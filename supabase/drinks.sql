-- Drink types beyond wine. Apply after agent-photos.sql and label-scan.sql.
-- Existing rows become drink_type 'Wine' with data, photos and sharing untouched.
alter table public.wines add column if not exists drink_type text not null default 'Wine';
alter table public.wines add column if not exists abv numeric(4,1);
alter table public.wines alter column style drop not null;
alter table public.wines drop constraint if exists wines_style_check;
alter table public.wines add constraint wines_drink_check check (
 (drink_type='Wine' and style is not null and style in ('Red','White','Rosé','Sparkling','Other') and abv is null)
 or (drink_type in ('Soju','Makgeolli','Beer','Whisky','Cocktail','Sake','Other') and style is null and vintage is null and (abv is null or (abv>=0 and abv<=100)))
);
-- Shared read-only view now carries the drink type and ABV. Still no owner ids, emails or photos.
drop function if exists public.shared_wines(uuid);
create function public.shared_wines(share_token uuid)
returns table(id uuid,producer text,name text,vintage integer,country text,style text,score numeric,notes text,created_at timestamptz,drink_type text,abv numeric)
language sql stable security definer set search_path='' as $$
 select w.id,w.producer,w.name,w.vintage,w.country,w.style,w.score,w.notes,w.created_at,w.drink_type,w.abv
 from public.wines w join public.collection_shares s on s.owner_id=w.owner_id where s.token=share_token order by w.score desc,w.created_at desc
$$;
revoke all on function public.shared_wines(uuid) from public;
grant execute on function public.shared_wines(uuid) to authenticated;
-- Agent entry key accepts every drink type. Same add-only, rate-limited shape.
drop function if exists public.agent_add_wine(text,text,text,integer,text,text,numeric,text);
create function public.agent_add_wine(p_key text,p_producer text,p_name text,p_vintage integer,p_country text,p_style text,p_score numeric,p_notes text,p_drink_type text default 'Wine',p_abv numeric default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare o uuid; n uuid; t text;
begin
 select owner_id into o from public.agent_keys where key_hash=encode(sha256(convert_to(coalesce(p_key,''),'UTF8')),'hex');
 if o is null then raise exception 'not allowed'; end if;
 if (select count(*) from public.wines where owner_id=o and added_via='agent' and created_at>now()-interval '1 hour')>=30 then raise exception 'too many entries, try later'; end if;
 t:=coalesce(p_drink_type,'Wine');
 if t not in ('Wine','Soju','Makgeolli','Beer','Whisky','Cocktail','Sake','Other') then raise exception 'unknown drink type'; end if;
 if t='Wine' then
  if p_abv is not null then raise exception 'abv is only for other drinks'; end if;
  insert into public.wines(owner_id,producer,name,vintage,country,style,score,notes,added_via,drink_type,abv)
  values (o,left(trim(p_producer),120),left(trim(p_name),160),p_vintage,left(coalesce(p_country,''),80),p_style,p_score,left(coalesce(p_notes,''),2000),'agent','Wine',null) returning id into n;
 else
  if p_style is not null or p_vintage is not null then raise exception 'vintage and style are only for wine'; end if;
  insert into public.wines(owner_id,producer,name,vintage,country,style,score,notes,added_via,drink_type,abv)
  values (o,left(trim(p_producer),120),left(trim(p_name),160),null,left(coalesce(p_country,''),80),null,p_score,left(coalesce(p_notes,''),2000),'agent',t,p_abv) returning id into n;
 end if;
 return n;
end $$;
revoke all on function public.agent_add_wine(text,text,text,integer,text,text,numeric,text,text,numeric) from public;
grant execute on function public.agent_add_wine(text,text,text,integer,text,text,numeric,text,text,numeric) to anon, authenticated;
-- Photo attach matches on the drink type too, so a makgeolli never lands on a wine of the same name.
drop function if exists public.agent_photo_reserve(text,text,text,integer);
create function public.agent_photo_reserve(p_key text,p_producer text,p_name text,p_vintage integer,p_drink_type text default 'Wine')
returns table(claim uuid, object_path text) language plpgsql security definer set search_path='' as $$
declare o uuid; h text; w uuid; c uuid:=gen_random_uuid(); p text; t text;
begin
 h:=encode(sha256(convert_to(coalesce(p_key,''),'UTF8')),'hex');
 select owner_id into o from public.agent_keys where key_hash=h for update;
 if o is null then raise exception 'not allowed'; end if;
 if (select count(*) from public.agent_photo_claims where owner_id=o and created_at>now()-interval '1 hour')>=30 then raise exception 'too many uploads'; end if;
 t:=coalesce(p_drink_type,'Wine');
 if t not in ('Wine','Soju','Makgeolli','Beer','Whisky','Cocktail','Sake','Other') then raise exception 'unknown drink type'; end if;
 if (select count(*) from public.wines where owner_id=o and lower(producer)=lower(trim(p_producer)) and lower(name)=lower(trim(p_name)) and vintage is not distinct from p_vintage and drink_type=t)<>1 then raise exception 'target unavailable'; end if;
 select id into w from public.wines where owner_id=o and lower(producer)=lower(trim(p_producer)) and lower(name)=lower(trim(p_name)) and vintage is not distinct from p_vintage and drink_type=t and photo_path is null for update;
 if w is null or exists(select 1 from public.agent_photo_claims where wine_id=w and (completed or created_at>now()-interval '10 minutes')) then raise exception 'target unavailable'; end if;
 p:=o::text||'/'||w::text||'/agent-'||c::text||'.jpg';
 insert into public.agent_photo_claims(id,owner_id,wine_id,path,key_hash) values(c,o,w,p,h);
 return query select c,p;
end $$;
revoke all on function public.agent_photo_reserve(text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.agent_photo_reserve(text,text,text,integer,text) to service_role;

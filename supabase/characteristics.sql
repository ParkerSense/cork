-- Wine taste profile: four optional 1-5 scales (sweetness, acidity, tannin, body). Apply after drinks.sql.
-- Wine-only, like vintage and style. Existing rows keep null scales.
alter table public.wines add column if not exists sweetness smallint;
alter table public.wines add column if not exists acidity smallint;
alter table public.wines add column if not exists tannin smallint;
alter table public.wines add column if not exists body smallint;
alter table public.wines drop constraint if exists wines_taste_check;
alter table public.wines add constraint wines_taste_check check (
 (drink_type='Wine'
  and (sweetness is null or sweetness between 1 and 5)
  and (acidity is null or acidity between 1 and 5)
  and (tannin is null or tannin between 1 and 5)
  and (body is null or body between 1 and 5))
 or (drink_type<>'Wine' and sweetness is null and acidity is null and tannin is null and body is null)
);
-- Shared read-only view carries the taste scales too. Still no owner ids, emails or photos.
drop function if exists public.shared_wines(uuid);
create function public.shared_wines(share_token uuid)
returns table(id uuid,producer text,name text,vintage integer,country text,style text,score numeric,notes text,created_at timestamptz,drink_type text,abv numeric,sweetness smallint,acidity smallint,tannin smallint,body smallint)
language sql stable security definer set search_path='' as $$
 select w.id,w.producer,w.name,w.vintage,w.country,w.style,w.score,w.notes,w.created_at,w.drink_type,w.abv,w.sweetness,w.acidity,w.tannin,w.body
 from public.wines w join public.collection_shares s on s.owner_id=w.owner_id where s.token=share_token order by w.score desc,w.created_at desc
$$;
revoke all on function public.shared_wines(uuid) from public;
grant execute on function public.shared_wines(uuid) to authenticated;
-- Agent entry key accepts the four scales as optional extras for wine. Same add-only, rate-limited shape.
drop function if exists public.agent_add_wine(text,text,text,integer,text,text,numeric,text,text,numeric);
create function public.agent_add_wine(p_key text,p_producer text,p_name text,p_vintage integer,p_country text,p_style text,p_score numeric,p_notes text,p_drink_type text default 'Wine',p_abv numeric default null,p_sweetness integer default null,p_acidity integer default null,p_tannin integer default null,p_body integer default null)
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
  insert into public.wines(owner_id,producer,name,vintage,country,style,score,notes,added_via,drink_type,abv,sweetness,acidity,tannin,body)
  values (o,left(trim(p_producer),120),left(trim(p_name),160),p_vintage,left(coalesce(p_country,''),80),p_style,p_score,left(coalesce(p_notes,''),2000),'agent','Wine',null,p_sweetness,p_acidity,p_tannin,p_body) returning id into n;
 else
  if p_style is not null or p_vintage is not null then raise exception 'vintage and style are only for wine'; end if;
  if p_sweetness is not null or p_acidity is not null or p_tannin is not null or p_body is not null then raise exception 'taste scales are only for wine'; end if;
  insert into public.wines(owner_id,producer,name,vintage,country,style,score,notes,added_via,drink_type,abv)
  values (o,left(trim(p_producer),120),left(trim(p_name),160),null,left(coalesce(p_country,''),80),null,p_score,left(coalesce(p_notes,''),2000),'agent',t,p_abv) returning id into n;
 end if;
 return n;
end $$;
revoke all on function public.agent_add_wine(text,text,text,integer,text,text,numeric,text,text,numeric,integer,integer,integer,integer) from public;
grant execute on function public.agent_add_wine(text,text,text,integer,text,text,numeric,text,text,numeric,integer,integer,integer,integer) to anon, authenticated;

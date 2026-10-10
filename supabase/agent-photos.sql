-- Service-only functions used by agent-photo. No anonymous read or Storage grant.
create table public.agent_photo_claims (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 wine_id uuid not null references public.wines(id) on delete cascade,
 path text not null unique, key_hash text not null, created_at timestamptz not null default now(), completed boolean not null default false
);
alter table public.agent_photo_claims enable row level security;
revoke all on public.agent_photo_claims from anon, authenticated;
create or replace function public.agent_photo_reserve(p_key text,p_producer text,p_name text,p_vintage integer)
returns table(claim uuid, object_path text) language plpgsql security definer set search_path='' as $$
declare o uuid; h text; w uuid; c uuid:=gen_random_uuid(); p text;
begin
 h:=encode(sha256(convert_to(coalesce(p_key,''),'UTF8')),'hex');
 select owner_id into o from public.agent_keys where key_hash=h for update;
 if o is null then raise exception 'not allowed'; end if;
 if (select count(*) from public.agent_photo_claims where owner_id=o and created_at>now()-interval '1 hour')>=30 then raise exception 'too many uploads'; end if;
 if (select count(*) from public.wines where owner_id=o and lower(producer)=lower(trim(p_producer)) and lower(name)=lower(trim(p_name)) and vintage is not distinct from p_vintage)<>1 then raise exception 'target unavailable'; end if;
 select id into w from public.wines where owner_id=o and lower(producer)=lower(trim(p_producer)) and lower(name)=lower(trim(p_name)) and vintage is not distinct from p_vintage and photo_path is null for update;
 if w is null or exists(select 1 from public.agent_photo_claims where wine_id=w and (completed or created_at>now()-interval '10 minutes')) then raise exception 'target unavailable'; end if;
 p:=o::text||'/'||w::text||'/agent-'||c::text||'.jpg';
 insert into public.agent_photo_claims(id,owner_id,wine_id,path,key_hash) values(c,o,w,p,h);
 return query select c,p;
end $$;
create or replace function public.agent_photo_finish(p_key text,p_claim uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.agent_photo_claims; o uuid;
begin
 select owner_id into o from public.agent_keys where key_hash=encode(sha256(convert_to(coalesce(p_key,''),'UTF8')),'hex') for update;
 if o is null then raise exception 'not allowed'; end if;
 select * into r from public.agent_photo_claims where id=p_claim and owner_id=o and key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex') and not completed and created_at>now()-interval '10 minutes' for update;
 if r.id is null then raise exception 'not allowed'; end if;
 update public.wines set photo_path=r.path where id=r.wine_id and owner_id=o and photo_path is null;
 if not found then raise exception 'target unavailable'; end if;
 update public.agent_photo_claims set completed=true where id=r.id;
end $$;
revoke all on function public.agent_photo_reserve(text,text,text,integer),public.agent_photo_finish(text,uuid) from public,anon,authenticated;
grant execute on function public.agent_photo_reserve(text,text,text,integer),public.agent_photo_finish(text,uuid) to service_role;

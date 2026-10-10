-- Add-only agent entry key. Apply after schema.sql.
-- The owner approves a key HASH (from a pairing link). The secret itself never reaches the app or the repo.
-- The key can add wines for that owner only: no read, edit, delete, photos, or sharing.
alter table public.wines add column if not exists added_via text not null default 'app' check (added_via in ('app','agent'));
create table if not exists public.agent_keys (
 owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
 key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.agent_keys enable row level security;
revoke all on public.agent_keys from anon, authenticated;
grant select (owner_id, created_at) on public.agent_keys to authenticated;
create policy "Own key status" on public.agent_keys for select to authenticated using (owner_id=(select auth.uid()));
create or replace function public.set_agent_key(p_hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'sign in required'; end if;
 if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'bad key'; end if;
 insert into public.agent_keys(owner_id,key_hash) values (auth.uid(),p_hash)
 on conflict (owner_id) do update set key_hash=excluded.key_hash, created_at=now();
end $$;
create or replace function public.revoke_agent_key() returns void language sql security definer set search_path='' as $$
 delete from public.agent_keys where owner_id=auth.uid()
$$;
create or replace function public.agent_add_wine(p_key text,p_producer text,p_name text,p_vintage integer,p_country text,p_style text,p_score numeric,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare o uuid; n uuid;
begin
 select owner_id into o from public.agent_keys where key_hash=encode(sha256(convert_to(coalesce(p_key,''),'UTF8')),'hex');
 if o is null then raise exception 'not allowed'; end if;
 if (select count(*) from public.wines where owner_id=o and added_via='agent' and created_at>now()-interval '1 hour')>=30 then raise exception 'too many entries, try later'; end if;
 insert into public.wines(owner_id,producer,name,vintage,country,style,score,notes,added_via)
 values (o,left(trim(p_producer),120),left(trim(p_name),160),p_vintage,left(coalesce(p_country,''),80),p_style,p_score,left(coalesce(p_notes,''),2000),'agent') returning id into n;
 return n;
end $$;
revoke all on function public.set_agent_key(text), public.revoke_agent_key(), public.agent_add_wine(text,text,text,integer,text,text,numeric,text) from public;
grant execute on function public.set_agent_key(text), public.revoke_agent_key() to authenticated;
grant execute on function public.agent_add_wine(text,text,text,integer,text,text,numeric,text) to anon, authenticated;
revoke execute on function public.set_agent_key(text), public.revoke_agent_key() from anon;

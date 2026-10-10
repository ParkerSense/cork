-- Apply in a dedicated project. No tasting data belongs in this file.
create table if not exists public.wines (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 producer text not null check (length(producer) between 1 and 120),
 name text not null check (length(name) between 1 and 160),
 vintage integer check (vintage between 1900 and 2100),
 country text not null default '' check(length(country)<=80),
 style text not null check(style in ('Red','White','Rosé','Sparkling','Other')),
 score numeric(3,1) not null check(score between 0 and 10),
 notes text not null default '' check(length(notes)<=2000),
 photo_path text,
 created_at timestamptz not null default now()
);
create index if not exists wines_owner_idx on public.wines(owner_id);
alter table public.wines enable row level security;
revoke all on public.wines from anon;
grant select,insert,update,delete on public.wines to authenticated;
create policy "Own wines only" on public.wines for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
-- Sharing is explicit and read-only. A random link is a bearer credential.
create table public.collection_shares (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 token uuid not null default gen_random_uuid() unique,
 created_at timestamptz not null default now(),
 unique(owner_id)
);
alter table public.collection_shares enable row level security;
revoke all on public.collection_shares from anon;
grant select,insert,delete on public.collection_shares to authenticated;
create policy "Own sharing settings only" on public.collection_shares for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create or replace function public.shared_wines(share_token uuid)
returns table(id uuid,producer text,name text,vintage integer,country text,style text,score numeric,notes text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select w.id,w.producer,w.name,w.vintage,w.country,w.style,w.score,w.notes,w.created_at
 from public.wines w join public.collection_shares s on s.owner_id=w.owner_id where s.token=share_token order by w.score desc,w.created_at desc
$$;
revoke all on function public.shared_wines(uuid) from public;
grant execute on function public.shared_wines(uuid) to authenticated;

-- Image contents/results are never stored here. Only rolling quota counters.
create table public.label_scan_limits (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 minute_start timestamptz not null,
 minute_count integer not null,
 day_start date not null,
 day_count integer not null
);
alter table public.label_scan_limits enable row level security;
revoke all on public.label_scan_limits from public,anon,authenticated;
-- Service role only: Edge Function passes the verified Auth user id.
create or replace function public.reserve_label_scan(p_owner uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare t timestamptz := clock_timestamp(); r public.label_scan_limits; m timestamptz; d date;
begin
 m := date_trunc('minute',t); d := (t at time zone 'UTC')::date;
 insert into public.label_scan_limits values(p_owner,m,0,d,0) on conflict do nothing;
 select * into r from public.label_scan_limits where owner_id=p_owner for update;
 if r.minute_start=m and r.minute_count>=3 or r.day_start=d and r.day_count>=20 then return false; end if;
 update public.label_scan_limits set minute_start=m,minute_count=case when r.minute_start=m then r.minute_count+1 else 1 end,
 day_start=d,day_count=case when r.day_start=d then r.day_count+1 else 1 end where owner_id=p_owner;
 return true;
end $$;
revoke all on function public.reserve_label_scan(uuid) from public,anon,authenticated;
grant execute on function public.reserve_label_scan(uuid) to service_role;

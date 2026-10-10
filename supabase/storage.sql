-- Private photo storage. Apply after schema.sql in the same dedicated project.
-- One private bucket; each person can only touch files under their own user-id folder.
-- Photos are never returned by shared_wines(), so shared viewers cannot see them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wine-photos', 'wine-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];
create policy "Own photos read" on storage.objects for select to authenticated using (bucket_id = 'wine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'wine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own photos update" on storage.objects for update to authenticated using (bucket_id = 'wine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'wine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own photos delete" on storage.objects for delete to authenticated using (bucket_id = 'wine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

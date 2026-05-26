-- =============================================================================
-- Hayat Ağı — Adım 2: Storage bucket ve politikaları
--
-- ÖN KOŞUL: 0001_initial_schema.sql başarıyla çalıştırılmış olmalı
--
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run
-- =============================================================================

-- Bucket oluştur (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'responder-documents',
  'responder-documents',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;

-- İsteğe bağlı: avatar bucket (MVP'de signed URL kullanılacak)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Storage RLS politikaları: responder-documents
-- Dosya yolu formatı: {user_id}/belge.pdf
-- -----------------------------------------------------------------------------

create policy "responder_docs_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'responder-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "responder_docs_read_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'responder-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "responder_docs_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'responder-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'responder-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "responder_docs_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'responder-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "responder_docs_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'responder-documents'
    and private.is_admin(auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Storage RLS politikaları: avatars
-- -----------------------------------------------------------------------------

create policy "avatars_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_read_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Doğrulama
select id, name, public from storage.buckets where id in ('responder-documents', 'avatars');

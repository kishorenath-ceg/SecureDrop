-- Storage bucket setup for SecureDrop private files
-- This bucket intentionally keeps uploaded files private and requires backend-controlled access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'files',
  'files',
  false,
  104857600,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/octet-stream',
    'application/json',
    'text/csv',
    'application/xml',
    'text/xml',
    'application/x-tar'
  ]
)
on conflict (name) do nothing;

create policy if not exists "Authenticated users can upload files"
on storage.objects for insert
with check (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
);

create policy if not exists "Authenticated users can view their own files"
on storage.objects for select
using (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
);

create policy if not exists "Authenticated users can update their own files"
on storage.objects for update
using (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
);

create policy if not exists "Authenticated users can delete their own files"
on storage.objects for delete
using (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
);

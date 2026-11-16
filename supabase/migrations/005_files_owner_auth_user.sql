-- File uploads store the authenticated user's auth.users.id as owner_id.
-- Migrate any existing profile IDs before aligning the foreign key.
alter table public.files
  drop constraint if exists files_owner_id_fkey;

update public.files as files
set owner_id = profiles.user_id
from public.profiles as profiles
where files.owner_id = profiles.id
  and files.owner_id <> profiles.user_id;

alter table public.files
  add constraint files_owner_id_fkey
  foreign key (owner_id)
  references auth.users(id)
  on delete cascade;

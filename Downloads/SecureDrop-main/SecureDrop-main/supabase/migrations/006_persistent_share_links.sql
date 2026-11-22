-- Persist all files in a transfer and align share ownership with auth.users.
alter table public.share_links
  add column if not exists file_ids text[] not null default array[]::text[];

update public.share_links
set file_ids = array[file_id::text]
where cardinality(file_ids) = 0
  and file_id is not null;

alter table public.share_links
  drop constraint if exists share_links_owner_id_fkey;

update public.share_links as share_links
set owner_id = profiles.user_id
from public.profiles as profiles
where share_links.owner_id = profiles.id
  and share_links.owner_id <> profiles.user_id;

alter table public.share_links
  add constraint share_links_owner_id_fkey
  foreign key (owner_id)
  references auth.users(id)
  on delete cascade;

create index if not exists idx_share_links_file_ids on public.share_links using gin(file_ids);

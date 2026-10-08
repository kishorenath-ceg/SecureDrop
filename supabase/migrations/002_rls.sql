-- SecureDrop RLS policies
-- These policies enforce ownership boundaries and prevent unrestricted access.
-- Public users should never receive blanket access to private files and share links.

alter table profiles enable row level security;
alter table files enable row level security;
alter table share_links enable row level security;
alter table download_events enable row level security;

create index if not exists idx_files_owner_id on files(owner_id);
create index if not exists idx_share_links_file_id on share_links(file_id);
create index if not exists idx_share_links_owner_id on share_links(owner_id);
create index if not exists idx_share_links_token on share_links(token);
create index if not exists idx_share_links_custom_slug on share_links(custom_slug);
create index if not exists idx_download_events_share_link_id on download_events(share_link_id);

-- profiles
create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = user_id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = user_id);

-- files
create policy "Users can view their own files"
on files for select
using (owner_id = auth.uid());

create policy "Users can insert their own files"
on files for insert
with check (owner_id = auth.uid());

create policy "Users can update their own files"
on files for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete their own files"
on files for delete
using (owner_id = auth.uid());

-- share_links
create policy "Users can view their own share links"
on share_links for select
using (owner_id = auth.uid());

create policy "Users can insert their own share links"
on share_links for insert
with check (owner_id = auth.uid());

create policy "Users can update their own share links"
on share_links for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete their own share links"
on share_links for delete
using (owner_id = auth.uid());

-- download_events
create policy "Users can view their own download events"
on download_events for select
using (owner_id = auth.uid());

create policy "Users can insert their own download events"
on download_events for insert
with check (owner_id = auth.uid());

create policy "Users can update their own download events"
on download_events for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

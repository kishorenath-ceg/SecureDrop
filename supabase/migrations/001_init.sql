-- Initial SecureDrop schema.
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on profiles(user_id);

create table if not exists files (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id) on delete cascade,
  original_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  is_deleted boolean not null default false
);

create table if not exists share_links (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid references files(id) on delete cascade,
  owner_id uuid references profiles(id) on delete cascade,
  token text unique not null,
  custom_slug text unique,
  password_hash text,
  expires_at timestamptz,
  max_downloads integer,
  download_count integer not null default 0,
  is_active boolean not null default true,
  is_revoked boolean not null default false,
  password_protected boolean not null default false,
  owner_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists download_events (
  id uuid primary key default uuid_generate_v4(),
  share_link_id uuid references share_links(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  owner_id uuid references profiles(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  status text not null,
  error_code text
);

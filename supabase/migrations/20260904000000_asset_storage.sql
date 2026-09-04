-- The files stop living in one browser.
--
-- Until now `sources` (what the user uploaded) and `mockups` (what MockupGen
-- rendered) existed only in that browser's IndexedDB. A second machine, a
-- private window, a cleared cache -- or a browser quietly evicting storage
-- under disk pressure -- lost them, and the app could only say so:
--   "Active upload assets missing in this browser."
--
-- Two private buckets hold them now, and IndexedDB becomes a cache in front.
-- `listing_assets` is the record of what is in there: without it a bucket is
-- the same anonymous folder the browser was, and nothing could be answered for
-- or cleaned up.

-- ---------------------------------------------------------------- buckets --
insert into storage.buckets (id, name, public)
values ('sources', 'sources', false), ('mockups', 'mockups', false)
on conflict (id) do nothing;

-- Every object lives under the owner's uid: `${uid}/${folder}/${file}`. The
-- first path segment is the whole access rule.
create policy "own assets are readable"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('sources', 'mockups')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own assets are writable"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('sources', 'mockups')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own assets are replaceable"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('sources', 'mockups')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own assets are removable"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('sources', 'mockups')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------- what is in there --
create type public.asset_kind as enum ('source', 'mockup', 'delivery');

create table public.listing_assets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- The listing this belongs to. Text, and not a foreign key, for the same
  -- reason listings.id is text: the app generates it, and assets are uploaded
  -- while the listing row is still being written.
  listing_id   text not null check (char_length(listing_id) <= 128),
  folder_name  text not null check (char_length(folder_name) <= 200),

  kind         public.asset_kind not null,
  -- Where the object sits in its bucket, uid prefix included.
  storage_path text not null check (char_length(storage_path) <= 1024),
  bucket       text not null check (bucket in ('sources', 'mockups')),

  file_name    text not null check (char_length(file_name) <= 300),
  content_type text check (char_length(content_type) <= 128),
  bytes        bigint not null default 0 check (bytes >= 0),
  width        integer check (width >= 0),
  height       integer check (height >= 0),

  -- For a mockup: which template made it, and which sources went into it.
  -- This is what the schema could never answer before -- it mentioned mockups
  -- four times and every one was the same single thumbnail.
  template_id  text check (char_length(template_id) <= 128),
  source_files text[] not null default '{}',

  created_at   timestamptz not null default now(),

  unique (user_id, bucket, storage_path)
);

create index listing_assets_owner_idx   on public.listing_assets (user_id, folder_name);
create index listing_assets_listing_idx on public.listing_assets (user_id, listing_id);

alter table public.listing_assets enable row level security;

create policy "own asset records are readable"
  on public.listing_assets for select to authenticated
  using (auth.uid() = user_id);

create policy "own asset records are writable"
  on public.listing_assets for insert to authenticated
  with check (auth.uid() = user_id);

create policy "own asset records are replaceable"
  on public.listing_assets for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own asset records are removable"
  on public.listing_assets for delete to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------- what the studio decided --
-- Which templates were picked by hand and which image sits in which frame.
-- These were React state and nothing else, so any refresh threw away work that
-- had been done listing by listing.
alter table public.listings
  add column if not exists studio_prefs jsonb not null default '{}'::jsonb;

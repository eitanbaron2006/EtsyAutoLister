-- AutoLister schema. Mirrors the Firestore model that firestore.rules guarded:
--   users/{uid}                     -> public.profiles
--   users/{uid}/listings/{listingId} -> public.listings
-- Field-level validation that firestore.rules hand-rolled in its DSL is now
-- enforced by column types + CHECK constraints; ownership is enforced by RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
create type public.listing_status as enum (
  'idle', 'scanning', 'mockups', 'thumbnail', 'compiling',
  'seo', 'ready', 'publishing', 'published'
);

-- ------------------------------------------------------------- profiles ----
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text        not null check (char_length(email) <= 256),
  etsy_connected    boolean     not null default false,
  -- NOTE: same trust model the Firestore doc had (owner-readable). See README
  -- security note: this belongs in a server-only table before going multi-user.
  etsy_token        text        check (char_length(etsy_token) <= 1024),
  last_product_type text        check (char_length(last_product_type) <= 64),
  -- saved_tips and plan were written by the app but REJECTED by firestore.rules
  -- (not in its update allow-list). They are first-class columns here.
  saved_tips        text[]      not null default '{}',
  plan              text        not null default 'free' check (char_length(plan) <= 32),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ------------------------------------------------------------- listings ----
create table public.listings (
  user_id                     uuid not null references auth.users (id) on delete cascade,
  -- app-generated listing id; unique per user, exactly like the Firestore doc id
  id                          text not null check (id ~ '^[a-zA-Z0-9_\-]{1,128}$'),

  folder_name                 text not null check (char_length(folder_name) <= 200),
  project_id                  text check (char_length(project_id) <= 128),
  project_name                text check (char_length(project_name) <= 200),
  status                      public.listing_status not null default 'idle',

  title                       text check (char_length(title) <= 256),
  description                 text check (char_length(description) <= 10000),
  price                       numeric(12, 2) check (price >= 0),
  tags                        text[] check (array_length(tags, 1) is null or array_length(tags, 1) <= 13),

  -- the id/url Etsy hands back after publishing (renamed: `id` is taken)
  etsy_listing_id             text check (char_length(etsy_listing_id) <= 128),
  listing_url                 text check (char_length(listing_url) <= 1024),

  product_type                text check (char_length(product_type) <= 64),
  pipeline_step_text          text check (char_length(pipeline_step_text) <= 512),
  -- base64 preview. Firestore capped this at 1.5M chars but its own hard
  -- document limit is 1 MiB, so large mockups failed to write. No cap here.
  mockup_image                text,
  mockup_note                 text check (char_length(mockup_note) <= 512),

  quantity                    integer check (quantity >= 0),
  listing_type                text check (char_length(listing_type) <= 64),
  renewal_option              text check (char_length(renewal_option) <= 64),
  who_made                    text check (char_length(who_made) <= 64),
  when_made                   text check (char_length(when_made) <= 64),
  category                    text check (char_length(category) <= 64),
  shipping_profile            text check (char_length(shipping_profile) <= 128),
  is_supply                   boolean,
  sku                         text check (char_length(sku) <= 128),
  primary_color               text check (char_length(primary_color) <= 64),
  secondary_color             text check (char_length(secondary_color) <= 64),
  occasion                    text check (char_length(occasion) <= 64),
  holiday                     text check (char_length(holiday) <= 64),
  personalization_enabled     boolean,
  personalization_instructions text check (char_length(personalization_instructions) <= 1000),
  materials                   text check (char_length(materials) <= 1000),
  production_partners         text check (char_length(production_partners) <= 256),

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  primary key (user_id, id)
);

create index listings_user_created_idx on public.listings (user_id, created_at desc);
create index listings_project_idx      on public.listings (user_id, project_id) where project_id is not null;

-- ------------------------------------------------------- updated_at ----
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------ profile bootstrap on signup ----
-- Replaces the client-side "create profile if missing" round-trip in page.tsx.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ RLS ----
alter table public.profiles enable row level security;
alter table public.listings enable row level security;

-- This replaces ~150 lines of firestore.rules.
create policy "own profile" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own listings" on public.listings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------- realtime ----
-- Backs the single onSnapshot listener the app had on the listings collection.
alter publication supabase_realtime add table public.listings;

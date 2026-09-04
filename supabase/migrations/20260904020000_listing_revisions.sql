-- A title that was better before the last run.
--
-- Re-running Gemini, or editing by hand, overwrote the previous title, tags
-- and description with nothing kept. There was no way back, and no way to tell
-- whether a listing's copy had been written by the model or by a person.
--
-- Only the three fields worth arguing about are recorded, and only when they
-- actually change. This is a history to read, not an audit log to prove
-- anything with.

create table public.listing_revisions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  listing_id     text not null check (char_length(listing_id) <= 128),
  field          text not null check (field in ('title', 'description', 'tags')),
  -- What it said before the change that replaced it.
  previous_value text,
  source         text check (char_length(source) <= 32),
  changed_at     timestamptz not null default now()
);

create index listing_revisions_listing_idx
  on public.listing_revisions (user_id, listing_id, changed_at desc);

alter table public.listing_revisions enable row level security;

create policy "own revisions are readable"
  on public.listing_revisions for select to authenticated
  using (auth.uid() = user_id);

create policy "own revisions are writable"
  on public.listing_revisions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "own revisions are removable"
  on public.listing_revisions for delete to authenticated
  using (auth.uid() = user_id);

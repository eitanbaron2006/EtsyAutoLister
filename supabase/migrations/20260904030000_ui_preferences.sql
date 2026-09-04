-- How the person likes to work, kept where a new browser can find it.
--
-- Theme, Autopilot-vs-Guided, and the default mockup fit mode lived in three
-- localStorage keys and nowhere else, so a cleared cache or a second machine
-- silently reverted all three to their defaults.
--
-- The same shape MockupGen settled on: the database is the copy that counts
-- and the browser keeps one as a cache, so the first paint needs no round trip
-- and the stored value wins once it lands.

alter table public.profiles
  add column if not exists ui_prefs jsonb not null default '{}'::jsonb;

comment on column public.profiles.ui_prefs is
  'Working preferences (theme, autopilot, fit mode). localStorage caches these; this is the copy that counts.';

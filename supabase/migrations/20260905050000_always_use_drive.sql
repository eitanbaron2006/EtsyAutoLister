-- Send every listing to Drive, not only the ones Etsy will not carry.
--
-- Oversize listings have to go somewhere — that is not a preference. This is:
-- a shop that wants its own cloud copy of everything it sells, as a backup it
-- controls rather than one it hopes Etsy keeps.
--
-- Off by default. Uploading a hundred megabytes per listing is a real cost in
-- time and in someone's Drive quota, and it should be asked for.

alter table public.profiles
  add column if not exists always_use_drive boolean not null default false;

comment on column public.profiles.always_use_drive is
  'Upload every listing''s files to Drive, not only those too large for Etsy. A backup the shop asked for; never blocks a listing that would publish without it.';

-- Where in Drive the shop wants its buyer folders to live.
--
-- The app used to put everything under one hardcoded name. A shop that already
-- organises its Drive has an opinion about that, and it is a cheap one to
-- honour.
--
-- A path, not a folder id: the `drive.file` scope this app holds sees only
-- what it created itself, so an existing folder the shop picked by hand would
-- be invisible to it. What can be offered is a path the app makes and owns --
-- "Shop/Downloads" becomes Shop, then Downloads inside it.

alter table public.profiles
  add column if not exists drive_folder_path text
    check (drive_folder_path is null or char_length(drive_folder_path) <= 512);

comment on column public.profiles.drive_folder_path is
  'Slash-separated path under My Drive for buyer download folders, e.g. "Etsy/Downloads". Created by the app; cannot point at a folder the app did not make, because the drive.file scope cannot see one. Null means the default.';

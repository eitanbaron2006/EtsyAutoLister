-- How a listing too large for Etsy reaches the buyer.
--
-- Etsy takes five files of 20MB. A set of several artworks at every print
-- ratio comes to more than that, so the files cannot be the product: the
-- product becomes a link, and the shop needs somewhere to put the files.
--
-- Two ways to have one, and a shop may use either:
--   1. Connect Google Drive, and the app puts the files there itself.
--   2. Paste a link to somewhere the buyer can download from.
--
-- The Drive tokens follow the same rule as the Etsy token: their own table,
-- row level security on and NO policies, so no client role can reach them.
-- Only the service role, which exists on the server alone, can. The manual
-- link is not a secret and lives on the profile.

-- ------------------------------------------------------- the manual link --
alter table public.profiles
  add column if not exists delivery_link text
    check (delivery_link is null or char_length(delivery_link) <= 2048);

comment on column public.profiles.delivery_link is
  'Where the buyer downloads a listing whose files Etsy will not carry. Any URL the shop controls; not a secret. Superseded by a connected Drive account when both are present.';

-- ------------------------------------------------------- the Drive grant --
create table public.drive_tokens (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  access_token  text        not null check (char_length(access_token) <= 4096),
  refresh_token text        check (char_length(refresh_token) <= 4096),
  expires_at    timestamptz,
  -- Which Google account the grant belongs to. Shown in the UI so a shop can
  -- see it connected the right one; not used to authorise anything.
  account_email text        check (char_length(account_email) <= 320),
  scope         text        check (char_length(scope) <= 1024),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.drive_tokens enable row level security;
-- Deliberately no policies. See the note above.

revoke all on public.drive_tokens from anon, authenticated;

create trigger drive_tokens_touch_updated_at
  before update on public.drive_tokens
  for each row execute function public.touch_updated_at();

-- ------------------------------------------- what the client may know of it --
-- The page needs to render "Connected as ..." without ever seeing a token, so
-- the connection state is mirrored onto the profile, which the owner can read.
-- Written by the server when the grant is stored or removed.
alter table public.profiles
  add column if not exists drive_account_email text
    check (drive_account_email is null or char_length(drive_account_email) <= 320);

comment on column public.profiles.drive_account_email is
  'The Google account whose Drive is connected, or null. A display value only — the grant itself is in public.drive_tokens, which no client role can read.';

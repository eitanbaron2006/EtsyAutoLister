-- The Etsy access token stops passing through the browser.
--
-- It lived in `profiles.etsy_token`, readable by the owner's own row, and the
-- OAuth callback handed it to the page with
--   window.opener.postMessage({ token }, '*')
-- -- any window that could get a handle on the opener could read it. From
-- there the page kept it in React state and posted it back with every publish.
--
-- The migration in which that column was created said so itself:
--   "this belongs in a server-only table before going multi-user".
--
-- This table has row level security on and **no policies at all**, which is
-- the point: neither the anon nor the authenticated role can select, insert or
-- update it. Only the service role, which bypasses RLS, reaches it -- and that
-- key exists solely on the server.

create table public.etsy_tokens (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  access_token text        not null check (char_length(access_token) <= 4096),
  refresh_token text       check (char_length(refresh_token) <= 4096),
  expires_at   timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.etsy_tokens enable row level security;
-- Deliberately no policies. See the note above.

revoke all on public.etsy_tokens from anon, authenticated;

create trigger etsy_tokens_touch_updated_at
  before update on public.etsy_tokens
  for each row execute function public.touch_updated_at();

-- Carry across whatever is already stored, so a connected account stays
-- connected through the change.
insert into public.etsy_tokens (user_id, access_token)
select id, etsy_token
from public.profiles
where etsy_token is not null and char_length(etsy_token) > 0
on conflict (user_id) do nothing;

-- The old column is emptied rather than dropped: the client still reads
-- `etsy_connected` beside it, and a column that disappears mid-deploy takes
-- the running page with it. What it must no longer hold is the secret.
update public.profiles set etsy_token = null where etsy_token is not null;

comment on column public.profiles.etsy_token is
  'Deprecated and always null. The real token lives in public.etsy_tokens, which no client role can read.';

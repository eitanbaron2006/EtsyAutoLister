-- Corrects a column comment that promised more than the code delivers.
--
-- 20260904010000 moved the real Etsy token into `public.etsy_tokens` and left
-- `profiles.etsy_token` behind, commented:
--
--   'Deprecated and always null. The real token lives in public.etsy_tokens,
--    which no client role can read.'
--
-- The first sentence is not true. The demo path in app/page.tsx still calls
--   updateProfile(user.uid, { etsyConnected: true, etsyToken: 'DEMO_TOKEN' })
-- and `etsyToken` is still a member of ProfilePatch, so the column can and
-- does hold that literal string.
--
-- Nothing is being fixed here. 'DEMO_TOKEN' is a marker, not a credential, and
-- the security property the previous migration set out to establish holds: no
-- real Etsy token reaches this column, and no client role can read the table
-- that holds the real one. What is corrected is the claim, because a comment
-- read as an invariant is worse than no comment -- the next person to touch
-- this would reasonably assume the write path was already closed.

comment on column public.profiles.etsy_token is
  'Deprecated. Never holds a real Etsy access token -- that lives in public.etsy_tokens, which no client role can read. Still written by the demo connect path, which stores the literal marker ''DEMO_TOKEN'' here. Treat any value as a flag, never as a credential.';

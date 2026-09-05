-- The shop's own look, so what the buyer receives comes from the shop rather
-- than from this app.
--
-- A listing too large for Etsy is delivered as a link, and the thing actually
-- uploaded is a PDF carrying it. That PDF is the last thing a buyer sees with
-- the shop's name on it, so it should not look like a generic receipt: the
-- name, the logo and a colour taken from the shop are enough to make it read
-- as theirs.
--
-- Read from Etsy when the shop connects, and cached here — the PDF is built
-- on every oversize publish, and that is not a reason to call Etsy each time.

alter table public.profiles
  add column if not exists shop_branding jsonb not null default '{}'::jsonb;

comment on column public.profiles.shop_branding is
  'Cached from the connected Etsy shop: { shopId, shopName, iconUrl, title, announcement, accentColor, fetchedAt }. Presentation only — nothing here authorises anything.';

-- Which preset the shop's delivery PDF uses, plus whatever it overrode.
alter table public.profiles
  add column if not exists pdf_preset jsonb not null default '{}'::jsonb;

comment on column public.profiles.pdf_preset is
  'Delivery PDF design: { preset: id, accentColor?, headline?, message?, showLogo? }. Empty means the default preset with everything taken from shop_branding.';

-- Where a listing's files ended up, once they have been put somewhere.
alter table public.listings
  add column if not exists delivery jsonb;

comment on column public.listings.delivery is
  'Where the buyer downloads this listing: { provider: drive|manual, folderId?, url, fileCount, bytes, deliveredAt }. Null until the files have been delivered.';

# What AutoLister stores, what it loses, and the order to fix it

Written after reading the code, not the intentions. Every claim below was
checked against the files named beside it.

The rule this follows, the same one MockupGen was reviewed under: **if this
browser were wiped right now, what would hurt?** What would not hurt is not
worth a write. What would hurt and is only in the browser is the work.

---

## Where things live today

| Layer | Holds |
|---|---|
| **Supabase Postgres** | `public.profiles` (identity, `etsy_connected`, `etsy_token`, `last_product_type`, `saved_tips`, `plan`) and `public.listings` (title, description, price, 13 tags, status, pipeline step, project, Etsy id and url, product attributes, and one small `mockup_image` preview) |
| **IndexedDB** `autolister-assets` | `sources` — the files the user uploaded, as Blobs, keyed `${uid}:${folder}`. `mockups` — the rendered mockups, as Blobs. `lib/asset-store.ts` |
| **localStorage** | exactly three keys: `autolister-theme`, `autolister-studio-autopilot`, `autolister-fit-mode` |
| **React state** | the staging tray, the studio's template and frame choices, and the whole pipeline run |

There are **no Supabase Storage buckets**. Nothing in `app/`, `lib/` or
`supabase/` calls `.storage`.

---

## The gap that matters, and the ones behind it

### 1. The files exist in one browser and nowhere else — **critical**

`sources` and `mockups` are Blobs in IndexedDB. The only thing that reaches the
server is a 480px JPEG at quality 0.8, written as a base64 data URL into
`listings.mockup_image` (`app/page.tsx`, `blobToScaledJpegDataUrl(blob, 480, 0.8)`).

So a different machine, a different browser, a private window, or a cleared
cache means the originals and the full-size mockups are **gone**, and the app
says so:

> `Active upload assets missing in this browser. Reload raw files or browse directory.`

Two things make this worse than it looks:

- **Nothing measures or bounds the store.** `lib/asset-store.ts` never calls
  `navigator.storage.estimate()` or `persist()`. A browser under disk pressure
  evicts IndexedDB **silently** — there is no warning and no error until a
  listing tries to publish.
- **Nothing records which mockups a listing was built from.** The schema
  mentions mockups four times and every one of them is the single thumbnail.
  Which templates ran, which files came back, at what size — none of it exists
  anywhere, in the browser or on the server.

### 2. A run interrupted mid-way cannot resume — **high**

The pipeline (scan → mockups → thumbnail → compile → SEO) runs entirely in the
page. Close the tab and the run stops where it stood. `recoverStalledListings`
(`lib/listings-repo.ts:298`) does not resume anything: after
`STALE_PIPELINE_MS` — ten minutes — it sets the listing back to `idle` with
"The previous run was interrupted before it finished. Press Run to try again."

Everything already done in that run is thrown away, including the mockups that
were rendered and paid for in time.

### 3. The studio's choices die on refresh — **high**

`selectedTemplateIds`, `frameAssignments` and `studioPrefsMap`
(`app/page.tsx:172-177`) are `useState` and nothing else. Which templates were
chosen by hand, and which image sits in which frame of a multi-frame mockup,
are lost on any reload. For a set of listings arranged one by one, that is real
work.

### 4. The staging tray dies on refresh — **medium**

`stagedProducts` and `stagedSelection` (`app/page.tsx:218-219`) hold the files
chosen, the sets merged, the groups split and the names given — all before
"Create Listings" writes anything. A refresh at that moment loses all of it.

### 5. The Etsy token is stored in the clear, readable by the owner row — **medium, security**

`profiles.etsy_token` is plain text under RLS. The migration says so itself:

> `-- this belongs in a server-only table before going multi-user`

It is not a data-loss issue; it is the one that becomes urgent the day a second
person has an account.

### 6. No history of titles, tags or descriptions — **low**

Re-running Gemini, or editing by hand, overwrites the previous values. There is
no way back to a title that was better.

### 7. Billing — **not a gap yet**

`profiles.plan` is a string with a default of `free`. There is no Stripe, no
transactions, no limits. Nothing is being lost because nothing is being
charged. Leave it until there is a product decision.

---

## What should stay exactly where it is

| | Why |
|---|---|
| **Blobs in IndexedDB** | After the fix below they become a **cache** in front of the bucket: same speed, no round trip, and no longer the only copy. |
| **theme, autopilot, fit-mode** | Per-device preferences. They should follow MockupGen's pattern — stored in `profiles`, cached in `localStorage`, the server winning — but they are three small keys and nothing breaks while they wait. |
| **`ETSY_API_KEY`, Supabase secrets** | Already server-side only, read in `app/api/**/route.ts` from `process.env`. Correct as is. |
| **Live pipeline progress** | The per-second step text is a live view. What has to survive is the **completed work**, not the animation. |

---

## The plan, in the order that pays

### Phase 1 — the files reach the server (closes gap 1) — **DONE, 2026-09-04**

The whole point. Nothing else matters as much.

1. Create two Supabase Storage buckets: `sources` and `mockups`, private, with
   RLS keyed on `auth.uid()` so a user reaches only their own prefix
   (`${uid}/${folder}/...`).
2. On upload, write to the bucket **and** to IndexedDB. IndexedDB stops being
   the record and becomes the cache.
3. On read, ask IndexedDB first, fall back to the bucket, and refill the cache.
   The "assets missing in this browser" error becomes a download, not a dead end.
4. Add a `listing_assets` table — one row per stored file: listing, kind
   (`source` / `mockup`), storage path, bytes, width, height, and for a mockup
   the template it came from. This is the same record that made MockupGen's
   print files answerable for, and it is what makes cleanup and re-delivery
   possible.
5. Backfill: on sign-in, any listing whose assets are in this browser but not in
   the bucket gets uploaded once, in the background.

**Done when:** signing in on a second machine shows the mockups and can publish.

### Phase 2 — a run survives the tab (closes gap 2)

1. Persist what each step produced as it completes, not only the step name:
   the mockup rows from phase 1 already do most of this.
2. Change `recoverStalledListings` from *reset* to *resume*: return the listing
   to the step after the last one that completed, rather than to `idle`.
3. Keep the ten-minute window — it is a reasonable definition of "no live
   owner" — but let it hand back work instead of discarding it.

**Done when:** closing the tab during mockup rendering and reopening continues
from the mockups already made.

### Phase 3 — the studio and the tray survive a refresh (gaps 3, 4) — **studio done; tray outstanding**

1. `selectedTemplateIds` and `frameAssignments` become a `jsonb studio_prefs`
   column on `listings`, written when they change (debounced, as MockupGen
   writes preferences).
2. The staging tray is pre-listing, so it does not belong in `listings`. Give it
   `sessionStorage` under one key, cleared when "Create Listings" runs. It costs
   almost nothing and removes the worst surprise in the flow.

### Phase 4 — the token moves server-side (gap 5)

Move `etsy_token` to a table no client role can select, reachable only through
the API routes that already hold `ETSY_API_KEY`. Do this before a second person
has an account.

### Phase 5 — content history (gap 6)

A `listing_revisions` table: listing, field, old value, when, and what produced
it (Gemini or a person). Cheap to add, and it is the only way to recover a
title that was better before the last run.

---

## What to measure before starting

Two numbers decide how phase 1 is built, and neither is known today:

- **How much is actually in IndexedDB** — `navigator.storage.estimate()` on a
  real account. It sets the bucket sizing and says whether eviction is already
  a live risk rather than a theoretical one.
- **How large a real source file is** — sources are originals, and the
  difference between 5 MB and 80 MB per listing decides whether uploads need
  resumability or a plain PUT will do.


---

## Status

**Phase 1 — done and verified against the running local stack.**
`supabase/migrations/20260904000000_asset_storage.sql` creates both private
buckets, four storage policies keyed on the uid prefix, `public.listing_assets`
with its own RLS, and `listings.studio_prefs`. `lib/asset-paths.ts` holds the
pure path logic (9 tests), `lib/asset-cloud.ts` the bucket and record calls, and
`lib/asset-store.ts` is now a cache: it writes through on save, and
`syncFromCloud` fills in whatever this browser is missing. `app/page.tsx` calls
that once after the local read and asks the browser for durable storage.

Proved end to end against `127.0.0.1:57321`, with two real accounts:

```
upload: ok
record: ok (13 bytes)
download: ok, byte for byte
another user downloading it: refused (Object not found)
another user reading the record: sees nothing
another user writing into that prefix: refused
studio_prefs column: present
```

**Phase 3 — the studio half is done.** `selectedTemplateIds` and
`frameAssignments` are written to `listings.studio_prefs` when they change and
read back when the studio opens. The staging tray still lives in React state.

**Outstanding:** the staging tray (phase 3), resume-instead-of-reset (phase 2),
the Etsy token move (phase 4), content history (phase 5).

**Operational note:** the migration has been applied to the **local** stack
only. `supabase status` reports `linked_project: null`, so when a hosted project
exists it needs the same migration before the app is deployed against it.

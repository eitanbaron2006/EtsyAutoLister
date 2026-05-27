# Draft Review Mockup Gallery Design

## Goal

Turn the completed listing Draft dialog into a readable product review screen
that prominently shows generated product mockups instead of squeezing metadata
into a narrow, overflowing card layout.

## Current Problems

- The dialog uses a narrow two-column layout that clips long titles,
  descriptions, and tag pills.
- The main generated visual is presented as a small "cover thumbnail" rather
  than the key product proof.
- The package card reports `activeProduct.images.length` as the number of
  mockups, but `images` represents source uploads from the current browser
  session, so a completed draft can incorrectly say it includes `0` mockups.
- The pipeline saves only one generated `mockupImage`, so there is no basic
  gallery for reviewing product presentation options.

## Chosen Experience

When the user compiles a listing, the existing browser canvas engine will
produce three presentation variants for the same product:

1. `Hero` - the primary existing lifestyle composition used for AI listing
   context and the dashboard thumbnail.
2. `Detail` - a closer crop or alternate layout highlighting the artwork.
3. `Store Cover` - a promotional variant suited to an Etsy image slot.

These variants are intentionally generated locally from the same uploaded
asset and product type. This remains a basic mockup preview feature; it does
not call an image-generation model or change the Vertex listing-copy request.

## Data Model

Extend `ListingMetadata` with:

```ts
mockupImages?: Array<{
  id: string;
  label: string;
  image: string;
}>;
```

Keep the existing `mockupImage?: string` field as the primary/legacy image for
dashboard table thumbnails, copy-generation context, downloads, and existing
draft records.

For old drafts that have only `mockupImage`, the dialog constructs one `Hero`
gallery item at render time. Nothing in Firestore requires a migration.

## Pipeline Flow

1. During the current `mockups` step, generate three data URLs with the
   existing canvas renderer and small variant-specific presentation changes.
2. Use the first result as `mockupImage` so existing code paths remain stable.
3. Continue sending only the primary mockup to listing copy generation, as the
   listing metadata request needs visual context rather than three duplicates.
4. Save the full array as `mockupImages` when the listing enters `ready`.

## Dialog Layout

The Draft dialog becomes a wide review workspace within the viewport:

- A wider modal shell with a constrained internal body height.
- Header with listing title/purpose and draft status, kept compact.
- Main content split on desktop into a larger visual panel and a metadata
  panel; on smaller widths it stacks cleanly.
- Visual panel:
  - Large selected mockup preview.
  - A compact row of thumbnail buttons labeled `Hero`, `Detail`, and
    `Store Cover`.
  - A package summary that uses the actual gallery count.
  - Download action for the currently selected mockup.
- Metadata panel:
  - Product type, generated title, description, price, and tags.
  - Long text receives useful vertical room instead of internal cramped cards.
  - Copy actions remain next to their relevant values.
- Footer:
  - Close action and completion/publish action remain available without
    competing with the body content.

## State And Interaction

- Add component state for the selected preview index, initialized to `0`.
- Whenever a different listing is opened, reset selection to the primary
  mockup.
- Thumbnail selection updates the large preview and the download target.
- Empty/mockup-pending states remain graceful if a draft is incomplete.

## Scope Boundaries

- Modify only the existing listing pipeline and Draft review UI required for
  this feature.
- Do not change the Vertex AI fallback behavior or the listing metadata API.
- Do not add remote image-generation services or new backend endpoints.
- Do not broadly redesign dashboard pages outside the Draft review experience.

## Verification

- Add testable pure helpers for deriving gallery items from modern and legacy
  listing records and for generating stable mockup variant metadata.
- Verify three mockup items are saved for newly compiled listings and a
  legacy single-image draft renders one usable preview.
- Run `npm test`, `npm run lint`, and `npm run build`.
- Open the local app in a browser and inspect the Draft dialog at desktop and
  narrow widths, confirming no clipped content and visible mockup selection.

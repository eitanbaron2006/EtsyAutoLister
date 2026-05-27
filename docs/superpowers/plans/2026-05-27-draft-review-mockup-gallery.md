# Draft Review Mockup Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped Draft dialog with a readable review layout and show three locally generated product mockups for newly compiled listings.

**Architecture:** Keep the existing client-side pipeline in `app/page.tsx`, because it already owns canvas mockup rendering and Firestore persistence. Add one small pure helper module for gallery item metadata and legacy fallback behavior so the new data contract can be regression-tested without rendering the entire page. Extend the current canvas generator with three presentation variants and update only the Draft dialog body to consume the gallery.

**Tech Stack:** Next.js/React, TypeScript, Tailwind utility classes, browser Canvas API, Firestore document merge writes, Node test runner via `tsx`, Codex in-app Browser for visual verification.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `lib/mockup-gallery.ts` | Define gallery item/variant types, stable three-variant metadata, and backward-compatible gallery derivation. |
| `lib/mockup-gallery.test.ts` | Cover three generated variants, empty-image filtering, and legacy single-image fallback. |
| `app/page.tsx` | Generate mockup variant images, persist `mockupImages`, track selected preview, and render the redesigned Draft dialog. |
| `docs/superpowers/specs/2026-05-27-draft-review-mockup-gallery-design.md` | Approved scope and UX reference; no additional behavior changes. |

No API route, Vertex provider, or shared Dialog component change is required.

### Task 1: Gallery Data Contract And Legacy Fallback

**Files:**
- Create: `lib/mockup-gallery.test.ts`
- Create: `lib/mockup-gallery.ts`

- [ ] **Step 1: Write failing tests for new and existing drafts**

Create `lib/mockup-gallery.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { createMockupGallery, getReviewMockups } from './mockup-gallery';

test('labels three generated review mockups in display order', () => {
  const gallery = createMockupGallery(['hero.jpg', 'detail.jpg', 'cover.jpg']);

  assert.deepEqual(gallery, [
    { id: 'hero', label: 'Hero', image: 'hero.jpg' },
    { id: 'detail', label: 'Detail', image: 'detail.jpg' },
    { id: 'store-cover', label: 'Store Cover', image: 'cover.jpg' },
  ]);
});

test('uses the legacy mockup image when a stored gallery is missing', () => {
  assert.deepEqual(getReviewMockups(undefined, 'saved-hero.jpg'), [
    { id: 'hero', label: 'Hero', image: 'saved-hero.jpg' },
  ]);
});

test('does not render blank generated image entries', () => {
  assert.deepEqual(createMockupGallery(['hero.jpg', '', 'cover.jpg']), [
    { id: 'hero', label: 'Hero', image: 'hero.jpg' },
    { id: 'store-cover', label: 'Store Cover', image: 'cover.jpg' },
  ]);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
npm test -- lib/mockup-gallery.test.ts
```

Expected: FAIL because `./mockup-gallery` does not yet exist.

- [ ] **Step 3: Implement the gallery helper module**

Create `lib/mockup-gallery.ts`:

```ts
export type MockupVariantId = 'hero' | 'detail' | 'store-cover';

export interface MockupGalleryItem {
  id: MockupVariantId;
  label: string;
  image: string;
}

export const MOCKUP_VARIANTS: Array<{ id: MockupVariantId; label: string }> = [
  { id: 'hero', label: 'Hero' },
  { id: 'detail', label: 'Detail' },
  { id: 'store-cover', label: 'Store Cover' },
];

export function createMockupGallery(images: string[]): MockupGalleryItem[] {
  return MOCKUP_VARIANTS.flatMap((variant, index) => {
    const image = images[index];
    return image ? [{ ...variant, image }] : [];
  });
}

export function getReviewMockups(
  gallery: MockupGalleryItem[] | undefined,
  legacyImage: string | undefined,
): MockupGalleryItem[] {
  const saved = (gallery || []).filter((item) => Boolean(item.image));
  if (saved.length > 0) return saved;
  return legacyImage ? [{ id: 'hero', label: 'Hero', image: legacyImage }] : [];
}
```

- [ ] **Step 4: Run the tests to verify GREEN**

Run:

```powershell
npm test -- lib/mockup-gallery.test.ts
```

Expected: PASS for all three helper tests.

- [ ] **Step 5: Commit the data-contract helper**

Run:

```powershell
git add lib/mockup-gallery.ts lib/mockup-gallery.test.ts
git commit -m "feat: add draft mockup gallery model"
```

### Task 2: Generate And Store Three Local Mockups

**Files:**
- Modify: `app/page.tsx`
- Test: `lib/mockup-gallery.test.ts`

- [ ] **Step 1: Extend the listing data model and import the gallery utilities**

At the imports in `app/page.tsx`, add:

```ts
import {
  MOCKUP_VARIANTS,
  createMockupGallery,
  getReviewMockups,
  type MockupGalleryItem,
  type MockupVariantId,
} from '@/lib/mockup-gallery';
```

Extend `ListingMetadata`:

```ts
mockupImage?: string;
mockupImages?: MockupGalleryItem[];
```

- [ ] **Step 2: Generate gallery variants during the existing mockup step**

Replace the one-image generation in `runAutomatedAIPipeline` with:

```ts
const activeImg = sessionFiles.images[0];
const mockupUrls = await Promise.all(
  MOCKUP_VARIANTS.map(({ id }) =>
    generateSimulatedMockup(folderName, productType, activeImg, id)
  )
);
const mockupImages = createMockupGallery(mockupUrls);
const dataUrl = mockupImages[0]?.image || '';
```

Include the new gallery in the existing `ready` Firestore update:

```ts
mockupImage: dataUrl,
mockupImages,
```

Keep `base64ImagesPayload = [dataUrl]` unchanged so AI copy generation receives
only the primary visual context.

- [ ] **Step 3: Add simple presentation variants to the canvas renderer**

Update the renderer signature:

```ts
const generateSimulatedMockup = (
  title: string,
  productType: string,
  uploadedImageFile?: File,
  variant: MockupVariantId = 'hero'
): Promise<string> => {
```

Before each successful `resolve(canvas.toDataURL('image/jpeg'))`, apply a
small variant overlay function:

```ts
const finishMockup = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  title: string,
  variant: MockupVariantId
) => {
  if (variant === 'detail') {
    ctx.fillStyle = 'rgba(247, 241, 222, 0.94)';
    ctx.fillRect(22, 22, 110, 30);
    ctx.fillStyle = '#15140f';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('DETAIL VIEW', 36, 42);
  }

  if (variant === 'store-cover') {
    ctx.fillStyle = 'rgba(21, 20, 15, 0.78)';
    ctx.fillRect(0, 510, 800, 90);
    ctx.fillStyle = '#f7f1de';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText(title.toUpperCase().slice(0, 38), 36, 548);
    ctx.font = 'bold 12px monospace';
    ctx.fillText('DIGITAL DOWNLOAD / INSTANT ACCESS', 36, 574);
  }
};
```

Use:

```ts
finishMockup(ctx, canvas, title, variant);
resolve(canvas.toDataURL('image/jpeg'));
```

for all branches, including asynchronous image load success/fallback paths.
The existing scene remains the `hero` variant; the other two are basic listing
review variations rather than remote AI-generated scenes.

- [ ] **Step 4: Verify tests and compilation**

Run:

```powershell
npm test -- lib/mockup-gallery.test.ts app/api/gemini/generate-listing/ai-config.test.ts app/api/gemini/generate-listing/route.test.ts
npm run build
```

Expected: helper/API tests pass and TypeScript/Next build completes.

- [ ] **Step 5: Commit persisted gallery generation**

Run:

```powershell
git add app/page.tsx
git commit -m "feat: generate multiple listing mockups"
```

### Task 3: Redesign The Draft Review Dialog

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Track active preview selection and reset it per listing**

Add state next to `isDialogOpen`:

```ts
const [selectedMockupIndex, setSelectedMockupIndex] = useState(0);
```

In both `openPreviewPanel` and `handlePreviewProject`, reset selection before
opening:

```ts
setSelectedMockupIndex(0);
setIsDialogOpen(true);
```

Before rendering the dialog body, derive:

```ts
const reviewMockups = activeProduct
  ? getReviewMockups(activeProduct.mockupImages, activeProduct.mockupImage)
  : [];
const selectedMockup = reviewMockups[selectedMockupIndex] || reviewMockups[0];
```

- [ ] **Step 2: Replace the cramped shell with a wide modal workspace**

Set the Dialog content container to:

```tsx
<DialogContent className="w-[min(1180px,calc(100vw-2rem))] sm:max-w-[1180px] max-h-[92vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] text-[#15140f] font-sans">
```

Use a padded header, a scrollable body, and a persistent footer:

```tsx
<DialogHeader className="px-6 sm:px-8 pt-6 pb-5 border-b border-[rgba(21,20,15,0.12)]">
...
</DialogHeader>
<div className="overflow-y-auto px-6 sm:px-8 py-6">
  <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-7">
    ...
  </div>
</div>
<div className="px-6 sm:px-8 py-4 border-t border-[rgba(21,20,15,0.12)] flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
...
</div>
```

- [ ] **Step 3: Render the mockup gallery and accurate package count**

In the visual panel, use `selectedMockup?.image` for the large preview, render
thumbnail buttons from `reviewMockups`, and replace the incorrect count:

```tsx
<p className="text-xs text-[#5a5448] mt-1 leading-relaxed">
  Includes {reviewMockups.length} generated mockup{reviewMockups.length === 1 ? '' : 's'} plus deliverable files.
</p>
```

Download the selected preview:

```ts
if (selectedMockup) {
  link.href = selectedMockup.image;
  link.download = `${activeProduct.folderName.toLowerCase()}_${selectedMockup.id}.jpg`;
}
```

Thumbnail buttons must include an active border/state:

```tsx
{reviewMockups.map((mockup, index) => (
  <button key={mockup.id} onClick={() => setSelectedMockupIndex(index)}>
    <img src={mockup.image} alt={`${mockup.label} mockup`} />
    <span>{mockup.label}</span>
  </button>
))}
```

- [ ] **Step 4: Give listing metadata readable room**

Keep current copy operations, but replace the cramped pricing/tag cards and
small text areas with:

```tsx
<textarea rows={8} className="... min-h-44 ..." />
<div className="flex flex-wrap gap-2">
  {(activeProduct.tags || []).map((tag) => (
    <span className="text-[11px] ...">{tag}</span>
  ))}
</div>
```

Use full-width sections for description and tags and place price in a compact
header row; do not create internally scrolling keyword tiles.

- [ ] **Step 5: Run code verification**

Run:

```powershell
npm test -- lib/mockup-gallery.test.ts app/api/gemini/generate-listing/ai-config.test.ts app/api/gemini/generate-listing/route.test.ts
npm run lint
npm run build
```

Expected: tests/build pass. Existing `@next/next/no-img-element` warnings may
remain because the app already renders data-URL and remote preview images with
plain `<img>` elements.

- [ ] **Step 6: Commit the dialog redesign**

Run:

```powershell
git add app/page.tsx
git commit -m "feat: redesign draft review gallery"
```

### Task 4: Browser Verification

**Files:**
- No production file changes expected unless visual inspection reveals a concrete defect.

- [ ] **Step 1: Start the local app**

Run:

```powershell
npm run dev
```

Expected: local Next.js development server starts successfully.

- [ ] **Step 2: Open the known local route in the Codex in-app Browser**

Open `http://localhost:3000`, sign in or use the existing local app flow as
available, create/compile a draft, and open the Draft review dialog.

Verify:

- The dialog is wider than the prior narrow card and fits within the viewport.
- Three labeled mockup thumbnails appear for a newly compiled listing.
- Clicking thumbnails changes the large preview.
- The package summary displays the visible gallery count.
- Title, description, price, and tags are readable without narrow clipped
  tiles.
- At a narrow browser width, content stacks and remains reachable by scrolling.

- [ ] **Step 3: Capture final verification evidence**

Run:

```powershell
git status --short --branch
git diff --name-only origin/main...HEAD
```

Expected: implementation touches `app/page.tsx`, `lib/mockup-gallery.ts`,
tests, and design/plan documents only; Vertex API route files are unchanged by
this feature.

# Draft Review Uploaded Image Gallery Implementation Plan

**Goal:** Fix the Draft dialog layout and show uploaded product images only.
Do not generate mockup variants inside this app.

## Tasks

- [x] Replace the mockup-gallery helper with `lib/uploaded-previews.ts`.
- [x] Add tests proving uploaded file names and URLs become preview items
  without invented variants.
- [x] Stop the client pipeline from calling the local canvas mockup renderer.
- [x] Send uploaded image data URLs directly to the listing AI request.
- [x] Render the Draft dialog as a vertical flex column, not a horizontal row.
- [x] Show the selected uploaded image, thumbnails, and clear empty state.
- [x] Run automated tests, lint, and production build.
- [x] Verify the Draft dialog visually in the browser.

# Draft Review Uploaded Image Gallery Design

## Goal

Make the Draft review dialog readable and show the product images the user
actually uploaded. The app must not create local mockup variants in this step.
Later, this same gallery area can be wired to the existing external mockup
system.

## Current Problems

- The dialog can lay out horizontally and clip content if its shell is treated
  as a row-based flex container.
- The previous draft design introduced generated `Hero`, `Detail`, and
  `Store Cover` variants, but the requested behavior is to display source
  uploads only.
- The listing pipeline used a local canvas renderer as a mockup generator. That
  conflicts with the planned external mockup service.

## Chosen Experience

- When a Draft is opened, the dialog builds a gallery from the image files held
  in the current browser session for that listing.
- The main preview displays the selected uploaded image with `object-contain`
  so the original asset is visible rather than cropped into a fake mockup.
- Thumbnail buttons use the uploaded file names as labels.
- If no uploaded image is available in the current browser session, the dialog
  shows a clear empty state instead of inventing a preview.

## Pipeline Flow

- The AI listing request receives base64 data from the user's uploaded image
  files.
- The client no longer calls the local canvas mockup renderer.
- Firestore no longer saves new `mockupImages` gallery records from local
  generation. Existing legacy `mockupImage` fields may still exist on old
  records, but the Draft dialog uses current uploaded files.

## Dialog Layout

- The `DialogContent` shell is a vertical flex column with `flex-col`, avoiding
  the horizontal split shown in the broken screenshot.
- Header, body, and footer stay in vertical order.
- The body uses a desktop two-column grid:
  - Left: large uploaded image preview, thumbnails, and package actions.
  - Right: product type, title, description, price, and tags.
- On smaller screens, the columns stack and scroll inside the dialog.

## Verification

- Test the pure helper that converts uploaded files and object URLs into
  preview items.
- Run `npm test`, `npm run lint`, and `npm run build`.
- Open the app in a browser and confirm the Draft dialog no longer splits
  horizontally and shows uploaded images when browser-session files exist.

// What happens to a listing's print files, given what the shop has connected.
//
// Four combinations, and they are not variations on one flow — they differ in
// where the files go, who makes the PDF, and whether the shop has to finish
// the job by hand. Deciding that inline at the publish button is how a case
// gets missed, so it is decided here, once, and tested.
//
// Pure: no network, no Drive, no PDF. The callers act on the plan.

export interface DeliveryContext {
  /** An Etsy shop is connected and can be published to. */
  hasShop: boolean;
  /** A Drive grant exists, so files can be uploaded. */
  hasDrive: boolean;
  /**
   * A link the shop pasted itself. Stands in for Drive as somewhere the buyer
   * can download from, but the app cannot put anything there.
   */
  manualLink?: string | null;
  /** Whether the files exceed what Etsy will carry. */
  oversize: boolean;
  /**
   * The shop asked for every listing to go to Drive, not only the ones Etsy
   * will not carry. Some shops want the cloud copy as their own backup.
   */
  alwaysUseDrive?: boolean;
}

export interface DeliveryPlan {
  /** Nothing to do: the files fit and the shop has not asked for more. */
  kind: 'none' | 'drive' | 'manual';
  /**
   * Put every print size in the Drive folder, one file per ratio.
   *
   * Alongside the archive rather than instead of it: a buyer who wants the
   * one size their frame takes should not have to download a hundred
   * megabytes and unpack it to get at a single file.
   */
  uploadSizesToDrive: boolean;
  /** Put the combined archive there too, for taking the lot in one go. */
  uploadZipToDrive: boolean;
  /** Offer the archive as a download, because nothing will upload it. */
  offerZipDownload: boolean;
  /** Build the buyer's sheet. */
  makePdf: boolean;
  /** Attach the sheet to the Etsy listing from here. */
  attachPdfToEtsy: boolean;
  /** Put the sheet in the draft's files, for the shop to upload by hand. */
  offerPdfDownload: boolean;
  /** Let the shop edit the sheet before it is used. */
  allowPdfEditing: boolean;
  /** Where the PDF's link points, when it is known ahead of time. */
  linkSource: 'drive' | 'manual' | 'none';
  /** One line for the UI, so the shop is told rather than left to infer. */
  summary: string;
}

/**
 * Whether these files need delivering at all.
 *
 * Oversize always does — Etsy will not carry them. A shop that asked for every
 * listing to reach its Drive gets that too, which is a backup rather than a
 * necessity, so it never blocks anything.
 */
export function needsDelivery(ctx: DeliveryContext): boolean {
  return ctx.oversize || !!(ctx.alwaysUseDrive && ctx.hasDrive);
}

export function planDelivery(ctx: DeliveryContext): DeliveryPlan {
  const manual = !!(ctx.manualLink && ctx.manualLink.trim());

  if (!needsDelivery(ctx)) {
    return {
      kind: 'none',
      uploadSizesToDrive: false, uploadZipToDrive: false, offerZipDownload: false,
      makePdf: false, attachPdfToEtsy: false, offerPdfDownload: false,
      allowPdfEditing: false, linkSource: 'none',
      summary: 'These files fit on Etsy and go up with the listing.',
    };
  }

  if (ctx.hasDrive) {
    // The app can put the files somewhere and knows the link, so it can build
    // a finished sheet. Whether it can also post it depends on the shop.
    return {
      kind: 'drive',
      uploadSizesToDrive: true,
      uploadZipToDrive: true,
      offerZipDownload: false,
      makePdf: true,
      // Only when the listing's own files cannot go up. Etsy counts the sheet
      // against the same five-file allowance, so attaching one to a listing
      // that already carries its files is how a publish that would have
      // worked starts being refused — and the buyer gets a link to files
      // they were handed anyway.
      attachPdfToEtsy: ctx.hasShop && ctx.oversize,
      // No shop to post to: the sheet is still made, and handed over for the
      // shop to upload itself.
      offerPdfDownload: !ctx.hasShop && ctx.oversize,
      allowPdfEditing: !ctx.hasShop,
      linkSource: 'drive',
      summary: !ctx.oversize
        ? 'These files fit on Etsy and go up with the listing. A copy also goes to your Drive.'
        : ctx.hasShop
          ? 'Every size and a combined archive go to your Drive, and the listing carries a PDF linking to them.'
          : 'Every size and a combined archive go to your Drive. Download the PDF and upload it to your shop yourself.',
    };
  }

  // No Drive: nothing can be uploaded anywhere, so the archive is a download
  // and the sheet is the shop's to finish. A pasted link is what the sheet
  // points at; without one there is nothing to point at yet.
  return {
    kind: 'manual',
    // Nowhere to upload to, so nothing is uploaded. The archive is the one
    // thing worth handing over by hand: fifteen separate downloads is not a
    // workflow anyone wants to repeat per listing.
    uploadSizesToDrive: false,
    uploadZipToDrive: false,
    offerZipDownload: true,
    makePdf: true,
    attachPdfToEtsy: false,
    offerPdfDownload: true,
    allowPdfEditing: true,
    linkSource: manual ? 'manual' : 'none',
    summary: manual
      ? 'Download the archive, put it where your link points, and upload the PDF to your shop.'
      : 'Download the archive and host it yourself. Add your download link so the PDF can point at it.',
  };
}

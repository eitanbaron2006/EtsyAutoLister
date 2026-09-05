// Drawing the buyer's download sheet.
//
// One page, and it has one job: get the buyer to their files. Everything else
// on it exists to make that page look like it came from the shop rather than
// from a tool the shop happens to use.
//
// pdf-lib rather than a headless browser: this runs on every oversize publish,
// and a Chromium per PDF is a heavy price for one page of text.

import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFImage } from 'pdf-lib';

import {
  resolvePdfDesign,
  type PdfPresetChoice,
  type ShopBranding,
} from '@/lib/pdf-presets';

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;

export interface DeliverySheetInput {
  branding?: ShopBranding;
  choice?: PdfPresetChoice;
  /** What the buyer bought. */
  listingTitle: string;
  /** Where the files are. */
  downloadUrl: string;
  fileCount?: number;
  /** Fetched by the caller — this module does no network of its own. */
  logo?: { bytes: Uint8Array; type: 'png' | 'jpg' } | null;
}

/** Greedy wrap. Returns the lines, so the caller can lay them out. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildDeliverySheet(input: DeliverySheetInput): Promise<Uint8Array> {
  const design = resolvePdfDesign(input.choice, input.branding);
  const { preset } = design;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${design.shopName} — your download`);
  pdf.setProducer('Etsy AutoLister');

  const page = pdf.addPage([A4.width, A4.height]);
  const serif = await pdf.embedFont(preset.titleFont === 'serif' ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const serifBold = await pdf.embedFont(preset.titleFont === 'serif' ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const accent = rgb(design.accent.r, design.accent.g, design.accent.b);
  const ink = rgb(design.ink.r, design.ink.g, design.ink.b);
  const paper = rgb(design.paper.r, design.paper.g, design.paper.b);
  const muted = rgb(
    design.ink.r + (1 - design.ink.r) * 0.45,
    design.ink.g + (1 - design.ink.g) * 0.45,
    design.ink.b + (1 - design.ink.b) * 0.45,
  );

  page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: paper });

  const contentWidth = A4.width - MARGIN * 2;
  const centred = preset.align === 'center';
  const xFor = (width: number) => (centred ? (A4.width - width) / 2 : MARGIN);

  let y = A4.height;

  // Header band — the strongest signal that this is one shop's sheet.
  if (preset.headerBand) {
    const bandHeight = 140;
    page.drawRectangle({ x: 0, y: A4.height - bandHeight, width: A4.width, height: bandHeight, color: accent });
    y = A4.height - bandHeight - 40;
  } else {
    y = A4.height - MARGIN;
  }

  // On a band, the shop name sits inside it, reversed out.
  const onBand = preset.headerBand;
  const nameSize = 20;
  const nameWidth = serifBold.widthOfTextAtSize(design.shopName, nameSize);

  let logo: PDFImage | null = null;
  if (design.showLogo && input.logo) {
    try {
      logo = input.logo.type === 'png'
        ? await pdf.embedPng(input.logo.bytes)
        : await pdf.embedJpg(input.logo.bytes);
    } catch {
      // A logo that will not embed is not worth failing a delivery over.
      logo = null;
    }
  }

  if (onBand) {
    const bandTop = A4.height - 140;
    if (logo) {
      const size = 44;
      page.drawImage(logo, { x: centred ? (A4.width - size) / 2 : MARGIN, y: bandTop + 74, width: size, height: size });
      page.drawText(design.shopName, {
        x: xFor(nameWidth), y: bandTop + 40, size: nameSize, font: serifBold, color: paper,
      });
    } else {
      page.drawText(design.shopName, {
        x: xFor(nameWidth), y: bandTop + 58, size: nameSize, font: serifBold, color: paper,
      });
    }
  } else {
    if (logo) {
      const size = 52;
      page.drawImage(logo, { x: centred ? (A4.width - size) / 2 : MARGIN, y: y - size, width: size, height: size });
      y -= size + 18;
    }
    const w = serifBold.widthOfTextAtSize(design.shopName, nameSize);
    page.drawText(design.shopName, { x: xFor(w), y: y - nameSize, size: nameSize, font: serifBold, color: accent });
    y -= nameSize + 26;
  }

  // Headline
  const headlineSize = 26;
  for (const line of wrap(design.headline, serifBold, headlineSize, contentWidth)) {
    const w = serifBold.widthOfTextAtSize(line, headlineSize);
    page.drawText(line, { x: xFor(w), y: y - headlineSize, size: headlineSize, font: serifBold, color: ink });
    y -= headlineSize + 8;
  }
  y -= 14;

  // What they bought
  const titleSize = 12;
  for (const line of wrap(input.listingTitle, sansBold, titleSize, contentWidth)) {
    const w = sansBold.widthOfTextAtSize(line, titleSize);
    page.drawText(line, { x: xFor(w), y: y - titleSize, size: titleSize, font: sansBold, color: muted });
    y -= titleSize + 5;
  }
  y -= 18;

  // The message
  const bodySize = 11.5;
  for (const line of wrap(design.message, sans, bodySize, contentWidth)) {
    const w = sans.widthOfTextAtSize(line, bodySize);
    page.drawText(line, { x: xFor(w), y: y - bodySize, size: bodySize, font: sans, color: ink });
    y -= bodySize + 7;
  }
  y -= 30;

  // The link. The point of the page, so it is given the most weight.
  //
  // Sized to what it holds: a fixed height left a band of empty box under a
  // one-line URL, which reads as something failing to load rather than as
  // deliberate space.
  const linkSize = 10;
  const linkLines = wrap(input.downloadUrl, sans, linkSize, contentWidth - 36).slice(0, 3);
  const boxHeight = 26 + 14 + linkLines.length * (linkSize + 3) + 16;
  page.drawRectangle({
    x: MARGIN, y: y - boxHeight, width: contentWidth, height: boxHeight,
    color: paper, borderColor: accent, borderWidth: 1.5,
  });

  const label = input.fileCount
    ? `YOUR FILES — ${input.fileCount} ITEM${input.fileCount === 1 ? '' : 'S'}`
    : 'YOUR FILES';
  const labelWidth = sansBold.widthOfTextAtSize(label, 9);
  page.drawText(label, {
    x: centred ? (A4.width - labelWidth) / 2 : MARGIN + 18,
    y: y - 26, size: 9, font: sansBold, color: accent,
  });

  // Long links wrap rather than run off the page — a truncated link is useless.
  let linkY = y - 46;
  for (const line of linkLines) {
    const w = sans.widthOfTextAtSize(line, linkSize);
    page.drawText(line, {
      x: centred ? (A4.width - w) / 2 : MARGIN + 18,
      y: linkY, size: linkSize, font: sans, color: ink,
    });
    linkY -= linkSize + 3;
  }

  // Clickable over the whole box, so a tap works as well as a copy-paste.
  //
  // The URI has to be a PDFString: handed a plain JS string, pdf.context.obj
  // writes it as a Name, and the annotation renders as a link that goes
  // nowhere — which is worse than no link at all, because it looks like one.
  const linkAnnot = pdf.context.register(
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [MARGIN, y - boxHeight, MARGIN + contentWidth, y],
      Border: [0, 0, 0],
      A: pdf.context.obj({
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(input.downloadUrl),
      }),
    }),
  );
  page.node.set(PDFName.of('Annots'), pdf.context.obj([linkAnnot]));

  y -= boxHeight + 26;

  const note = 'Keep this file. The link stays live, so you can download again whenever you need to.';
  const noteSize = 9.5;
  for (const line of wrap(note, sans, noteSize, contentWidth)) {
    const w = sans.widthOfTextAtSize(line, noteSize);
    page.drawText(line, { x: xFor(w), y: y - noteSize, size: noteSize, font: sans, color: muted });
    y -= noteSize + 5;
  }

  const footer = design.shopName;
  const footerWidth = sans.widthOfTextAtSize(footer, 9);
  page.drawText(footer, {
    x: (A4.width - footerWidth) / 2, y: MARGIN - 20, size: 9, font: sans, color: muted,
  });

  return pdf.save();
}

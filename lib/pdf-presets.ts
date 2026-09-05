// How the buyer's download sheet looks.
//
// This PDF is the product on an oversize listing — the only file Etsy carries,
// and the last thing the buyer sees with the shop's name on it. A generic
// receipt would read as a mistake, so the design is the shop's: its name, its
// logo, and a colour it chose. The presets differ in arrangement and weight,
// not in what they say.
//
// Pure data and pure functions. The drawing lives in lib/delivery-pdf.ts, so
// a preset can be added, previewed or tested without a PDF in sight.

export interface ShopBranding {
  shopId?: number | string;
  shopName?: string;
  /** The shop's Etsy icon. Drawn as the logo when the preset asks for one. */
  iconUrl?: string;
  title?: string;
  announcement?: string;
  accentColor?: string;
  fetchedAt?: string;
}

export interface PdfPresetChoice {
  preset?: string;
  accentColor?: string;
  headline?: string;
  message?: string;
  showLogo?: boolean;
}

export interface PdfPreset {
  id: string;
  name: string;
  /** One line, for the picker. */
  description: string;
  /** Fallback accent when neither the shop nor the shop's choice gives one. */
  accent: string;
  ink: string;
  paper: string;
  /** Serif reads as a print shop; sans reads as a modern one. */
  titleFont: 'serif' | 'sans';
  /** A band of accent behind the header. */
  headerBand: boolean;
  logo: boolean;
  /** Centred is calmer; left is more business-like. */
  align: 'center' | 'left';
}

export const PDF_PRESETS: PdfPreset[] = [
  {
    id: 'studio',
    name: 'Studio',
    description: 'Serif, centred, a band of your shop colour. The default.',
    accent: '#ed6f5c', ink: '#15140f', paper: '#f7f1de',
    titleFont: 'serif', headerBand: true, logo: true, align: 'center',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'No band, no logo. Type and the link, nothing else.',
    accent: '#15140f', ink: '#15140f', paper: '#ffffff',
    titleFont: 'sans', headerBand: false, logo: false, align: 'left',
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Wide serif on warm paper, logo above the title.',
    accent: '#8C6D4F', ink: '#2b2620', paper: '#faf6ee',
    titleFont: 'serif', headerBand: false, logo: true, align: 'center',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Full-width colour header, white type, sans throughout.',
    accent: '#2f6f6b', ink: '#15140f', paper: '#ffffff',
    titleFont: 'sans', headerBand: true, logo: true, align: 'left',
  },
];

export const DEFAULT_PRESET_ID = 'studio';

export const presetById = (id?: string): PdfPreset =>
  PDF_PRESETS.find(p => p.id === id) ?? PDF_PRESETS.find(p => p.id === DEFAULT_PRESET_ID)!;

/** `#rgb` and `#rrggbb`, with or without the hash. Anything else is refused. */
export function parseHexColor(value?: string): { r: number; g: number; b: number } | null {
  if (!value) return null;
  const hex = value.trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

/**
 * The design one shop's sheet is actually drawn with.
 *
 * Three sources, narrowest first: what the shop set by hand, then what its
 * Etsy profile says, then the preset's own defaults. So a shop that changes
 * nothing still gets something of its own, and a shop that sets one field
 * keeps the rest.
 */
export function resolvePdfDesign(
  choice: PdfPresetChoice | undefined,
  branding: ShopBranding | undefined,
) {
  const preset = presetById(choice?.preset);
  const accent =
    parseHexColor(choice?.accentColor) ??
    parseHexColor(branding?.accentColor) ??
    parseHexColor(preset.accent)!;

  const shopName = branding?.shopName?.trim() || 'Your download';

  return {
    preset,
    accent,
    ink: parseHexColor(preset.ink)!,
    paper: parseHexColor(preset.paper)!,
    shopName,
    headline: choice?.headline?.trim() || 'Thank you for your order',
    message:
      choice?.message?.trim() ||
      `Your files are ready. Everything you bought from ${shopName} is in the folder below — every print size, at full resolution.`,
    // A logo can only be drawn if the preset wants one and the shop has one.
    showLogo: (choice?.showLogo ?? preset.logo) && !!branding?.iconUrl,
    logoUrl: branding?.iconUrl,
  };
}

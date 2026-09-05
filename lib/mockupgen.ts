// Client for the local MockupGen rendering server.
// All endpoints are public JSON/multipart HTTP — no auth, no CSRF, no cookies.
// Errors come back as: {"success": false, "error": "<human readable message>"}.

export const DEFAULT_MOCKUPGEN_BASE_URL =
  process.env.NEXT_PUBLIC_MOCKUPGEN_URL || 'http://127.0.0.1:5000';

const BASE_URL_STORAGE_KEY = 'mockupgen-base-url';

export function getMockupGenBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(BASE_URL_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
  }
  return DEFAULT_MOCKUPGEN_BASE_URL.replace(/\/+$/, '');
}

export function setMockupGenBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed) {
    localStorage.setItem(BASE_URL_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(BASE_URL_STORAGE_KEY);
  }
}

// Rendered images and template previews are returned as relative URLs
// (e.g. /outputs/mockup_x.png) — prefix with the base URL to fetch/display.
export function resolveMockupUrl(relativeUrl: string): string {
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  return `${getMockupGenBaseUrl()}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}

export type MockupOrientation = 'portrait' | 'landscape' | 'square';
export type MockupFitMode = 'auto' | 'cover' | 'contain' | 'stretch';
export type MockupOutputFormat = 'png' | 'webp' | 'jpeg';

export interface MockupCategory {
  id: number;
  name: string;
  slug: string;
  template_count: number;
}

export interface MockupTemplateSummary {
  template_id: string;
  name: string;
  preview_url: string;
  supported_modes: string[];
  orientation: MockupOrientation;
  product_type: string;
  frame_count: number; // artwork slots: 1 = classic, >1 = multi-frame set scene
}

export interface MockupTemplateFrame {
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: number;
  orientation: MockupOrientation;
}

export interface MockupTemplateDetails {
  template_id: string;
  name: string;
  product_type: string;
  orientation: MockupOrientation;
  canvas_width: number;
  canvas_height: number;
  fit_mode: string;
  preview_url: string;
  frames: MockupTemplateFrame[];
}

export interface MockupOutputOptions {
  format?: MockupOutputFormat;
  quality?: number; // 1-100, applies to webp/jpeg
}

// "fieldName" or {file: "fieldName", frame: n} to pin to a numbered frame.
export type MockupArtworkRef = string | { file: string; frame: number };

export interface MockupSelectionHints {
  product_type?: string; // hard filter — use category slugs
  orientation?: MockupOrientation;
  keywords?: string[];
  mockup_kind?: string;
}

export interface MockupBatchItemSpec {
  id: string;
  artworks: MockupArtworkRef | MockupArtworkRef[];
  template_id?: string;
  selection?: MockupSelectionHints;
  fit_mode?: MockupFitMode;
  realism?: boolean;
  output?: MockupOutputOptions;
}

export interface MockupBatchDefaults {
  fit_mode?: MockupFitMode;
  realism?: boolean;
  output?: MockupOutputOptions;
}

export interface MockupBatchSpec {
  defaults?: MockupBatchDefaults;
  items: MockupBatchItemSpec[]; // 1-20 items per request
}

export interface MockupBatchItemResult {
  id: string;
  success: boolean;
  template_id?: string;
  output_url?: string;
  width?: number;
  height?: number;
  artworks?: string[];
  frame_assignment?: string[]; // frame_assignment[i] = file field rendered into frame i+1
  selection?: { mode: string; criteria?: Record<string, unknown> };
  error?: string;
}

export interface MockupBatchResponse {
  success: boolean;
  items: MockupBatchItemResult[];
}

export interface MockupSingleRenderResult {
  success: boolean;
  mode: string;
  template_id: string;
  output_url: string;
  width: number;
  height: number;
}

// Large batches with realism on can take a while — allow well over 120s.
const RENDER_TIMEOUT_MS = 180_000;
// A full pack of print files is tens of megapixels each, several times over.
const PRINT_TIMEOUT_MS = 600_000;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getMockupGenBaseUrl()}${path}`, init);
  let payload: any;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`MockupGen server returned an invalid response (HTTP ${res.status})`);
  }
  if (!res.ok && payload?.error) throw new Error(payload.error);
  if (!res.ok) throw new Error(`MockupGen request failed (HTTP ${res.status})`);
  return payload as T;
}

export async function checkMockupGenHealth(): Promise<boolean> {
  try {
    const payload = await fetchJson<{ status: string; service: string }>('/api/health');
    return payload.status === 'ok';
  } catch {
    return false;
  }
}

export async function listMockupCategories(): Promise<MockupCategory[]> {
  return fetchJson<MockupCategory[]>('/api/mockups/categories');
}

export async function listMockupTemplates(productType?: string): Promise<MockupTemplateSummary[]> {
  const query = productType ? `?product_type=${encodeURIComponent(productType)}` : '';
  return fetchJson<MockupTemplateSummary[]>(`/api/mockups/templates${query}`);
}

export async function getMockupTemplate(templateId: string): Promise<MockupTemplateDetails> {
  return fetchJson<MockupTemplateDetails>(`/api/mockups/templates/${encodeURIComponent(templateId)}`);
}

// Batch render (preferred). One item = one output mockup.
// HTTP 200 — all items succeeded; 207 — at least one failed (inspect each
// item individually, never treat as total failure); 400 — malformed spec.
export async function renderMockupBatch(
  spec: MockupBatchSpec,
  fileMap: Record<string, File | Blob>,
): Promise<MockupBatchResponse> {
  const form = new FormData();
  form.append('spec', JSON.stringify(spec));
  for (const [field, file] of Object.entries(fileMap)) form.append(field, file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
  try {
    const res = await fetch(`${getMockupGenBaseUrl()}/api/mockups/render/batch`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const payload = await res.json();
    if (res.status === 400) throw new Error(payload.error || 'Malformed mockup render spec');
    return payload as MockupBatchResponse;
  } finally {
    clearTimeout(timer);
  }
}

// Single render — one artwork, one mockup. Provide templateId, or
// productType for auto-selection by ratio, or neither for full auto.
export async function renderMockupSingle(
  artwork: File | Blob,
  options: {
    templateId?: string;
    productType?: string;
    fitMode?: MockupFitMode;
    realism?: boolean;
    outputFormat?: MockupOutputFormat;
    quality?: number;
  } = {},
): Promise<MockupSingleRenderResult> {
  const form = new FormData();
  form.append('mode', 'simple');
  form.append('artwork', artwork);
  if (options.templateId) form.append('template_id', options.templateId);
  if (options.productType) form.append('product_type', options.productType);
  if (options.fitMode) form.append('fit_mode', options.fitMode);
  if (options.realism !== undefined) form.append('realism', options.realism ? 'true' : 'false');
  if (options.outputFormat) form.append('output_format', options.outputFormat);
  if (options.quality !== undefined) form.append('quality', String(options.quality));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
  try {
    const res = await fetch(`${getMockupGenBaseUrl()}/api/mockups/render`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.error || 'Mockup render failed');
    return payload as MockupSingleRenderResult;
  } finally {
    clearTimeout(timer);
  }
}

// Download a rendered output promptly — the outputs folder is not
// guaranteed to persist forever.
export async function downloadMockupOutput(outputUrl: string): Promise<Blob> {
  const res = await fetch(resolveMockupUrl(outputUrl));
  if (!res.ok) throw new Error(`Failed to download rendered mockup (HTTP ${res.status})`);
  return res.blob();
}

const ACCEPTED_ARTWORK_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

// The server accepts png/jpg/jpeg/webp artworks only.
export function isMockupGenSupportedImage(file: File): boolean {
  return ACCEPTED_ARTWORK_TYPES.includes(file.type.toLowerCase());
}

/* ------------------------------------------------------------ print files

   The other half of what a listing ships. Mockups are what the shop shows;
   these are what the buyer downloads -- the artwork at print resolution, in
   every ratio the print system says suits its proportions.

   The server does the packing: a digital listing on Etsy takes five files of
   twenty megabytes, so it answers with plain images when they fit in five and
   with size-aware archives when they do not. Nothing here has to know the
   rule, only which shape came back. */

/**
 * How a listing's print files can be handed over.
 *
 * - `files`    the exports fit the marketplace allowance and go up as they are
 * - `archives` more files than slots, but the total fits: packed by size
 * - `oversize` past what the marketplace accepts at all. One archive of
 *              everything, which CANNOT be uploaded -- it is meant to be
 *              delivered as a link (a Drive folder named in a PDF). The
 *              client used to know only the first two, so this arrived
 *              labelled "packed into archives" and was queued for an upload
 *              that could not succeed.
 */
export type PrintDeliveryMode = 'files' | 'archives' | 'oversize';

export interface PrintDeliverable {
  index: number;
  kind: 'print' | 'guide' | 'archive';
  /** What the buyer should see it called. */
  name: string;
  /** What it is called on the render server. */
  file: string;
  url: string;
  bytes: number;
  ratio?: string | null;
  ratios?: string[];
}

/**
 * Whether a deliverable has a picture the render server can preview.
 *
 * A listing whose files overflow Etsy's five-file allowance comes back packed
 * -- one archive instead of eighteen images -- and an archive has no preview.
 * Asking for one yields a broken image icon, which is what the art-sizes
 * column used to show for every set.
 */
export function isPrintPreviewable(fileName: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(fileName);
}

export interface PrintDeliverablesResponse {
  success: boolean;
  error?: string;
  export_id?: number | null;
  delivery: PrintDeliveryMode;
  guide_dropped: boolean;
  mode?: string;
  quality?: string;
  limits: { max_files: number; max_bytes: number };
  slots_used: number;
  deliverables: PrintDeliverable[];
  /** Present on `oversize`: the server's own account of why, in plain words. */
  note?: string;
  total_bytes?: number;
  allowance_bytes?: number;
  /** Ratios that exceed a single slot on their own, if any. */
  oversized?: string[];
}

/** Print files for one artwork, ready to upload as they are. */
export async function requestPrintDeliverables(
  artwork: File | Blob,
  options: { setId?: number; ratios?: string; quality?: string; mode?: string; reference?: string } = {},
): Promise<PrintDeliverablesResponse> {
  const spec: Record<string, unknown> = {};
  if (options.setId) spec.set = options.setId;
  if (options.ratios) spec.ratios = options.ratios;
  if (options.quality) spec.quality = options.quality;
  if (options.mode) spec.mode = options.mode;
  if (options.reference) spec.reference = options.reference;

  const form = new FormData();
  form.append('artwork', artwork, artwork instanceof File ? artwork.name : 'artwork.png');
  form.append('spec', JSON.stringify(spec));

  const controller = new AbortController();
  // Print files are tens of megapixels each; a full pack is minutes of work,
  // and the mockup timeout is not long enough for it.
  const timer = setTimeout(() => controller.abort(), PRINT_TIMEOUT_MS);
  try {
    const res = await fetch(`${getMockupGenBaseUrl()}/api/print/deliverables`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 409 is the one worth reading: the files were made, but they cannot be
      // delivered under the limits. It names what did not fit.
      throw new Error(payload.error || `Print export failed (HTTP ${res.status})`);
    }
    return payload as PrintDeliverablesResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** The bytes of one deliverable, to be stored with the listing. */
export async function downloadPrintDeliverable(url: string): Promise<Blob> {
  const res = await fetch(resolveMockupUrl(url));
  if (!res.ok) throw new Error(`Failed to download a print file (HTTP ${res.status})`);
  return res.blob();
}

export interface PrintExportRecord {
  id: number;
  artwork_name: string;
  output_mode: string;
  quality: string;
  created_at: string;
  files: { ratio_key: string; file_name: string; width: number; height: number; bytes: number; ms: number }[];
  guide_file: string;
}

/**
 * The print files already made for one listing.
 *
 * They are not downloaded here and not stored here. The render server keeps
 * them with its own history and its own retention, and answers for them by
 * the reference the listing was exported under -- so the browser holds a list,
 * not twenty megabytes an image.
 */
export async function listPrintExports(reference: string): Promise<PrintExportRecord[]> {
  const res = await fetch(`${getMockupGenBaseUrl()}/api/print/exports?reference=${encodeURIComponent(reference)}`);
  if (!res.ok) return [];
  const payload = await res.json().catch(() => ({}));
  return (payload.exports ?? []) as PrintExportRecord[];
}

/** The print sets a shop has configured, for choosing one before a run. */
export async function listPrintSets(): Promise<{ id: number; name: string; mode: string; ratio_keys: string[] }[]> {
  const res = await fetch(`${getMockupGenBaseUrl()}/api/print/sets`);
  if (!res.ok) return [];
  const payload = await res.json().catch(() => ({}));
  return payload.sets ?? [];
}

/**
 * Pack files that have already been exported into what a listing can carry.
 *
 * A set is several artworks sold together, and each needs its own sizes -- so
 * the export runs once per image. The packing has to see all of them at once:
 * three artworks at six ratios is eighteen files against five slots, and that
 * is not a decision six files can make on their own.
 */
export async function packPrintFiles(
  fileNames: string[],
  guide?: string,
): Promise<PrintDeliverablesResponse> {
  const res = await fetch(`${getMockupGenBaseUrl()}/api/print/package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: fileNames, guide }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Could not package the print files (HTTP ${res.status})`);
  return payload as PrintDeliverablesResponse;
}

/**
 * One ratio export: the artwork at print resolution for a single aspect.
 *
 * The server returns url, bytes and dimensions per file and always has; the
 * client used to declare only the name, so the individual sizes could not be
 * listed anywhere and a set appeared to have produced one file -- the archive
 * they were packed into -- instead of the fifteen it actually made.
 */
export interface PrintExportFile {
  file: string;
  success: boolean;
  ratio: string;
  url: string;
  bytes: number;
  width?: number;
  height?: number;
  prints_at?: string;
}

export interface PrintExportResponse {
  files: PrintExportFile[];
  guide?: { file: string; url?: string } | null;
}

/** Print files for one artwork, without packaging them. */
export async function exportPrintFiles(
  artwork: File | Blob,
  options: { setId?: number; ratios?: string; quality?: string; mode?: string; reference?: string } = {},
): Promise<PrintExportResponse> {
  const spec: Record<string, unknown> = {};
  if (options.setId) spec.set = options.setId;
  if (options.ratios) spec.ratios = options.ratios;
  if (options.quality) spec.quality = options.quality;
  if (options.mode) spec.mode = options.mode;
  if (options.reference) spec.reference = options.reference;

  const form = new FormData();
  form.append('artwork', artwork, artwork instanceof File ? artwork.name : 'artwork.png');
  form.append('spec', JSON.stringify(spec));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRINT_TIMEOUT_MS);
  try {
    const res = await fetch(`${getMockupGenBaseUrl()}/api/print/export`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || `Print export failed (HTTP ${res.status})`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

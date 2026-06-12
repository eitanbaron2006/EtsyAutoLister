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

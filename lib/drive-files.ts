// Putting a listing's files in the shop's own Drive.
//
// Server-only, like the grant it uses. The `drive.file` scope this app asks
// for reaches nothing but what it created itself, which is why every lookup
// here is scoped to that: a folder the app made is findable, a folder the shop
// made by hand is invisible to it, and that is the intended trade.

import 'server-only';

import { readDriveAccessToken } from '@/lib/drive-token';
import { parseFolderPath } from '@/lib/drive-path';

export { DEFAULT_FOLDER_PATH, parseFolderPath } from '@/lib/drive-path';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveError';
  }
}

async function token(userId: string): Promise<string> {
  const accessToken = await readDriveAccessToken(userId);
  if (!accessToken) throw new DriveError('Google Drive is not connected, or the grant has expired.');
  return accessToken;
}

async function driveFetch(accessToken: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new DriveError(`Drive refused the request (${res.status}): ${detail}`);
  }
  return res;
}

/** Escapes a value for a Drive query string. */
const q = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/**
 * The folder for one name under one parent, made if it is not there yet.
 *
 * `drive.file` only sees what this app created, so this finds the app's own
 * folder and never collides with something the shop happens to have named the
 * same. Trashed matches are skipped: a folder the shop deleted should be
 * remade, not resurrected.
 */
async function ensureFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const clauses = [
    `name = '${q(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
    parentId ? `'${q(parentId)}' in parents` : null,
  ].filter(Boolean).join(' and ');

  const found = await driveFetch(
    accessToken,
    `${DRIVE_API}/files?q=${encodeURIComponent(clauses)}&fields=files(id,name)&pageSize=1`,
  ).then(r => r.json());

  if (found.files?.[0]?.id) return found.files[0].id as string;

  const created = await driveFetch(accessToken, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  }).then(r => r.json());

  return created.id as string;
}

export interface ListingFolder {
  folderId: string;
  /** The page a buyer opens. Only set once the folder has been shared. */
  url: string;
}

/**
 * The folder for one listing: `<root>/<listing>`, made if needed and shared.
 *
 * Shared as "anyone with the link can view" — the link is the product, and a
 * buyer who has paid for it should not have to ask for access or sign in to a
 * Google account to collect what they bought.
 */
export async function ensureListingFolder(
  userId: string,
  folderName: string,
  /** The shop's chosen path, e.g. "Etsy/Downloads". Defaulted when unset. */
  rootPath?: string | null,
  /** Used as the root when no path is set, so folders read as <Shop>/<Product>. */
  shopName?: string | null,
): Promise<ListingFolder> {
  const accessToken = await token(userId);

  // Walked rather than created in one call: Drive has no mkdir -p, so each
  // segment is found-or-made inside the one before it.
  let parentId: string | undefined;
  for (const segment of parseFolderPath(rootPath, shopName)) {
    parentId = await ensureFolder(accessToken, segment, parentId);
  }

  const folderId = await ensureFolder(accessToken, folderName, parentId);

  // Idempotent in effect: granting the same permission twice is not an error
  // worth failing a delivery over.
  try {
    await driveFetch(accessToken, `${DRIVE_API}/files/${folderId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  } catch (err) {
    console.warn('Could not set the sharing permission (it may already be set)', err);
  }

  return { folderId, url: `https://drive.google.com/drive/folders/${folderId}` };
}

/**
 * Put one file in a folder, replacing any earlier copy of the same name.
 *
 * Replacing rather than adding: a re-run should leave the buyer with one copy
 * of each size, not a folder that grows a duplicate set every time.
 */
export async function uploadToFolder(
  userId: string,
  folderId: string,
  fileName: string,
  body: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<{ id: string; bytes: number }> {
  const accessToken = await token(userId);

  const existing = await driveFetch(
    accessToken,
    `${DRIVE_API}/files?q=${encodeURIComponent(
      `name = '${q(fileName)}' and '${q(folderId)}' in parents and trashed = false`,
    )}&fields=files(id)&pageSize=1`,
  ).then(r => r.json());
  const priorId: string | undefined = existing.files?.[0]?.id;

  const payload = body instanceof Blob ? body : new Blob([body as BlobPart], { type: contentType });

  // Multipart in one request: metadata and bytes together, which is the only
  // shape that sets a parent and a name on the same call.
  const boundary = `autolister${Date.now()}`;
  const metadata = priorId ? {} : { name: fileName, parents: [folderId] };
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const multipart = new Blob([head, payload, tail], { type: `multipart/related; boundary=${boundary}` });

  const url = priorId
    ? `${DRIVE_UPLOAD}/files/${priorId}?uploadType=multipart&fields=id,size`
    : `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,size`;

  const saved = await driveFetch(accessToken, url, {
    method: priorId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  }).then(r => r.json());

  return { id: saved.id as string, bytes: Number(saved.size ?? payload.size ?? 0) };
}

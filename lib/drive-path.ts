// Where a shop's buyer folders live in its Drive.
//
// Pure path logic, kept out of lib/drive-files.ts so it can be tested without
// dragging in `server-only` and a Drive token. Same split as asset-paths.ts
// beside asset-cloud.ts.

/**
 * The last resort, when the shop has set no path and Etsy told us no name.
 *
 * Only reached by a shop that has neither configured a folder nor connected
 * Etsy — otherwise the default root is the shop's own name, which is what a
 * shop looking at its Drive expects to see.
 */
export const DEFAULT_FOLDER_PATH = 'Etsy AutoLister — Buyer Downloads';

/**
 * Split a shop's chosen path into folder names.
 *
 * Kept strict on purpose: these become real folders in someone's Drive, and a
 * name with a slash, a leading dot or trailing spaces is a folder that is
 * awkward to find and worse to delete. Empty segments collapse, so "a//b" and
 * "/a/b/" both mean the same two folders.
 */
export function parseFolderPath(
  path?: string | null,
  /**
   * Used when no path is set — the shop's own name, so the folders read as
   * `<Shop>/<Product>` in its Drive rather than as this app's filing.
   */
  fallbackRoot?: string | null,
): string[] {
  const segments = (path ?? '')
    .split('/')
    .map(part => part.trim().replace(/^\.+/, '').trim())
    .filter(Boolean)
    // Drive has no depth limit worth hitting, but a runaway path is a bug
    // rather than an intention.
    .slice(0, 6)
    .map(part => part.slice(0, 120));

  if (segments.length > 0) return segments;

  // The fallback goes through the same cleaning: a shop name can carry a
  // slash, and one that did would silently become two folders.
  const fallback = (fallbackRoot ?? '')
    .replace(/[\/\\]/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);

  return [fallback || DEFAULT_FOLDER_PATH];
}

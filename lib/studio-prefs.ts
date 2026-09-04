// What the studio was set to for one listing, read back safely.
//
// The column is `jsonb not null default '{}'`, so a listing that has never
// been through the studio comes back as an object with nothing in it -- not as
// undefined. Code that reached straight for `prefs.templateIds.length` on that
// object crashed the moment the camera button was pressed on a new product.
//
// Anything the column holds is treated as untrusted: it is jsonb, so an older
// version, a hand edit or a bad write can put anything in there, and none of
// it should reach the screen.

export interface StudioPrefs {
  templateIds: string[];
  assignments: Record<number, string>;
}

const EMPTY: StudioPrefs = { templateIds: [], assignments: {} };

export function readStudioPrefs(raw: unknown): StudioPrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY;
  const record = raw as Record<string, unknown>;

  const templateIds = Array.isArray(record.templateIds)
    ? record.templateIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];

  const assignments: Record<number, string> = {};
  if (record.assignments && typeof record.assignments === 'object' && !Array.isArray(record.assignments)) {
    for (const [frame, value] of Object.entries(record.assignments as Record<string, unknown>)) {
      const index = Number(frame);
      // A frame number that is not a number is not a frame.
      if (Number.isInteger(index) && index >= 0 && typeof value === 'string') {
        assignments[index] = value;
      }
    }
  }

  return { templateIds, assignments };
}

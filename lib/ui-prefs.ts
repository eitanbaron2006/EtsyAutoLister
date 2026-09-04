'use client';

// How the person likes to work: the theme, Autopilot-vs-Guided, and the
// default mockup fit mode.
//
// These lived in three localStorage keys and nowhere else, so a cleared cache
// or a second machine reverted all three without saying so. They follow the
// shape MockupGen settled on instead:
//
//   the database is the copy that counts, and the browser keeps one as a cache
//
// The cache is read first so the screen paints immediately with no round trip;
// the stored value arrives with the profile a moment later and wins. Writes go
// to the cache at once and to the profile after a pause, so dragging a control
// is one save rather than one per step.
//
// Nothing here is worth an error. A browser in a private window, a full quota,
// a server that will not answer -- every path falls back to the default and
// the app opens on it.

import { updateProfile } from '@/lib/listings-repo';
import type { MockupFitMode } from '@/lib/mockupgen';

export const PREF_KEYS = {
  theme: 'autolister-theme',
  autopilot: 'autolister-studio-autopilot',
  fitMode: 'autolister-fit-mode',
} as const;

export interface UiPrefs {
  theme?: 'light' | 'dark';
  autopilot?: boolean;
  fitMode?: MockupFitMode;
}

const SAVE_DELAY = 700;

export function readCached(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeCached(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The stored copy is still the one that counts.
  }
}

const isFitMode = (value: unknown): value is MockupFitMode =>
  value === 'auto' || value === 'cover' || value === 'contain' || value === 'stretch';

/** The preferences the profile carries, ignoring anything unrecognisable. */
export function readStoredPrefs(raw: unknown): UiPrefs {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const prefs: UiPrefs = {};
  if (record.theme === 'light' || record.theme === 'dark') prefs.theme = record.theme;
  if (typeof record.autopilot === 'boolean') prefs.autopilot = record.autopilot;
  if (isFitMode(record.fitMode)) prefs.fitMode = record.fitMode;
  return prefs;
}

/* What the profile is known to hold, so a write can send the whole object
   without dropping the preferences it is not changing. A jsonb column is
   replaced, not merged, by an update -- so the merge happens here. */
let known: UiPrefs = {};

/** Seed the known state from the profile as it loads. */
export function rememberStoredPrefs(prefs: UiPrefs): void {
  known = { ...known, ...prefs };
}

/* One timer for all three: controls changed in quick succession are one write. */
let timer: ReturnType<typeof setTimeout> | null = null;

/** Cache it now, store it shortly. Merged, so one control cannot wipe another. */
export function savePref(uid: string | null | undefined, patch: UiPrefs, cache?: Record<string, string>): void {
  for (const [key, value] of Object.entries(cache ?? {})) writeCached(key, value);
  known = { ...known, ...patch };
  if (!uid) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void updateProfile(uid, { uiPrefs: { ...known } }).catch(() => {
      // The cache still holds it; the app is no worse off than it was before
      // any of this was stored at all.
    });
  }, SAVE_DELAY);
}

/** Send anything still waiting, for a tab that is about to close. */
export function flushPrefs(uid: string | null | undefined): void {
  if (!uid || !timer) return;
  clearTimeout(timer);
  timer = null;
  void updateProfile(uid, { uiPrefs: { ...known } }).catch(() => { });
}

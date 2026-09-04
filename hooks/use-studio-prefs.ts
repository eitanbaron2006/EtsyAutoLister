'use client';

// Studio working preferences: pipeline mode (Autopilot vs Guided) and the
// default mockup fit mode.
//
// They used to live in localStorage and nowhere else, so a cleared cache or a
// second machine reverted both without saying so. The database is the copy
// that counts now; the browser keeps one as a cache, which is what paints the
// first frame with no round trip.
//
// The order of precedence is derived rather than copied into more state: what
// this session chose, then what the profile carries, then the cache, then the
// default. Adopting the stored value by writing it into state would fight the
// person changing the control, and would need an effect to do it.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PREF_KEYS, readCached, savePref, writeCached, type UiPrefs } from '@/lib/ui-prefs';
import type { MockupFitMode } from '@/lib/mockupgen';

const isFitMode = (value: unknown): value is MockupFitMode =>
  value === 'auto' || value === 'cover' || value === 'contain' || value === 'stretch';

function cachedAutopilot(): boolean | undefined {
  if (typeof window === 'undefined') return undefined;
  const cached = readCached(PREF_KEYS.autopilot);
  return cached === null ? undefined : cached !== 'false';
}

function cachedFitMode(): MockupFitMode | undefined {
  if (typeof window === 'undefined') return undefined;
  const cached = readCached(PREF_KEYS.fitMode);
  return isFitMode(cached) ? cached : undefined;
}

export function useStudioPrefs(uid?: string | null, stored?: UiPrefs) {
  // Undefined until this session changes something, so the stored value is
  // free to win in the meantime.
  const [chosenAutopilot, setChosenAutopilot] = useState<boolean | undefined>(undefined);
  const [chosenFitMode, setChosenFitMode] = useState<MockupFitMode | undefined>(undefined);
  const [cached] = useState(() => ({ autopilot: cachedAutopilot(), fitMode: cachedFitMode() }));

  const studioAutopilot = chosenAutopilot ?? stored?.autopilot ?? cached.autopilot ?? true;
  const studioFitMode = chosenFitMode ?? stored?.fitMode ?? cached.fitMode ?? 'stretch';

  // Keep the cache in step with what is being shown, so the next cold start
  // paints the right thing before the profile arrives. Storage only: nothing
  // here changes what the screen is already rendering.
  useEffect(() => {
    writeCached(PREF_KEYS.autopilot, studioAutopilot ? 'true' : 'false');
    writeCached(PREF_KEYS.fitMode, studioFitMode);
  }, [studioAutopilot, studioFitMode]);

  const toggleStudioAutopilot = () => {
    const next = !studioAutopilot;
    setChosenAutopilot(next);
    savePref(uid, { autopilot: next }, { [PREF_KEYS.autopilot]: next ? 'true' : 'false' });
    toast.info(next
      ? 'Autopilot enabled — the pipeline runs end-to-end on launch.'
      : 'Guided mode — you approve each Studio stage yourself.');
  };

  const changeStudioFitMode = (mode: MockupFitMode) => {
    setChosenFitMode(mode);
    savePref(uid, { fitMode: mode }, { [PREF_KEYS.fitMode]: mode });
  };

  return { studioAutopilot, toggleStudioAutopilot, studioFitMode, changeStudioFitMode };
}

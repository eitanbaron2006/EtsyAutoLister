'use client';

// Studio working preferences, persisted per browser in localStorage:
// pipeline mode (Autopilot vs Guided) and the default mockup fit mode.
import { useState } from 'react';
import { toast } from 'sonner';
import type { MockupFitMode } from '@/lib/mockupgen';

export function useStudioPrefs() {
  const [studioAutopilot, setStudioAutopilot] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autolister-studio-autopilot') !== 'false';
    }
    return true;
  });

  const [studioFitMode, setStudioFitMode] = useState<MockupFitMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('autolister-fit-mode');
      if (stored === 'auto' || stored === 'cover' || stored === 'contain' || stored === 'stretch') return stored;
    }
    return 'stretch';
  });

  const toggleStudioAutopilot = () => {
    setStudioAutopilot(prev => {
      const next = !prev;
      localStorage.setItem('autolister-studio-autopilot', next ? 'true' : 'false');
      toast.info(next
        ? 'Autopilot enabled — the pipeline runs end-to-end on launch.'
        : 'Guided mode — you approve each Studio stage yourself.');
      return next;
    });
  };

  const changeStudioFitMode = (mode: MockupFitMode) => {
    setStudioFitMode(mode);
    localStorage.setItem('autolister-fit-mode', mode);
  };

  return { studioAutopilot, toggleStudioAutopilot, studioFitMode, changeStudioFitMode };
}

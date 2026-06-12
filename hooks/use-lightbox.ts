'use client';

// Fullscreen lightbox state + arrow-key navigation.
import { useEffect, useState } from 'react';
import type { LightboxState } from '@/components/photo-lightbox';

export function useLightbox() {
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.items.length } : prev);
      } else if (e.key === 'ArrowLeft') {
        setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length } : prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  return { lightbox, setLightbox };
}

'use client';

import { useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { toast } from 'sonner';

export type LightboxState = { items: { url: string; label: string; sub?: string }[]; index: number } | null;

// Fullscreen dark photo viewer with arrows, filmstrip and wheel navigation.
// Rendered in every view that can open it (hub + workspace).
export function PhotoLightbox({ lightbox, setLightbox }: { lightbox: LightboxState; setLightbox: (next: LightboxState) => void }) {
  const wheelStampRef = useRef(0);
  if (!lightbox) {
    return (
      <Dialog open={false} onOpenChange={() => { }}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }
  const current = lightbox.items[lightbox.index];
  const goTo = (offset: number) => setLightbox({
    ...lightbox,
    index: (lightbox.index + offset + lightbox.items.length) % lightbox.items.length
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) setLightbox(null); }}>
      <DialogContent className="!flex !flex-col !gap-0 !max-w-none w-[100vw] h-[100vh] sm:rounded-none border-0 p-0 bg-[#12110c]/[0.97] text-[#f7f1de] font-sans [&>button]:top-6 [&>button]:right-6 [&>button]:z-20 [&>button]:w-11 [&>button]:h-11 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:hover:bg-white/20 [&>button]:text-white [&>button]:opacity-100 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
        <DialogTitle className="sr-only">{current.label}</DialogTitle>
        <DialogDescription className="sr-only">Fullscreen photo viewer</DialogDescription>

        {/* Single wrapper keeps the nav arrows out of the [&>button]
            close-button styling and anchors their positioning */}
        <div
          className="relative flex flex-col w-full h-full"
          onWheel={(e) => {
            if (lightbox.items.length < 2) return;
            const now = Date.now();
            if (now - wheelStampRef.current < 180) return;
            wheelStampRef.current = now;
            if (e.deltaY > 0) goTo(1);
            else if (e.deltaY < 0) goTo(-1);
          }}
        >
          {/* Floating image */}
          <div className="min-h-0 flex-1 w-full flex items-center justify-center px-20 sm:px-28 pt-8 pb-2 select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.label} className="max-w-full max-h-full object-contain rounded-md shadow-2xl" />
          </div>

          {/* Caption + counter + download, like the render-server viewer */}
          <div className="shrink-0 pt-1 pb-2 text-center space-y-1 select-none">
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-sm font-medium text-white max-w-[70vw] truncate" title={current.label}>{current.label}</span>
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = current.url;
                  link.download = current.label || 'photo';
                  link.click();
                  toast.success('Photo downloaded!');
                }}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Download this photo"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-white/55 font-mono block">{lightbox.index + 1} / {lightbox.items.length}</span>
            {current.sub && <span className="text-[10px] text-white/35 block max-w-[70vw] mx-auto truncate">{current.sub}</span>}
          </div>

          {/* Filmstrip for direct jumps */}
          {lightbox.items.length > 1 && (
            <div className="shrink-0 pb-5 px-6 flex gap-1.5 justify-center overflow-x-auto select-none">
              {lightbox.items.map((item, idx) => (
                <button
                  type="button"
                  key={`${item.url}-${idx}`}
                  onClick={() => setLightbox({ ...lightbox, index: idx })}
                  className={`w-14 h-14 shrink-0 rounded-md overflow-hidden border-2 transition-all cursor-pointer bg-white/5 ${idx === lightbox.index ? 'border-[#ed6f5c] opacity-100' : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'}`}
                  title={item.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Side navigation */}
          {lightbox.items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(-1)}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
                title="Previous (←)"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
                title="Next (→)"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

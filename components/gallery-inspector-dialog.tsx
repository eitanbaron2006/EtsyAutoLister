'use client';

// "Photo Package Inspector" — every photo that ships with a listing, shown
// large in a balanced grid with type badges (Mockup / Info / Product).
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon } from 'lucide-react';
import { balancedGridColumns } from '@/lib/grid';
import type { LightboxState } from '@/components/photo-lightbox';
import { TipFillerCard, TipPanel } from '@/components/studio-tips';
import type { UploadedPreview } from '@/lib/uploaded-previews';

const kindOf = (id: string) => id.startsWith('mockup-') ? 'Mockup' : id.startsWith('extra-') ? 'Info' : 'Product';
const badgeClass = (kind: string) => kind === 'Mockup'
  ? 'bg-[#ed6f5c] text-white'
  : kind === 'Info'
    ? 'bg-[#6e7448] text-white'
    : 'bg-[#15140f] text-[#f7f1de]';

export function GalleryInspectorDialog({
  open,
  title,
  photos,
  savedTips,
  onToggleSaveTip,
  onOpenChange,
  onOpenLightbox
}: {
  open: boolean;
  title: string;
  photos: UploadedPreview[];
  savedTips: string[];
  onToggleSaveTip: (tip: string) => void;
  onOpenChange: (open: boolean) => void;
  onOpenLightbox: (state: LightboxState) => void;
}) {
  const cols = balancedGridColumns(Math.max(1, photos.length));
  const rows = Math.ceil(Math.max(1, photos.length) / cols);
  const emptyCells = photos.length > 0 ? cols * rows - photos.length : 0;
  // Up to 2 rows leave vertical room: pin them to the top and fill the rest
  const tipsBelow = rows <= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col !gap-0 w-[calc(100vw-2rem)] lg:!max-w-[1100px] h-[88vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] font-sans">
        <DialogHeader className="shrink-0 px-6 sm:px-8 pt-5 pb-4 border-b border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.10)] bg-transparent dark:bg-[#201e18]/20">
          <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Photo Package Inspector</span>
          <DialogTitle className="text-xl font-serif font-medium leading-tight text-[#15140f] dark:text-[#f7f1de]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs font-sans">
            Every photo that ships with this listing — click one for a fullscreen view with navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-6 sm:px-8 py-5 flex flex-col gap-3">
          {photos.length === 0 ? (
            <div className="text-center py-20">
              <ImageIcon className="w-10 h-10 text-[#8b8676] dark:text-[#807b6c] mx-auto opacity-60 mb-3" />
              <p className="text-xs text-[#5a5448] dark:text-[#a39e8f]">No photos loaded for this listing in the browser.</p>
            </div>
          ) : (
            <>
              <div
                className={`grid gap-3 content-start ${tipsBelow ? 'shrink-0' : 'flex-1 min-h-0 overflow-y-auto'}`}
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridAutoRows: 'max-content'
                }}
              >
                {photos.map((preview, index) => {
                  const kind = kindOf(preview.id);
                  return (
                    <button
                      type="button"
                      key={preview.id}
                      onClick={() => onOpenLightbox({
                        items: photos.map(p => ({ url: p.image, label: p.label, sub: kindOf(p.id) })),
                        index
                      })}
                      className="text-left rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] bg-[#efe7d2] dark:bg-[#12110c] hover:border-[#ed6f5c]/50 dark:hover:border-[#ed6f5c]/60 transition-colors cursor-zoom-in group flex flex-col w-full"
                      // Height follows the column width (near-square)
                      style={{ aspectRatio: '1 / 1.08' }}
                      title="Open fullscreen view"
                    >
                      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#ece4cf]/60 dark:bg-[#22211b]/60 p-2 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.image} alt={preview.label} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.02]" />
                        <span className={`absolute top-2 left-2 text-[7px] font-mono tracking-wider px-1.5 py-0.5 rounded-full uppercase font-bold select-none ${badgeClass(kind)}`}>
                          {kind}
                        </span>
                      </div>
                      <div className="shrink-0 px-2.5 py-1.5 bg-[#f7f1de] dark:bg-[#1a1914] border-t border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)]">
                        <span className="text-[9px] font-medium text-[#15140f] dark:text-[#f7f1de] block truncate" title={preview.label}>{preview.label}</span>
                      </div>
                    </button>
                  );
                })}
                {/* Fill holes in the last row so it never has a gap */}
                {Array.from({ length: emptyCells }).map((_, fillerIndex) => (
                  <TipFillerCard key={`tip-filler-${fillerIndex}`} offset={fillerIndex * 3 + 1} savedTips={savedTips} onToggleSave={onToggleSaveTip} />
                ))}
              </div>
              {/* Fill the vertical space left below the rows with a tips panel */}
              {tipsBelow && <TipPanel savedTips={savedTips} onToggleSave={onToggleSaveTip} />}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

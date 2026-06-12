'use client';

// "Generated Mockups" dialog — every render for one listing, opened from the
// session table's Live Mockup Thumb. Pass `listing` already resolved to the
// live Firestore copy; null keeps the dialog closed.
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { balancedGridColumns } from '@/lib/grid';
import type { GeneratedMockup, ListingMetadata } from '@/lib/listing-types';
import type { LightboxState } from '@/components/photo-lightbox';
import { TipFillerCard, TipPanel } from '@/components/studio-tips';

export function MockupViewerDialog({
  listing,
  mockups,
  isRendering,
  templateName,
  savedTips,
  onToggleSaveTip,
  onClose,
  onOpenStudio,
  onOpenLightbox
}: {
  listing: ListingMetadata | null;
  mockups: GeneratedMockup[];
  isRendering: boolean;
  templateName: (templateId: string) => string;
  savedTips: string[];
  onToggleSaveTip: (tip: string) => void;
  onClose: () => void;
  onOpenStudio: (listing: ListingMetadata) => void;
  onOpenLightbox: (state: LightboxState) => void;
}) {
  const isRenderingNow = !!listing && (isRendering ||
    ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(listing.status));
  const viewerCols = balancedGridColumns(Math.max(1, mockups.length));
  const viewerRows = Math.ceil(Math.max(1, mockups.length) / viewerCols);
  const viewerEmptyCells = mockups.length > 0 ? viewerCols * viewerRows - mockups.length : 0;

  return (
    <Dialog open={!!listing} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!flex !flex-col !gap-0 w-[calc(100vw-2rem)] lg:!max-w-[1100px] h-[88vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] text-[#15140f] font-sans">
        {listing && (
          <>
            <DialogHeader className="shrink-0 px-6 sm:px-8 pt-5 pb-4 border-b border-[rgba(21,20,15,0.12)]">
              <div className="flex items-start justify-between gap-4 pr-9">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Generated Mockups</span>
                  <DialogTitle className="text-xl font-serif font-medium leading-tight text-[#15140f] max-w-[560px] truncate" title={listing.folderName}>
                    {listing.folderName}
                  </DialogTitle>
                  <DialogDescription className="text-[#5a5448] text-xs font-sans">
                    {mockups.length} render{mockups.length === 1 ? '' : 's'} in this session · click a card to download it
                  </DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenStudio(listing)}
                  className="font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#efe7d2] hover:bg-[#ece4cf] shadow-none cursor-pointer shrink-0"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5 text-[#ed6f5c]" /> Open Studio
                </Button>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 px-6 sm:px-8 py-5 flex flex-col gap-3">
              {isRenderingNow && (
                <div className="shrink-0 flex items-center gap-2.5 p-3 rounded-xl border border-[#ed6f5c]/25 bg-[#ed6f5c]/5 text-[#5a5448] text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ed6f5c] shrink-0" />
                  The pipeline is running for this product — fresh mockups will appear here when the render finishes.
                </div>
              )}

              {mockups.length > 0 ? (
                <>
                  <div
                    className={viewerRows === 1
                      ? 'shrink-0 grid gap-3 items-center justify-items-center'
                      : 'flex-1 min-h-0 grid gap-3 items-center'}
                    style={{
                      gridTemplateColumns: `repeat(${viewerCols}, minmax(0, 1fr))`,
                      gridAutoRows: '1fr',
                      ...(viewerRows === 1 ? { height: '52%' } : {})
                    }}
                  >
                    {mockups.map((mockup, index) => (
                      <button
                        type="button"
                        key={mockup.id}
                        onClick={() => onOpenLightbox({
                          items: mockups.map(m => ({
                            url: m.url,
                            label: templateName(m.templateId),
                            sub: m.sourceFileNames.length > 1 ? `SET · ${m.sourceFileNames.length} artworks · ${m.file.name}` : m.file.name
                          })),
                          index
                        })}
                        className="text-left rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] hover:border-[#ed6f5c]/50 transition-colors cursor-zoom-in group flex flex-col min-h-0 w-full"
                        // Cards stay near-square: in tall cells they stop
                        // growing and center instead of stretching
                        style={{ aspectRatio: '1 / 1.08', maxHeight: '100%' }}
                        title="Open fullscreen view"
                      >
                        <div className="flex-1 min-h-0 flex items-center justify-center bg-[#ece4cf]/60 p-2 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mockup.url} alt={mockup.file.name} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.02]" />
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = mockup.url;
                              link.download = mockup.file.name;
                              link.click();
                              toast.success(`${mockup.file.name} downloaded!`);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#f7f1de]/95 border border-[rgba(21,20,15,0.16)] text-[#15140f] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ece4cf] cursor-pointer"
                            title="Download this mockup"
                          >
                            <Download className="w-3 h-3" />
                          </span>
                        </div>
                        <div className="shrink-0 px-2.5 py-1.5 bg-[#f7f1de] border-t border-[rgba(21,20,15,0.10)]">
                          <span className="text-[9px] font-medium text-[#15140f] block truncate" title={templateName(mockup.templateId)}>
                            {templateName(mockup.templateId)}
                          </span>
                        </div>
                      </button>
                    ))}
                    {Array.from({ length: viewerEmptyCells }).map((_, fillerIndex) => (
                      <TipFillerCard key={`tip-filler-${fillerIndex}`} offset={fillerIndex * 3} savedTips={savedTips} onToggleSave={onToggleSaveTip} />
                    ))}
                  </div>
                  {/* A single photo row frees the lower half — tips zone */}
                  {viewerRows === 1 && <TipPanel savedTips={savedTips} onToggleSave={onToggleSaveTip} />}
                </>
              ) : listing.mockupImage ? (
                <div className="text-center space-y-3 py-6">
                  <span className="text-[10px] text-[#8b8676] font-mono block leading-relaxed max-w-md mx-auto">
                    Full renders from the previous session are not in browser memory — this is the saved listing cover:
                  </span>
                  <div className="max-w-[320px] mx-auto rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={listing.mockupImage} alt="Saved listing cover" className="w-full h-auto object-contain" />
                  </div>
                  <span className="text-[10px] text-[#5a5448] font-medium block">
                    Open the Studio to re-attach sources and render fresh mockups.
                  </span>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Camera className="w-10 h-10 text-[#8b8676] mx-auto opacity-60 mb-3" />
                  <p className="text-xs text-[#5a5448]">No mockups rendered yet for this product.</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

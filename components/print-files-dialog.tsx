'use client';

// "Art Sizes" dialog — every print size one listing produced (2x3, 4x5, ISO A,
// square, 5x7...), i.e. what the buyer downloads, as opposed to the mockups,
// which are what the shop shows.
//
// Deliberately built as a mirror of MockupViewerDialog: same shell, same
// header shape, same fixed-row grid that always fits without scrolling, same
// card anatomy and tips strip. The only differences are the ones the content
// forces — non-image deliverables have no preview, and the download is a real
// link to the render server rather than an in-memory blob.
//
// The files themselves are fifteen to twenty megabytes each and are never
// pulled into the browser: the thumbnails are previews the render server makes
// and keeps, a few tens of kilobytes apiece, and the full file is only fetched
// if someone actually opens one.

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileArchive } from 'lucide-react';
import { balancedGridColumns } from '@/lib/grid';
import { isPrintPreviewable, resolveMockupUrl } from '@/lib/mockupgen';
import type { ListingMetadata } from '@/lib/listing-types';
import type { LightboxState } from '@/components/photo-lightbox';
import { TipFillerCard, TipPanel } from '@/components/studio-tips';

export interface PrintFile {
  fileName: string;
  url: string;
  bytes: number;
}

const sizeLabel = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function PrintFilesDialog({
  listing,
  files,
  deliveredAs,
  savedTips,
  onToggleSaveTip,
  onClose,
  onOpenLightbox,
}: {
  listing: ListingMetadata | null;
  files: PrintFile[];
  /**
   * How many files Etsy actually receives. Usually the same as `files.length`,
   * but a set makes more sizes than the five-file allowance holds and they are
   * packed, so fifteen sizes can arrive as one archive. Saying so here is the
   * difference between "the run only made one file" and "the run made fifteen
   * and they travel together".
   */
  deliveredAs: number;
  savedTips: string[];
  onToggleSaveTip: (tip: string) => void;
  onClose: () => void;
  onOpenLightbox: (state: LightboxState) => void;
}) {
  const viewerCols = balancedGridColumns(Math.max(1, files.length));
  const viewerRows = Math.ceil(Math.max(1, files.length) / viewerCols);
  const viewerEmptyCells = files.length > 0 ? viewerCols * viewerRows - files.length : 0;
  // Up to 2 rows leave vertical room: fill what remains below with a tips panel.
  const tipsBelow = viewerRows <= 2;

  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  // Only pictures can be opened full size, so the lightbox indexes those alone.
  const previewable = files.filter(file => isPrintPreviewable(file.fileName));

  return (
    <Dialog open={!!listing} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!flex !flex-col !gap-0 w-[calc(100vw-2rem)] lg:!max-w-[1100px] h-[88vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] font-sans">
        {listing && (
          <>
            <DialogHeader className="shrink-0 px-6 sm:px-8 pt-5 pb-4 border-b border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.10)] bg-transparent dark:bg-[#201e18]/20">
              <div className="flex items-start justify-between gap-4 pr-9">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Art Sizes</span>
                  <DialogTitle className="text-xl font-serif font-medium leading-tight text-[#15140f] dark:text-[#f7f1de] max-w-[560px] truncate" title={listing.folderName}>
                    {listing.folderName}
                  </DialogTitle>
                  <DialogDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs font-sans">
                    {files.length} size{files.length === 1 ? '' : 's'} · {Math.round(total / 1048576)}MB ·{' '}
                    {deliveredAs > 0 && deliveredAs < files.length
                      ? `packed into ${deliveredAs} file${deliveredAs === 1 ? '' : 's'} for Etsy — it allows five per listing`
                      : 'upload these to Etsy'}
                    {' '}— they stay on the render server until you save one
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 px-6 sm:px-8 py-5 flex flex-col gap-3">
              {files.length > 0 ? (
                <>
                  {/* Same rule as the mockup viewer: every file on screen at
                      once. The grid takes the space that is left and splits it
                      into `viewerRows` equal rows, so cards shrink to fit and
                      never scroll. */}
                  <div
                    className="grid gap-3 flex-1 min-h-0 overflow-hidden"
                    style={{
                      gridTemplateColumns: `repeat(${viewerCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${viewerRows}, minmax(0, 1fr))`
                    }}
                  >
                    {files.map(file => {
                      const picture = isPrintPreviewable(file.fileName);
                      const fullUrl = resolveMockupUrl(file.url);
                      return (
                        <button
                          type="button"
                          key={file.fileName}
                          onClick={() => {
                            if (!picture) return;
                            onOpenLightbox({
                              items: previewable.map(item => ({
                                url: resolveMockupUrl(item.url),
                                label: item.fileName,
                                sub: sizeLabel(item.bytes)
                              })),
                              index: previewable.findIndex(item => item.fileName === file.fileName)
                            });
                          }}
                          className={`text-left rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] bg-[#efe7d2] dark:bg-[#12110c] hover:border-[#ed6f5c]/50 dark:hover:border-[#ed6f5c]/60 transition-colors group flex flex-col w-full h-full min-h-0 ${picture ? 'cursor-zoom-in' : 'cursor-default'}`}
                          title={picture ? 'Open fullscreen view' : file.fileName}
                        >
                          <div className="flex-1 min-h-0 flex items-center justify-center bg-[#ece4cf]/60 dark:bg-[#22211b]/60 p-2 relative">
                            {picture ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={`${fullUrl}?preview=1`}
                                alt={file.fileName}
                                loading="lazy"
                                className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.02]"
                              />
                            ) : (
                              /* An archive has no preview, and a set usually comes back as
                                 exactly one of them — which in a single-cell grid meant the
                                 whole dialog was an empty box with "ZIP" adrift in the middle.
                                 Give it something to be: an icon, the type, and what is in it. */
                              <span className="flex flex-col items-center justify-center gap-2 text-[#8b8676] select-none px-4 text-center">
                                <FileArchive className="w-8 h-8 text-[#ed6f5c]/70" />
                                <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                                  {file.fileName.split('.').pop()}
                                </span>
                                <span className="text-[10px] leading-relaxed max-w-[32ch]">
                                  Every size for this listing, packed into one file — Etsy allows
                                  five per listing and a set needs more than that.
                                </span>
                              </span>
                            )}
                            <a
                              href={fullUrl}
                              download
                              target="_blank"
                              rel="noopener"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#f7f1de]/95 dark:bg-[#12110c]/95 border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] text-[#15140f] dark:text-[#f7f1de] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ece4cf] dark:hover:bg-[#22211b] cursor-pointer"
                              title="Download the file the buyer receives"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="shrink-0 px-2.5 py-1.5 bg-[#f7f1de] dark:bg-[#1a1914] border-t border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)] flex items-center justify-between gap-2">
                            <span className="text-[9px] font-medium text-[#15140f] dark:text-[#f7f1de] block truncate" title={file.fileName}>
                              {file.fileName}
                            </span>
                            <span className="text-[9px] font-mono text-[#8b8676] shrink-0 select-none">{sizeLabel(file.bytes)}</span>
                          </div>
                        </button>
                      );
                    })}
                    {/* Fill holes in the last row so it never has a gap */}
                    {Array.from({ length: viewerEmptyCells }).map((_, fillerIndex) => (
                      <TipFillerCard key={`tip-filler-${fillerIndex}`} offset={fillerIndex * 3} savedTips={savedTips} onToggleSave={onToggleSaveTip} />
                    ))}
                  </div>
                  {tipsBelow && (
                    <div className="shrink-0 flex h-14">
                      <TipPanel savedTips={savedTips} onToggleSave={onToggleSaveTip} />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <span className="text-[10px] text-[#8b8676] dark:text-[#a39e8f] font-mono text-center leading-relaxed max-w-md">
                    No sizes yet — run the pipeline for this product and the render server will produce them.
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

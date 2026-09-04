'use client';

// Every print file one listing produced -- what the buyer downloads, as
// opposed to the mockups, which are what the shop shows.
//
// The files themselves are fifteen to twenty megabytes each and are never
// pulled into the browser: the thumbnails are previews the render server makes
// and keeps, a few tens of kilobytes apiece, and the full file is only fetched
// if someone actually opens one.

import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { resolveMockupUrl } from '@/lib/mockupgen';
import type { ListingMetadata } from '@/lib/listing-types';

export interface PrintFile {
  fileName: string;
  url: string;
  bytes: number;
}

const sizeLabel = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const isPicture = (name: string) => /\.(jpe?g|png|webp)$/i.test(name);

export function PrintFilesDialog({
  listing,
  files,
  onClose,
  onOpenLightbox,
}: {
  listing: ListingMetadata | null;
  files: PrintFile[];
  onClose: () => void;
  onOpenLightbox?: (url: string) => void;
}) {
  if (!listing) return null;

  const total = files.reduce((sum, file) => sum + file.bytes, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[86vh] overflow-y-auto rounded-2xl border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] bg-[#f7f1de] dark:bg-[#12110c] p-5 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de] truncate">
              {listing.folderName}
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#8b8676] mt-0.5 select-none">
              {files.length} print file{files.length === 1 ? '' : 's'} · {Math.round(total / 1048576)}MB ·
              {' '}upload these to Etsy
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-[#8b8676] hover:text-[#ed6f5c] hover:bg-transparent cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map(file => (
            <div
              key={file.fileName}
              className="rounded-xl border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] overflow-hidden bg-[#ece4cf]/50 dark:bg-[#22211b]"
            >
              {isPicture(file.fileName) ? (
                <button
                  type="button"
                  onClick={() => onOpenLightbox?.(resolveMockupUrl(file.url))}
                  className="block w-full cursor-zoom-in"
                  title="See it full size"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${resolveMockupUrl(file.url)}?preview=1`}
                    alt={file.fileName}
                    loading="lazy"
                    className="w-full h-32 object-contain bg-white"
                  />
                </button>
              ) : (
                <div className="w-full h-32 flex items-center justify-center text-[10px] font-mono uppercase tracking-wider text-[#8b8676] select-none">
                  {file.fileName.split('.').pop()}
                </div>
              )}
              <div className="p-2.5 space-y-1">
                <p className="text-[10px] text-[#15140f] dark:text-[#f7f1de] truncate" title={file.fileName}>
                  {file.fileName}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono text-[#8b8676] select-none">{sizeLabel(file.bytes)}</span>
                  <a
                    href={resolveMockupUrl(file.url)}
                    download
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[#ed6f5c] hover:underline"
                    title="Download the file the buyer receives"
                  >
                    <Download className="w-3 h-3" /> Save
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-[#8b8676] font-mono mt-4 leading-relaxed select-none">
          These stay on the render server. Nothing here downloads a full file until you ask it to.
        </p>
      </div>
    </div>
  );
}

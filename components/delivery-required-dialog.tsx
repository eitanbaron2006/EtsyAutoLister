'use client';

// Shown when a listing's files are past what Etsy will carry and the shop has
// nowhere to put them instead.
//
// Two moments call this up, and they are not the same question:
//
//   'notice'  — opening the draft. Here to be told, before spending time on a
//               listing that cannot go up whole. Dismissible.
//   'publish' — the publish button. A decision has to be made now: go up
//               without the files, or stop and set delivery up first.
//
// Either way the shop can connect from inside it, which is the point: being
// told what is wrong and being unable to fix it from where you are told is
// most of what makes a warning annoying.

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Check } from 'lucide-react';
import { DigitalDeliveryCard } from '@/components/digital-delivery-card';

export type DeliveryPrompt = {
  mode: 'notice' | 'publish';
  /** Which listing raised it, so the draft can be reopened after the OAuth trip. */
  listingId: string;
  folderName: string;
  /** The render server's own account of the sizes, when it gave one. */
  note?: string;
  /**
   * The shop's answer. `withoutFiles` is false once a download location
   * exists — the listing then goes up whole, the same as the draft's own
   * publish button, rather than deliberately short.
   */
  onConfirm?: (withoutFiles: boolean) => void;
};

export function DeliveryRequiredDialog({
  prompt,
  darkMode,
  driveAccountEmail,
  deliveryLink,
  driveFolderPath,
  shopName,
  onConnectDrive,
  onDisconnectDrive,
  onSaveLink,
  onSaveFolderPath,
  onClose,
}: {
  prompt: DeliveryPrompt | null;
  darkMode: boolean;
  driveAccountEmail: string | null;
  deliveryLink: string | null;
  driveFolderPath: string | null;
  shopName: string | null;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onSaveLink: (link: string) => void;
  onSaveFolderPath: (path: string) => void;
  onClose: () => void;
}) {
  const publishing = prompt?.mode === 'publish';
  const ready = !!driveAccountEmail || !!(deliveryLink && deliveryLink.trim());

  return (
    <Dialog open={!!prompt} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!max-w-lg bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] sm:rounded-[24px] text-[#15140f] dark:text-[#f7f1de] font-sans">
        {prompt && (
          <>
            <DialogHeader>
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Digital delivery needed
              </span>
              <DialogTitle className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">
                {ready
                  ? 'Ready to publish in full'
                  : publishing
                    ? 'Publish this listing without its files?'
                    : 'This listing cannot go up whole'}
              </DialogTitle>
              <DialogDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs leading-relaxed">
                {prompt.note
                  ? prompt.note
                  : `The print sizes for "${prompt.folderName}" are larger than Etsy accepts as files.`}
                {' '}
                {ready
                  ? 'A download location is set up, so this listing can be published in full.'
                  : publishing
                    ? 'Without somewhere for the buyer to download them, the listing goes up with its photos, title, description and tags — but no files attached.'
                    : 'Set up a download location and it can be listed automatically. Without one it can still be published, but the buyer receives nothing to download.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-1">
              <DigitalDeliveryCard
                compact
                darkMode={darkMode}
                driveAccountEmail={driveAccountEmail}
                deliveryLink={deliveryLink}
                driveFolderPath={driveFolderPath}
                shopName={shopName}
                onConnectDrive={onConnectDrive}
                onDisconnectDrive={onDisconnectDrive}
                onSaveLink={onSaveLink}
                onSaveFolderPath={onSaveFolderPath}
              />
            </div>

            {ready && (
              <p className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#6e7448] leading-relaxed">
                <Check className="w-3 h-3 shrink-0" />
                Delivery is set up. This listing can be published in full.
              </p>
            )}

            {/* The shared footer is a full-bleed bar: a top border, a grey
                ground and negative margins that push it past the dialog's
                padding. Under a single Close button that reads as a toolbar
                with nothing in it. Stripped back to a plain right-aligned row. */}
            <DialogFooter className="!mx-0 !mb-0 !border-0 !bg-transparent !p-0 !pt-2 gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[#5a5448] dark:text-[#a39e8f] hover:bg-[#ece4cf] dark:hover:bg-[#22211b] hover:text-[#15140f] dark:hover:text-[#f7f1de] text-xs font-mono uppercase tracking-wider cursor-pointer rounded-full px-5"
              >
                {publishing ? 'Cancel' : 'Close'}
              </Button>
              {publishing && (
                <Button
                  onClick={() => { prompt.onConfirm?.(!ready); onClose(); }}
                  className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-xs rounded-full px-6 uppercase tracking-wider cursor-pointer border-0"
                >
                  {ready ? 'Publish' : 'Publish without files'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

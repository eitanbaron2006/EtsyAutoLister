'use client';

// Where the buyer downloads a listing whose files Etsy will not carry.
//
// Etsy takes five files of 20MB. A set of several artworks at every print
// ratio comes to more than that, so for those listings the files cannot be the
// product — a link has to be. A shop can provide one two ways, and either is
// enough:
//
//   1. Connect Google Drive, and the app puts the files there itself.
//   2. Paste a link to somewhere it already hosts them.
//
// Nothing here ever holds the Drive grant. Connecting sends the shop to a
// server route; what comes back is which account was connected.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, HardDrive, Link2 } from 'lucide-react';

export function DigitalDeliveryCard({
  darkMode,
  driveAccountEmail,
  deliveryLink,
  driveFolderPath,
  shopName,
  onConnectDrive,
  onDisconnectDrive,
  onSaveLink,
  onSaveFolderPath,
  /** Rendered inside the draft warning, where the framing is different. */
  compact = false,
}: {
  darkMode: boolean;
  driveAccountEmail: string | null;
  deliveryLink: string | null;
  driveFolderPath: string | null;
  /** Shown as the placeholder, because it is what an unset path resolves to. */
  shopName?: string | null;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onSaveLink: (link: string) => void;
  onSaveFolderPath: (path: string) => void;
  compact?: boolean;
}) {
  // The saved value can change under the field — a profile load, or the other
  // copy of this card in the draft dialog — so follow it. Adjusted during
  // render rather than in an effect: an effect would paint the stale value
  // first and then correct it, and React flags the cascading render.
  const saved = deliveryLink ?? '';
  const [draft, setDraft] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setDraft(saved);
  }

  const dirty = draft.trim() !== (deliveryLink ?? '').trim();

  const savedPath = driveFolderPath ?? '';
  const [pathDraft, setPathDraft] = useState(savedPath);
  const [lastPath, setLastPath] = useState(savedPath);
  if (savedPath !== lastPath) {
    setLastPath(savedPath);
    setPathDraft(savedPath);
  }
  const pathDirty = pathDraft.trim() !== savedPath.trim();
  const connected = !!driveAccountEmail || !!(deliveryLink && deliveryLink.trim());

  const body = (
    <>
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#8b8676] font-bold">
            {"▪ DIGITAL DELIVERY"}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono ${connected ? 'text-[#6e7448]' : 'text-[#8b8676]'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#6e7448]' : 'bg-[#8b8676]'}`} />
            {connected ? 'Ready' : 'Not set'}
          </span>
        </div>
      )}

      <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'}`}>
        Etsy carries five files of 20MB. A set at every print size comes to more than
        that, so those listings are sold as a link instead. Either option below is enough.
      </p>

      {/* 1 — Google Drive */}
      <div className={`rounded-xl border p-3 space-y-2 ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#12110c]' : 'border-[rgba(21,20,15,0.12)] bg-[#efe7d2]/50'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>
            <HardDrive className="w-3.5 h-3.5 text-[#ed6f5c]" /> Google Drive
          </span>
          {driveAccountEmail ? (
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#6e7448]">
                <Check className="w-3 h-3" /> {driveAccountEmail}
              </span>
              <button
                onClick={onDisconnectDrive}
                className="text-[9px] font-mono uppercase tracking-wider text-[#ed6f5c] hover:underline cursor-pointer font-bold"
              >
                Disconnect
              </button>
            </span>
          ) : (
            <Button
              size="xs"
              onClick={onConnectDrive}
              className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0 font-mono text-[9px] uppercase tracking-wider rounded-full px-3 h-7 cursor-pointer"
            >
              Connect
            </Button>
          )}
        </div>
        <p className="text-[9px] text-[#8b8676] leading-relaxed">
          The app creates a folder and puts each listing&apos;s files in it. It can only
          see files it created — nothing already in your Drive.
        </p>

        {driveAccountEmail && (
          <div className="pt-2 border-t border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)] space-y-1.5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] font-bold block">
              Where to put them
            </span>
            <div className="flex items-center gap-2">
              <Input
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && pathDirty) onSaveFolderPath(pathDraft); }}
                placeholder={shopName ? `${shopName} (default)` : 'Your shop name (default)'}
                className={`h-8 text-[11px] rounded-lg ${darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.14)] text-[#f7f1de]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)] text-[#15140f]'}`}
              />
              <Button
                size="xs"
                variant="outline"
                disabled={!pathDirty}
                onClick={() => onSaveFolderPath(pathDraft)}
                className={`h-8 shrink-0 font-mono text-[9px] uppercase tracking-wider rounded-full px-3 cursor-pointer disabled:opacity-40 ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de]'}`}
              >
                Save
              </Button>
            </div>
            {!shopName && (
              /* Without a connected shop there is no name to fall back on, and
                 the folders would land under this app's name — which is not
                 what anyone looking at their own Drive expects to find. */
              <p className="text-[9px] leading-relaxed text-[#ed6f5c]">
                No Etsy shop is connected, so there is no shop name to use. Connect your
                shop, or set a path here — otherwise folders are created under
                &quot;Etsy AutoLister — Buyer Downloads&quot;.
              </p>
            )}
            <p className="text-[9px] text-[#8b8676] leading-relaxed">
              Left empty, folders go under your shop&apos;s name. Set a path to put them
              elsewhere — use <span className="font-mono">/</span> for nesting, e.g.{' '}
              <span className="font-mono">Etsy/Downloads</span>. The app creates it, and cannot
              use a folder you made yourself: the permission you granted does not see one.
            </p>
          </div>
        )}
      </div>

      {/* 2 — a link the shop already has */}
      <div className={`rounded-xl border p-3 space-y-2 ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#12110c]' : 'border-[rgba(21,20,15,0.12)] bg-[#efe7d2]/50'}`}>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>
          <Link2 className="w-3.5 h-3.5 text-[#ed6f5c]" /> Or a link of your own
        </span>
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) onSaveLink(draft); }}
            placeholder="https://drive.google.com/drive/folders/..."
            className={`h-8 text-[11px] rounded-lg ${darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.14)] text-[#f7f1de]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)] text-[#15140f]'}`}
          />
          <Button
            size="xs"
            variant="outline"
            disabled={!dirty}
            onClick={() => onSaveLink(draft)}
            className={`h-8 shrink-0 font-mono text-[9px] uppercase tracking-wider rounded-full px-3 cursor-pointer disabled:opacity-40 ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de]'}`}
          >
            {draft.trim() ? 'Save' : 'Clear'}
          </Button>
        </div>
        <p className="text-[9px] text-[#8b8676] leading-relaxed">
          Anywhere the buyer can download from. Used as-is; a connected Drive takes
          precedence when both are set.
        </p>
      </div>
    </>
  );

  if (compact) return <div className="space-y-3">{body}</div>;

  return (
    <Card className={`${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} border rounded-[18px] shadow-none p-5 space-y-3`}>
      {body}
    </Card>
  );
}

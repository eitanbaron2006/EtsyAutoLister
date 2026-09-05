'use client';

// Designing the sheet the buyer receives.
//
// On an oversize listing this PDF *is* the product — the only file small
// enough for Etsy to carry — so it is worth more than a default. The shop
// picks a preset, and everything else starts from its own Etsy profile: its
// name, its logo, and a colour it can override.
//
// The preview is drawn by the server, because the drawing is. A change
// re-renders it rather than approximating it in HTML, so what the shop signs
// off on is the file the buyer opens.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

import { PDF_PRESETS, type PdfPresetChoice } from '@/lib/pdf-presets';

export function DeliverySheetEditor({
  open,
  saved,
  shopName,
  onSave,
  onClose,
}: {
  open: boolean;
  /** What is stored on the profile. The editor starts from it. */
  saved: PdfPresetChoice;
  shopName: string | null;
  onSave: (choice: PdfPresetChoice) => Promise<void> | void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<PdfPresetChoice>(saved);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reopening should show what is stored, not what was abandoned last time.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setChoice(saved);
  }

  // The blob URL from the previous draw, so it can be released. Held in a ref
  // rather than state: revoking it is cleanup, not something to render.
  const lastUrl = useRef<string | null>(null);

  const draw = useCallback(async (next: PdfPresetChoice) => {
    setDrawing(true);
    try {
      const res = await fetch('/api/delivery-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: next }),
      });
      if (!res.ok) throw new Error('preview failed');
      const url = URL.createObjectURL(await res.blob());
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = url;
      setPreviewUrl(url);
    } catch {
      toast.error('Could not draw the preview.');
    } finally {
      setDrawing(false);
    }
  }, []);

  // Debounced: typing a headline should not post a request per keystroke.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => { void draw(choice); }, 350);
    return () => clearTimeout(timer);
  }, [open, choice, draw]);

  useEffect(() => () => {
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
  }, []);

  const set = (patch: Partial<PdfPresetChoice>) => setChoice(prev => ({ ...prev, ...patch }));

  const activePreset = choice.preset ?? 'studio';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="!flex !flex-col !gap-0 w-[calc(100vw-2rem)] lg:!max-w-[1000px] h-[88vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] font-sans">
        <DialogHeader className="shrink-0 px-6 sm:px-8 pt-5 pb-4 border-b border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.10)]">
          <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Buyer&apos;s download sheet</span>
          <DialogTitle className="text-xl font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">
            How your download looks
          </DialogTitle>
          <DialogDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs leading-relaxed">
            The PDF a buyer opens when a listing is too large for Etsy to carry. It starts from your
            shop{shopName ? ` — ${shopName}` : ''}, and everything below is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 px-6 sm:px-8 py-5 overflow-hidden">

          {/* Controls */}
          <div className="min-h-0 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] font-bold block">Preset</span>
              <div className="grid grid-cols-2 gap-2">
                {PDF_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => set({ preset: preset.id })}
                    className={`text-left rounded-xl border p-2.5 transition-colors cursor-pointer ${
                      activePreset === preset.id
                        ? 'border-[#ed6f5c] bg-[#ed6f5c]/10'
                        : 'border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] hover:border-[#ed6f5c]/50'
                    }`}
                  >
                    <span className="text-[11px] font-serif font-medium block text-[#15140f] dark:text-[#f7f1de]">{preset.name}</span>
                    <span className="text-[9px] text-[#8b8676] leading-tight block mt-0.5">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] font-bold block">Accent colour</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={choice.accentColor || '#ed6f5c'}
                  onChange={(e) => set({ accentColor: e.target.value })}
                  className="w-9 h-8 rounded cursor-pointer bg-transparent border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)]"
                />
                <Input
                  value={choice.accentColor ?? ''}
                  onChange={(e) => set({ accentColor: e.target.value })}
                  placeholder="From your shop, or the preset"
                  className="h-8 text-[11px] rounded-lg bg-[#efe7d2] dark:bg-[#22211b] border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)]"
                />
                {choice.accentColor && (
                  <button
                    type="button"
                    onClick={() => set({ accentColor: undefined })}
                    className="text-[9px] font-mono uppercase tracking-wider text-[#ed6f5c] hover:underline cursor-pointer shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] font-bold block">Headline</span>
              <Input
                value={choice.headline ?? ''}
                onChange={(e) => set({ headline: e.target.value })}
                placeholder="Thank you for your order"
                className="h-8 text-[11px] rounded-lg bg-[#efe7d2] dark:bg-[#22211b] border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)]"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] font-bold block">Message</span>
              <textarea
                value={choice.message ?? ''}
                onChange={(e) => set({ message: e.target.value })}
                rows={4}
                placeholder="Left empty, it tells the buyer their files are ready and names your shop."
                className="w-full text-[11px] rounded-lg p-2 leading-relaxed bg-[#efe7d2] dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] resize-none"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={choice.showLogo ?? true}
                onChange={(e) => set({ showLogo: e.target.checked })}
                className="mt-0.5 accent-[#ed6f5c] cursor-pointer"
              />
              <span className="text-[9px] text-[#8b8676] leading-relaxed">
                Show your shop&apos;s logo. Only drawn if your Etsy shop has one and the preset
                makes room for it.
              </span>
            </label>
          </div>

          {/* Preview — the file itself, not an impression of it */}
          <div className="min-h-0 rounded-xl border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] bg-[#ece4cf]/50 dark:bg-[#12110c] overflow-hidden relative">
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                title="Delivery sheet preview"
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-[#8b8676]">
                Drawing the first preview…
              </div>
            )}
            {drawing && previewUrl && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[#8b8676] bg-[#f7f1de]/90 dark:bg-[#1a1914]/90 rounded-full px-2 py-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Redrawing
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="!mx-0 !mb-0 !bg-transparent shrink-0 px-6 sm:px-8 py-4 border-t border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.10)] gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#5a5448] dark:text-[#a39e8f] hover:bg-[#ece4cf] dark:hover:bg-[#22211b] text-xs font-mono uppercase tracking-wider cursor-pointer rounded-full px-5"
          >
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(choice);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-xs rounded-full px-6 uppercase tracking-wider cursor-pointer border-0"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving</> : 'Save design'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

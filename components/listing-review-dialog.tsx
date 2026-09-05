'use client';

// "Draft ready for your shop" — the full listing review & publish dialog.
// Extracted mechanically from Home: prop names intentionally mirror the
// original state/handler names to keep the JSX body unchanged.
import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Copy, Download, ExternalLink, FileCode, Grid, Loader2 } from 'lucide-react';

import { renderFormattedDescription } from '@/lib/listing-format';
import type { ListingMetadata, ProductData } from '@/lib/listing-types';
import type { LightboxState } from '@/components/photo-lightbox';
import type { UploadedPreview } from '@/lib/uploaded-previews';

export function ListingReviewDialog({
  isDialogOpen,
  setIsDialogOpen,
  setIsGalleryInspectorOpen,
  setSourcePreviewImages,
  setSelectedPreviewIndex,
  activeProduct,
  printFiles,
  sourcePreviewImages,
  selectedPreview,
  setLightbox,
  handleCopyText,
  handleUpdateActiveProduct,
  descTab,
  setDescTab,
  isPackingZip,
  handleDownloadZipPackage,
  publishToEtsySnapshot,
  selectedMode
}: {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  setIsGalleryInspectorOpen: (open: boolean) => void;
  setSourcePreviewImages: React.Dispatch<React.SetStateAction<UploadedPreview[]>>;
  setSelectedPreviewIndex: (index: number) => void;
  activeProduct: ProductData | null;
  printFiles: { fileName: string; url: string; bytes: number }[];
  sourcePreviewImages: UploadedPreview[];
  selectedPreview: UploadedPreview | undefined;
  setLightbox: (state: LightboxState) => void;
  handleCopyText: (text: string, label: string) => void;
  handleUpdateActiveProduct: (key: string, value: unknown) => void;
  descTab: 'edit' | 'preview';
  setDescTab: (tab: 'edit' | 'preview') => void;
  isPackingZip: boolean;
  handleDownloadZipPackage: (product: ProductData) => void;
  publishToEtsySnapshot: (item: ListingMetadata) => void;
  selectedMode: 'etsy' | 'manual' | null;
}) {
  return (
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsGalleryInspectorOpen(false);
            setSourcePreviewImages(prev => {
              // Only the dialog's own upload previews hold fresh object URLs;
              // mockup URLs are session-owned and extras are static paths.
              prev.forEach(p => { if (p.id.startsWith('upload')) URL.revokeObjectURL(p.image); });
              return [];
            });
            setSelectedPreviewIndex(0);
          }
        }}
      >
        <DialogContent className="listing-review-dialog !flex !flex-col !gap-0 w-[calc(100vw-2rem)] lg:!max-w-[1380px] h-[90vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] text-[#15140f] font-sans">
          <DialogHeader className="shrink-0 px-6 sm:px-8 pt-5 pb-4 border-b border-[rgba(21,20,15,0.12)]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pr-9">
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Listing Review</span>
                <DialogTitle className="text-xl sm:text-2xl font-serif font-medium leading-tight text-[#15140f]">Draft ready for your shop</DialogTitle>
                <DialogDescription className="text-[#5a5448] text-xs max-w-xl leading-relaxed font-sans">
                  Review and customize your optimized Etsy listing metadata and mockup parameters in one screen.
                </DialogDescription>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider bg-[#6e7448]/10 text-[#6e7448] px-2.5 py-1 rounded-full border border-[#6e7448]/30 shrink-0 font-bold select-none">
                {activeProduct?.status === 'published' ? 'Live On Etsy' : 'Draft Prepared'}
              </span>
            </div>
          </DialogHeader>

          {activeProduct && (
            <div className="min-h-0 flex-1 px-6 sm:px-8 py-5 flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_460px] gap-6 flex-1 min-h-0 overflow-hidden">

                {/* COLUMN 1: Visual Mockup & ZIP Package (Width: 240px) */}
                <section className="flex flex-col h-full min-h-0 gap-3">
                  {/* Pinned header — never scrolls with the gallery */}
                  <div className="shrink-0 flex items-end justify-between">
                    <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-[0.18em] font-bold">Listing Photos</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8b8676] font-mono">{sourcePreviewImages.length} Image{sourcePreviewImages.length === 1 ? '' : 's'}</span>
                      {sourcePreviewImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsGalleryInspectorOpen(true)}
                          className="text-[9px] font-mono font-bold text-[#ed6f5c] hover:underline uppercase tracking-wider cursor-pointer flex items-center gap-1"
                          title="Inspect every photo in large view"
                        >
                          <Grid className="w-2.5 h-2.5" /> Inspect
                        </button>
                      )}
                    </span>
                  </div>

                  {/* Scrollable gallery — the package card below stays pinned */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
                    {selectedPreview ? (
                      <button
                        type="button"
                        onClick={() => setLightbox({
                          items: sourcePreviewImages.map(p => ({
                            url: p.image,
                            label: p.label,
                            sub: p.id.startsWith('mockup-') ? 'Mockup' : p.id.startsWith('extra-') ? 'Info' : 'Product Image'
                          })),
                          index: Math.max(0, sourcePreviewImages.findIndex(p => p.id === selectedPreview.id))
                        })}
                        className="relative h-[220px] w-full max-w-[220px] mx-auto rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] shadow-sm flex items-center justify-center cursor-zoom-in group"
                        title="Open fullscreen view"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedPreview.image} alt="mockup" className="w-full h-full object-contain bg-[#efe7d2] transition-transform group-hover:scale-[1.02]" />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
                          <span className="bg-[#ed6f5c] text-white text-[7px] font-mono tracking-wider px-1.5 py-0.5 rounded-full uppercase font-bold">
                            {selectedPreview.id.startsWith('mockup-') ? 'Mockup' : selectedPreview.id.startsWith('extra-') ? 'Info' : 'Product Image'}
                          </span>
                        </div>
                      </button>
                    ) : activeProduct?.mockupImage ? (
                      <button
                        type="button"
                        onClick={() => activeProduct.mockupImage && setLightbox({
                          items: [{ url: activeProduct.mockupImage, label: 'Saved listing cover', sub: 'Mockup' }],
                          index: 0
                        })}
                        className="relative h-[220px] w-full max-w-[220px] mx-auto rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] shadow-sm flex items-center justify-center cursor-zoom-in group"
                        title="Open fullscreen view"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeProduct.mockupImage} alt="persisted preview" className="w-full h-full object-contain bg-[#efe7d2] transition-transform group-hover:scale-[1.02]" />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
                          <span className="bg-[#ed6f5c] text-white text-[7px] font-mono tracking-wider px-1.5 py-0.5 rounded-full uppercase font-bold">
                            Mockup
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="h-32 w-full max-w-[220px] mx-auto rounded-xl flex items-center justify-center bg-[#ece4cf]/60 border border-[rgba(21,20,15,0.16)] text-[#5a5448]">
                        <span className="text-[10px] font-mono uppercase text-center px-4">No Image</span>
                      </div>
                    )}

                    {sourcePreviewImages.length > 0 && (() => {
                      // Grouped thumbnails: what sells (mockups), what informs
                      // (info images), and what IS the product (sources)
                      const indexed = sourcePreviewImages.map((preview, index) => ({ preview, index }));
                      const groups = [
                        { label: 'Mockups', items: indexed.filter(e => e.preview.id.startsWith('mockup-')) },
                        { label: 'Info Images', items: indexed.filter(e => e.preview.id.startsWith('extra-')) },
                        { label: 'Art Sizes', items: indexed.filter(e => e.preview.id.startsWith('print-')) },
                      ];
                      return (
                        <div className="space-y-3 w-full max-w-[220px] mx-auto">
                          {groups.filter(group => group.items.length > 0).map(group => (
                            <div key={group.label} className="space-y-1">
                              <span className="text-[8px] font-mono uppercase tracking-widest text-[#8b8676] font-bold block select-none border-b border-[rgba(21,20,15,0.08)] pb-0.5">
                                {"▪ "}{group.label} ({group.items.length})
                              </span>
                              <div className="grid grid-cols-4 gap-1">
                                {group.items.map(({ preview, index }) => (
                                  <button
                                    type="button"
                                    key={preview.id}
                                    onClick={() => setSelectedPreviewIndex(index)}
                                    title={preview.label}
                                    className={`overflow-hidden rounded-md border p-0.5 text-left transition-colors cursor-pointer ${selectedPreview?.id === preview.id
                                      ? 'border-[#ed6f5c] bg-[#ed6f5c]/5'
                                      : 'border-[rgba(21,20,15,0.12)] bg-[#efe7d2]/40 hover:border-[#ed6f5c]/45'
                                      }`}
                                  >
                                    <div className="aspect-[4/3] rounded overflow-hidden bg-[#ece4cf]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={preview.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <Card className="shrink-0 bg-[#efe7d2]/55 p-2.5 border border-[rgba(21,20,15,0.12)] rounded-xl shadow-none space-y-2">
                    <div>
                      <h4 className="text-[11px] font-serif font-medium text-[#15140f] leading-none">Compiled Etsy Package</h4>
                      <p className="text-[9px] text-[#5a5448] mt-0.5 leading-tight">
                        Includes {sourcePreviewImages.length} image{sourcePreviewImages.length === 1 ? '' : 's'} &amp; {activeProduct.files?.length || 0} deliverable{activeProduct.files?.length === 1 ? '' : 's'}.
                      </p>
                    </div>

                    {/* The print sizes were missing from this panel entirely — the
                        one screen for reviewing a draft before it goes to the shop
                        said nothing about the files the buyer actually receives.
                        A set makes it obvious: eighteen renders overflow Etsy's
                        five-file allowance and come back as a single archive, so
                        "3 deliverables" above was counting staged files, not these. */}
                    {printFiles.length > 0 && (
                      /* One line, not a list. A set of five artworks makes
                         thirty of these, and spelling them out pushed the
                         title, the description and the tags — the things this
                         screen exists to review — off the bottom. The names
                         are worth having, not worth the column: they hang off
                         the hover instead. */
                      <div
                        className="pt-1.5 border-t border-[rgba(21,20,15,0.12)] flex items-baseline justify-between gap-2 cursor-help"
                        title={printFiles
                          .map(file => `${file.fileName}  ${file.bytes >= 1048576
                            ? `${(file.bytes / 1048576).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(file.bytes / 1024))} KB`}`)
                          .join('\n')}
                      >
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] font-bold">
                          Art Sizes
                        </span>
                        <span className="text-[9px] font-mono text-[#8b8676]">
                          {printFiles.length} file{printFiles.length === 1 ? '' : 's'} ·{' '}
                          {Math.round(printFiles.reduce((sum, f) => sum + f.bytes, 0) / 1048576)}MB
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <Button
                        onClick={() => {
                          if (selectedPreview) {
                            const link = document.createElement('a');
                            link.href = selectedPreview.image;
                            link.download = selectedPreview.label;
                            link.click();
                            toast.success(`${selectedPreview.label} downloaded!`);
                          }
                        }}
                        disabled={!selectedPreview}
                        size="xs"
                        className="w-full bg-[#f7f1de] border border-[rgba(21,20,15,0.14)] hover:bg-[#ece4cf] text-[#15140f] font-mono text-[9px] py-1.5 rounded-md uppercase tracking-wider cursor-pointer"
                        variant="outline"
                      >
                        <Download className="w-3 h-3 mr-1 text-[#ed6f5c]" /> Download Selected
                      </Button>
                      <Button
                        onClick={() => handleDownloadZipPackage(activeProduct)}
                        disabled={isPackingZip}
                        size="xs"
                        className="w-full bg-transparent border border-[#ed6f5c]/35 text-[#ed6f5c] hover:bg-[#ed6f5c]/10 font-mono text-[9px] py-1.5 rounded-md uppercase tracking-wider cursor-pointer"
                        variant="outline"
                      >
                        {isPackingZip ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Packing...</>
                        ) : (
                          <><FileCode className="w-3 h-3 mr-1" /> Get ZIP Package</>
                        )}
                      </Button>
                    </div>
                  </Card>
                </section>

                {/* COLUMN 2: Editable Title, Description, and Tags (Width: flex-1) */}
                <section className="space-y-3.5 flex flex-col h-full overflow-hidden">
                  {/* Title Area */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex justify-between items-center">
                      <Label className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider font-bold">SEO Optimized Title</Label>
                      <button onClick={() => handleCopyText(activeProduct.title || '', 'Title')} className="text-[9px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer">
                        <Copy className="w-2.5 h-2.5" /> Copy Title
                      </button>
                    </div>
                    <textarea
                      value={activeProduct.title || ''}
                      onChange={(e) => handleUpdateActiveProduct('title', e.target.value)}
                      className="w-full h-14 rounded-xl border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]/35 p-3 text-xs leading-snug font-serif text-[#15140f] focus:outline-none focus:border-[#ed6f5c] resize-none"
                      placeholder="Enter optimized product title..."
                    />
                  </div>

                  {/* Description Area - flexible height */}
                  <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider font-bold">Sales Copy Description</Label>
                        <div className="inline-flex rounded-md border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]/20 p-0.5 select-none shrink-0 font-mono text-[8px]">
                          <button
                            type="button"
                            onClick={() => setDescTab('edit')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer uppercase ${descTab === 'edit' ? 'bg-[#ed6f5c] text-white font-bold' : 'text-[#8b8676] hover:text-[#15140f]'}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDescTab('preview')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer uppercase ${descTab === 'preview' ? 'bg-[#ed6f5c] text-white font-bold' : 'text-[#8b8676] hover:text-[#15140f]'}`}
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                      <button onClick={() => handleCopyText(activeProduct.description || '', 'Description')} className="text-[9px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer">
                        <Copy className="w-2.5 h-2.5" /> Copy Desc
                      </button>
                    </div>
                    {descTab === 'preview' ? (
                      <div className="w-full flex-1 rounded-xl border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]/35 p-3.5 text-xs text-[#5a5448] overflow-y-auto leading-relaxed select-text text-left">
                        {renderFormattedDescription(activeProduct.description || '')}
                      </div>
                    ) : (
                      <textarea
                        value={activeProduct.description || ''}
                        onChange={(e) => handleUpdateActiveProduct('description', e.target.value)}
                        className="w-full flex-1 rounded-xl border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]/35 p-3 text-xs text-[#5a5448] leading-relaxed focus:outline-none focus:border-[#ed6f5c] resize-none overflow-y-auto"
                        placeholder="Enter optimized product description..."
                      />
                    )}
                  </div>

                  {/* Tags Area - fixed height: h-[140px] flex-none */}
                  <div className="h-[140px] flex-none flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider font-bold">Tag Keywords ({(activeProduct.tags || []).length} / 13)</Label>
                      <button onClick={() => handleCopyText((activeProduct.tags || []).join(', '), 'Tags list')} className="text-[9px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer">
                        <Copy className="w-2.5 h-2.5" /> Copy Tags
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto border border-[rgba(21,20,15,0.12)] bg-[#efe7d2]/20 p-2 rounded-xl flex flex-wrap gap-1 content-start">
                      {(activeProduct.tags || []).map((tag, i) => (
                        <span key={i} className="text-[9px] bg-[#efe7d2] text-[#5a5448] border border-[rgba(21,20,15,0.12)] px-2 py-0.5 rounded-full font-mono uppercase font-bold flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = (activeProduct.tags || []).filter((_, idx) => idx !== i);
                              handleUpdateActiveProduct('tags', newTags);
                            }}
                            className="text-[#ed6f5c] hover:text-[#e25e4a] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(activeProduct.tags || []).length < 13 && (
                        <input
                          type="text"
                          placeholder="+ Add tag..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value.trim().toLowerCase();
                              if (val && !(activeProduct.tags || []).includes(val)) {
                                handleUpdateActiveProduct('tags', [...(activeProduct.tags || []), val]);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          className="text-[9px] bg-transparent border-0 outline-none text-[#15140f] font-mono uppercase font-bold w-20 px-1 py-0.5"
                        />
                      )}
                    </div>
                  </div>
                </section>

                {/* COLUMN 3: Detailed Etsy Listing Fields Form (Width: 460px) */}
                <section className="space-y-3 flex flex-col h-full overflow-y-auto pr-1">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-[0.18em] font-bold">Etsy Parameters</span>
                    <h3 className="text-xs font-serif font-medium text-[#15140f]">Listing Metadata Config</h3>
                  </div>

                  <div className="bg-[#efe7d2]/55 border border-[rgba(21,20,15,0.12)] rounded-xl p-3 space-y-2.5 font-sans text-xs flex-1">
                    {/* Price and Quantity row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Price ($)</Label>
                        <input
                          type="number"
                          step="0.01"
                          value={activeProduct.price || 5.95}
                          onChange={(e) => handleUpdateActiveProduct('price', parseFloat(e.target.value) || 0)}
                          className="w-full h-8 px-2 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Quantity</Label>
                        <input
                          type="number"
                          value={activeProduct.quantity || 999}
                          onChange={(e) => handleUpdateActiveProduct('quantity', parseInt(e.target.value) || 1)}
                          className="w-full h-8 px-2 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Listing Type & Renewal Options */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Listing Type</Label>
                        <select
                          value={activeProduct.listingType || 'digital'}
                          onChange={(e) => handleUpdateActiveProduct('listingType', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="digital">Digital Product</option>
                          <option value="physical">Physical Product</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Renewal</Label>
                        <select
                          value={activeProduct.renewalOption || 'manual'}
                          onChange={(e) => handleUpdateActiveProduct('renewalOption', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="manual">Manual Renewal</option>
                          <option value="automatic">Auto Renewal</option>
                        </select>
                      </div>
                    </div>

                    {/* Who Made It & When was it made */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Who Made It?</Label>
                        <select
                          value={activeProduct.whoMade || 'i_did'}
                          onChange={(e) => handleUpdateActiveProduct('whoMade', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="i_did">I did (Handmade)</option>
                          <option value="collective">Shop member</option>
                          <option value="someone_else">Another company</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">When was it made?</Label>
                        <select
                          value={activeProduct.whenMade || '2020_2026'}
                          onChange={(e) => handleUpdateActiveProduct('whenMade', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="2020_2026">Recent (2020 - 2026)</option>
                          <option value="2010_2019">2010s (2010 - 2019)</option>
                          <option value="before_2010">Vintage (Before 2010)</option>
                          <option value="made_to_order">Made to Order</option>
                        </select>
                      </div>
                    </div>

                    {/* Etsy Section & Shipping Profile */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Etsy Store Section</Label>
                        <select
                          value={activeProduct.category || 'digital_art'}
                          onChange={(e) => handleUpdateActiveProduct('category', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="digital_art">Digital Art Prints</option>
                          <option value="planners">Planners &amp; Templates</option>
                          <option value="presets">Lightroom Presets</option>
                          <option value="graphics">PNG / SVG Packs</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Shipping Profile</Label>
                        <select
                          value={activeProduct.shippingProfile || 'free_digital'}
                          onChange={(e) => handleUpdateActiveProduct('shippingProfile', e.target.value)}
                          disabled={activeProduct.listingType !== 'physical'}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none disabled:opacity-50"
                        >
                          <option value="free_digital">Free Delivery (Digital)</option>
                          <option value="standard_us">US Standard ($3.99)</option>
                          <option value="worldwide">Worldwide Shipping</option>
                        </select>
                      </div>
                    </div>

                    {/* Product Class (isSupply) & SKU */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Product Class</Label>
                        <select
                          value={activeProduct.isSupply ? 'supply' : 'finished'}
                          onChange={(e) => handleUpdateActiveProduct('isSupply', e.target.value === 'supply')}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="finished">Finished Product</option>
                          <option value="supply">Supply or Tool</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">SKU Code</Label>
                        <input
                          type="text"
                          value={activeProduct.sku || ''}
                          onChange={(e) => handleUpdateActiveProduct('sku', e.target.value)}
                          placeholder="e.g. WOOD-FRAME-01"
                          className="w-full h-8 px-2 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none placeholder-[#8b8676]/65"
                        />
                      </div>
                    </div>

                    {/* Primary & Secondary Colors */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Primary Color</Label>
                        <select
                          value={activeProduct.primaryColor || ''}
                          onChange={(e) => handleUpdateActiveProduct('primaryColor', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="beige">Beige</option>
                          <option value="black">Black</option>
                          <option value="blue">Blue</option>
                          <option value="brown">Brown</option>
                          <option value="gold">Gold</option>
                          <option value="gray">Gray</option>
                          <option value="green">Green</option>
                          <option value="orange">Orange</option>
                          <option value="pink">Pink</option>
                          <option value="purple">Purple</option>
                          <option value="red">Red</option>
                          <option value="silver">Silver</option>
                          <option value="white">White</option>
                          <option value="yellow">Yellow</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Secondary Color</Label>
                        <select
                          value={activeProduct.secondaryColor || ''}
                          onChange={(e) => handleUpdateActiveProduct('secondaryColor', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="beige">Beige</option>
                          <option value="black">Black</option>
                          <option value="blue">Blue</option>
                          <option value="brown">Brown</option>
                          <option value="gold">Gold</option>
                          <option value="gray">Gray</option>
                          <option value="green">Green</option>
                          <option value="orange">Orange</option>
                          <option value="pink">Pink</option>
                          <option value="purple">Purple</option>
                          <option value="red">Red</option>
                          <option value="silver">Silver</option>
                          <option value="white">White</option>
                          <option value="yellow">Yellow</option>
                        </select>
                      </div>
                    </div>

                    {/* Occasion & Holiday */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Occasion</Label>
                        <select
                          value={activeProduct.occasion || ''}
                          onChange={(e) => handleUpdateActiveProduct('occasion', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="anniversary">Anniversary</option>
                          <option value="birthday">Birthday</option>
                          <option value="baby_shower">Baby Shower</option>
                          <option value="graduation">Graduation</option>
                          <option value="mothers_day">{"Mother's Day"}</option>
                          <option value="fathers_day">{"Father's Day"}</option>
                          <option value="housewarming">Housewarming</option>
                          <option value="wedding">Wedding</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Holiday</Label>
                        <select
                          value={activeProduct.holiday || ''}
                          onChange={(e) => handleUpdateActiveProduct('holiday', e.target.value)}
                          className="w-full h-8 px-1.5 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="christmas">Christmas</option>
                          <option value="easter">Easter</option>
                          <option value="halloween">Halloween</option>
                          <option value="hanukkah">Hanukkah</option>
                          <option value="thanksgiving">Thanksgiving</option>
                          <option value="valentines_day">{"Valentine's Day"}</option>
                        </select>
                      </div>
                    </div>

                    {/* Personalization Enabled & Production Partners */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex items-center gap-2 pt-3">
                        <input
                          type="checkbox"
                          id="personalizationCheckbox"
                          checked={activeProduct.personalizationEnabled || false}
                          onChange={(e) => handleUpdateActiveProduct('personalizationEnabled', e.target.checked)}
                          className="w-4 h-4 accent-[#ed6f5c] rounded border-[rgba(21,20,15,0.16)] bg-[#f7f1de] cursor-pointer"
                        />
                        <Label htmlFor="personalizationCheckbox" className="text-[9px] font-mono uppercase text-[#8b8676] font-bold select-none cursor-pointer">Personalization</Label>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Production Partner</Label>
                        <input
                          type="text"
                          value={activeProduct.productionPartners || ''}
                          onChange={(e) => handleUpdateActiveProduct('productionPartners', e.target.value)}
                          placeholder="e.g. Printify, None"
                          className="w-full h-8 px-2 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none placeholder-[#8b8676]/65"
                        />
                      </div>
                    </div>

                    {/* Personalization Instructions */}
                    {activeProduct.personalizationEnabled && (
                      <div className="space-y-1">
                        <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Instructions to Buyer</Label>
                        <textarea
                          value={activeProduct.personalizationInstructions || ''}
                          onChange={(e) => handleUpdateActiveProduct('personalizationInstructions', e.target.value)}
                          placeholder="Provide personalization instructions for buyers..."
                          className="w-full h-10 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs p-2 focus:outline-none resize-none"
                        />
                      </div>
                    )}

                    {/* Materials used */}
                    <div className="space-y-1">
                      <Label className="text-[9px] font-mono uppercase text-[#8b8676] font-bold">Materials (comma separated)</Label>
                      <input
                        type="text"
                        value={activeProduct.materials || ''}
                        onChange={(e) => handleUpdateActiveProduct('materials', e.target.value)}
                        placeholder="e.g. paper, matte finish, digital download"
                        className="w-full h-8 px-2 rounded-lg border border-[rgba(21,20,15,0.14)] bg-[#f7f1de] text-[#15140f] text-xs focus:outline-none placeholder-[#8b8676]/65"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          <div className="shrink-0 px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-[rgba(21,20,15,0.12)] bg-[#f5efdc] font-sans">

            {/* Direct Link live on Etsy if published */}
            {activeProduct?.status === 'published' && activeProduct.listingUrl ? (
              <a
                href={activeProduct.listingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#ed6f5c] hover:underline font-mono tracking-wide font-medium flex items-center gap-1.5"
              >
                <span>🌐 View live Etsy Listing Manager</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : <div />}

            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
              <Button variant="ghost" className="text-[#5a5448] hover:bg-[#ece4cf] hover:text-[#15140f] text-xs font-mono uppercase tracking-wider cursor-pointer rounded-lg px-5" onClick={() => setIsDialogOpen(false)}>Close Review</Button>

              {selectedMode === 'etsy' ? (
                activeProduct?.status === 'published' ? (
                  <Button variant="outline" disabled className="text-[#6e7448] border-[#6e7448]/35 bg-[#efe7d2] font-mono text-xs uppercase tracking-wider rounded-lg px-6">
                    <Check className="w-4 h-4 mr-1 text-[#6e7448]" /> Active Draft Added
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (activeProduct) publishToEtsySnapshot(activeProduct);
                    }}
                    disabled={activeProduct?.status === 'publishing'}
                    className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-xs rounded-full px-6 transition-colors uppercase tracking-wider cursor-pointer border-0"
                  >
                    {activeProduct?.status === 'publishing' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Syncing API...
                      </>
                    ) : 'Publish Draft Direct to Shop'}
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => {
                    toast.success("Successfully marked listing draft as completed locally!");
                    setIsDialogOpen(false);
                  }}
                  className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-xs rounded-full px-6 transition-colors uppercase tracking-wider cursor-pointer border-0"
                >
                  Mark Completed Task
                </Button>
              )}
            </div>

          </div>


        </DialogContent>
      </Dialog>
  );
}

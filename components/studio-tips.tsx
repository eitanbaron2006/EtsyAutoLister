'use client';

import { useEffect, useState } from 'react';
import { Bookmark, ChevronRight, Sparkles } from 'lucide-react';

// Gentle rotating usage tips — turns leftover dialog space into guidance
const STUDIO_TIPS = [
  'The first mockup is always your Etsy cover — it comes from a MAIN template matched to your artwork\'s orientation.',
  'Stretch fills frames edge-to-edge but can distort proportions — switch Fit Mode to Cover when faces or logos look off.',
  'Pick exactly one template in the Studio to unlock the frame picker and pin each set image to a numbered frame.',
  'Bulk flow: stage sets and singles together, hit Create once, then "Compile All" runs the pipeline product after product.',
  'Sources and renders are saved in this browser — a refresh won\'t lose them, but other devices won\'t see them.',
  'Re-render a single mockup from the Studio gallery (the history icon) — it keeps the same template and frame layout.',
  'Etsy allows up to 20 photos per listing: mockups go first, then info images, then your source files.',
  'Drop "What\'s included" and size-chart images into the listing-extras folder — they attach to every product of that type automatically.',
  '"Get ZIP Package" in the draft review bundles mockups, info images, sources and the listing copy into one download.',
  'In the fullscreen viewer you can move between photos with the arrows, your keyboard, the mouse wheel or the filmstrip.'
];

type TipSaveProps = { savedTips: string[]; onToggleSave: (tip: string) => void };

// Small bookmark toggle reused by both tip components
function TipSaveButton({ tip, savedTips, onToggleSave, size = 'sm' }: TipSaveProps & { tip: string; size?: 'sm' | 'md' }) {
  const isSaved = savedTips.includes(tip);
  const box = size === 'md' ? 'w-7 h-7' : 'w-6 h-6';
  const icon = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <button
      type="button"
      onClick={() => onToggleSave(tip)}
      className={`${box} rounded-full border flex items-center justify-center cursor-pointer transition-colors ${isSaved
        ? 'bg-[#ed6f5c] border-[#ed6f5c] text-white hover:bg-[#e25e4a]'
        : 'bg-[#f7f1de] dark:bg-[#12110c] border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] text-[#5a5448] dark:text-[#ece4cf] hover:text-[#ed6f5c] hover:border-[#ed6f5c]/40'}`}
      title={isSaved ? 'Remove from your account page' : 'Save to your account page'}
    >
      <Bookmark className={`${icon} ${isSaved ? 'fill-current' : ''}`} />
    </button>
  );
}

// Card-sized tip that fills leftover grid cells so odd counts look intentional
export function TipFillerCard({ offset = 0, savedTips, onToggleSave }: TipSaveProps & { offset?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(prev => prev + 1), 12000);
    return () => clearInterval(timer);
  }, []);
  const tipIndex = (offset + tick) % STUDIO_TIPS.length;
  return (
    <div
      className="studio-tip-filler"
      style={{ aspectRatio: '1 / 1.08', maxHeight: '100%' }}
    >
      <Sparkles className="studio-tip-filler__sparkle" />
      <span className="studio-tip-filler__label">{"▪ Studio Tip"}</span>
      <span className="studio-tip-filler__text">{STUDIO_TIPS[tipIndex]}</span>
      <div className="studio-tip-filler__actions">
        <span className="studio-tip-filler__count">{tipIndex + 1}/{STUDIO_TIPS.length}</span>
        <TipSaveButton tip={STUDIO_TIPS[tipIndex]} savedTips={savedTips} onToggleSave={onToggleSave} />
        <button
          type="button"
          onClick={() => setTick(prev => prev + 1)}
          className="w-6 h-6 rounded-full bg-[#f7f1de] dark:bg-[#12110c] border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] text-[#5a5448] dark:text-[#ece4cf] hover:text-[#ed6f5c] hover:border-[#ed6f5c]/40 flex items-center justify-center cursor-pointer transition-colors"
          title="Next tip"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Large enclosed tips zone — its CSS adapts between a spacious panel and a
// compact strip when the gallery leaves only a shallow area below.
export function TipPanel({ savedTips, onToggleSave }: TipSaveProps) {
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % STUDIO_TIPS.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="studio-tip-panel-shell">
      <div className="studio-tip-panel">
        <div className="studio-tip-panel__label">
          <Sparkles className="studio-tip-panel__sparkle" />
          <span>{"▪ Studio Tip"}</span>
        </div>
        <p className="studio-tip-panel__text">{STUDIO_TIPS[tipIndex]}</p>
        <div className="studio-tip-panel__actions">
          <span className="studio-tip-panel__count">{tipIndex + 1}/{STUDIO_TIPS.length}</span>
          <TipSaveButton tip={STUDIO_TIPS[tipIndex]} savedTips={savedTips} onToggleSave={onToggleSave} size="md" />
          <button
            type="button"
            onClick={() => setTipIndex(prev => (prev + 1) % STUDIO_TIPS.length)}
            className="w-7 h-7 rounded-full bg-[#f7f1de] dark:bg-[#12110c] border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] text-[#5a5448] dark:text-[#ece4cf] hover:text-[#ed6f5c] hover:border-[#ed6f5c]/40 flex items-center justify-center cursor-pointer transition-colors"
            title="Next tip"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}


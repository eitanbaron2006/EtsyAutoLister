'use client';

// Landing-page interactive sandbox demo (self-contained).
import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

const SANDBOX_ITEMS = [
  {
    id: 'botanical',
    label: ' botanical illustrations pack',
    title: 'Vintage Botanical Fern Prints Set of 3 — Watercolor Fern Wall Art Printables',
    productClass: 'Printable Wall Art',
    price: 12.50,
    tags: ['botanical prints', 'watercolor fern', 'vintage poster', 'green wall art', 'herb set decor', 'printable art', 'nature gallery', 'fern illustration', 'farmhouse decor', 'office wall art', 'cottagecore print', 'rustic foliage', 'digital download'],
    mockText: 'Vibrant vintage watercolor landscape in rustic bedroom wooden frame, perfect downloadable product.',
    assets: ['fern_watercolor_01.pdf', 'fern_watercolor_02.pdf', 'framed_canvas_preview.jpg'],
    mockImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80'
  },
  {
    id: 'planner',
    label: ' kinfolk undated planner',
    title: 'Kinfolk Minimal Daily Planner PDF — Aesthetic Digital Organizer & Bullet Agenda',
    productClass: 'Daily Planner Notebook',
    price: 6.95,
    tags: ['daily planner', 'minimalist agenda', 'kinfolk style', 'digital organizer', 'goodnotes planner', 'aesthetic journal', 'ipad notebook', 'adhd focal tool', 'printable pdf', 'lifestyle tracker', 'weekly agenda', 'monthly scheduler', 'undated tracker'],
    mockText: 'Minimalist layout sheet on standard gray tablet showing undated time columns and an editorial high-contrast charcoal grid.',
    assets: ['nordic_weekly_agenda.pdf', 'daily_focal_tracker.pdf', 'ipad_tablet_mockup.jpg'],
    mockImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&q=80'
  },
  {
    id: 'presets',
    label: ' nordic coffee lightroom preset',
    title: 'Nordic Coffee Warm Lightroom Presets — Editorial Vintage Cozy Filters for Mobile & Desktop',
    productClass: 'Lightroom Presets DNG',
    price: 8.90,
    tags: ['lightroom presets', 'nordic coffee', 'cozy filter', 'editorial preset', 'vintage warm tone', 'instagram aesthetic', 'mobile preset dng', 'desktop lrtemplate', 'cafe photo filter', 'warm wood style', 'earthy lifestyle', 'creative blogging', 'portrait color preset'],
    mockText: 'Before/After splits of a cozy coffee house scene transformed with deep mahogany shadows and soft warm cream highlights.',
    assets: ['nordic_moody_warm.dng', 'editorial_cafe_vintage.lrtemplate', 'before_after_split.jpg'],
    mockImage: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=500&q=80'
  }
];

export function SandboxPlayground({ darkMode }: { darkMode?: boolean }) {
  const [activeTab, setActiveTab] = useState('botanical');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [step, setStep] = useState(3); // 0: scanning, 1: layout, 2: context, 3: ready

  const currentItem = SANDBOX_ITEMS.find(item => item.id === activeTab) || SANDBOX_ITEMS[0];

  const triggerSynthesis = (tabId: string) => {
    setActiveTab(tabId);
    setIsSynthesizing(true);
    setStep(0);

    // Simulate pipeline steps
    const timer1 = setTimeout(() => setStep(1), 800);
    const timer2 = setTimeout(() => setStep(2), 1600);
    const timer3 = setTimeout(() => {
      setStep(3);
      setIsSynthesizing(false);
    }, 2400);
  };

  return (
    <section id="sandbox" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
      <div className="sec-rule text-left">
        <span className="roman">I.A</span>
        <span className="meta-grp">
          <span>Interactive Sandbox</span>
          <span className="dot-mark">•</span>
          <span>Open Utility Workspace</span>
        </span>
        <span>001 / 008</span>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12" data-reveal="">
        <div className="space-y-3 max-w-xl text-left">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase block font-sans">
            {"▪ INTERACTIVE TOOL SANDBOX"}
          </span>
          <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-tight">
            <strong>See the layout parser </strong><br /><strong>and </strong><em>SEO engine in action</em><span className="h-dot">.</span>
          </h2>
        </div>
        <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] max-w-sm leading-relaxed text-left font-sans">
          Select an asset class below to witness how the system scans catalogs, layouts mockup frames, maps ratios, and writes digital listings context.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch font-sans" data-reveal="">
        {/* Left column: Selector & Progress */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          <div className="space-y-3.5">
            <span className="text-[9px] font-mono uppercase text-[#8b8676] dark:text-[#a39e8f] tracking-widest block font-bold font-sans">{"▪ 1. CHOOSE SAMPLE PRODUCT"}</span>
            <div className="flex flex-col gap-2.5">
              {SANDBOX_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => triggerSynthesis(item.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${activeTab === item.id
                    ? 'bg-[#ece4cf]/60 border-[#ed6f5c]/40 text-[#15140f] dark:bg-[#1a1914]/80 dark:border-[#ed6f5c] dark:text-[#f7f1de] font-semibold'
                    : 'bg-[#efe7d2]/40 border-[rgba(21,20,15,0.10)] dark:bg-[#22211b]/40 dark:border-[rgba(247,241,222,0.10)] text-[#5a5448] dark:text-[#ece4cf] hover:bg-[#ece4cf]/30 dark:hover:bg-[#1a1914]/50'
                    }`}
                >
                  <span className="font-mono lowercase">{item.label}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === item.id ? 'translate-x-1 text-[#ed6f5c]' : 'text-[#8b8676] dark:text-[#a39e8f]'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Core Pipeline Log Monitor */}
          <div className="bg-[#ece4cf]/35 dark:bg-[#1a1914]/50 border border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.12)] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)] font-sans">
              <span className="text-[9px] font-mono uppercase text-[#8b8676] dark:text-[#a39e8f] tracking-widest font-bold">{"▪ PIPELINE TELEMETRY"}</span>
              <span className="text-[8px] bg-[#fbfaee] dark:bg-[#12110c] text-[#15140f] dark:text-[#f7f1de] px-1.5 py-0.5 rounded border border-[rgba(21,20,15,0.06)] dark:border-[rgba(247,241,222,0.10)] font-mono font-bold uppercase select-none">
                {isSynthesizing ? 'ACTIVE' : 'READY'}
              </span>
            </div>

            <div className="space-y-3 font-mono text-[10px] text-left">
              <div className="flex items-center gap-2.5 select-none">
                <span className={`w-2 h-2 rounded-full ${step >= 0 ? 'bg-[#ed6f5c]' : 'bg-[#ddd2b6] dark:bg-[#44423a]'} ${isSynthesizing && step === 0 ? 'animate-ping' : ''}`} />
                <span className={step === 0 ? 'text-[#15140f] dark:text-[#f7f1de] font-bold' : 'text-[#8b8676] dark:text-[#a39e8f]'}>[01] INGEST & EXTRACT LOCAL FILES</span>
              </div>
              <div className="flex items-center gap-2.5 select-none">
                <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-[#ed6f5c]' : 'bg-[#ddd2b6] dark:bg-[#44423a]'} ${isSynthesizing && step === 1 ? 'animate-ping' : ''}`} />
                <span className={step === 1 ? 'text-[#15140f] dark:text-[#f7f1de] font-bold' : 'text-[#8b8676] dark:text-[#a39e8f]'}>[02] COMPILE MOCKUP TEMPLATE</span>
              </div>
              <div className="flex items-center gap-2.5 select-none">
                <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-[#ed6f5c]' : 'bg-[#ddd2b6] dark:bg-[#44423a]'} ${isSynthesizing && step === 2 ? 'animate-ping' : ''}`} />
                <span className={step === 2 ? 'text-[#15140f] dark:text-[#f7f1de] font-bold' : 'text-[#8b8676] dark:text-[#a39e8f]'}>[03] EVALUATE GEMINI COPYWRITING</span>
              </div>
              <div className="flex items-center gap-2.5 select-none">
                <span className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-[#6e7448] dark:bg-[#9ea671]' : 'bg-[#ddd2b6] dark:bg-[#44423a]'} ${isSynthesizing && step === 3 ? 'animate-ping' : ''}`} />
                <span className={step === 3 ? 'text-[#6e7448] dark:text-[#9ea671] font-bold' : 'text-[#8b8676] dark:text-[#a39e8f]'}>[04] DRAFT SYNCED SUCCESSFULLY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Formatted Metadata Output */}
        <div className={`lg:col-span-8 ${darkMode ? 'bg-[#1a1914]/40 border-[rgba(247,241,222,0.12)]' : 'bg-[#ece4cf]/25 border-[rgba(21,20,15,0.14)]'} rounded-2xl p-6 flex flex-col justify-between relative min-h-[400px]`}>
          {isSynthesizing ? (
            <div className={`absolute inset-0 ${darkMode ? 'bg-[#12110c]/85' : 'bg-[#efe7d2]/80'} backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center rounded-2xl z-20`}>
              <Loader2 className="w-8 h-8 text-[#ed6f5c] animate-spin mb-4" />
              <h4 className={`text-sm font-serif font-medium ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>Synthesizing {currentItem.productClass} Catalog...</h4>
              <p className={`text-[10px] ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-mono mt-1 uppercase tracking-wider`}>Estimated completion time: 2.4s</p>
            </div>
          ) : null}

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)] font-sans">
              <div>
                <span className="text-[9px] font-mono uppercase text-[#8b8676] dark:text-[#a39e8f] tracking-widest block font-bold">{"▪ DELIVERABLE COMPILATION PACKAGE"}</span>
                <span className={`text-xs font-serif font-medium ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} mt-1 block`}>
                  Class: <span className="text-[#ed6f5c] font-normal italic">{currentItem.productClass}</span>
                </span>
              </div>
              <span className="text-[10.5px] font-sans font-medium tracking-wide bg-[#ed6f5c]/10 text-[#ed6f5c] border border-[#ed6f5c]/20 px-3 py-1 rounded-full self-start sm:self-center select-none">
                Est: ${currentItem.price.toFixed(2)} USD
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-2">
              {/* Product Visual */}
              <div className="md:col-span-5 space-y-2.5 text-left font-sans">
                <span className="text-[9px] font-mono uppercase text-[#8b8676] dark:text-[#a39e8f] tracking-widest block font-bold">{"▪ 2. COMPILED MOCKUP THUMB"}</span>
                <div className={`relative aspect-[4/3] rounded-xl overflow-hidden border ${darkMode ? 'border-[rgba(247,241,222,0.16)] bg-[#12110c]' : 'border-[rgba(21,20,15,0.16)] bg-[#efe7d2]'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentItem.mockImage} alt={currentItem.title} className="w-full h-full object-cover grayscale-[10%] hover:scale-105 transition-transform duration-300 pointer-events-none" />
                  <div className="absolute top-2 left-2 bg-[#ed6f5c] text-white text-[8px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-sm select-none animate-fade-in">
                    Render Match
                  </div>
                </div>
                <div className={`p-3 border rounded-lg text-[9px] font-mono select-none ${darkMode ? 'bg-[#1a1914]/60 border-[rgba(247,241,222,0.10)] text-[#ece4cf]' : 'bg-[#ece4cf]/50 border-[rgba(21,20,15,0.10)] text-[#5a5448]'}`}>
                  <span className={`font-bold uppercase block mb-1 font-sans ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>Source Assets Local List:</span>
                  <ul className="list-disc pl-3.5 space-y-1 font-sans">
                    {currentItem.assets.map((asset, idx) => (
                      <li key={idx} className="truncate">{asset}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Product AI Metapairings */}
              <div className="md:col-span-7 space-y-4 text-left font-sans">
                <div className="space-y-1.5 font-sans">
                  <span className="text-[9px] font-mono uppercase text-[#8b8676] dark:text-[#a39e8f] tracking-widest block font-bold">{"▪ 3. FORMULATED SEO TITLE"}</span>
                  <div className={`text-xs font-serif font-medium ${darkMode ? 'text-[#f7f1de] bg-[#1a1914]/60 border-[rgba(247,241,222,0.12)]' : 'text-[#15140f] bg-[#efe7d2]/60 border-[rgba(21,20,15,0.12)]'} p-2.5 rounded-lg leading-relaxed select-none`}>
                    {currentItem.title}
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <span className="text-[9px] font-mono uppercase text-[#8b8676] dark:text-[#a39e8f] tracking-widest block font-bold">{"▪ 4. ESTABLISHED TAGS COMPLEMENT (13)"}</span>
                  <div className="flex flex-wrap gap-1">
                    {currentItem.tags.map((tag, idx) => (
                      <span key={idx} className={`text-[8.5px] font-mono uppercase font-bold ${darkMode ? 'text-[#ece4cf] bg-[#22211b]/80 border-[rgba(247,241,222,0.12)]' : 'text-[#5a5448] bg-[#efe7d2]/70 border-[rgba(21,20,15,0.12)]'} px-2 py-0.5 rounded select-none`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 border-t ${darkMode ? 'border-[rgba(247,241,222,0.10)]' : 'border-[rgba(21,20,15,0.10)]'} pt-4 mt-6 leading-none select-none`}>
            <span className="w-2 h-2 rounded-full bg-[#6e7448] dark:bg-[#9ea671] animate-pulse" />
            <span className="text-[9px] text-[#8b8676] dark:text-[#a39e8f] font-mono uppercase">Full automated lifecycle generated client-side locally in the browser frame.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

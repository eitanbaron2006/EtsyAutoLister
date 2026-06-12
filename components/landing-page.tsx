'use client';

// Logged-out marketing landing page. Extracted mechanically from Home —
// prop names mirror the original state/handler names.
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowRight,
  Camera,
  Layers,
  Layers2,
  Moon,
  Plus,
  Sparkles,
  Store,
  Sun,
  User
} from 'lucide-react';
import { SandboxPlayground } from '@/components/sandbox-playground';
import { ScrollToTop } from '@/components/scroll-to-top';

export type LabFilter = 'all' | 'wallart' | 'presets' | 'stickers' | 'planners';

export function LandingPage({
  darkMode,
  toggleDarkMode,
  handleGoogleSignIn,
  activeLabFilter,
  setActiveLabFilter
}: {
  darkMode: boolean;
  toggleDarkMode: () => void;
  handleGoogleSignIn: () => void;
  activeLabFilter: LabFilter;
  setActiveLabFilter: (filter: LabFilter) => void;
}) {
  return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-[#12110c] text-[#f7f1de]' : 'bg-[#efe7d2] text-[#15140f]'} font-sans flex flex-col justify-between relative transition-colors duration-300`}>
        {/* Paper texture overlay */}
        <div
          className={`fixed inset-0 pointer-events-none mix-blend-multiply opacity-90 ${darkMode ? 'hidden' : 'block'}`}
          style={{
            zIndex: 15,
            backgroundImage: `radial-gradient(circle at 12% 18%, rgba(106, 92, 56, 0.07) 0, transparent 28%), radial-gradient(circle at 88% 72%, rgba(106, 92, 56, 0.06) 0, transparent 32%), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
            backgroundSize: 'auto, auto, 240px 240px'
          }}
        />

        {/* Side Rails */}
        <div className="side-rail right hidden xl:flex z-40">
          <span className="rail-text">Etsy AutoLister — {darkMode ? "NIGHT ARCHIVE" : "DAY ARCHIVE"} · Vol. 01 · Issue Nº 26</span>
        </div>
        <div className="side-rail left hidden xl:flex z-40">
          <span className="rail-text">Mockups · Keywords · Tags · SEO · Instant Publishing</span>
        </div>

        {/* Topbar strip (natural document flow, not sticky!) */}
        <div className="topbar w-full">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 topbar-inner">
            <span><b>{darkMode ? "NIGHT ZONE" : "AUTOLISTER"} / 2026</b> &nbsp;·&nbsp; Vol. 01 / Issue Nº 26</span>
            <span className="hidden md:inline-flex gap-6 font-mono text-[9px] uppercase tracking-wider text-[#8b8676]">
              <span>Filed under <b className="text-[#ed6f5c]">Etsy · Automation</b></span>
              <span>Production Mode · Secure Sync</span>
            </span>
            <span className="right col-end-auto">
              <span className="inline-flex items-center text-[10px] font-mono tracking-wider"><span className="pulse"></span>Live · v0.3.0</span>
            </span>
          </div>
        </div>

        {/* Headroom Sticky Header Navigation */}
        <header className="nav py-5 w-full">
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 flex items-center justify-between">
            <a href="#top" className="group flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <Store className="w-[1.4rem] h-[1.4rem] text-[#15140f] dark:text-[#f7f1de] group-hover:text-[#ed6f5c] transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3" />
              <span className="header-brand">
                Auto<em>Lister</em><span className="dot">.</span>
              </span>
            </a>
            {/* Navigation Menu Links */}
            <ul className="hidden lg:flex items-center gap-6 xl:gap-8 nav-links list-none m-0 p-0">
              <li><a href="#capabilities" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Features<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">01</span>
              </a></li>
              <li><a href="#playground" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Demo<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">02</span>
              </a></li>
              <li><a href="#metrics" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Metrics<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">03</span>
              </a></li>
              <li><a href="#about" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                About<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">04</span>
              </a></li>
              <li><a href="#systems" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Niches<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">05</span>
              </a></li>
              <li><a href="#labs" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Presets<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">06</span>
              </a></li>
              <li><a href="#workflow" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Workflow<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">07</span>
              </a></li>
              <li><a href="#portfolio" className="relative text-xs font-sans font-bold uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] hover:text-[#ed6f5c] transition-colors duration-180 cursor-pointer">
                Portfolio<span className="text-[8px] text-[#8b8676] dark:text-[#a39e8f] absolute -top-1 -right-3 tracking-normal font-mono font-normal">08</span>
              </a></li>
            </ul>

            <div className="flex items-center gap-3">
              {/* Premium Dark Mode Toggler on Landing Page header */}
              <button
                onClick={toggleDarkMode}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ed6f5c]/10 text-[#ed6f5c] border border-[#ed6f5c]/20 text-[10.5px] font-sans font-medium tracking-wide transition-all cursor-pointer hover:bg-[#ed6f5c]/15"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-[#ed6f5c]" /> : <Moon className="w-3.5 h-3.5 text-[#ed6f5c]" />}
                <span className="font-sans font-bold text-[9px] uppercase tracking-wider">{darkMode ? "Light Mode" : "Dark Mode"}</span>
              </button>


              <Button
                onClick={handleGoogleSignIn}
                size="sm"
                className={`bg-[#15140f] dark:bg-[#f7f1de] hover:bg-[#2a2620] dark:hover:bg-[#ece4cf] text-[#f7f1de] dark:text-[#15140f] border ${darkMode ? 'border-[rgba(247,241,222,0.16)]' : 'border-[#15140f]'} font-medium rounded-full px-5 py-1.5 text-xs transition-all shadow-[0_4px_12px_rgba(21,20,15,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(21,20,15,0.12)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:translate-y-0 cursor-pointer`}
              >
                Sign In
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section Container */}
        <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 sm:px-12 py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
            {/* Left Column: Main Hero Hook Copy */}
            <div className="lg:col-span-7 space-y-8 text-left flex flex-col items-start hero-copy">
              <div className="flex flex-col items-start gap-3.5" data-reveal="">
                <a
                  href="https://discord.gg/8X9v3JPr"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ed6f5c]/10 text-[#ed6f5c] border border-[#ed6f5c]/20 text-[10.5px] font-sans font-medium tracking-wide transition-all cursor-pointer hover:bg-[#ed6f5c]/15"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ed6f5c]" />
                  <span>Join Discord</span>
                </a>
                <div className="flex items-center gap-2 text-[10.5px] sm:text-[11px] font-sans uppercase tracking-[0.08em] font-semibold">
                  <span className="text-[#ed6f5c]">— OPEN-SOURCE DESIGN STUDIO</span>
                  <span className="text-[#8b8676] dark:text-[#a39e8f]">·</span>
                  <span className="text-[#8b8676] dark:text-[#a39e8f]">Nº 01</span>
                </div>
              </div>

              <h1 className="section-h2 text-4xl sm:text-5xl md:text-6xl lg:text-[3.8rem] xl:text-[4.75rem] text-[#15140f] dark:text-[#f7f1de] leading-[1.08] select-none text-left max-w-5xl" data-reveal="">
                <strong>Upload raw </strong><em>products,</em><strong> generate </strong><em>mockups &amp; metadata</em><strong> instantly</strong><span className="h-dot">.</span>
              </h1>

              <p className="text-[16px] sm:text-[17px] md:text-[18px] text-[#2a2620] dark:text-[#ece4cf] max-w-2xl text-left leading-[1.65] font-sans" data-reveal="">
                Skip multi-step designer work. Upload your raw JPEG designs, PDF art prints, Lightroom parameters, or planners, and AutoLister dynamically renders elegant mockup templates and complete optimized catalog structures in minutes.
              </p>

              {/* Action Buttons & Circles */}
              <div className="flex flex-col sm:flex-row gap-4 justify-start w-full sm:w-auto pt-2" data-reveal="">
                <Button
                  onClick={handleGoogleSignIn}
                  className="bg-[#ed6f5c] hover:bg-[#ef8171] text-white border-0 font-sans font-bold text-xs py-5 px-7 rounded-full shadow-[0_8px_30px_rgba(237,111,92,0.3)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_36px_rgba(237,111,92,0.45)] hover:-translate-y-1 active:translate-y-0 active:shadow-[0_8px_30px_rgba(237,111,92,0.3)] transition-all duration-300 inline-flex items-center gap-2 cursor-pointer"
                >
                  Star us on GitHub <ArrowRight className="w-3.5 h-3.5 -rotate-45" />
                </Button>

                <Button
                  onClick={handleGoogleSignIn}
                  className={`bg-[#efe7d2] dark:bg-[#1a1914] border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#efe7d2] hover:bg-[#25241d]' : 'border-[rgba(21,20,15,0.16)] text-[#15140f] hover:bg-[#ece4cf]'} font-sans font-bold text-xs py-5 px-7 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:-translate-y-1 active:translate-y-0 active:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 inline-flex items-center gap-2 cursor-pointer`}
                >
                  Download desktop <Plus className="w-3.5 h-3.5 border border-current rounded-full p-0.5" />
                </Button>

                <Button
                  onClick={handleGoogleSignIn}
                  className="bg-[#15140f] dark:bg-[#f7f1de] hover:bg-[#2a2620] dark:hover:bg-[#ece4cf] text-[#f7f1de] dark:text-[#15140f] border border-[#15140f] dark:border-transparent font-sans font-medium text-xs py-5 px-7 rounded-full shadow-[0_8px_30px_rgba(21,20,15,0.15)] dark:shadow-[0_8px_30px_rgba(247,241,222,0.08)] hover:shadow-[0_12px_36px_rgba(21,20,15,0.22)] dark:hover:shadow-[0_12px_36px_rgba(247,241,222,0.15)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#efe7d2] dark:text-[#15140f]" />
                  Sync Your Shop (Google Auth)
                </Button>
              </div>

              {/* Statistics circle dials */}
              <div className="flex flex-wrap items-center gap-x-10 gap-y-6 pt-4" data-reveal="">
                {/* Dial 1 */}
                <div className="flex items-center gap-3.5 group cursor-pointer dial-container">
                  <div className="relative w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    <svg className="absolute w-full h-full -rotate-90 dial-svg">
                      <circle cx="28" cy="28" r="23" stroke={darkMode ? 'rgba(247,241,222,0.1)' : 'rgba(21,20,15,0.1)'} strokeWidth="3" fill="transparent" />
                      <circle cx="28" cy="28" r="23" stroke="#ed6f5c" strokeWidth="3" fill="transparent" strokeDasharray="144.5" strokeDashoffset="99.7" strokeLinecap="round" className="transition-all duration-500 ease-out group-hover:stroke-dashoffset-0" />
                    </svg>
                    <span className="font-mono font-extrabold text-sm relative z-10 text-[#15140f] dark:text-[#f7f1de]">31</span>
                  </div>
                  <div className="text-left leading-tight font-sans text-[10px] uppercase tracking-wider">
                    <div className="font-bold text-[#15140f] dark:text-[#f7f1de] group-hover:text-[#ed6f5c] transition-colors">SKILLS</div>
                    <div className={`text-[9px] font-medium ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>SHIPPABLE</div>
                  </div>
                </div>

                {/* Dial 2 */}
                <div className="flex items-center gap-3.5 group cursor-pointer dial-container">
                  <div className="relative w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    <svg className="absolute w-full h-full -rotate-90 dial-svg">
                      <circle cx="28" cy="28" r="23" stroke={darkMode ? 'rgba(247,241,222,0.1)' : 'rgba(21,20,15,0.1)'} strokeWidth="3" fill="transparent" />
                      <circle cx="28" cy="28" r="23" stroke="#ed6f5c" strokeWidth="3" fill="transparent" strokeDasharray="144.5" strokeDashoffset="40.5" strokeLinecap="round" className="transition-all duration-500 ease-out group-hover:stroke-dashoffset-0" />
                    </svg>
                    <span className="font-mono font-extrabold text-sm relative z-10 text-[#15140f] dark:text-[#f7f1de]">72</span>
                  </div>
                  <div className="text-left leading-tight font-sans text-[10px] uppercase tracking-wider">
                    <div className="font-bold text-[#15140f] dark:text-[#f7f1de] group-hover:text-[#ed6f5c] transition-colors">SYSTEMS</div>
                    <div className={`text-[9px] font-medium ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>PORTABLE</div>
                  </div>
                </div>

                {/* Dial 3 */}
                <div className="flex items-center gap-3.5 group cursor-pointer dial-container">
                  <div className="relative w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    <svg className="absolute w-full h-full -rotate-90 dial-svg">
                      <circle cx="28" cy="28" r="23" stroke={darkMode ? 'rgba(247,241,222,0.1)' : 'rgba(21,20,15,0.1)'} strokeWidth="3" fill="transparent" />
                      <circle cx="28" cy="28" r="23" stroke="#ed6f5c" strokeWidth="3" fill="transparent" strokeDasharray="144.5" strokeDashoffset="127.1" strokeLinecap="round" className="transition-all duration-500 ease-out group-hover:stroke-dashoffset-0" />
                    </svg>
                    <span className="font-mono font-extrabold text-sm relative z-10 text-[#15140f] dark:text-[#f7f1de]">12</span>
                  </div>
                  <div className="text-left leading-tight font-sans text-[10px] uppercase tracking-wider">
                    <div className="font-bold text-[#15140f] dark:text-[#f7f1de] group-hover:text-[#ed6f5c] transition-colors">CLIS</div>
                    <div className={`text-[9px] font-medium ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>BYO AGENT</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Premium Animated SVG Illustration representing EtsyAutoLister */}
            <div className="lg:col-span-5 w-full flex items-center justify-center relative aspect-square mt-8 lg:mt-0" data-reveal="scale">
              {/* Corner Brackets */}
              <span className={`absolute top-0 left-0 w-5 h-5 border-t border-l ${darkMode ? 'border-[rgba(247,241,222,0.3)]' : 'border-[rgba(21,20,15,0.3)]'}`} />
              <span className={`absolute top-0 right-0 w-5 h-5 border-t border-r ${darkMode ? 'border-[rgba(247,241,222,0.3)]' : 'border-[rgba(21,20,15,0.3)]'}`} />
              <span className={`absolute bottom-0 left-0 w-5 h-5 border-b border-l ${darkMode ? 'border-[rgba(247,241,222,0.3)]' : 'border-[rgba(21,20,15,0.3)]'}`} />
              <span className={`absolute bottom-0 right-0 w-5 h-5 border-b border-r ${darkMode ? 'border-[rgba(247,241,222,0.3)]' : 'border-[rgba(21,20,15,0.3)]'}`} />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-artwork.jpg"
                alt="EtsyAutoLister Premium Workflow"
                className="w-full h-full object-contain p-2 sm:p-4 rounded-[20px] select-none transition-all duration-500 hover:scale-[1.02] drop-shadow-[0_15px_30px_rgba(21,20,15,0.08)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
        </main>

        {/* Feature Bento Capability Grid Section */}
        <section id="capabilities" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-12">
          <div className="sec-rule text-left">
            <span className="roman">I.</span>
            <span className="meta-grp">
              <span>System Capabilities</span>
              <span className="dot-mark">•</span>
              <span>Platform Architecture</span>
            </span>
            <span>001 / 008</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12" data-reveal="">
            <div className="space-y-3 max-w-xl text-left">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase block font-sans">
                {"▪ SYSTEM CAPABILITIES & ARCHITECTURE"}
              </span>
              <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-tight">
                <strong>Architectural </strong><em>integrity</em><strong> for<br />high-volume </strong><em>cataloging</em><span className="h-dot">.</span>
              </h2>
            </div>
            <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] max-w-sm leading-relaxed text-left font-sans">
              The AutoLister workspace handles high-fidelity designs inline with browser memory. Generate drafts, format canvases, and index metadata without external database lock-in.
            </p>
          </div>

          <div className="cards grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Bento Card 1: Vector Canvas Layout */}
            <div className="card bg-[#ece4cf]/30 dark:bg-[#1a1914]/40 border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] p-6 space-y-4 hover:bg-[#ece4cf]/50 dark:hover:bg-[#1a1914]/60 transition-colors" data-reveal="">
              <div className="w-10 h-10 rounded-xl bg-[#efe7d2] dark:bg-[#12110c] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] flex items-center justify-center text-[#ed6f5c]">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Canvas Formatting Matrix</h3>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                Applies designs directly inside device containers, floating frames, and high-contrast digital mats. Avoids Photoshop actions and raw export bottlenecks.
              </p>
            </div>

            {/* Bento Card 2: Gemini 3.5 SEO Copilot */}
            <div className="card bg-[#ece4cf]/30 dark:bg-[#1a1914]/40 border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] p-6 space-y-4 hover:bg-[#ece4cf]/50 dark:hover:bg-[#1a1914]/60 transition-colors" data-reveal="">
              <div className="w-10 h-10 rounded-xl bg-[#efe7d2] dark:bg-[#12110c] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] flex items-center justify-center text-[#ed6f5c]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Predictive Tag Synthesizer</h3>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                Automated context ingestion analyzes file structures to generate title copies, meta tags, and the exhaustive list of 13 niche SEO items matching Etsy search algorithms.
              </p>
            </div>

            {/* Bento Card 3: Secure Edge Synchronization */}
            <div className="card bg-[#ece4cf]/30 dark:bg-[#1a1914]/40 border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] p-6 space-y-4 hover:bg-[#ece4cf]/50 dark:hover:bg-[#1a1914]/60 transition-colors" data-reveal="">
              <div className="w-10 h-10 rounded-xl bg-[#efe7d2] dark:bg-[#12110c] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] flex items-center justify-center text-[#ed6f5c]">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Direct API Listing Publish</h3>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                Publish outputs as active or inactive drafts to your connected storefront instantly via our secure OAuth proxy pipeline, ensuring clean asset transport.
              </p>
            </div>
          </div>
        </section>

        {/* Live Interactive Sandbox Playground Section */}
        <section id="playground" className="relative z-10">
          <SandboxPlayground darkMode={darkMode} />
        </section>

        {/* Comparative Pipeline Matrix Section */}
        <section id="metrics" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">I.B</span>
            <span className="meta-grp">
              <span>Efficiency Metrics</span>
              <span className="dot-mark">•</span>
              <span>Comparative Pipeline Matrix</span>
            </span>
            <span>001 / 008</span>
          </div>
          <div className="space-y-3 max-w-xl text-left mb-12" data-reveal="">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase block font-sans">
              {"▪ EFFICIENCY METRICS"}
            </span>
            <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-tight">
              <strong>A smarter route</strong><br /><strong>to the </strong><em>marketplace storefront</em><span className="h-dot">.</span>
            </h2>
            <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
              We compared standard manual creator listings with the native Etsy AutoLister workflow pipeline.
            </p>
          </div>

          <div className={`border ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#1a1914]/20' : 'border-[rgba(21,20,15,0.14)] bg-[#ece4cf]/20'} rounded-[18px] overflow-hidden`} data-reveal="">
            <Table>
              <TableHeader>
                <TableRow className={`border-b ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#1a1914]/40' : 'border-[rgba(21,20,15,0.14)] bg-[#ece4cf]/40'} font-mono`}>
                  <TableHead className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} h-11 pl-6 text-left`}>Parameter Matrix</TableHead>
                  <TableHead className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'} h-11 text-left`}>Manual Etsy Upload Flow</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#ed6f5c] h-11 pr-6 text-right">AutoLister Native Agency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-left">
                <TableRow className={`border-b ${darkMode ? 'border-[rgba(247,241,222,0.08)]' : 'border-[rgba(21,20,15,0.08)]'}`}>
                  <TableCell className={`font-serif font-medium text-xs ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} py-4 pl-6`}>Mockup Composite Creation</TableCell>
                  <TableCell className={`text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>15–20 mins (Photoshop / Canva resize constraints)</TableCell>
                  <TableCell className="text-xs text-[#ed6f5c] font-mono text-right pr-6 font-bold">1.2 Seconds (Auto Canvas Ingestion)</TableCell>
                </TableRow>
                <TableRow className={`border-b ${darkMode ? 'border-[rgba(247,241,222,0.08)]' : 'border-[rgba(21,20,15,0.08)]'}`}>
                  <TableCell className={`font-serif font-medium text-xs ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} py-4 pl-6`}>SEO Copywriting & Framing</TableCell>
                  <TableCell className={`text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>10 mins (Manual context framing for tags)</TableCell>
                  <TableCell className="text-xs text-[#ed6f5c] font-mono text-right pr-6 font-bold">Instant (Gemini Ingested Context)</TableCell>
                </TableRow>
                <TableRow className={`border-b ${darkMode ? 'border-[rgba(247,241,222,0.08)]' : 'border-[rgba(21,20,15,0.08)]'}`}>
                  <TableCell className={`font-serif font-medium text-xs ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} py-4 pl-6`}>Keywords Extraction (13 Tags)</TableCell>
                  <TableCell className={`text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>5–10 mins (Vague guesses, no algorithmic scoring)</TableCell>
                  <TableCell className="text-xs text-[#ed6f5c] font-mono text-right pr-6 font-bold">Automatic (Full Tag Complement)</TableCell>
                </TableRow>
                <TableRow className={`border-b ${darkMode ? 'border-[rgba(247,241,222,0.08)]' : 'border-[rgba(21,20,15,0.08)]'}`}>
                  <TableCell className={`font-serif font-medium text-xs ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} py-4 pl-6`}>Draft Export Accuracy</TableCell>
                  <TableCell className={`text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>High error rates (Incorrect frame aspect mapping)</TableCell>
                  <TableCell className="text-xs text-[#ed6f5c] font-mono text-right pr-6 font-bold">Excellent Ratio Validation</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Global Active Ticker / Wire (From The Field / Cities & Contributors) */}
        <section className="wire select-none" id="wire">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 wire-inner">
            <div className="wire-left">
              <span className="wire-mark" aria-hidden="true">
                <span className="wire-pulse"></span>
              </span>
              <span className="wire-title">
                <b>From the field</b>
                <span>Open · 23 cities · 6 contributors</span>
              </span>
            </div>
            <div className="wire-rows">
              {/* Row 1: Coordinates */}
              <div className="wire-row">
                <div className="marquee-track animate-marquee-x">
                  {[
                    { coord: "52.52°N", name: "Berlin" },
                    { coord: "35.68°N", name: "Tokyo" },
                    { coord: "31.23°N", name: "Shanghai" },
                    { coord: "39.90°N", name: "Beijing" },
                    { coord: "25.03°N", name: "Taipei" },
                    { coord: "1.35°N", name: "Singapore" },
                    { coord: "12.97°N", name: "Bangalore" },
                    { coord: "25.20°N", name: "Dubai" },
                    { coord: "6.52°N", name: "Lagos" },
                    { coord: "1.29°S", name: "Nairobi" },
                    { coord: "33.92°S", name: "Cape Town" },
                    { coord: "38.72°N", name: "Lisbon" },
                    { coord: "40.42°N", name: "Madrid" },
                    { coord: "48.86°N", name: "Paris" },
                    { coord: "51.51°N", name: "London" },
                    { coord: "52.37°N", name: "Amsterdam" },
                    { coord: "59.33°N", name: "Stockholm" },
                    { coord: "43.65°N", name: "Toronto" },
                    { coord: "40.71°N", name: "New York" },
                    { coord: "37.77°N", name: "San Francisco" },
                    { coord: "19.43°N", name: "Mexico City" },
                    { coord: "23.55°S", name: "São Paulo" },
                    { coord: "33.87°S", name: "Sydney" }
                  ].map((loc, idx) => (
                    <span key={idx} className="wire-item">
                      <span className="wire-dot">·</span>
                      <span className="wire-coord">{loc.coord}</span>
                      <span className="wire-name">{loc.name}</span>
                    </span>
                  ))}
                  {/* Duplicated for loop */}
                  {[
                    { coord: "52.52°N", name: "Berlin" },
                    { coord: "35.68°N", name: "Tokyo" },
                    { coord: "31.23°N", name: "Shanghai" },
                    { coord: "39.90°N", name: "Beijing" },
                    { coord: "25.03°N", name: "Taipei" },
                    { coord: "1.35°N", name: "Singapore" },
                    { coord: "12.97°N", name: "Bangalore" },
                    { coord: "25.20°N", name: "Dubai" },
                    { coord: "6.52°N", name: "Lagos" },
                    { coord: "1.29°S", name: "Nairobi" },
                    { coord: "33.92°S", name: "Cape Town" },
                    { coord: "38.72°N", name: "Lisbon" },
                    { coord: "40.42°N", name: "Madrid" },
                    { coord: "48.86°N", name: "Paris" },
                    { coord: "51.51°N", name: "London" },
                    { coord: "52.37°N", name: "Amsterdam" },
                    { coord: "59.33°N", name: "Stockholm" },
                    { coord: "43.65°N", name: "Toronto" },
                    { coord: "40.71°N", name: "New York" },
                    { coord: "37.77°N", name: "San Francisco" },
                    { coord: "19.43°N", name: "Mexico City" },
                    { coord: "23.55°S", name: "São Paulo" },
                    { coord: "33.87°S", name: "Sydney" }
                  ].map((loc, idx) => (
                    <span key={`dup-${idx}`} className="wire-item">
                      <span className="wire-dot">·</span>
                      <span className="wire-coord">{loc.coord}</span>
                      <span className="wire-name">{loc.name}</span>
                    </span>
                  ))}
                </div>
              </div>
              {/* Row 2: Contributors */}
              <div className="wire-row">
                <div className="marquee-track animate-marquee-x-reverse">
                  {[
                    { handle: "@tw93", role: "kami" },
                    { handle: "@guizang", role: "@op7418" },
                    { handle: "@alchaincyf", role: "@huashu" },
                    { handle: "@multica-ai", role: "@daemon" },
                    { handle: "@OpenCoworkAI", role: "@codesign" },
                    { handle: "@nexu-io", role: "studio" },
                    { handle: "@you", role: "be next" }
                  ].map((creator, idx) => (
                    <span key={idx} className="wire-item">
                      <span className="wire-dot">·</span>
                      <span className="wire-handle">{creator.handle}</span>
                      <span className="wire-role">{creator.role}</span>
                    </span>
                  ))}
                  {/* Duplicated for loop */}
                  {[
                    { handle: "@tw93", role: "kami" },
                    { handle: "@guizang", role: "@op7418" },
                    { handle: "@alchaincyf", role: "@huashu" },
                    { handle: "@multica-ai", role: "@daemon" },
                    { handle: "@OpenCoworkAI", role: "@codesign" },
                    { handle: "@nexu-io", role: "studio" },
                    { handle: "@you", role: "be next" }
                  ].map((creator, idx) => (
                    <span key={`dup-${idx}`} className="wire-item">
                      <span className="wire-dot">·</span>
                      <span className="wire-handle">{creator.handle}</span>
                      <span className="wire-role">{creator.role}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section II: About / Manifesto Section */}
        <section id="about" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">II.</span>
            <span className="meta-grp">
              <span>About / Manifesto</span>
              <span className="dot-mark">•</span>
              <span>Open Design / Volume 01</span>
            </span>
            <span>002 / 008</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 items-center">
            <div className="lg:col-span-7 space-y-6 text-left" data-reveal="">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>About the studio · Nº 02</span>
              </div>
              <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] leading-none">
                <strong>We treat your </strong><em>digital catalog</em><strong> as a </strong><em>curated gallery,</em><strong> not a raw dump</strong><span className="h-dot">.</span>
              </h2>
              <p className="text-sm text-[#5a5448] dark:text-[#ece4cf] leading-relaxed max-w-xl font-sans">
                Every asset published to your storefront should command value. Standard bulk importers flood stores with ugly product images, generic text, and sloppy tagging. AutoCAD templates respect structural margins, device alignment, shadow depth, and semantic tag complementary sets to ensure elite visual standing.
              </p>
              <div className="pt-4 flex items-center gap-4 text-xs font-mono text-[#8b8676] dark:text-[#a39e8f]">
                <span className={`w-8 h-8 rounded-full border ${darkMode ? 'border-[#f7f1de]' : 'border-[#15140f]'} flex items-center justify-center font-serif italic text-[13px] text-[#15140f] dark:text-[#f7f1de]`}>Ø</span>
                <span>Automated compilation, custom premium results. Est. 2026.</span>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className={`aspect-square rounded-2xl overflow-hidden border ${darkMode ? 'border-[rgba(247,241,222,0.14)] bg-[#1a1914]' : 'border-[rgba(21,20,15,0.16)] bg-[#ece4cf]/30'} p-6 flex flex-col justify-between`}>
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676]">FIG. 02 / PROXIMITY INDEX</span>
                  <span className="text-[9px] font-mono uppercase bg-[#ed6f5c]/15 text-[#ed6f5c] px-2 py-0.5 rounded">COGNITIVE COMPOSITE</span>
                </div>
                <div className="my-auto space-y-4">
                  {/* Layer indicators simulating real high-end studio workspace layout mapping */}
                  <div className={`p-3.5 border rounded-xl flex items-center justify-between text-xs font-mono ${darkMode ? 'bg-[#12110c]/80 border-[rgba(247,241,222,0.10)]' : 'bg-[#f7f1de]/80 border-[rgba(21,20,15,0.12)]'}`}>
                    <div className="flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-[#ed6f5c]" />
                      <span>Studio Natural Light Cast</span>
                    </div>
                    <span className="text-[#8b8676]">92%</span>
                  </div>
                  <div className={`p-3.5 border rounded-xl flex items-center justify-between text-xs font-mono ${darkMode ? 'bg-[#12110c]/80 border-[rgba(247,241,222,0.10)]' : 'bg-[#f7f1de]/80 border-[rgba(21,20,15,0.12)]'}`}>
                    <div className="flex items-center gap-2">
                      <Layers2 className="w-3.5 h-3.5 text-[#6e7448] dark:text-[#9ea671]" />
                      <span>Shadow Falloff Weight</span>
                    </div>
                    <span className="text-[#8b8676]">0.45px</span>
                  </div>
                  <div className={`p-3.5 border rounded-xl flex items-center justify-between text-xs font-mono ${darkMode ? 'bg-[#12110c]/80 border-[rgba(247,241,222,0.10)]' : 'bg-[#f7f1de]/80 border-[rgba(21,20,15,0.12)]'}`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#e9b94a]" />
                      <span>Gemini Tag Score threshold</span>
                    </div>
                    <span className="text-[#8b8676]">0.98 Match</span>
                  </div>
                </div>
                <p className="text-[10px] text-left text-[#5a5448] dark:text-[#a39e8f] leading-normal font-sans">
                  *AutoLister computes visual gravity matrices directly in the browser instance to create stunning mockups.*
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section III: Multi-Category Capabilities Grid */}
        <section id="systems" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">III.</span>
            <span className="meta-grp">
              <span>System Profiles</span>
              <span className="dot-mark">•</span>
              <span>Modular Studio Capabilities</span>
            </span>
            <span>003 / 008</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-14" data-reveal="">
            <div className="lg:col-span-5 space-y-4 text-left">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>Four Target Systems · Nº 03</span>
              </div>
              <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-none">
                <strong>Specialized </strong><em>asset pipelines</em><strong> for </strong><em>Etsy creators</em><span className="h-dot">.</span>
              </h2>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans mt-2">
                Create catalogs for printable items, presets, labels, or planners. We custom tailored compile matrices to suit each digital niche format perfectly.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
              {/* Profile A: Printable Art */}
              <div className={`p-6 border rounded-2xl ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'} space-y-3`}>
                <div className="w-9 h-9 border border-[#ed6f5c]/20 text-[#ed6f5c] rounded-xl flex items-center justify-center font-serif text-sm">A</div>
                <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">01 / Printable Art Prints</h3>
                <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                  Automates layered mockups utilizing wooden mat textures, gallery wall floating frames, and natural botanical casts. Perfect for PDF, JPEG, PNG set structures.
                </p>
              </div>
              {/* Profile B: Presets */}
              <div className={`p-6 border rounded-2xl ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'} space-y-3`}>
                <div className="w-9 h-9 border border-[#ed6f5c]/20 text-[#ed6f5c] rounded-xl flex items-center justify-center font-serif text-sm">B</div>
                <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">02 / Lightroom Presets DNG</h3>
                <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                  Synthesizes dynamic before-and-after portrait sliders, mobile layout grids, cozy cafe vignettes, and direct metadata inclusions for immediate mobile dng file exports.
                </p>
              </div>
              {/* Profile C: Sticker Sheets */}
              <div className={`p-6 border rounded-2xl ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'} space-y-3`}>
                <div className="w-9 h-9 border border-[#ed6f5c]/20 text-[#ed6f5c] rounded-xl flex items-center justify-center font-serif text-sm">C</div>
                <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">03 / Clipart & Digital Stickers</h3>
                <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                  Produces simulated checkered backings, diecut borders with bleed parameters, glossy surface shine highlights, and multi-sticker previews in one compile.
                </p>
              </div>
              {/* Profile D: Daily Planners */}
              <div className={`p-6 border rounded-2xl ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'} space-y-3`}>
                <div className="w-9 h-9 border border-[#ed6f5c]/20 text-[#ed6f5c] rounded-xl flex items-center justify-center font-serif text-sm">D</div>
                <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">04 / Digital Planners PDF</h3>
                <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                  Presents gorgeous landscape tablet bezels, undated calendar layers, notebook wire binders, and planner pages floats. Highly-stylized minimalist design guidelines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section IV: Live Labs Showcase with Interactive State Filtering */}
        <section id="labs" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">IV.</span>
            <span className="meta-grp">
              <span>Studio Labs</span>
              <span className="dot-mark">•</span>
              <span>Presets Showcase & Mock Ratios</span>
            </span>
            <span>004 / 008</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12" data-reveal="">
            <div className="space-y-3 max-w-xl text-left">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>Living Asset Archive · Nº 04</span>
              </div>
              <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-none">
                <strong>Explore our </strong><em>catalog template</em><strong> preset </strong><em>directory</em><span className="h-dot">.</span>
              </h2>
            </div>

            {/* Interactive filtering pills */}
            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {[
                { label: 'All Presets', id: 'all' },
                { label: 'Printable Art', id: 'wallart' },
                { label: 'Lightroom', id: 'presets' },
                { label: 'Stickers', id: 'stickers' },
                { label: 'PDF Planners', id: 'planners' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setActiveLabFilter(pill.id as any)}
                  className={`px-4.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wide border cursor-pointer transition-all duration-200 ${activeLabFilter === pill.id
                    ? 'bg-[#ed6f5c] text-white border-[#ed6f5c] font-bold shadow-sm'
                    : `${darkMode ? 'bg-[#1a1914] text-[#ece4cf] border-[rgba(247,241,222,0.16)] hover:bg-[#22211b]' : 'bg-[#efe7d2] text-[#15140f] border-[rgba(21,20,15,0.16)] hover:bg-[#ece4cf]'}`
                    }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Labs Display Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              {
                id: 'lab-1',
                category: 'wallart',
                badge: 'Printables',
                num: 'Nº 01',
                year: '2026',
                title: 'Vintage Botany Frame',
                desc: 'Vertical rustic oak wood texture mat mockups with environmental sunray cast masks.',
                image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&q=80',
              },
              {
                id: 'lab-2',
                category: 'presets',
                badge: 'Lightroom',
                num: 'Nº 02',
                year: '2026',
                title: 'Warm Espresso Mobile LUT',
                desc: 'Soft beige highlights cafe photography filter template showcasing slider templates.',
                image: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=500&q=80',
              },
              {
                id: 'lab-3',
                category: 'stickers',
                badge: 'Stickers',
                num: 'Nº 03',
                year: '2026',
                title: 'Vinyl Diecut Contour Set',
                desc: 'Aesthetic checkered transparent png borders matching high-margin printing sheets.',
                image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80',
              },
              {
                id: 'lab-4',
                category: 'planners',
                badge: 'Planners',
                num: 'Nº 04',
                year: '2026',
                title: 'Kinfolk Planner Journal',
                desc: 'Undated daily schedule planner inside modern slate tablet frame with metal binder spiral.',
                image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&q=80',
              },
              {
                id: 'lab-5',
                category: 'wallart',
                badge: 'Printables',
                num: 'Nº 05',
                year: '2026',
                title: 'Minimal Gallery Multi-Frame',
                desc: 'Three piece vertical frames layout hanging in clean modern studio wall shadows.',
                image: 'https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=500&q=80',
              }
            ]
              .filter(item => activeLabFilter === 'all' || item.category === activeLabFilter)
              .map(item => (
                <div key={item.id} className="group flex flex-col justify-between h-full space-y-4">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-sm bg-transparent border border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.12)]">
                    <span className="absolute top-3 left-3 bg-[#efe7d2]/95 dark:bg-[#12110c]/95 border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-none">
                      {item.badge}
                    </span>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                      <span>{item.num}</span>
                      <span>{item.year}</span>
                    </div>
                    <h4 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de] leading-none">{item.title}</h4>
                    <p className={`text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans leading-relaxed line-clamp-2`}>{item.desc}</p>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Section V: Step-By-Step Compilation Loop Method */}
        <section id="workflow" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">V.</span>
            <span className="meta-grp">
              <span>Compilation Method</span>
              <span className="dot-mark">•</span>
              <span>Deterministic Layout Loop</span>
            </span>
            <span>005 / 008</span>
          </div>
          {/* Method head — exact reference layout: 1.4fr heading / 1fr note */}
          <div className="grid gap-[60px] items-start mb-20" style={{ gridTemplateColumns: '1.4fr 1fr' }} data-reveal="">
            <div>
              <span className="flex items-center gap-3 text-[11px] font-sans font-semibold tracking-[0.22em] text-[#ed6f5c] uppercase mb-8 leading-none">
                <span className="w-[18px] h-[1px] bg-[#ed6f5c] inline-block"></span>
                The Automated High-Fidelity Pipeline · Nº 05
              </span>
              <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] leading-tight mt-8">
                <strong>Four step </strong><em>execution</em><strong> to </strong><em>storefront sync</em><span className="h-dot">.</span>
              </h2>
            </div>
            <div className="flex items-start gap-[14px] pt-[14px]" data-reveal="">
              <span className="text-2xl leading-none font-sans text-[#ed6f5c]">+</span>
              <p className="text-[13px] text-[#2a2620] dark:text-[#ece4cf] leading-[1.55] max-w-[22ch] font-sans">
                Every stage runs client-side inside secure sandbox memory. Composed assets are transported explicitly on your command.
              </p>
            </div>
          </div>

          {/* 4-column method grid — exact reference structure */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[50px] relative text-left" data-reveal="">


            {/* Step 1 */}
            <div className="relative flex flex-col">
              <div className="font-serif italic text-[#ed6f5c] leading-[0.85] mb-6 select-none relative z-10 inline-block pr-3 " style={{ fontSize: '78px', letterSpacing: '-0.02em' }}>01</div>
              <h4 className="font-sans font-extrabold text-[#15140f] dark:text-[#f7f1de] mb-[18px] flex items-center justify-between pr-[18px]" style={{ fontSize: '30px', letterSpacing: '-0.022em' }}>
                Ingest Raw Assets <span className="text-[#8b8676] dark:text-[#a39e8f] text-[22px] font-light">→</span>
              </h4>
              <p className="text-[13.5px] text-[#5a5448] dark:text-[#ece4cf] leading-[1.55] font-sans mb-6 max-w-[24ch]">
                Drag-and-drop raw photo filters dng, digital templates pdf, transparency decal png, or vectors.
              </p>
              <div className="aspect-square rounded-xl overflow-hidden mt-auto" style={{ boxShadow: '0 30px 60px -30px rgba(21,20,15,0.18)' }}>
                <img src="/step1-ingest.png" alt="Ingest Raw Assets" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col">
              <div className="font-serif italic text-[#ed6f5c] leading-[0.85] mb-6 select-none relative z-10 inline-block pr-3 " style={{ fontSize: '78px', letterSpacing: '-0.02em' }}>02</div>
              <h4 className="font-sans font-extrabold text-[#15140f] dark:text-[#f7f1de] mb-[18px] flex items-center justify-between pr-[18px]" style={{ fontSize: '30px', letterSpacing: '-0.022em' }}>
                Frame Canvas Mat <span className="text-[#8b8676] dark:text-[#a39e8f] text-[22px] font-light">→</span>
              </h4>
              <p className="text-[13.5px] text-[#5a5448] dark:text-[#ece4cf] leading-[1.55] font-sans mb-6 max-w-[24ch]">
                Apply premium drop shadow matrices, frame wood types, floating mats, or tablet bezels cleanly in one click.
              </p>
              <div className="aspect-square rounded-xl overflow-hidden mt-auto" style={{ boxShadow: '0 30px 60px -30px rgba(21,20,15,0.18)' }}>
                <img src="/step2-frame.png" alt="Frame Canvas Mat" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col">
              <div className="font-serif italic text-[#ed6f5c] leading-[0.85] mb-6 select-none relative z-10 inline-block pr-3 " style={{ fontSize: '78px', letterSpacing: '-0.02em' }}>03</div>
              <h4 className="font-sans font-extrabold text-[#15140f] dark:text-[#f7f1de] mb-[18px] flex items-center justify-between pr-[18px]" style={{ fontSize: '30px', letterSpacing: '-0.022em' }}>
                Compute Gemini Copy <span className="text-[#8b8676] dark:text-[#a39e8f] text-[22px] font-light">→</span>
              </h4>
              <p className="text-[13.5px] text-[#5a5448] dark:text-[#ece4cf] leading-[1.55] font-sans mb-6 max-w-[24ch]">
                AI parses texture metrics to formulate SEO-ranked titles, comprehensive meta descriptions, and 13 targeted tags.
              </p>
              <div className="aspect-square rounded-xl overflow-hidden mt-auto" style={{ boxShadow: '0 30px 60px -30px rgba(21,20,15,0.18)' }}>
                <img src="/step3-copy.png" alt="Compute Gemini Copy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>

            {/* Step 4 — no arrow on last */}
            <div className="relative flex flex-col">
              <div className="font-serif italic text-[#ed6f5c] leading-[0.85] mb-6 select-none relative z-10 inline-block pr-3 " style={{ fontSize: '78px', letterSpacing: '-0.02em' }}>04</div>
              <h4 className="font-sans font-extrabold text-[#15140f] dark:text-[#f7f1de] mb-[18px]" style={{ fontSize: '30px', letterSpacing: '-0.022em' }}>
                Sovereign Direct Sync
              </h4>
              <p className="text-[13.5px] text-[#5a5448] dark:text-[#ece4cf] leading-[1.55] font-sans mb-6 max-w-[24ch]">
                Sync generated images and complete copywriting as active digital listings draft via Google OAuth APIs.
              </p>
              <div className="aspect-square rounded-xl overflow-hidden mt-auto" style={{ boxShadow: '0 30px 60px -30px rgba(21,20,15,0.18)' }}>
                <img src="/step4-sync.png" alt="Sovereign Direct Sync" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </section>

        {/* Section VI: Selected Curated Designs Portfolio Showcase */}
        <section id="portfolio" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">VI.</span>
            <span className="meta-grp">
              <span>Curated Portfolio</span>
              <span className="dot-mark">•</span>
              <span>Featured Digital Collections</span>
            </span>
            <span>006 / 008</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 items-center text-left" data-reveal="">
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>Selected Metadata Work · Nº 06</span>
              </div>
              <h2 className="section-h2 text-3xl sm:text-4xl text-[#15140f] dark:text-[#f7f1de] leading-none tracking-tight">
                <strong>High-margin </strong><em>structures</em><strong> built inside </strong><em>the studio</em><span className="h-dot">.</span>
              </h2>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                A closer inspection of live collections successfully generated with correct formatting, high SEO tags complementary sets, and realistic environmental lighting matrices.
              </p>
              <div className="pt-2">
                <Button
                  onClick={handleGoogleSignIn}
                  className="bg-transparent hover:bg-[#ed6f5c]/10 text-[#ed6f5c] border border-[#ed6f5c]/25 rounded-full font-sans font-semibold text-xs px-6 py-4.5 shadow-none transition-colors cursor-pointer"
                >
                  Sync Your Shop Now →
                </Button>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Card 1 */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} shadow-sm space-y-4`}>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                  <span>Selected Series</span>
                  <span>01 / 31</span>
                </div>
                <h3 className="text-xl font-bold font-serif text-[#15140f] dark:text-[#f7f1de] leading-none">Autumn Foliage Series</h3>
                <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                  Set of 4 vintage botany watercolor prints formatted inside warm oak frames with soft neutral cream mats.
                </p>
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)]">
                  <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&q=80" alt="Autumn Foliage" className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#ed6f5c] uppercase border-t border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)] pt-3">
                  <span>2026 Print Art</span>
                  <span>Ready Draft Synced</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} shadow-sm space-y-4`}>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                  <span>Aesthetic Tool</span>
                  <span>04 / 31</span>
                </div>
                <h3 className="text-xl font-bold font-serif text-[#15140f] dark:text-[#f7f1de] leading-none">Goodnotes Focal Binder</h3>
                <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                  Minimal daily landscape undated agenda optimized for GoodNotes with hyperlinked index pages.
                </p>
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[rgba(21,20,15,0.10)] dark:border-[rgba(247,241,222,0.10)]">
                  <img src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&q=80" alt="Daily Binder" className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#ed6f5c] uppercase border-t border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)] pt-3">
                  <span>2026 Planners</span>
                  <span>Active Live Listing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section VII: Creator Testimonial & Heritage */}
        <section id="testimonials" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">VII.</span>
            <span className="meta-grp">
              <span>Creator Voices</span>
              <span className="dot-mark">•</span>
              <span>Real Digital Seller Testimony</span>
            </span>
            <span>007 / 008</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left" data-reveal="">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none font-sans">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>Proven Value Ratio · Nº 07</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-medium text-[#15140f] dark:text-[#f7f1de] leading-snug tracking-tight">
                “Before AutoLister, formatting mockup sizes and guessing 13 SEO tags consumed <span className="italic font-normal text-[#ed6f5c]">80% of my studio hours.</span> Now I dragging raw art vectors in, compile mat layers, and sync the final active draft in 10 seconds flat.”
              </h2>
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-full ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.14)] text-[#f7f1de]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.14)] text-[#15140f]'} border flex items-center justify-center font-serif italic text-lg select-none`}>
                  N
                </span>
                <div>
                  <h4 className="text-sm font-bold font-sans text-[#15140f] dark:text-[#f7f1de] leading-tight">Nina Kovac</h4>
                  <p className="text-xs text-[#8b8676] dark:text-[#a39e8f] font-sans">Creative Director · North Foliage Studio</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 relative aspect-square rounded-2xl overflow-hidden border border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.12)] bg-transparent">
              <img src="https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=500&q=80" alt="Nina Kovac Studio" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>

        {/* Section VIII: Studio Call To Action */}
        <section id="contact" className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-16">
          <div className="sec-rule text-left">
            <span className="roman">VIII.</span>
            <span className="meta-grp">
              <span>Live Launch</span>
              <span className="dot-mark">•</span>
              <span>Initiate Sovereign Synced Workspaces</span>
            </span>
            <span>008 / 008</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 items-center text-left" data-reveal="">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none font-sans">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>Connect & Secure · Nº 08</span>
              </div>
              <h2 className="section-h2 text-4xl sm:text-5xl md:text-6xl text-[#15140f] dark:text-[#f7f1de] leading-none tracking-tight">
                <strong>Let&apos;s construct </strong><em>something</em><strong> expressive</strong><br /><em>&amp; profitable</em><span className="h-dot">.</span>
              </h2>
              <p className="text-sm text-[#5a5448] dark:text-[#ece4cf] max-w-xl leading-relaxed font-sans">
                Sign in securely using Google authentication to retrieve your sovereign Firebase sandbox folder instances. Link your custom Etsy OAuth credentials to instantly begin compiling.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Button
                  onClick={handleGoogleSignIn}
                  className="bg-[#15140f] dark:bg-[#f7f1de] hover:bg-[#2a2620] dark:hover:bg-[#ece4cf] text-[#f7f1de] dark:text-[#15140f] font-sans font-medium text-sm py-6 px-8 rounded-full shadow-none transition-colors cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <User className="w-4 h-4 text-[#efe7d2]" />
                  Sign In (Google Authentication)
                </Button>
                <div className={`p-4 rounded-full border border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.12)] font-mono text-[11px] font-semibold text-center text-[#15140f] dark:text-[#f7f1de] select-none uppercase tracking-wider`}>
                  Secure Cloud Sync: Active
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 relative">
              <div className={`aspect-square rounded-2xl overflow-hidden border ${darkMode ? 'border-[rgba(247,241,222,0.14)] bg-[#1a1914]' : 'border-[rgba(21,20,15,0.16)] bg-[#ece4cf]/30'} p-6 flex flex-col justify-between`}>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676]">WORKSPACE KEY DATA</div>
                <div className="my-auto space-y-1 text-xs font-mono">
                  <div className="flex justify-between border-b border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)] pb-1">
                    <span className="text-[#8b8676]">Sovereign Memory:</span>
                    <span>100% Secure</span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)] pb-1 pt-1">
                    <span className="text-[#8b8676]">Asset Caching:</span>
                    <span>Client Isolated</span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)] pb-1 pt-1">
                    <span className="text-[#8b8676]">Sync Frequency:</span>
                    <span>Direct API Sync</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#ed6f5c]">
                  <span>● Live Deploy</span>
                  <span>MMXXVI Edition</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impressive, Professional Multi-Column Editorial Footer */}
        <footer className={`relative z-10 border-t ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#1a1914]/60' : 'border-[rgba(21,20,15,0.16)] bg-[#ece4cf]/40'} pt-20 pb-12 mt-12 font-sans select-none`}>
          <div className="max-w-7xl mx-auto px-6 sm:px-12 grid grid-cols-1 md:grid-cols-12 gap-12 sm:gap-16">
            {/* Column 1: Brand & Statement */}
            <div className="md:col-span-5 space-y-5 text-left">
              <a href="#top" className="group flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                <Store className={`w-[1.4rem] h-[1.4rem] ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} group-hover:text-[#ed6f5c] transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3`} />
                <span className="header-brand">
                  Auto<em>Lister</em><span className="dot">.</span>
                </span>
              </a>
              <p className={`text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} leading-relaxed max-w-sm font-sans mt-4`}>
                The sovereign alternative for digital catalog automation. Formulates high-fidelity light mockups, embeds drop shadow variables, and computes elite Gemini SEO copywriting to enable seamless Etsy publishing.
              </p>
              <div className="pt-2">
                <Button
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-2 text-[10.5px] font-mono uppercase bg-[#15140f] dark:bg-[#f7f1de] text-[#f7f1de] dark:text-[#15140f] px-5 py-3.5 rounded-full hover:bg-[#ed6f5c] dark:hover:bg-[#ed6f5c] hover:text-white dark:hover:text-white transition-colors duration-200 shadow-none cursor-pointer"
                >
                  Retrieve Active Workspace
                  <span className="text-[10px] text-[#8b8676] dark:text-[#a39e8f] lowercase ml-1">· cloud sync</span>
                </Button>
              </div>
            </div>

            {/* Column 2: Architecture Integrity */}
            <div className="md:col-span-2 space-y-4 text-left font-sans">
              <h5 className={`text-[10px] font-mono font-bold tracking-widest ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} uppercase`}>{"▪ STUDIO SUITE"}</h5>
              <ul className={`space-y-2.5 text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Local-First Engine</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Canvas Mockups</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Gemini Copy Model</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Metadata Matrix</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Sovereign Directory</span></li>
              </ul>
            </div>

            {/* Column 3: Category Classes */}
            <div className="md:col-span-2 space-y-4 text-left font-sans">
              <h5 className={`text-[10px] font-mono font-bold tracking-widest ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} uppercase`}>{"▪ DIGITAL CATEGORIES"}</h5>
              <ul className={`space-y-2.5 text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Wall Art Print sets</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Lightroom DNG presets</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Stickers & Decals pack</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">PDF Daily Planners</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Clipart Assets</span></li>
              </ul>
            </div>

            {/* Column 4: Operational Integrity */}
            <div className="md:col-span-3 space-y-4 text-left font-sans">
              <h5 className={`text-[10px] font-mono font-bold tracking-widest ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} uppercase`}>{"▪ LEGAL & PERSISTENCE"}</h5>
              <ul className={`space-y-2.5 text-xs ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'} font-sans`}>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Apache-2.0 License</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Google Auth Integrity</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Secure Firebase Storage</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Isolated Client Sandbox</span></li>
                <li><span className="hover:text-[#ed6f5c] transition-colors cursor-pointer block font-medium">Zero Session Leak</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom Strip */}
          <div className={`max-w-7xl mx-auto px-6 sm:px-12 mt-16 pt-8 border-t ${darkMode ? 'border-[rgba(247,241,222,0.12)]' : 'border-[rgba(21,20,15,0.12)]'} flex flex-col md:flex-row items-center justify-between gap-4 text-[10.5px] ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'} font-mono`}>
            <span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#ed6f5c] inline-block mr-2 animate-pulse align-middle" />
              Sovereign <b>AutoLister System</b> · Apache-2.0 · 2026 / Vol. 01 / Issue Nº 26
            </span>
            <span className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-start md:justify-end">
              <span>Cloud PERSISTENCE: Firebase Sync Enabled</span>
              <span>·</span>
              <span>52.5200° N · 13.4050° E</span>
              <span className="text-[#ed6f5c]">♥ MMXXVI</span>
            </span>
          </div>

          {/* Big Name Showcase (Foot-Mega) */}
          <div className="max-w-7xl mx-auto px-6 sm:px-12 foot-mega">
            <div className="word">Auto<em>Lister</em><span className="dot">.</span></div>
          </div>
        </footer>
        <ScrollToTop darkMode={darkMode} />
      </div>
  );
}
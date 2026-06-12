'use client';

// Product-category picker screen. Extracted mechanically from Home —
// prop names mirror the originals.
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Camera, Grid, Image as ImageIcon, Layers, Store } from 'lucide-react';

export function CategorySelectView({
  darkMode,
  selectedMode,
  handleSelectProductType,
  setSelectedProductType,
  handleNavigateBackRoutes,
  setCurrentView,
  setSelectedMode,
  setStudioListingId,
  setActiveProject
}: {
  darkMode: boolean;
  selectedMode: 'etsy' | 'manual' | null;
  handleSelectProductType: (type: string) => void;
  setSelectedProductType: (type: string | null) => void;
  handleNavigateBackRoutes: () => void;
  setCurrentView: (view: 'projects') => void;
  setSelectedMode: (mode: 'etsy' | 'manual' | null) => void;
  setStudioListingId: (id: string | null) => void;
  setActiveProject: (project: { id: string; name: string } | null) => void;
}) {
  return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-[#12110c] text-[#f7f1de]' : 'bg-[#efe7d2] text-[#15140f]'} font-sans flex flex-col justify-between relative transition-colors duration-300`}>
        {/* Side Rails */}
        <div className="side-rail right hidden xl:flex">
          <span className="rail-text">Etsy AutoLister — {darkMode ? "NIGHT ARCHIVE" : "DAY ARCHIVE"} · Vol. 01 · Issue Nº 26</span>
        </div>
        <div className="side-rail left hidden xl:flex">
          <span className="rail-text">Mockups · Keywords · Tags · SEO · Instant Publishing</span>
        </div>

        {/* Topbar strip */}
        <div className={`topbar w-full ${darkMode ? 'bg-[#12110c] border-[rgba(247,241,222,0.12)] border-b' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.14)] border-b'}`}>
          <div className="max-w-6xl mx-auto px-6 sm:px-12 topbar-inner">
            <span><b>{darkMode ? "NIGHT MODE" : "AUTOLISTER"} / 2026</b> &nbsp;·&nbsp; Product Category Selection</span>
            <span className="hidden md:inline-flex gap-6 font-mono text-[9px] uppercase tracking-wider text-[#8b8676]">
              <span>Filed under <b className="text-[#ed6f5c]">Etsy · Automation</b></span>
              <span>Production Mode · Secure Sync</span>
            </span>
            <span className="right">
              <span className="inline-flex items-center text-[10px] font-mono tracking-wider"><span className="pulse"></span>Live · v0.3.0</span>
            </span>
          </div>
        </div>

        <header className={`relative z-10 py-5 ${darkMode ? 'bg-[#1a1914]/40 border-[rgba(247,241,222,0.12)]' : 'bg-[#efe7d2]/40 border-[rgba(21,20,15,0.16)]'} border-b w-full flex-shrink-0`}>
          <div className="max-w-6xl mx-auto w-full px-6 sm:px-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 border ${darkMode ? 'border-[#f7f1de]' : 'border-[#15140f]'} rounded-full flex items-center justify-center font-serif italic text-lg select-none`}>
                Ø
              </div>
              <div className="flex flex-col">
                <span className="text-base font-serif font-medium leading-none">
                  Etsy <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#ed6f5c] ml-0.5">AutoLister</span>
                </span>
                <span className="text-[9px] text-[#8b8676] font-mono uppercase tracking-widest mt-1">
                  {selectedMode === 'etsy' ? 'Route A · Direct Store Sync' : 'Route B · Manual Clipboard'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMode(null);
                  setSelectedProductType(null);
                  setStudioListingId(null);
                  setActiveProject(null);
                  setCurrentView('projects');
                }}
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer flex items-center gap-1.5`}
              >
                <Grid className="w-3.5 h-3.5 text-[#ed6f5c]" /> Projects Hub
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-3.5 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] hover:bg-[#ece4cf]'} transition-colors duration-150 cursor-pointer flex items-center gap-1.5`}
                onClick={handleNavigateBackRoutes}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col justify-center space-y-10">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#ed6f5c] bg-[#ece4cf]/60 dark:bg-[#1a1914] px-2.5 py-1 rounded border border-[#ed6f5c]/20">
              Product Settings
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">What kind of digital listing are you creating?</h1>
            <p className="text-xs sm:text-sm text-[#5a5448] dark:text-[#ece4cf] max-w-lg mx-auto leading-relaxed">
              Selecting a category configures the automated canvas engines to build beautiful thumbnails, and optimizes the Gemini AI SEO guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">

            {/* Category 1: PNG Artwork Package */}
            <Card
              onClick={() => handleSelectProductType('png_graphics')}
              className="group bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-[0_6px_20px_rgba(21,20,15,0.05)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:border-[#ed6f5c]/60 dark:hover:border-[#ed6f5c]/60 hover:shadow-[0_12px_32px_rgba(237,111,92,0.15)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ed6f5c] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4 p-6">
                <div className="w-10 h-10 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#15140f] dark:text-[#f7f1de] group-hover:bg-[#ed6f5c] group-hover:text-white dark:group-hover:text-white flex items-center justify-center font-medium transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">PNG Artwork Pack</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5 text-[#5a5448] dark:text-[#ece4cf] font-sans">
                    Clipart illustrations, graphic stamps, textures, and scrapbooking overlays with custom checkered transparent mockups.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="py-2.5 px-6 bg-[#ece4cf]/30 dark:bg-[#22211b]/35 border-t border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] text-[9px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                Mockups: Transparent Sticker Grid
              </CardFooter>
            </Card>

            {/* Category 2: Printable Wall Art Prints */}
            <Card
              onClick={() => handleSelectProductType('printable_wallart')}
              className="group bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-[0_6px_20px_rgba(21,20,15,0.05)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:border-[#ed6f5c]/60 dark:hover:border-[#ed6f5c]/60 hover:shadow-[0_12px_32px_rgba(237,111,92,0.15)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ed6f5c] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4 p-6">
                <div className="w-10 h-10 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#15140f] dark:text-[#f7f1de] group-hover:bg-[#ed6f5c] group-hover:text-white dark:group-hover:text-white flex items-center justify-center font-medium transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Printable Wall Art</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5 text-[#5a5448] dark:text-[#ece4cf] font-sans">
                    Digital landscape/portrait wall photography or abstract poster prints mapped dynamically inside organic wooden picture frames.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="py-2.5 px-6 bg-[#ece4cf]/30 dark:bg-[#22211b]/35 border-t border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] text-[9px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                Mockups: Wooden Room Frames
              </CardFooter>
            </Card>

            {/* Category 3: Photographers Presets */}
            <Card
              onClick={() => handleSelectProductType('presets')}
              className="group bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-[0_6px_20px_rgba(21,20,15,0.05)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:border-[#ed6f5c]/60 dark:hover:border-[#ed6f5c]/60 hover:shadow-[0_12px_32px_rgba(237,111,92,0.15)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ed6f5c] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4 p-6">
                <div className="w-10 h-10 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#15140f] dark:text-[#f7f1de] group-hover:bg-[#ed6f5c] group-hover:text-white dark:group-hover:text-white flex items-center justify-center font-medium transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Lightroom Presets</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5 text-[#5a5448] dark:text-[#ece4cf] font-sans">
                    Photographer LUT parameters and XMP files styled and presented inside side-by-side splits with before-and-after panels.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="py-2.5 px-6 bg-[#ece4cf]/30 dark:bg-[#22211b]/35 border-t border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] text-[9px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                Mockups: Split Landscape Screen
              </CardFooter>
            </Card>

            {/* Category 4: Digital Agenda Planners */}
            <Card
              onClick={() => handleSelectProductType('planners')}
              className="group bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-[0_6px_20px_rgba(21,20,15,0.05)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:border-[#ed6f5c]/60 dark:hover:border-[#ed6f5c]/60 hover:shadow-[0_12px_32px_rgba(237,111,92,0.15)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ed6f5c] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4 p-6">
                <div className="w-10 h-10 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#15140f] dark:text-[#f7f1de] group-hover:bg-[#ed6f5c] group-hover:text-white dark:group-hover:text-white flex items-center justify-center font-medium transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Digital Planners</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5 text-[#5a5448] dark:text-[#ece4cf] font-sans">
                    Weekly calendars, budget binders, and interactive PDF journals formatted inside a sleek digital tablet computer bezels.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="py-2.5 px-6 bg-[#ece4cf]/30 dark:bg-[#22211b]/35 border-t border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] text-[9px] font-mono text-[#8b8676] dark:text-[#a39e8f] uppercase">
                Mockups: Tablet Device Covers
              </CardFooter>
            </Card>

          </div>
        </main>

        <footer className={`h-16 border-t ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#12110c] text-[#a39e8f]' : 'border-[rgba(21,20,15,0.16)] bg-[#efe7d2] text-[#8b8676]'} flex items-center justify-center text-[10px] font-mono tracking-wide`}>
          Select a listing type to start configuring resources.
        </footer>
      </div>
  );
}

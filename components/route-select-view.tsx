'use client';

// "Choose your route" screen (Etsy OAuth vs manual copy). Extracted
// mechanically from Home — prop names mirror the originals.
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileCode, Grid, Lock, LogOut, Store } from 'lucide-react';

export function RouteSelectView({
  darkMode,
  selectedMode,
  handleConnectEtsy,
  setSelectedMode,
  setCurrentView,
  handleLogOut
}: {
  darkMode: boolean;
  selectedMode: 'etsy' | 'manual' | null;
  handleConnectEtsy: () => void;
  setSelectedMode: (mode: 'etsy' | 'manual' | null) => void;
  setCurrentView: (view: 'projects') => void;
  handleLogOut: () => void;
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
            <span><b>{darkMode ? "NIGHT MODE" : "AUTOLISTER"} / 2026</b> &nbsp;·&nbsp; Routing Channels</span>
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
                <span className="text-base font-serif font-medium tracking-tight leading-none">
                  Etsy <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#ed6f5c] ml-0.5">AutoLister</span>
                </span>
                <span className="text-[9px] text-[#8b8676] font-mono uppercase tracking-widest mt-1">Select Integration Route</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Premium Back to projects list */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentView('projects')}
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer flex items-center gap-1.5`}
              >
                <Grid className="w-3.5 h-3.5 text-[#ed6f5c]" /> Projects Registry
              </Button>

              <Button
                onClick={handleLogOut}
                size="sm"
                variant="outline"
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col justify-center space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ece4cf]/60 dark:bg-[#1a1914]/80 text-[#ed6f5c] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-full text-[10px] uppercase font-mono tracking-wider">
              <Lock className="w-3 h-3 text-[#ed6f5c]" />
              <span>Safe Cloud Persistence</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-[#15140f] dark:text-[#f7f1de] leading-none">
              How would you like to list today?
            </h1>
            <p className="text-[#5a5448] dark:text-[#ece4cf] max-w-lg mx-auto text-xs sm:text-sm leading-relaxed font-sans">
              Connect directly to publish drafts straight to your authenticated Etsy Storefront, or build your layouts manually with active side-by-side copy widgets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Direct Sync integration Mode */}
            <Card
              className="group bg-[#f7f1de] dark:bg-[#1a1914] hover:border-[#ed6f5c]/60 border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-[0_8px_30px_rgba(21,20,15,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_40px_rgba(237,111,92,0.16)] dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
              onClick={handleConnectEtsy}
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#ed6f5c] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4 p-8">
                <div className="w-12 h-12 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-xl flex items-center justify-center text-[#15140f] dark:text-[#f7f1de] transition-colors group-hover:bg-[#ed6f5c] group-hover:text-white dark:group-hover:text-white duration-300">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Route A: Direct Store Mode</CardTitle>
                  <CardDescription className="text-[#5a5448] dark:text-[#ece4cf] mt-2 text-xs leading-relaxed font-sans">
                    OAuth secure coupling with your registered Etsy shop. Auto-submits generated graphic interior mockups, titles, pricing structure and deliverables into your seller draft queues.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="bg-[#ece4cf]/30 dark:bg-[#22211b]/35 p-6 border-t border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#ed6f5c] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  Connect Seller Portal <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] bg-[#f7f1de] dark:bg-[#12110c] text-[#ed6f5c] border border-[#ed6f5c]/20 font-mono px-2 py-0.5 rounded uppercase font-bold">API Integration</span>
              </CardFooter>
            </Card>

            {/* Path B: Manual Client Copy Mode */}
            <Card
              className="group bg-[#f7f1de] dark:bg-[#1a1914] hover:border-[#15140f]/60 dark:hover:border-[#f7f1de]/60 border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-[0_8px_30px_rgba(21,20,15,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_40px_rgba(21,20,15,0.12)] dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
              onClick={() => setSelectedMode('manual')}
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#15140f] dark:bg-[#f7f1de] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4 p-8">
                <div className="w-12 h-12 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-xl flex items-center justify-center text-[#15140f] dark:text-[#f7f1de] transition-colors group-hover:bg-[#15140f] group-hover:text-white dark:group-hover:bg-[#f7f1de] dark:group-hover:text-[#12110c] duration-300">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Route B: Manual Copy Mode</CardTitle>
                  <CardDescription className="text-[#5a5448] dark:text-[#ece4cf] mt-2 text-xs leading-relaxed font-sans">
                    Compile design drafts on the fly without authorizing shop access. Generates optimized digital packs and mockup sheets with rapid clipboards for simple copy/paste workflows.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="bg-[#ece4cf]/30 dark:bg-[#22211b]/35 p-6 border-t border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  Launch Manual Creator <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] bg-[#f7f1de] dark:bg-[#12110c] text-[#5a5448] dark:text-[#ece4cf] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] font-mono px-2 py-0.5 rounded uppercase font-bold">Offline Safe</span>
              </CardFooter>
            </Card>
          </div>
        </main>

        <footer className={`h-16 border-t ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#12110c] text-[#a39e8f]' : 'border-[rgba(21,20,15,0.16)] bg-[#efe7d2] text-[#8b8676]'} flex items-center justify-center text-[10px] font-mono tracking-wide`}>
          Sync status with Cloud Firestore is active and healthy.
        </footer>
      </div>
  );
}

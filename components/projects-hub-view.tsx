'use client';

// Projects Hub — the project registry dashboard. Extracted mechanically from
// Home; prop names mirror the original state/handler names.
import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Store,
  Sun,
  Trash2,
  User
} from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { PhotoLightbox, type LightboxState } from '@/components/photo-lightbox';
import type { GeneratedMockup, ListingMetadata } from '@/lib/listing-types';

type ListingsCohort = {
  total: number;
  activePipeline: number;
  readyDrafts: number;
  publishedHistory: number;
  unprocessedIdle: number;
};

type HubProject = { key: string; name: string; items: ListingMetadata[] };

type DeleteRequest = { title: string; description: string; action: () => void } | null;

export function ProjectsHubView({
  user,
  darkMode,
  toggleDarkMode,
  dbListings,
  listingsCohort,
  hubFilteredProjects,
  filterTab,
  setFilterTab,
  mockupResultsMap,
  studioTemplateName,
  handleContinueProjectGroup,
  handleDeleteProjectGroup,
  deleteRequest,
  setDeleteRequest,
  lightbox,
  setLightbox,
  setCurrentView,
  setSelectedMode,
  setSelectedProductType,
  handleLogOut
}: {
  user: FirebaseUser;
  darkMode: boolean;
  toggleDarkMode: () => void;
  dbListings: ListingMetadata[];
  listingsCohort: ListingsCohort;
  hubFilteredProjects: HubProject[];
  filterTab: 'all' | 'pipeline' | 'ready' | 'published';
  setFilterTab: (tab: 'all' | 'pipeline' | 'ready' | 'published') => void;
  mockupResultsMap: Record<string, GeneratedMockup[]>;
  studioTemplateName: (templateId: string) => string;
  handleContinueProjectGroup: (name: string, items: ListingMetadata[]) => void;
  handleDeleteProjectGroup: (items: ListingMetadata[]) => void;
  deleteRequest: DeleteRequest;
  setDeleteRequest: (request: DeleteRequest) => void;
  lightbox: LightboxState;
  setLightbox: (state: LightboxState) => void;
  setCurrentView: (view: 'projects' | 'routes' | 'category' | 'workspace' | 'account') => void;
  setSelectedMode: (mode: 'etsy' | 'manual' | null) => void;
  setSelectedProductType: (type: string | null) => void;
  handleLogOut: () => void;
}) {
  return (
      <div className={`min-h-screen font-sans ${darkMode ? 'dark bg-[#12110c] text-[#f7f1de]' : 'bg-[#efe7d2] text-[#15140f]'} flex flex-col justify-between relative transition-colors duration-300`}>
        {/* Side Rails */}
        <div className="side-rail right hidden xl:flex">
          <span className="rail-text">Etsy AutoLister — {darkMode ? "NIGHT ARCHIVE" : "DAY ARCHIVE"} · Vol. 01 · Issue Nº 26</span>
        </div>
        <div className="side-rail left hidden xl:flex">
          <span className="rail-text">Projects Hub · Secure Cloud Persistence</span>
        </div>

        <div>
          {/* Topbar strip */}
          <div className={`topbar w-full ${darkMode ? 'bg-[#12110c] border-[rgba(247,241,222,0.12)] border-b' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.14)] border-b'}`}>
            <div className="max-w-7xl mx-auto px-6 sm:px-12 topbar-inner">
              <span><b>{darkMode ? "NIGHT ARCHIVE" : "AUTOLISTER"} / 2026</b> &nbsp;·&nbsp; Projects Hub</span>
              <span className="hidden md:inline-flex gap-6 font-mono text-[9px] uppercase tracking-widest text-[#8b8676]">
                <span>User: <b className={`${darkMode ? 'text-[#f08e7c]' : 'text-[#ed6f5c]'}`}>{user.email}</b></span>
                <span>Production Mode · Secure Sync</span>
              </span>
              <span className="right">
                <span className="inline-flex items-center text-[10px] font-mono tracking-widest text-[#8b8676] uppercase">
                  <span className="pulse"></span>Cloud Status: Active
                </span>
              </span>
            </div>
          </div>

          {/* Header Navigation with Dark Mode Toggler and Actions */}
          <header className={`relative z-10 py-5 ${darkMode ? 'bg-[#1a1914]/40' : 'bg-[#efe7d2]/40'} w-full flex-shrink-0 border-b ${darkMode ? 'border-[rgba(247,241,222,0.12)]' : 'border-[rgba(21,20,15,0.14)]'}`}>
            <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 flex items-center justify-between">
              <div className="group flex items-center gap-2.5">
                <Store className="w-[1.4rem] h-[1.4rem] text-[#15140f] dark:text-[#f7f1de] group-hover:text-[#ed6f5c] transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3" />
                <div className="flex flex-col">
                  <span className="text-sm font-serif italic font-medium tracking-tight">
                    Etsy <span className="font-sans font-bold not-italic text-xs uppercase tracking-wider text-[#ed6f5c]">Dashboard</span>
                  </span>
                  <span className="hidden md:inline-block text-[10px] text-[#8b8676] uppercase tracking-widest mt-0.5 font-mono">
                    <b>Catalog Workspace Suite</b>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Premium Dark Mode Toggler matching "Join Discord" style */}
                <button
                  onClick={toggleDarkMode}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ed6f5c]/10 text-[#ed6f5c] border border-[#ed6f5c]/20 text-[10.5px] font-sans font-medium tracking-wide transition-all cursor-pointer hover:bg-[#ed6f5c]/15"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5 text-[#ed6f5c]" /> : <Moon className="w-3.5 h-3.5 text-[#ed6f5c]" />}
                  <span className="font-sans font-bold text-[9px] uppercase tracking-wider">{darkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>

                <Button
                  onClick={() => {
                    setSelectedMode(null);
                    setSelectedProductType(null);
                    setCurrentView('routes');
                  }}
                  size="sm"
                  className="bg-[#15140f] dark:bg-[#f7f1de] hover:bg-[#2a2620] dark:hover:bg-[#ece4cf] text-[#f7f1de] dark:text-[#15140f] font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(21,20,15,0.12)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(21,20,15,0.18)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:translate-y-0 active:shadow-[0_4px_12px_rgba(21,20,15,0.12)] transition-all duration-200 cursor-pointer border-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Start New Draft
                </Button>

                <Button
                  onClick={() => setCurrentView('account')}
                  size="sm"
                  variant="outline"
                  className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
                  title="Account & settings"
                >
                  <User className="w-3.5 h-3.5 mr-1 text-[#ed6f5c]" /> Account
                </Button>

                <Button
                  onClick={handleLogOut}
                  size="sm"
                  variant="outline"
                  className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:translate-y-0 transition-all duration-200 cursor-pointer`}
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 py-10 space-y-10">
            {/* Hero / Overview Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-3 max-w-xl text-left">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase block font-sans">
                  {"▪ YOUR CREATIVE DESK"}
                </span>
                <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight leading-tight">
                  Welcome back to <span className="italic font-normal">your digital studio.</span>
                </h1>
                <p className={`text-xs ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} max-w-lg leading-relaxed font-sans`}>
                  Synchronize active listings, resume unfinished pipeline runs configured with high-fidelity canvas previews, and download completed draft packages compiled via Gemini.
                </p>
              </div>

              {/* Stats/Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto md:min-w-[480px]">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'}`}>
                  <div className={`text-[9px] font-mono uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>Total drafts</div>
                  <div className="text-xl font-serif font-bold mt-1">{listingsCohort.total}</div>
                </div>

                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'}`}>
                  <div className={`text-[9px] font-mono uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>In-Progress</div>
                  <div className="text-xl font-serif font-bold mt-1 text-[#ed6f5c]">
                    {listingsCohort.activePipeline + listingsCohort.unprocessedIdle}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'}`}>
                  <div className={`text-[9px] font-mono uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>Ready drafts</div>
                  <div className="text-xl font-serif font-bold mt-1">{listingsCohort.readyDrafts}</div>
                </div>

                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de]/60 border-[rgba(21,20,15,0.16)]'}`}>
                  <div className={`text-[9px] font-mono uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>Live listings</div>
                  <div className="text-xl font-serif font-bold mt-1 text-[#6e7448] dark:text-[#9ea671]">{listingsCohort.publishedHistory}</div>
                </div>
              </div>
            </div>

            {/* Project List / Grid Container */}
            <Card className={`overflow-hidden border shadow-none rounded-2xl ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.14)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'}`}>
              <CardHeader className={`px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${darkMode ? 'border-[rgba(247,241,222,0.10)] bg-[#201e18]/20' : 'border-[rgba(21,20,15,0.12)] bg-[#ece4cf]/15'}`}>
                <div>
                  <CardTitle className="text-sm font-serif font-medium">AutoLister Interactive Listing Project Registry</CardTitle>
                  <CardDescription className={`${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} text-xs mt-1`}>
                    Instantly load unfinished design pipelines or review live-published deliverables.
                  </CardDescription>
                </div>

                {/* Filter segments */}
                <div className={`p-1 border rounded-lg flex items-center self-start sm:self-center gap-1 ${darkMode ? 'bg-[#12110c] border-[rgba(247,241,222,0.12)]' : 'bg-[#ece4cf]/40 border-[rgba(21,20,15,0.14)]'}`}>
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1.5 text-[9.5px] font-mono uppercase tracking-wider rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'all' ? (darkMode ? 'bg-[#1a1914] text-[#f7f1de] shadow-sm font-bold border border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold') : `${darkMode ? 'text-[#a39e8f] hover:text-[#f7f1de]' : 'text-[#5a5448] hover:text-[#15140f]'}`}`}
                  >
                    All ({listingsCohort.total})
                  </button>
                  <button
                    onClick={() => setFilterTab('pipeline')}
                    className={`px-3 py-1.5 text-[9.5px] font-mono uppercase tracking-wider rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'pipeline' ? (darkMode ? 'bg-[#1a1914] text-[#f7f1de] shadow-sm font-bold border border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold') : `${darkMode ? 'text-[#a39e8f] hover:text-[#f7f1de]' : 'text-[#5a5448] hover:text-[#15140f]'}`}`}
                  >
                    Processing ({listingsCohort.activePipeline + listingsCohort.unprocessedIdle})
                  </button>
                  <button
                    onClick={() => setFilterTab('ready')}
                    className={`px-3 py-1.5 text-[9.5px] font-mono uppercase tracking-wider rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'ready' ? (darkMode ? 'bg-[#1a1914] text-[#f7f1de] shadow-sm font-bold border border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold') : `${darkMode ? 'text-[#a39e8f] hover:text-[#f7f1de]' : 'text-[#5a5448] hover:text-[#15140f]'}`}`}
                  >
                    Ready ({listingsCohort.readyDrafts})
                  </button>
                  <button
                    onClick={() => setFilterTab('published')}
                    className={`px-3 py-1.5 text-[9.5px] font-mono uppercase tracking-wider rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'published' ? (darkMode ? 'bg-[#1a1914] text-[#f7f1de] shadow-sm font-bold border border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold') : `${darkMode ? 'text-[#a39e8f] hover:text-[#f7f1de]' : 'text-[#5a5448] hover:text-[#15140f]'}`}`}
                  >
                    Live ({listingsCohort.publishedHistory})
                  </button>
                </div>
              </CardHeader>

              <CardContent className="px-0 py-0 bg-transparent">
                {hubFilteredProjects.length === 0 ? (
                  <div className="text-center py-20 px-4 space-y-4">
                    <div className={`p-4 rounded-full max-w-max mx-auto ${darkMode ? 'bg-[#22211b]' : 'bg-[#ece4cf]/50'}`}>
                      <FileText className={`w-8 h-8 ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif font-medium text-base">No workspace draft listings found</h3>
                      <p className={`text-xs ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} max-w-sm mx-auto font-sans`}>
                        Create a fresh listing to build customized graphic interiors, mockups, keywords and tags automatically.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedMode(null);
                        setSelectedProductType(null);
                        setCurrentView('routes');
                      }}
                      className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-sans font-bold text-[9px] uppercase tracking-wider h-8 rounded-full px-5 inline-flex items-center gap-1.5 cursor-pointer border-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Start project now
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={`${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#1e1d17]/50 hover:bg-transparent' : 'border-[rgba(21,20,15,0.14)] bg-[#ece4cf]/30 hover:bg-transparent'} h-12`}>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} pl-6 h-11`}>Project / Collection</TableHead>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} h-11`}>Product Format</TableHead>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} h-11`}>Production Status</TableHead>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} h-11`}>Mockup Cover</TableHead>
                          <TableHead className={`text-right text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} pr-6 h-11`}>Manage Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hubFilteredProjects.map((project) => {
                          const first = project.items[0];
                          const counts = {
                            running: project.items.filter(i => ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(i.status)).length,
                            queued: project.items.filter(i => i.status === 'idle').length,
                            ready: project.items.filter(i => i.status === 'ready').length,
                            live: project.items.filter(i => i.status === 'published').length
                          };
                          const cover = project.items.find(i => i.mockupImage)?.mockupImage;

                          return (
                            <TableRow key={project.key} className={`${darkMode ? 'border-[rgba(247,241,222,0.10)] text-[#f7f1de]' : 'border-[rgba(21,20,15,0.12)] text-[#15140f]'} bg-transparent hover:bg-[#ece4cf]/15 dark:hover:bg-[#22211b]/30 h-16 transition-colors`}>

                              {/* Project Name + listing count */}
                              <TableCell className="pl-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-serif font-medium text-sm leading-tight block max-w-[280px] truncate" title={project.name}>{project.name}</span>
                                  <span className={`text-[10px] ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} font-mono mt-1 flex items-center gap-1.5`}>
                                    <Layers className={`w-3.5 h-3.5 ${darkMode ? 'text-[#807b6c]' : 'text-[#8b8676]'}`} /> {project.items.length} product listing{project.items.length === 1 ? '' : 's'}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Format Class */}
                              <TableCell className="align-middle">
                                <span className={`text-[10px] font-mono uppercase font-bold border px-2 py-0.5 rounded ${darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.16)] text-[#ece4cf]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]'}`}>
                                  {first?.productType === 'png_graphics' ? 'PNG Graphics' :
                                    first?.productType === 'printable_wallart' ? 'Wall Art' :
                                      first?.productType === 'presets' ? 'Presets' : 'Planner PDF'}
                                </span>
                              </TableCell>

                              {/* Aggregated production status */}
                              <TableCell className="align-middle">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {counts.running > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase tracking-wider border bg-[#efe7d2]/10 border-[#ed6f5c]/40 text-[#ed6f5c]">
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> {counts.running} Running
                                    </span>
                                  )}
                                  {counts.queued > 0 && (
                                    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase tracking-wider border ${darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.16)] text-[#a39e8f]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]'}`}>
                                      {counts.queued} Queued
                                    </span>
                                  )}
                                  {counts.ready > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase tracking-wider border bg-[#ed6f5c]/10 border-[#ed6f5c]/30 text-[#ed6f5c]">
                                      {counts.ready} Ready
                                    </span>
                                  )}
                                  {counts.live > 0 && (
                                    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase tracking-wider border bg-[#6e7448]/10 border-[#6e7448]/30 text-[#6e7448] ${darkMode ? 'dark:text-[#9ea671]' : ''}`}>
                                      {counts.live} Live
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Thumbnail Mockup Preview */}
                              <TableCell className="align-middle">
                                {cover ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Full session renders when available, saved covers otherwise
                                      const items = project.items.flatMap(item => {
                                        const sessionMockups = mockupResultsMap[item.folderName] || [];
                                        if (sessionMockups.length > 0) {
                                          return sessionMockups.map(m => ({ url: m.url, label: item.folderName, sub: studioTemplateName(m.templateId) }));
                                        }
                                        return item.mockupImage ? [{ url: item.mockupImage, label: item.folderName, sub: 'Saved cover' }] : [];
                                      });
                                      if (items.length > 0) setLightbox({ items, index: 0 });
                                    }}
                                    className={`relative w-12 h-12 border rounded overflow-hidden shadow-none bg-transparent group cursor-zoom-in ${darkMode ? 'border-[rgba(247,241,222,0.16)]' : 'border-[rgba(21,20,15,0.16)]'}`}
                                    title="View the project's mockups fullscreen"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={cover}
                                      alt="Mockup Thumbnail"
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  </button>
                                ) : (
                                  <span className={`text-[9px] font-mono uppercase tracking-tight font-medium ${darkMode ? 'text-[#807b6c]' : 'text-[#8b8676]'}`}>Pending</span>
                                )}
                              </TableCell>

                              {/* Quick Action triggers */}
                              <TableCell className="align-middle text-right pr-6">
                                <div className="flex items-center justify-end gap-2.5">
                                  <Button
                                    onClick={() => handleContinueProjectGroup(project.name, project.items)}
                                    size="sm"
                                    className="bg-[#15140f] dark:bg-[#f7f1de] hover:bg-[#2a2620] dark:hover:bg-[#ece4cf] text-[#f7f1de] dark:text-[#15140f] font-mono text-[9px] uppercase tracking-wider h-8.5 px-3.5 rounded-full cursor-pointer border-0 inline-flex items-center gap-1.5 transition-all"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5 text-[#ed6f5c]" /> {counts.live === project.items.length ? 'Review project' : 'Continue project'}
                                  </Button>

                                  <Button
                                    onClick={() => setDeleteRequest({
                                      title: 'Discard the whole project?',
                                      description: `"${project.name}" and all of its ${project.items.length} product listing${project.items.length === 1 ? '' : 's'} will be permanently removed, including saved drafts and covers. This cannot be undone.`,
                                      action: () => handleDeleteProjectGroup(project.items)
                                    })}
                                    size="xs"
                                    variant="ghost"
                                    className={`h-7 px-2 rounded-full hover:bg-[#ed6f5c]/10 text-[#ed6f5c] hover:text-[#e25e4a] cursor-pointer`}
                                    title="Discard the whole project"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>

                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Bottom Strip */}
        <footer className={`h-16 border-t ${darkMode ? 'border-[rgba(247,241,222,0.12)] bg-[#12110c]' : 'border-[rgba(21,20,15,0.16)] bg-[#efe7d2]'} flex items-center justify-center text-[10px] ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'} font-mono tracking-wide mt-12`}>
          Etsy AutoLister — Securely synchronizing {dbListings.length} project drafting assets in the Cloud Run container sandbox.
        </footer>

        {/* Fullscreen photo lightbox (shared component) */}
        <PhotoLightbox lightbox={lightbox} setLightbox={setLightbox} />

        {/* Destructive action confirmation */}
        <DeleteConfirmDialog request={deleteRequest} onClose={() => setDeleteRequest(null)} />
      </div>
  );
}

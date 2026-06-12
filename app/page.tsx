'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Store,
  FolderUp,
  Wand2,
  UploadCloud,
  CheckCircle2,
  ChevronRight,
  Lock,
  LogOut,
  Copy,
  FileCode,
  ArrowRight,
  User,
  Grid,
  ArrowLeft,
  ArrowUp,
  Sparkles,
  History,
  Plus,
  FileText,
  Check,
  Loader2,
  Layers,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  Camera,
  Layers2,
  Settings,
  Image as ImageIcon,
  BookOpen,
  FolderOpen,
  Cpu,
  Archive,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';

// Firebase Imports
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType
} from '@/lib/firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import JSZip from 'jszip';
import { createUploadedPreviews, type UploadedPreview } from '@/lib/uploaded-previews';
import {
  deleteListingAssets,
  loadAllMockups,
  loadAllSources,
  persistMockups,
  persistSources,
  type StoredMockup
} from '@/lib/asset-store';
import {
  checkMockupGenHealth,
  downloadMockupOutput,
  getMockupTemplate,
  isMockupGenSupportedImage,
  listMockupCategories,
  listMockupTemplates,
  renderMockupBatch,
  resolveMockupUrl,
  type MockupArtworkRef,
  type MockupBatchItemSpec,
  type MockupBatchSpec,
  type MockupCategory,
  type MockupFitMode,
  type MockupTemplateDetails,
  type MockupTemplateSummary
} from '@/lib/mockupgen';

type ListingMetadata = {
  id: string;
  folderName: string;
  projectId?: string; // all listings created in one staging-tray batch share this
  projectName?: string;
  title?: string;
  description?: string;
  price?: number;
  tags?: string[];
  status: 'idle' | 'scanning' | 'mockups' | 'thumbnail' | 'compiling' | 'seo' | 'ready' | 'publishing' | 'published';
  listingId?: string;
  listingUrl?: string;
  productType?: string; // 'png_graphics' | 'printable_wallart' | 'presets' | 'planners'
  pipelineStepText?: string;
  mockupImage?: string; // Legacy saved preview from older drafts.
  quantity?: number;
  listingType?: string;
  renewalOption?: string;
  whoMade?: string;
  whenMade?: string;
  category?: string;
  shippingProfile?: string;
  isSupply?: boolean;
  sku?: string;
  primaryColor?: string;
  secondaryColor?: string;
  occasion?: string;
  holiday?: string;
  personalizationEnabled?: boolean;
  personalizationInstructions?: string;
  materials?: string;
  productionPartners?: string;
};

// Extends ListingMetadata with in-memory selected Files during active sessions
type ProductData = ListingMetadata & {
  images: File[];
  files: File[];
};

// A product being assembled in the staging tray before creation. Singles and
// sets coexist in one batch — every staged entry becomes its own listing.
type StagedImage = { id: string; file: File; url: string };
type StagedProduct = {
  id: string;
  name: string;
  kind: 'single' | 'set';
  images: StagedImage[];
  files: File[]; // non-image deliverables (PDF/ZIP) attached to this product
};

// A mockup rendered by the local MockupGen server, downloaded into browser
// memory (the server's outputs folder is not guaranteed to persist).
type GeneratedMockup = {
  id: string;
  templateId: string;
  sourceFileNames: string[]; // the uploaded artwork(s) rendered into this mockup
  frameAssignment?: string[]; // frameAssignment[i] = artwork file name placed in frame i+1
  file: File;
  url: string; // object URL for in-app display
};

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

function SandboxPlayground({ darkMode }: { darkMode?: boolean }) {
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

function ScrollToTop({ darkMode }: { darkMode: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-50 p-3 rounded-full border shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
        } ${darkMode
          ? 'bg-[#1a1914] border-[rgba(247,241,222,0.16)] text-[#efe7d2] hover:bg-[#25241d]'
          : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#15140f] hover:bg-[#ece4cf]'
        }`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

const parseBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[#15140f] dark:text-[#f7f1de]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const renderFormattedDescription = (text: string) => {
  if (!text) return <p className="text-xs text-[#8b8676] italic">No description provided.</p>;

  let normalized = text;

  // Normalize by finding any uppercase header (3-40 chars of letters/spaces/dashes) followed by a colon
  // and putting double newlines around it. Safe lookbehind-free regular expression without /s flag.
  normalized = normalized.replace(/\s*(?:\n)*\s*([A-Z][A-Z\s\-]{2,40}:)\s*/g, "\n\n$1\n\n");

  const lines = normalized.split(/\n\n+/);
  const elements: React.ReactNode[] = [];
  let currentHeader: string | null = null;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if the line itself is a standardized header (e.g. "WHY YOU WILL LOVE IT:")
    const isHeader = /^[A-Z][A-Z\s\-]{2,40}:$/i.test(trimmed);
    if (isHeader) {
      currentHeader = trimmed;
      const headingText = trimmed.replace(/:$/, '');
      const isNotice = headingText.toUpperCase().includes("PLEASE NOTE") || headingText.toUpperCase().includes("TERMS");

      elements.push(
        <h4
          key={`h-${idx}`}
          className={`text-[10px] font-mono font-bold tracking-widest uppercase border-b pb-1.5 mt-6 mb-3 first:mt-0 ${isNotice
            ? 'text-[#ed6f5c] border-[#ed6f5c]/25'
            : 'text-[#ed6f5c] border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)]'
            }`}
        >
          {headingText}
        </h4>
      );
      return;
    }

    // Determine context style based on active header
    const isNoticeSection = currentHeader?.toUpperCase().includes("PLEASE NOTE") || currentHeader?.toUpperCase().includes("TERMS");

    // Parse list items or standard paragraphs
    const hasDashes = trimmed.includes(" - ") || trimmed.includes(" – ") || trimmed.includes(" — ");
    const hasBullets = trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•");

    if (hasBullets) {
      const items = trimmed.split(/\n|[-*•]\s+/).map(item => item.trim()).filter(Boolean);
      elements.push(
        <ul key={`ul-${idx}`} className="space-y-2 list-none mb-4 pl-1">
          {items.map((item, itemIdx) => (
            <li key={itemIdx} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed pl-3.5 relative">
              <span className="absolute left-0 top-1.5 text-[#ed6f5c] text-[10px] font-bold select-none leading-none">•</span>
              {parseBoldText(item)}
            </li>
          ))}
        </ul>
      );
    } else if (hasDashes) {
      // Split into items based on periods followed by spaces (safe, lookbehind-free sentence split)
      const rawItems = trimmed.split(/\.\s+/);
      const itemsFiltered = rawItems.map(item => item.trim()).filter(Boolean);

      const listItems: React.ReactNode[] = [];
      itemsFiltered.forEach((item, itemIdx) => {
        let fullItem = item;
        // Restore trailing period if lost in split and it's not the last item
        if (!fullItem.endsWith('.') && itemIdx < itemsFiltered.length - 1) {
          fullItem += '.';
        }

        // enforce spaces around dashes to avoid breaking words like "High-Quality"
        const dashMatch = fullItem.match(/^([\s\S]*?)\s+([-–—])\s+([\s\S]*)/);
        if (dashMatch) {
          const title = dashMatch[1].trim();
          const desc = dashMatch[3].trim();
          listItems.push(
            <li key={itemIdx} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed pl-3.5 relative">
              <span className="absolute left-0 top-1.5 text-[#ed6f5c] text-[10px] font-bold select-none leading-none">•</span>
              <strong className="font-bold text-[#15140f] dark:text-[#f7f1de]">{title}</strong> — {parseBoldText(desc)}
            </li>
          );
        } else {
          listItems.push(
            <li key={itemIdx} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed pl-3.5 relative">
              <span className="absolute left-0 top-1.5 text-[#ed6f5c] text-[10px] font-bold select-none leading-none">•</span>
              {parseBoldText(fullItem)}
            </li>
          );
        }
      });

      elements.push(
        <ul key={`ul-${idx}`} className="space-y-2 list-none mb-4 pl-1">
          {listItems}
        </ul>
      );
    } else {
      // Render standard paragraph text
      if (isNoticeSection) {
        // Special premium warning callout box design
        elements.push(
          <div key={`p-${idx}`} className="p-4 rounded-xl border border-[#ed6f5c]/25 bg-[#ed6f5c]/5 dark:bg-[#ed6f5c]/10 text-[#5a5448] dark:text-[#ece4cf] mb-4 text-xs leading-relaxed text-left relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ed6f5c]" />
            <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-[#ed6f5c] block mb-1 select-none">Attention Required</span>
            {parseBoldText(trimmed)}
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed mb-4 last:mb-0">
            {parseBoldText(trimmed)}
          </p>
        );
      }
    }
  });

  return <div className="space-y-1">{elements}</div>;
};

const getFormattedPlainTextDescription = (text: string): string => {
  if (!text) return "";

  let normalized = text.trim();

  // Normalize by finding any uppercase header (3-40 chars of letters/spaces/dashes) followed by a colon
  // and putting double newlines around it. Safe lookbehind-free regular expression without /s flag.
  normalized = normalized.replace(/\s*(?:\n)*\s*([A-Z][A-Z\s\-]{2,40}:)\s*/g, "\n\n$1\n\n");

  const lines = normalized.split(/\n\n+/);
  const formattedLines: string[] = [];
  let currentHeader: string | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if the line itself is a standardized header (e.g. "WHY YOU WILL LOVE IT:")
    const isHeader = /^[A-Z][A-Z\s\-]{2,40}:$/i.test(trimmed);
    if (isHeader) {
      currentHeader = trimmed;
      formattedLines.push(trimmed);
      return;
    }

    // Parse list items or standard paragraphs
    const hasDashes = trimmed.includes(" - ") || trimmed.includes(" – ") || trimmed.includes(" — ");
    const hasBullets = trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•");

    if (hasBullets) {
      const items = trimmed.split(/\n|[-*•]\s+/).map(item => item.trim()).filter(Boolean);
      items.forEach(item => {
        formattedLines.push(`• ${item}`);
      });
    } else if (hasDashes) {
      // Split into items based on periods followed by spaces (safe, lookbehind-free sentence split)
      const rawItems = trimmed.split(/\.\s+/);
      const itemsFiltered = rawItems.map(item => item.trim()).filter(Boolean);

      itemsFiltered.forEach((item, itemIdx) => {
        let fullItem = item;
        // Restore trailing period if lost in split and it's not the last item
        if (!fullItem.endsWith('.') && itemIdx < itemsFiltered.length - 1) {
          fullItem += '.';
        }

        // enforce spaces around dashes to avoid breaking words like "High-Quality"
        const dashMatch = fullItem.match(/^([\s\S]*?)\s+([-–—])\s+([\s\S]*)/);
        if (dashMatch) {
          const title = dashMatch[1].trim();
          const desc = dashMatch[3].trim();
          formattedLines.push(`• ${title} — ${desc}`);
        } else {
          formattedLines.push(`• ${fullItem}`);
        }
      });
    } else {
      formattedLines.push(trimmed);
    }
  });

  return formattedLines.join("\n\n");
};

export default function Home() {
  // Authentication & Configuration States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Selection Pathways variables
  const [selectedMode, setSelectedMode] = useState<'etsy' | 'manual' | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null); // e.g. 'png_graphics' | 'printable_wallart' | 'presets' | 'planners'

  const [etsyToken, setEtsyToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [globalAppUrl, setGlobalAppUrl] = useState('');

  // Brand New Dark Mode & Projects view states represent user's workspace preferences:
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autolister-theme') === 'dark';
    }
    return false;
  });
  const [currentView, setCurrentView] = useState<'projects' | 'routes' | 'category' | 'workspace'>('projects');

  // Listings Datastore & Filter states
  const [dbListings, setDbListings] = useState<ListingMetadata[]>([]);
  const [localFilesMap, setLocalFilesMap] = useState<Record<string, { images: File[]; files: File[] }>>({});
  const [mockupResultsMap, setMockupResultsMap] = useState<Record<string, GeneratedMockup[]>>({});
  const [mockupServerStatus, setMockupServerStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('checking');
  // Listings activated in this browser session (created here or continued from the hub)
  const [sessionListingIds, setSessionListingIds] = useState<string[]>([]);
  // Small per-listing source thumbnails (up to 4 object URLs per folder)
  const [sourceThumbsMap, setSourceThumbsMap] = useState<Record<string, string[]>>({});
  // Floating enlarged preview shown while hovering a product thumbnail
  const [hoverThumb, setHoverThumb] = useState<{ urls: string[]; label: string; x: number; y: number } | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Mockup Studio states (guided per-listing creation workspace)
  const [studioListingId, setStudioListingId] = useState<string | null>(null);
  const [studioAutopilot, setStudioAutopilot] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autolister-studio-autopilot') !== 'false';
    }
    return true;
  });
  const [studioSourcePreviews, setStudioSourcePreviews] = useState<UploadedPreview[]>([]);
  const [studioTemplates, setStudioTemplates] = useState<MockupTemplateSummary[]>([]);
  const [studioCategories, setStudioCategories] = useState<MockupCategory[]>([]);
  const [studioTemplateFilter, setStudioTemplateFilter] = useState<string>('all');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  // Frame picker: details of the single selected template + user frame choices
  const [frameTemplate, setFrameTemplate] = useState<MockupTemplateDetails | null>(null);
  const [frameAssignments, setFrameAssignments] = useState<Record<number, string>>({});
  // Per-listing studio choices (templates + frame layout), kept for the session
  const [studioPrefsMap, setStudioPrefsMap] = useState<Record<string, { templateIds: string[]; assignments: Record<number, string> }>>({});
  // How artworks fill their frames — stretch by default, user-changeable
  const [studioFitMode, setStudioFitMode] = useState<MockupFitMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('autolister-fit-mode');
      if (stored === 'auto' || stored === 'cover' || stored === 'contain' || stored === 'stretch') return stored;
    }
    return 'stretch';
  });
  const [isBrowsingTemplates, setIsBrowsingTemplates] = useState(false);
  const [isRenderingMockups, setIsRenderingMockups] = useState(false);
  const [isRunningCopy, setIsRunningCopy] = useState(false);
  const [isRunningAutopilot, setIsRunningAutopilot] = useState(false);
  const [studioZoomMockup, setStudioZoomMockup] = useState<GeneratedMockup | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('preview');
  const [isPackingZip, setIsPackingZip] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [sourcePreviewImages, setSourcePreviewImages] = useState<UploadedPreview[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pipeline' | 'ready' | 'published'>('all');
  const [activeLabFilter, setActiveLabFilter] = useState<'all' | 'wallart' | 'presets' | 'stickers' | 'planners'>('all');

  // Staging tray state — mixed batch of sets and singles before creation
  const [isUploadingRaw, setIsUploadingRaw] = useState(false);
  const [stagedProducts, setStagedProducts] = useState<StagedProduct[]>([]);
  const [stagedSelection, setStagedSelection] = useState<string[]>([]);
  const [projectNameInput, setProjectNameInput] = useState('');
  // The project this session works inside — set by the first creation or by
  // continuing a project from the hub; later creations join it.
  const [activeProject, setActiveProject] = useState<{ id: string; name: string } | null>(null);

  const rawFileInputRef = useRef<HTMLInputElement>(null);
  const setFileInputRef = useRef<HTMLInputElement>(null);
  const studioImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      sourcePreviewImages.forEach(preview => {
        // Mockup object URLs live in mockupResultsMap and are reused across
        // dialog opens — they are revoked on regeneration/logout instead.
        if (!preview.id.startsWith('mockup-')) URL.revokeObjectURL(preview.image);
      });
    };
  }, [sourcePreviewImages]);

  // Branded scroll listener for top menu bar sticky transitions (pure DOM manipulation matching open-design target exactly)
  useEffect(() => {
    const nav = document.querySelector('header.nav');
    if (!nav) return;
    const SHOW_TOP = 250;
    const DELTA = 6;
    let lastY = window.scrollY || 0;

    const onScroll = () => {
      const y = window.scrollY || 0;
      const d = y - lastY;
      if (y <= SHOW_TOP) {
        nav.classList.remove('is-hidden');
      } else if (d > DELTA) {
        nav.classList.add('is-hidden');
      } else if (d < -DELTA) {
        nav.classList.remove('is-hidden');
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadingAuth, user, currentView]);

  // Mark listing folders whose assets changed; a follow-up effect persists
  // them to IndexedDB so refreshes don't lose sources or rendered mockups.
  const pendingPersistRef = useRef<{ sources: Set<string>; mockups: Set<string> }>({ sources: new Set(), mockups: new Set() });

  // Restore browser-persisted assets after login (per-user records)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([loadAllSources(user.uid), loadAllMockups(user.uid)])
      .then(([sources, storedMockups]) => {
        if (cancelled) return;
        // In-memory entries from this session always win over restored ones
        setLocalFilesMap(prev => ({ ...sources, ...prev }));
        const restoredThumbs: Record<string, string[]> = {};
        for (const [folderName, bundle] of Object.entries(sources)) {
          restoredThumbs[folderName] = bundle.images.slice(0, 4).map(file => URL.createObjectURL(file));
        }
        setSourceThumbsMap(prev => ({ ...restoredThumbs, ...prev }));
        setMockupResultsMap(prev => {
          const restored: Record<string, GeneratedMockup[]> = {};
          for (const [folderName, mockups] of Object.entries(storedMockups)) {
            if (prev[folderName]) continue;
            restored[folderName] = mockups.map(stored => {
              const file = new File([stored.blob], stored.fileName, { type: stored.fileType });
              return {
                id: stored.id,
                templateId: stored.templateId,
                sourceFileNames: stored.sourceFileNames,
                frameAssignment: stored.frameAssignment,
                file,
                url: URL.createObjectURL(file)
              };
            });
          }
          return { ...restored, ...prev };
        });
      })
      .catch(() => {
        // IndexedDB unavailable — assets stay in-memory only for this session
      });
    return () => { cancelled = true; };
  }, [user]);

  // Persist dirty source folders after every commit
  useEffect(() => {
    if (!user) return;
    const pending = pendingPersistRef.current.sources;
    if (pending.size === 0) return;
    const folders = Array.from(pending);
    pending.clear();
    for (const folderName of folders) {
      const entry = localFilesMap[folderName];
      persistSources(user.uid, folderName, entry?.images || [], entry?.files || []).catch(() => { });
    }
  }, [localFilesMap, user]);

  // Persist dirty mockup folders after every commit
  useEffect(() => {
    if (!user) return;
    const pending = pendingPersistRef.current.mockups;
    if (pending.size === 0) return;
    const folders = Array.from(pending);
    pending.clear();
    for (const folderName of folders) {
      const stored: StoredMockup[] = (mockupResultsMap[folderName] || []).map(mockup => ({
        id: mockup.id,
        templateId: mockup.templateId,
        sourceFileNames: mockup.sourceFileNames,
        frameAssignment: mockup.frameAssignment,
        fileName: mockup.file.name,
        fileType: mockup.file.type,
        blob: mockup.file
      }));
      persistMockups(user.uid, folderName, stored).catch(() => { });
    }
  }, [mockupResultsMap, user]);

  // Probe the configured MockupGen server availability on load
  useEffect(() => {
    let cancelled = false;
    checkMockupGenHealth().then(ok => {
      if (!cancelled) setMockupServerStatus(ok ? 'online' : 'offline');
    });
    return () => { cancelled = true; };
  }, []);

  // Synchronize Dark Mode client state preferences
  useEffect(() => {
    const isDark = localStorage.getItem('autolister-theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // IntersectionObserver driven animations for data-reveal elements matching open-design
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    const setupObserver = () => {
      const elements = document.querySelectorAll('[data-reveal]:not([data-revealed="true"])');
      if (elements.length === 0) return;

      if (observer) {
        observer.disconnect();
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement;
              target.setAttribute('data-revealed', 'true');
              observer?.unobserve(target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
      );

      elements.forEach((el) => observer?.observe(el));
    };

    setupObserver();
    const timer = setTimeout(setupObserver, 200);
    const timer2 = setTimeout(setupObserver, 800);

    const mutationObserver = new MutationObserver(() => {
      setupObserver();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      if (observer) observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [user, currentView, activeLabFilter, loadingAuth]);


  const toggleDarkMode = () => {
    const nextVal = !darkMode;
    setDarkMode(nextVal);
    if (nextVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('autolister-theme', 'dark');
      toast.success("Dark Mode activated.");
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('autolister-theme', 'light');
      toast.success("Light Mode activated.");
    }
  };

  // Monitor Authentication and Firebase sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);

      if (currentUser) {
        // Logged in: Sync User Profile or create if missing
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              etsyConnected: false,
              createdAt: serverTimestamp()
            });
            toast.info("Created your cloud database account.");
          } else {
            const data = userSnap.data();
            if (data?.etsyConnected && data?.etsyToken) {
              setEtsyToken(data.etsyToken);
              setSelectedMode('etsy');
            }
            if (data?.lastProductType) {
              setSelectedProductType(data.lastProductType);
            }
          }
        } catch (err) {
          console.error("User collection sync error", err);
        }
      } else {
        // Logged out reset
        setSelectedMode(null);
        setSelectedProductType(null);
        setEtsyToken(null);
        setDbListings([]);
        setLocalFilesMap({});
        setMockupResultsMap(prev => {
          Object.values(prev).flat().forEach(mockup => URL.revokeObjectURL(mockup.url));
          return {};
        });
        setStudioListingId(null);
        setStudioSourcePreviews(prev => {
          prev.forEach(preview => URL.revokeObjectURL(preview.image));
          return [];
        });
        setStagedProducts(prev => {
          prev.forEach(product => product.images.forEach(img => URL.revokeObjectURL(img.url)));
          return [];
        });
        setStagedSelection([]);
        setSessionListingIds([]);
        setStudioPrefsMap({});
        setActiveProject(null);
        setSourceThumbsMap(prev => {
          Object.values(prev).flat().forEach(url => URL.revokeObjectURL(url));
          return {};
        });
        setHoverThumb(null);
        setCurrentView('projects');
      }
    });

    // Listen for OAuth messages from popup window
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || !event.data) return;
      if (event.data.type === 'OAUTH_AUTH_SUCCESS' && auth.currentUser) {
        const token = event.data.token;
        setEtsyToken(token);
        setIsConnecting(false);
        setSelectedMode('etsy');

        // Save connection back to Firestore user profile
        setDoc(doc(db, 'users', auth.currentUser.uid), {
          etsyConnected: true,
          etsyToken: token,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => {
          console.error("Error saving Etsy credentials to DB", err);
        });

        toast.success("Etsy shop connected and persisted safely in the cloud database!");
      }
    };

    window.addEventListener('message', handleMessage);

    // Defer setting app URL
    const timeoutId = setTimeout(() => {
      setGlobalAppUrl(window.location.origin);
    }, 0);

    return () => {
      unsub();
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, []);

  // Listen to the User's Saved Listings in Firestore in Real-Time
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/listings`;
    const unsubSnap = onSnapshot(collection(db, path), (snapshot) => {
      const items: ListingMetadata[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as ListingMetadata);
      });
      // Sort in-place by timestamp or status
      setDbListings(items);
    }, (error) => {
      // Mandated handler for Firestore security failures
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubSnap();
  }, [user]);

  // Handle Google Login Flow
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      toast.success("Welcome aboard!");
    } catch (err: any) {
      toast.error(err.message || "Failed to log in with Google.");
    }
  };

  // Handle Log Out
  const handleLogOut = async () => {
    try {
      await signOut(auth);
      setSelectedMode(null);
      setSelectedProductType(null);
      toast.success("Logged out successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to log out.");
    }
  };

  // Trigger Etsy OAuth URL / Demo mode Connect
  const handleConnectEtsy = async () => {
    if (!user) {
      toast.error("Please login first.");
      return;
    }
    try {
      setIsConnecting(true);
      const res = await fetch('/api/auth/etsy/url');
      if (!res.ok) throw new Error('Failed to fetch auth URL');
      const data = await res.json();

      if (data.demoMode) {
        setEtsyToken('DEMO_TOKEN');
        setIsConnecting(false);
        setSelectedMode('etsy');

        // Persist demo credentials
        await setDoc(doc(db, 'users', user.uid), {
          etsyConnected: true,
          etsyToken: 'DEMO_TOKEN'
        }, { merge: true });

        toast.success("Connected in DEMO MODE (Placeholder API keys detected).");
        return;
      }

      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      const popup = window.open(
        data.url,
        'etsy_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error connecting to Etsy');
      setIsConnecting(false);
    }
  };

  // Disconnect Etsy Account / Force revert selection 
  const handleDisconnectEtsy = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        etsyConnected: false,
        etsyToken: null
      }, { merge: true });
      setEtsyToken(null);
      setSelectedMode(null);
      toast.success("Etsy shop disconnected.");
    } catch (err: any) {
      toast.error("Disconnection failed: " + err.message);
    }
  };

  // Switch chosen path mode back to Route Selection Screen
  const handleNavigateBackRoutes = () => {
    setSelectedMode(null);
    setSelectedProductType(null);
    setStudioListingId(null);
    setActiveProject(null);
  };

  // Switch chosen product category type
  const handleNavigateBackProductType = () => {
    setSelectedProductType(null);
    setStudioListingId(null);
    setActiveProject(null);
  };

  // Persists the product category selection to Firestore user profile for safety
  const handleSelectProductType = async (type: string) => {
    setSelectedProductType(type);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          lastProductType: type,
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success(`Configured Workspace: Ready to design listings.`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Derive a clean product name from an image file name
  const productNameFromFile = (fileName: string): string => {
    const base = fileName.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return (base || 'Untitled Product').slice(0, 60);
  };

  const makeStagedImages = (files: File[]): StagedImage[] => {
    const stamp = Date.now();
    return files.map((file, idx) => ({
      id: `img-${stamp}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file)
    }));
  };

  // Stage each picked image as its own single product
  const handleAddSingleProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const picked = Array.from(e.target.files);
    const images = picked.filter(f => f.type.startsWith('image/'));
    const skipped = picked.length - images.length;
    if (skipped > 0) toast.info(`${skipped} non-image file${skipped === 1 ? '' : 's'} skipped — singles are image products.`);
    if (images.length > 0) {
      const stamp = Date.now();
      setStagedProducts(prev => [
        ...prev,
        ...makeStagedImages(images).map((img, idx) => ({
          id: `staged-${stamp}-${idx}`,
          name: productNameFromFile(img.file.name),
          kind: 'single' as const,
          images: [img],
          files: [] as File[]
        }))
      ]);
      toast.success(`Staged ${images.length} single product${images.length === 1 ? '' : 's'}.`);
    }
    if (rawFileInputRef.current) rawFileInputRef.current.value = '';
  };

  // Stage all picked files together as one set product (images + deliverables)
  const handleAddSetProduct = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const picked = Array.from(e.target.files);
    const images = picked.filter(f => f.type.startsWith('image/'));
    const deliverables = picked.filter(f => !f.type.startsWith('image/'));
    if (images.length === 0) {
      toast.error('A set needs at least one image.');
    } else {
      setStagedProducts(prev => [
        ...prev,
        {
          id: `staged-${Date.now()}-set`,
          name: productNameFromFile(images[0].name),
          kind: 'set' as const,
          images: makeStagedImages(images),
          files: deliverables
        }
      ]);
      toast.success(`Staged a set of ${images.length} image${images.length === 1 ? '' : 's'}${deliverables.length > 0 ? ` + ${deliverables.length} deliverable(s)` : ''}.`);
    }
    if (setFileInputRef.current) setFileInputRef.current.value = '';
  };

  const toggleStagedSelect = (id: string) => {
    if (isUploadingRaw) return;
    setStagedSelection(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  // Merge the selected staged products into one set
  const mergeSelectedIntoSet = () => {
    setStagedProducts(prev => {
      const selected = prev.filter(p => stagedSelection.includes(p.id));
      if (selected.length < 2) return prev;
      const merged: StagedProduct = {
        id: `staged-${Date.now()}-merged`,
        name: selected[0].name,
        kind: 'set',
        images: selected.flatMap(p => p.images),
        files: selected.flatMap(p => p.files)
      };
      const firstIndex = prev.findIndex(p => p.id === selected[0].id);
      const rest = prev.filter(p => !stagedSelection.includes(p.id));
      return [...rest.slice(0, firstIndex), merged, ...rest.slice(firstIndex)];
    });
    setStagedSelection([]);
    toast.success('Merged selection into one set product.');
  };

  // Split a staged set back into single products (deliverables stay on the first)
  const ungroupStagedSet = (id: string) => {
    setStagedProducts(prev => {
      const target = prev.find(p => p.id === id);
      if (!target || target.images.length < 2) return prev;
      const stamp = Date.now();
      const singles: StagedProduct[] = target.images.map((img, idx) => ({
        id: `staged-${stamp}-${idx}-split`,
        name: productNameFromFile(img.file.name),
        kind: 'single',
        images: [img],
        files: idx === 0 ? target.files : []
      }));
      const index = prev.findIndex(p => p.id === id);
      return [...prev.slice(0, index), ...singles, ...prev.slice(index + 1)];
    });
    setStagedSelection([]);
  };

  const removeStagedProduct = (id: string) => {
    setStagedProducts(prev => {
      const target = prev.find(p => p.id === id);
      target?.images.forEach(img => URL.revokeObjectURL(img.url));
      return prev.filter(p => p.id !== id);
    });
    setStagedSelection(prev => prev.filter(s => s !== id));
  };

  const clearStagedProducts = () => {
    setStagedProducts(prev => {
      prev.forEach(p => p.images.forEach(img => URL.revokeObjectURL(img.url)));
      return [];
    });
    setStagedSelection([]);
  };

  // Create one listing per staged product — sets and singles alike
  const handleCreateStagedProducts = async () => {
    if (!user || !selectedProductType || stagedProducts.length === 0) return;

    setIsUploadingRaw(true);
    try {
      const usedNames = new Set(Object.keys(localFilesMap));
      const batchMap: Record<string, { images: File[]; files: File[] }> = {};
      const stamp = Date.now().toString().slice(-4);
      const createdIds: string[] = [];
      let created = 0;

      // First creation defines the session's project; later batches join it
      const projectId = activeProject?.id || `proj_${Date.now()}`;
      const projectName = activeProject?.name || projectNameInput.trim() ||
        `Project ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${stagedProducts.length} product${stagedProducts.length === 1 ? '' : 's'}`;

      for (const [index, product] of stagedProducts.entries()) {
        let productName = product.name;
        let suffix = 2;
        while (usedNames.has(productName)) productName = `${product.name} (${suffix++})`;
        usedNames.add(productName);

        const imageFiles = product.images.map(img => img.file);
        batchMap[productName] = {
          images: imageFiles,
          // Without explicit deliverables the images themselves are the product files
          files: product.files.length > 0 ? product.files : imageFiles
        };

        const listingId = productName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase() + `_${stamp}_${index}`;
        const docPath = `users/${user.uid}/listings/${listingId}`;
        try {
          await setDoc(doc(db, docPath), {
            id: listingId,
            userId: user.uid,
            folderName: productName,
            projectId,
            projectName,
            status: 'idle',
            productType: selectedProductType,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          created++;
          createdIds.push(listingId);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
      }

      Object.keys(batchMap).forEach(name => pendingPersistRef.current.sources.add(name));
      Object.entries(batchMap).forEach(([name, bundle]) => updateSourceThumbs(name, bundle.images));
      setLocalFilesMap(prev => ({ ...prev, ...batchMap }));
      setSessionListingIds(prev => [...prev, ...createdIds]);
      setActiveProject({ id: projectId, name: projectName });
      toast.success(activeProject
        ? `Added ${created} product${created === 1 ? '' : 's'} to project "${projectName}".`
        : `Project "${projectName}" created with ${created} product${created === 1 ? '' : 's'} — compile them all in one click.`);
      setProjectNameInput('');
      clearStagedProducts();
    } finally {
      setIsUploadingRaw(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createSourcePreviewImages = (images: File[]) => {
    const imageFiles = images.filter(file => file.type.startsWith('image/'));
    const imageUrls = imageFiles.map(file => URL.createObjectURL(file));
    return createUploadedPreviews(imageFiles, imageUrls);
  };

  // Combine MockupGen renders (first, so they lead the gallery) with the raw uploads
  const buildPreviewGallery = (folderName: string, images: File[]): UploadedPreview[] => {
    const mockupPreviews: UploadedPreview[] = (mockupResultsMap[folderName] || []).map(mockup => ({
      id: mockup.id,
      label: mockup.file.name,
      image: mockup.url
    }));
    return [...mockupPreviews, ...createSourcePreviewImages(images)];
  };

  // Downscaled JPEG data URL — used for Firestore thumbnails and to keep
  // Gemini payloads small enough to avoid empty/blocked responses.
  const blobToScaledJpegDataUrl = (blob: Blob, maxEdge: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to decode rendered mockup'));
      };
      img.src = objectUrl;
    });
  };

  // Refresh the cached source thumbnails for one listing folder
  const updateSourceThumbs = (folderName: string, images: File[]) => {
    (sourceThumbsMap[folderName] || []).forEach(url => URL.revokeObjectURL(url));
    const urls = images.slice(0, 4).map(file => URL.createObjectURL(file));
    setSourceThumbsMap(prev => ({ ...prev, [folderName]: urls }));
  };

  // Static info images attached to every product of a type
  // (administrator drops files into public/listing-extras/<productType>/)
  const fetchListingExtras = async (productType?: string): Promise<{ url: string; file: File }[]> => {
    if (!productType) return [];
    try {
      const res = await fetch(`/api/listing-extras/${productType}`);
      if (!res.ok) return [];
      const data = await res.json();
      const urls: string[] = Array.isArray(data.files) ? data.files : [];
      const extras: { url: string; file: File }[] = [];
      for (const url of urls) {
        try {
          const blob = await (await fetch(url)).blob();
          const name = url.split('/').pop() || 'extra.png';
          extras.push({ url, file: new File([blob], name, { type: blob.type || 'image/png' }) });
        } catch {
          // Skip unreadable extras — never block the listing flow
        }
      }
      return extras;
    } catch {
      return [];
    }
  };

  // Build and download the full product package as a real ZIP:
  // mockups, per-type info images, source images, deliverables + listing copy
  const handleDownloadZipPackage = async (product: ProductData) => {
    setIsPackingZip(true);
    try {
      const sessionFiles = localFilesMap[product.folderName] || { images: [], files: [] };
      const mockups = mockupResultsMap[product.folderName] || [];
      const extras = await fetchListingExtras(product.productType);

      if (mockups.length === 0 && extras.length === 0 && sessionFiles.images.length === 0 && sessionFiles.files.length === 0) {
        toast.error('Nothing to pack — no mockups or files are loaded for this product in the browser.');
        return;
      }

      const zip = new JSZip();
      if (mockups.length > 0) {
        const dir = zip.folder('mockups');
        mockups.forEach(mockup => dir?.file(mockup.file.name, mockup.file));
      }
      if (extras.length > 0) {
        const dir = zip.folder('info-images');
        extras.forEach(extra => dir?.file(extra.file.name, extra.file));
      }
      if (sessionFiles.images.length > 0) {
        const dir = zip.folder('source-images');
        sessionFiles.images.forEach(file => dir?.file(file.name, file));
      }
      if (sessionFiles.files.length > 0) {
        const dir = zip.folder('deliverables');
        sessionFiles.files.forEach(file => dir?.file(file.name, file));
      }
      zip.file('listing.txt', [
        `TITLE:\n${product.title || ''}`,
        `DESCRIPTION:\n${product.description || ''}`,
        `TAGS:\n${(product.tags || []).join(', ')}`,
        `PRICE: ${product.price ?? ''}`
      ].join('\n\n'));

      const blob = await zip.generateAsync({ type: 'blob' });
      const zipName = `${product.folderName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase()}_etsy_package.zip`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${zipName} downloaded (${mockups.length} mockups · ${extras.length} info · ${sessionFiles.images.length} sources · ${sessionFiles.files.length} deliverables).`);
    } catch (err: any) {
      toast.error('ZIP packaging failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPackingZip(false);
    }
  };

  // Detect an image's orientation so we can pick ratio-appropriate templates
  const getImageOrientation = (file: File): Promise<'portrait' | 'landscape' | 'square'> => {
    return new Promise(resolve => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const ratio = img.width / img.height;
        resolve(ratio > 1.05 ? 'landscape' : ratio < 0.95 ? 'portrait' : 'square');
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve('square');
      };
      img.src = objectUrl;
    });
  };

  // Template catalog for client-side planning (cached in studio state)
  const getTemplateCatalog = async (): Promise<MockupTemplateSummary[]> => {
    if (studioTemplates.length > 0) return studioTemplates;
    try {
      const templates = await listMockupTemplates();
      setStudioTemplates(templates);
      return templates;
    } catch {
      return [];
    }
  };

  // Render real mockups on the local MockupGen server.
  // One image → one mockup per template (or one auto-matched mockup).
  // Multiple images → a SET: all images appear together in ONE mockup
  // (one batch item with an artworks list), per the MockupGen batch API.
  // frameAssignments (frame number → artwork file name) pin set artworks to
  // specific numbered frames; unpinned artworks are auto-placed by ratio.
  const generateListingMockups = async (
    folderName: string,
    images: File[],
    templateIds?: string[],
    options?: { append?: boolean; frameAssignments?: Record<number, string> }
  ): Promise<GeneratedMockup[]> => {
    const artworks = images.filter(isMockupGenSupportedImage);
    if (artworks.length === 0) return [];

    const healthy = await checkMockupGenHealth();
    setMockupServerStatus(healthy ? 'online' : 'offline');
    if (!healthy) {
      toast.warning('MockupGen server is offline — skipping mockup rendering for this run.');
      return [];
    }

    const MAX_ITEMS = 20; // server limit per batch request
    const MAX_SET_ARTWORKS = 12; // server limit per artworks list
    const MIN_MOCKUPS = 7; // every product ships with at least this many mockups
    const fileMap: Record<string, File> = {};
    const fieldToName: Record<string, string> = {};
    const items: MockupBatchItemSpec[] = [];

    if (artworks.length > 1) {
      // SET — one item renders all images together into a multi-frame template
      const setArtworks = artworks.slice(0, MAX_SET_ARTWORKS);
      if (artworks.length > MAX_SET_ARTWORKS) {
        toast.info(`Sets are capped at ${MAX_SET_ARTWORKS} artworks per mockup — extra images were left out.`);
      }
      const frameByName: Record<string, number> = {};
      for (const [frame, fileName] of Object.entries(options?.frameAssignments || {})) {
        if (fileName) frameByName[fileName] = Number(frame);
      }
      setArtworks.forEach((file, index) => {
        fileMap[`artwork_${index}`] = file;
        fieldToName[`artwork_${index}`] = file.name;
      });
      // A template can hold fewer frames than we have images — sending more
      // artworks than frames fails the item, so trim to the first N instead.
      const buildArtworkRefs = (limit: number, maxFrame: number): MockupArtworkRef[] =>
        setArtworks.slice(0, Math.max(1, limit)).map((file, index) => {
          const field = `artwork_${index}`;
          const frame = frameByName[file.name];
          return frame && frame <= maxFrame ? { file: field, frame } : field;
        });

      if (templateIds && templateIds.length > 0) {
        for (const templateId of templateIds.slice(0, MAX_ITEMS)) {
          let frameCount = setArtworks.length;
          try {
            const details = await getMockupTemplate(templateId);
            if (details.frames.length < setArtworks.length) {
              frameCount = details.frames.length;
              toast.info(`"${details.name}" has ${frameCount} frame${frameCount === 1 ? '' : 's'} — using the first ${frameCount} of ${setArtworks.length} images.`);
            }
          } catch {
            // Details unavailable — send the full set and let the server report
          }
          items.push({ id: `set-${templateId}`, artworks: buildArtworkRefs(frameCount, frameCount), template_id: templateId });
        }
      } else {
        // Auto selection: the server picks a template with enough frames
        items.push({ id: 'set-auto', artworks: buildArtworkRefs(setArtworks.length, setArtworks.length) });
      }
    } else {
      // SINGLE artwork — one mockup per chosen template, or one auto match
      const file = artworks[0];
      const field = 'artwork_0';
      fileMap[field] = file;
      fieldToName[field] = file.name;
      if (templateIds && templateIds.length > 0) {
        for (const templateId of templateIds.slice(0, MAX_ITEMS)) {
          items.push({ id: `single-${templateId}`, artworks: field, template_id: templateId });
        }
      }
    }

    // Top up to MIN_MOCKUPS: extra single renders on distinct templates whose
    // orientation matches each artwork (sets get their set mockup first, then
    // each image individually in a ratio-appropriate frame).
    if (items.length < MIN_MOCKUPS) {
      const catalog = await getTemplateCatalog();
      if (catalog.length > 0) {
        const usedTemplates = new Set<string>(
          items.map(item => item.template_id).filter((id): id is string => Boolean(id))
        );
        const fillArtworks = artworks.slice(0, MAX_SET_ARTWORKS);
        const orientations = await Promise.all(fillArtworks.map(file => getImageOrientation(file)));
        let cursor = 0;
        let guard = 0;
        while (items.length < Math.min(MIN_MOCKUPS, MAX_ITEMS) && guard < catalog.length * 2) {
          guard++;
          const index = cursor % fillArtworks.length;
          const field = `artwork_${index}`;
          fileMap[field] = fillArtworks[index];
          fieldToName[field] = fillArtworks[index].name;
          const orientation = orientations[index];
          const pick = catalog.find(t => !usedTemplates.has(t.template_id) && t.orientation === orientation)
            || catalog.find(t => !usedTemplates.has(t.template_id));
          if (!pick) break; // distinct templates exhausted
          usedTemplates.add(pick.template_id);
          items.push({ id: `fill-${index}-${pick.template_id}`, artworks: field, template_id: pick.template_id });
          cursor++;
        }
      }
      if (items.length === 0) {
        // Catalog unreachable — fall back to a single auto-matched render
        const field = 'artwork_0';
        fileMap[field] = artworks[0];
        fieldToName[field] = artworks[0].name;
        items.push({ id: 'single-auto', artworks: field });
      }
    }

    const spec: MockupBatchSpec = {
      defaults: {
        fit_mode: studioFitMode,
        realism: true,
        output: { format: 'jpeg', quality: 90 }
      },
      items
    };

    const response = await renderMockupBatch(spec, fileMap);

    const results: GeneratedMockup[] = [];
    for (const item of response.items) {
      // 207 responses mix successes and failures — handle each item on its own
      if (!item.success || !item.output_url) {
        toast.warning(`Mockup render failed: ${item.error || 'Unknown error'}`);
        continue;
      }
      try {
        // Download promptly — the server's outputs folder is not persistent
        const blob = await downloadMockupOutput(item.output_url);
        // Output filenames are timestamped by the server, so they are unique per run
        const fileName = item.output_url.split('/').pop() || `${item.id}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        results.push({
          id: `mockup-${folderName}-${fileName}`,
          templateId: item.template_id || '',
          sourceFileNames: (item.artworks || Object.keys(fileMap)).map(field => fieldToName[field] || field),
          frameAssignment: item.frame_assignment?.map(field => fieldToName[field] || field),
          file,
          url: URL.createObjectURL(file)
        });
      } catch (err: any) {
        toast.warning(`Could not download a rendered mockup: ${err.message || 'Unknown error'}`);
      }
    }

    if (results.length > 0) {
      pendingPersistRef.current.mockups.add(folderName);
      setMockupResultsMap(prev => {
        if (options?.append) {
          return { ...prev, [folderName]: [...(prev[folderName] || []), ...results] };
        }
        (prev[folderName] || []).forEach(m => URL.revokeObjectURL(m.url));
        return { ...prev, [folderName]: results };
      });
    }
    return results;
  };

  // Drop one rendered mockup from the session results
  const handleRemoveMockup = (folderName: string, mockupId: string) => {
    pendingPersistRef.current.mockups.add(folderName);
    setMockupResultsMap(prev => {
      const existing = prev[folderName] || [];
      const target = existing.find(m => m.id === mockupId);
      if (target) URL.revokeObjectURL(target.url);
      return { ...prev, [folderName]: existing.filter(m => m.id !== mockupId) };
    });
  };

  // Re-render a single mockup (same artworks, template and frame layout)
  const handleRetryMockup = async (folderName: string, mockup: GeneratedMockup) => {
    const sessionFiles = localFilesMap[folderName];
    const sources = (sessionFiles?.images || []).filter(f => mockup.sourceFileNames.includes(f.name));
    if (sources.length === 0) {
      toast.error('Source images for this mockup are no longer in browser memory.');
      return;
    }
    // Rebuild the frame layout the previous render used
    const previousAssignments: Record<number, string> = {};
    mockup.frameAssignment?.forEach((fileName, index) => {
      if (fileName) previousAssignments[index + 1] = fileName;
    });
    setIsRenderingMockups(true);
    try {
      const replacements = await generateListingMockups(
        folderName,
        sources,
        mockup.templateId ? [mockup.templateId] : undefined,
        { append: true, frameAssignments: previousAssignments }
      );
      if (replacements.length > 0) {
        handleRemoveMockup(folderName, mockup.id);
        toast.success('Mockup re-rendered.');
      }
    } catch (err: any) {
      toast.error('Re-render failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRenderingMockups(false);
    }
  };

  // --- Studio pipeline stages ---------------------------------------------

  // Render mockups and persist the dashboard thumbnail (no status changes)
  const renderMockupsForListing = async (
    listingId: string,
    folderName: string,
    templateIds?: string[],
    assignments?: Record<number, string>
  ): Promise<GeneratedMockup[]> => {
    const sessionFiles = localFilesMap[folderName] || { images: [], files: [] };
    const results = await generateListingMockups(folderName, sessionFiles.images, templateIds, { frameAssignments: assignments });

    if (results.length > 0 && user) {
      try {
        const thumbnail = await blobToScaledJpegDataUrl(results[0].file, 480, 0.8);
        await setDoc(doc(db, `users/${user.uid}/listings/${listingId}`), {
          mockupImage: thumbnail,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch {
        // Thumbnail persistence is cosmetic — ignore failures
      }
      toast.success(`Rendered ${results.length} mockup${results.length === 1 ? '' : 's'} via MockupGen.`);
    }
    return results;
  };

  // Guided Studio stage: render mockups as an isolated, reviewable step
  const runMockupStage = async (listing: ListingMetadata, templateIds?: string[], assignments?: Record<number, string>) => {
    if (!user) return;
    const docPath = `users/${user.uid}/listings/${listing.id}`;
    // Re-rendering mockups must not demote an already compiled draft
    const restoreStatus = ['ready', 'published'].includes(listing.status) ? listing.status : 'idle';
    setIsRenderingMockups(true);
    try {
      await setDoc(doc(db, docPath), {
        status: 'mockups',
        pipelineStepText: 'Rendering high-fidelity mockup frames on the MockupGen server...',
        updatedAt: serverTimestamp()
      }, { merge: true });

      const results = await renderMockupsForListing(listing.id, listing.folderName, templateIds, assignments);

      await setDoc(doc(db, docPath), {
        status: restoreStatus,
        pipelineStepText: results.length > 0
          ? 'Mockups rendered — review them in the Studio.'
          : 'Mockup render returned no results.',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err: any) {
      toast.error('Mockup stage failed: ' + (err.message || 'Unknown error'));
      await setDoc(doc(db, docPath), {
        status: restoreStatus,
        pipelineStepText: 'Mockup rendering failed — retry from the Studio.',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => { });
    } finally {
      setIsRenderingMockups(false);
    }
  };

  // Guided Studio stage: Gemini SEO copywriting
  const runCopyStage = async (listingId: string, folderName: string) => {
    if (!user) return;
    const docPath = `users/${user.uid}/listings/${listingId}`;
    const sessionFiles = localFilesMap[folderName] || { images: [], files: [] };
    setIsRunningCopy(true);
    try {
      await setDoc(doc(db, docPath), {
        status: 'seo',
        pipelineStepText: 'Optimizing high-converting titles and metadata with Gemini 3.5...',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Downscale before sending to Gemini — full-resolution uploads can
      // blow past model limits and come back as an empty response.
      const uploadedImageDataUrls = await Promise.all(
        sessionFiles.images
          .filter(file => file.type.startsWith('image/'))
          .map(file => blobToScaledJpegDataUrl(file, 1024, 0.85).catch(() => convertFileToBase64(file)))
      );

      const res = await fetch('/api/gemini/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, images: uploadedImageDataUrls })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const listingData = await res.json();

      // Firestore rejects undefined field values, so never trust the AI
      // payload shape blindly — fall back to safe defaults per field.
      const safeTitle = typeof listingData.title === 'string' && listingData.title.trim()
        ? listingData.title
        : folderName;
      const safeDescription = typeof listingData.description === 'string' ? listingData.description : '';
      const safeTags = Array.isArray(listingData.tags)
        ? listingData.tags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 13)
        : [];
      const safePrice = typeof listingData.price === 'number' && Number.isFinite(listingData.price)
        ? listingData.price
        : 5.00;

      // Master complete! Sync the compiled listing result to Firestore.
      await setDoc(doc(db, docPath), {
        status: 'ready',
        pipelineStepText: 'Optimization complete. Ready to publish!',
        title: safeTitle,
        description: getFormattedPlainTextDescription(safeDescription),
        tags: safeTags,
        price: safePrice,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(`Listing copy compiled for "${folderName}"!`);
    } catch (err: any) {
      toast.error('AI copy stage failed: ' + (err.message || 'Unknown error'));
      await setDoc(doc(db, docPath), {
        status: 'idle',
        pipelineStepText: 'Copy generation failed — run it again from the Studio.',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => { });
    } finally {
      setIsRunningCopy(false);
    }
  };

  // Autopilot: the full chained pipeline with step-by-step status updates
  const runAutomatedAIPipeline = async (listing: ListingMetadata, templateIds?: string[], assignments?: Record<number, string>) => {
    if (!user) return;
    const docPath = `users/${user.uid}/listings/${listing.id}`;
    setIsRunningAutopilot(true);
    try {
      // Step 1: Scanning Assets
      await setDoc(doc(db, docPath), {
        status: 'scanning',
        pipelineStepText: 'Reading digital deliverable blueprints & structures...',
        updatedAt: serverTimestamp()
      }, { merge: true });
      await new Promise(r => setTimeout(r, 1200));

      // Step 2: Render real mockups on the local MockupGen server
      await setDoc(doc(db, docPath), {
        status: 'mockups',
        pipelineStepText: 'Rendering high-fidelity mockup frames on the MockupGen server...',
        updatedAt: serverTimestamp()
      }, { merge: true });

      try {
        await renderMockupsForListing(listing.id, listing.folderName, templateIds, assignments);
      } catch (mockupErr: any) {
        // Mockup rendering is best-effort: keep the rest of the pipeline alive
        toast.warning('Mockup rendering failed: ' + (mockupErr.message || 'Unknown error'));
      }

      // Step 3: Promotional thumbnail texts overlays
      await setDoc(doc(db, docPath), {
        status: 'thumbnail',
        pipelineStepText: 'Configuring Etsy 300DPI promotional cover layout badges...',
        updatedAt: serverTimestamp()
      }, { merge: true });
      await new Promise(r => setTimeout(r, 1200));

      // Step 4: Zip Packing
      await setDoc(doc(db, docPath), {
        status: 'compiling',
        pipelineStepText: 'Assembling safe high-fidelity deliverable zip packs layers...',
        updatedAt: serverTimestamp()
      }, { merge: true });
      await new Promise(r => setTimeout(r, 1200));

      // Step 5: SEO and copy generation with Gemini (manages its own statuses)
      await runCopyStage(listing.id, listing.folderName);
    } catch (err: any) {
      toast.error('Pipeline failed: ' + (err.message || 'Unknown error'));
      await setDoc(doc(db, docPath), {
        status: 'idle',
        pipelineStepText: 'Failed during automation process. Reloading...',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => { });
    } finally {
      setIsRunningAutopilot(false);
    }
  };

  // Bulk: run the full autopilot pipeline over every idle session listing,
  // one after the other (sequential keeps the render server and Gemini happy)
  const runAllIdleListings = async () => {
    const idleListings = dbListings.filter(l => sessionListingIds.includes(l.id) && l.status === 'idle');
    const targets = idleListings.filter(l => (localFilesMap[l.folderName]?.images.length || 0) > 0);
    const skipped = idleListings.length - targets.length;
    if (targets.length === 0) {
      toast.info(skipped > 0
        ? 'Idle listings found, but their files are no longer in browser memory — re-stage them.'
        : 'No idle listings to compile in this session.');
      return;
    }
    if (skipped > 0) {
      toast.info(`${skipped} listing(s) skipped — their files are missing from this session.`);
    }
    setBulkProgress({ done: 0, total: targets.length });
    try {
      for (const [index, listing] of targets.entries()) {
        await runAutomatedAIPipeline(listing);
        setBulkProgress({ done: index + 1, total: targets.length });
      }
      toast.success(`Bulk compile finished — ${targets.length} listing${targets.length === 1 ? '' : 's'} processed.`);
    } finally {
      setBulkProgress(null);
    }
  };

  // --- Mockup Studio session handlers --------------------------------------

  const openStudio = (listing: ListingMetadata) => {
    const sessionFiles = localFilesMap[listing.folderName] || { images: [], files: [] };
    studioSourcePreviews.forEach(p => URL.revokeObjectURL(p.image));
    setStudioSourcePreviews(createSourcePreviewImages(sessionFiles.images));

    // Restore this listing's previous template/frame choices from the session
    const prefs = studioPrefsMap[listing.id];
    setSelectedTemplateIds(prefs?.templateIds || []);
    setFrameAssignments(prefs?.assignments || {});
    if (prefs?.templateIds.length === 1) {
      getMockupTemplate(prefs.templateIds[0])
        .then(details => setFrameTemplate(details))
        .catch(() => setFrameTemplate(null));
    } else {
      setFrameTemplate(null);
    }

    setStudioTemplateFilter('all');
    setIsBrowsingTemplates(false);
    setStudioZoomMockup(null);
    setStudioListingId(listing.id);

    // Load the template catalog for the picker (best-effort, cached per session)
    if (studioTemplates.length === 0) {
      Promise.all([listMockupTemplates(), listMockupCategories()])
        .then(([templates, categories]) => {
          setStudioTemplates(templates);
          setStudioCategories(categories);
          setMockupServerStatus('online');
        })
        .catch(() => {
          setMockupServerStatus('offline');
        });
    }
  };

  const closeStudio = () => {
    studioSourcePreviews.forEach(p => URL.revokeObjectURL(p.image));
    setStudioSourcePreviews([]);
    setStudioZoomMockup(null);
    setStudioListingId(null);
  };

  const toggleStudioAutopilot = () => {
    setStudioAutopilot(prev => {
      const next = !prev;
      localStorage.setItem('autolister-studio-autopilot', next ? 'true' : 'false');
      toast.info(next
        ? 'Autopilot enabled — the pipeline runs end-to-end on launch.'
        : 'Guided mode — you approve each Studio stage yourself.');
      return next;
    });
  };

  // Attach more source images to an open Studio session
  const handleStudioAttachImages = (listing: ListingMetadata, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newImages = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (newImages.length === 0) {
      toast.error('Only image files can be attached as artwork sources.');
      return;
    }
    pendingPersistRef.current.sources.add(listing.folderName);
    const existingEntry = localFilesMap[listing.folderName] || { images: [], files: [] };
    const combinedImages = [...existingEntry.images, ...newImages];
    updateSourceThumbs(listing.folderName, combinedImages);
    setLocalFilesMap(prev => {
      const existing = prev[listing.folderName] || { images: [], files: [] };
      return {
        ...prev,
        [listing.folderName]: { images: [...existing.images, ...newImages], files: existing.files }
      };
    });
    const appendedPreviews = newImages.map((file, idx) => ({
      id: `upload-${file.lastModified}-${idx}-${file.name}`,
      label: file.name,
      image: URL.createObjectURL(file)
    }));
    setStudioSourcePreviews(prev => [...prev, ...appendedPreviews]);
    if (studioImageInputRef.current) studioImageInputRef.current.value = '';
    toast.success(`Attached ${newImages.length} source image${newImages.length === 1 ? '' : 's'}.`);
  };

  // Remove one source image from an open Studio session
  const handleStudioRemoveImage = (listing: ListingMetadata, preview: UploadedPreview) => {
    pendingPersistRef.current.sources.add(listing.folderName);
    const existingEntry = localFilesMap[listing.folderName] || { images: [], files: [] };
    const removeIndex = existingEntry.images.findIndex(f => f.name === preview.label);
    if (removeIndex !== -1) {
      updateSourceThumbs(listing.folderName, [
        ...existingEntry.images.slice(0, removeIndex),
        ...existingEntry.images.slice(removeIndex + 1)
      ]);
    }
    setLocalFilesMap(prev => {
      const existing = prev[listing.folderName] || { images: [], files: [] };
      const index = existing.images.findIndex(f => f.name === preview.label);
      if (index === -1) return prev;
      return {
        ...prev,
        [listing.folderName]: {
          images: [...existing.images.slice(0, index), ...existing.images.slice(index + 1)],
          files: existing.files
        }
      };
    });
    URL.revokeObjectURL(preview.image);
    setStudioSourcePreviews(prev => prev.filter(p => p.id !== preview.id));
    // Frame assignments pointing at the removed image would fail the render
    const nextAssignments: Record<number, string> = {};
    for (const [frame, fileName] of Object.entries(frameAssignments)) {
      if (fileName !== preview.label) nextAssignments[Number(frame)] = fileName;
    }
    setFrameAssignments(nextAssignments);
    saveStudioPrefs(selectedTemplateIds, nextAssignments);
  };

  const changeStudioFitMode = (mode: MockupFitMode) => {
    setStudioFitMode(mode);
    localStorage.setItem('autolister-fit-mode', mode);
  };

  // Remember the studio's template/frame choices for this listing so they
  // survive leaving and re-entering the Studio within the session
  const saveStudioPrefs = (templateIds: string[], assignments: Record<number, string>) => {
    if (!studioListingId) return;
    setStudioPrefsMap(prev => ({ ...prev, [studioListingId]: { templateIds, assignments } }));
  };

  const toggleTemplateSelection = (templateId: string) => {
    const next = selectedTemplateIds.includes(templateId)
      ? selectedTemplateIds.filter(id => id !== templateId)
      : [...selectedTemplateIds, templateId];
    setSelectedTemplateIds(next);
    setFrameAssignments({});
    saveStudioPrefs(next, {});
    // The frame picker works against exactly one chosen template
    if (next.length === 1) {
      getMockupTemplate(next[0])
        .then(details => setFrameTemplate(details))
        .catch(() => setFrameTemplate(null));
    } else {
      setFrameTemplate(null);
    }
  };

  const clearTemplateSelection = () => {
    setSelectedTemplateIds([]);
    setFrameTemplate(null);
    setFrameAssignments({});
    saveStudioPrefs([], {});
  };

  // Assign an artwork to a numbered frame (an artwork can hold only one frame)
  const assignArtworkToFrame = (frame: number, fileName: string) => {
    const next: Record<number, string> = {};
    for (const [key, value] of Object.entries(frameAssignments)) {
      if (Number(key) !== frame && value !== fileName) next[Number(key)] = value;
    }
    if (fileName) next[frame] = fileName;
    setFrameAssignments(next);
    saveStudioPrefs(selectedTemplateIds, next);
  };

  // --- Studio derived view state --------------------------------------------

  const activeStudioListing = studioListingId
    ? dbListings.find(l => l.id === studioListingId) ?? null
    : null;
  const studioSessionFiles = activeStudioListing
    ? (localFilesMap[activeStudioListing.folderName] || { images: [], files: [] })
    : { images: [], files: [] };
  const studioMockups = activeStudioListing
    ? (mockupResultsMap[activeStudioListing.folderName] || [])
    : [];
  const filteredStudioTemplates = studioTemplateFilter === 'all'
    ? studioTemplates
    : studioTemplates.filter(t => t.product_type === studioTemplateFilter);
  const studioBusy = isRenderingMockups || isRunningCopy || isRunningAutopilot ||
    (activeStudioListing ? ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(activeStudioListing.status) : false);
  const studioTemplateName = (templateId: string) =>
    studioTemplates.find(t => t.template_id === templateId)?.name || templateId;

  // 'active' = the machine is working (spinner); 'attention' = waiting for
  // the user to act (clickable call-to-action) — never confuse the two.
  type StudioStepState = 'done' | 'active' | 'attention' | 'pending';
  const studioSteps: { label: string; hint: string; state: StudioStepState; onClick?: () => void }[] = activeStudioListing ? [
    {
      label: 'Upload Assets',
      hint: `${studioSessionFiles.images.length + studioSessionFiles.files.length} file(s) staged`,
      state: 'done'
    },
    {
      label: 'Source Review',
      hint: `${studioSessionFiles.images.length} artwork image(s)`,
      state: studioSessionFiles.images.length > 0 ? 'done' : 'pending'
    },
    {
      label: 'Mockup Lab',
      hint: studioMockups.length > 0 ? `${studioMockups.length} mockup(s) rendered` : 'Render or pick templates',
      state: (isRenderingMockups || activeStudioListing.status === 'mockups') ? 'active'
        : (studioMockups.length > 0 || activeStudioListing.mockupImage) ? 'done' : 'pending'
    },
    {
      label: 'AI Copywriting',
      hint: activeStudioListing.title ? 'Title, tags & copy ready' : 'Gemini SEO metadata',
      state: (isRunningCopy || activeStudioListing.status === 'seo') ? 'active'
        : activeStudioListing.title ? 'done' : 'pending'
    },
    {
      label: 'Review & Publish',
      hint: activeStudioListing.status === 'published' ? 'Live on Etsy'
        : activeStudioListing.status === 'ready' ? 'Your turn — click to open the draft' : 'Final draft review',
      state: activeStudioListing.status === 'published' ? 'done'
        : activeStudioListing.status === 'ready' ? 'attention' : 'pending',
      onClick: activeStudioListing.status === 'ready' && !studioBusy
        ? () => openPreviewPanel(activeStudioListing)
        : undefined
    }
  ] : [];

  // Real-time synchronization of active draft edits with React state and Firestore
  const handleUpdateActiveProduct = async (key: string, value: any) => {
    if (!activeProduct) return;

    // Update local React state instantly
    setActiveProduct(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: value
      };
    });

    // Sync to Firestore in the background
    if (user) {
      const docPath = `users/${user.uid}/listings/${activeProduct.id}`;
      try {
        await setDoc(doc(db, docPath), {
          [key]: value,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    }
  };

  // Direct connected API Etsy publishing process
  const publishToEtsySnapshot = async (item: ListingMetadata) => {
    if (!user) return;
    if (selectedMode !== 'etsy' || !etsyToken) {
      toast.error('Select Interactive Etsy Store mode and connect your account.');
      return;
    }

    const sessionFiles = localFilesMap[item.folderName];
    if (!sessionFiles) {
      toast.error('Active upload assets missing in this browser. Reload raw files or browse directory.');
      return;
    }

    const docPath = `users/${user.uid}/listings/${item.id}`;
    try {
      await setDoc(doc(db, docPath), {
        status: 'publishing',
        pipelineStepText: 'Exporting digital listing data straight to Connected Etsy Shop...',
        updatedAt: serverTimestamp()
      }, { merge: true });

      const formData = new FormData();
      formData.append('token', etsyToken);
      formData.append('title', item.title || '');
      formData.append('description', item.description || '');
      formData.append('price', (item.price || 5.00).toString());
      (item.tags || []).forEach(tag => formData.append('tags', tag));

      // Append standard and rich listing parameters
      if (item.quantity !== undefined) formData.append('quantity', item.quantity.toString());
      if (item.listingType) formData.append('listingType', item.listingType);
      if (item.renewalOption) formData.append('renewalOption', item.renewalOption);
      if (item.whoMade) formData.append('whoMade', item.whoMade);
      if (item.whenMade) formData.append('whenMade', item.whenMade);
      if (item.category) formData.append('category', item.category);
      if (item.shippingProfile) formData.append('shippingProfile', item.shippingProfile);

      if (item.isSupply !== undefined) formData.append('isSupply', item.isSupply.toString());
      if (item.sku) formData.append('sku', item.sku);
      if (item.primaryColor) formData.append('primaryColor', item.primaryColor);
      if (item.secondaryColor) formData.append('secondaryColor', item.secondaryColor);
      if (item.occasion) formData.append('occasion', item.occasion);
      if (item.holiday) formData.append('holiday', item.holiday);
      if (item.personalizationEnabled !== undefined) formData.append('personalizationEnabled', item.personalizationEnabled.toString());
      if (item.personalizationInstructions) formData.append('personalizationInstructions', item.personalizationInstructions);
      if (item.materials) formData.append('materials', item.materials);
      if (item.productionPartners) formData.append('productionPartners', item.productionPartners);

      // Photo package, in cover order: mockups → per-type info extras →
      // original source images. Etsy allows up to 20 photos per listing.
      const ETSY_MAX_PHOTOS = 20;
      const extras = await fetchListingExtras(item.productType);
      const photoFiles: File[] = [
        ...(mockupResultsMap[item.folderName] || []).map(mockup => mockup.file),
        ...extras.map(extra => extra.file),
        ...sessionFiles.images
      ];
      if (photoFiles.length > ETSY_MAX_PHOTOS) {
        toast.info(`Etsy allows ${ETSY_MAX_PHOTOS} photos — ${photoFiles.length - ETSY_MAX_PHOTOS} trimmed from the end of the package.`);
      }
      photoFiles.slice(0, ETSY_MAX_PHOTOS).forEach(file => formData.append('image', file));
      sessionFiles.files.forEach(file => formData.append('file', file));

      const res = await fetch('/api/etsy/create-listing', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // Successfully published: Sync to Firestore
      await setDoc(doc(db, docPath), {
        status: 'published',
        listingId: result.listingId,
        listingUrl: result.url,
        pipelineStepText: 'Finished layout. Successfully listed!',
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Successfully uploaded files and published draft to Etsy!');
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error('Failed to publish to store: ' + (err.message || 'Unknown error'));
      await setDoc(doc(db, docPath), {
        status: 'ready',
        pipelineStepText: 'Published aborted. Review your draft metadata settings.',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => { });
    }
  };

  // Delete Listing from cloud collection and local states
  const handleDeleteListingDraft = async (item: ListingMetadata) => {
    if (!user) return;
    const docPath = `users/${user.uid}/listings/${item.id}`;
    try {
      await deleteDoc(doc(db, docPath));
      deleteListingAssets(user.uid, item.folderName).catch(() => { });
      setSourceThumbsMap(prev => {
        (prev[item.folderName] || []).forEach(url => URL.revokeObjectURL(url));
        const next = { ...prev };
        delete next[item.folderName];
        return next;
      });
      toast.success("Listing draft discarded from database.");
    } catch (err: any) {
      toast.error("Discard failed: " + err.message);
    }
  };

  // Open Preview / Review dialog
  const openPreviewPanel = (item: ListingMetadata) => {
    const sessionFiles = localFilesMap[item.folderName] || { images: [], files: [] };
    setActiveProduct({
      ...item,
      description: getFormattedPlainTextDescription(item.description || ''),
      images: sessionFiles.images,
      files: sessionFiles.files
    });
    setSourcePreviewImages(buildPreviewGallery(item.folderName, sessionFiles.images));
    setSelectedPreviewIndex(0);
    setDescTab('preview');
    setIsDialogOpen(true);

    // Append the per-type info extras to the gallery once they load
    fetchListingExtras(item.productType).then(extras => {
      if (extras.length === 0) return;
      setSourcePreviewImages(prev => prev.some(p => p.id.startsWith('extra-'))
        ? prev
        : [...prev, ...extras.map((extra, index) => ({ id: `extra-${index}`, label: extra.file.name, image: extra.url }))]);
    });
  };

  // Resume a whole project: load ALL its listings into the session
  // (replaces the previous session scope — no accumulation between clicks)
  const handleContinueProjectGroup = (name: string, items: ListingMetadata[]) => {
    setSessionListingIds(items.map(item => item.id));
    const first = items[0];
    // New uploads in this session will join the continued project
    setActiveProject(first ? { id: first.projectId || first.id, name } : null);
    setSelectedProductType(first?.productType || 'png_graphics');
    // If we have an Etsy token connected, we use Direct Store Mode, else Manual Mode
    setSelectedMode(etsyToken ? 'etsy' : 'manual');
    setStudioListingId(null);
    setCurrentView('workspace');
    toast.success(`Resumed project "${name}" — ${items.length} listing${items.length === 1 ? '' : 's'} loaded into the session.`);
  };

  // Discard an entire project (all of its listings)
  const handleDeleteProjectGroup = async (items: ListingMetadata[]) => {
    if (!user) return;
    for (const item of items) {
      const docPath = `users/${user.uid}/listings/${item.id}`;
      try {
        await deleteDoc(doc(db, docPath));
        deleteListingAssets(user.uid, item.folderName).catch(() => { });
      } catch (err: any) {
        toast.error(`Failed to discard "${item.folderName}": ${err.message}`);
        return;
      }
    }
    setSessionListingIds(prev => prev.filter(id => !items.some(item => item.id === id)));
    setSourceThumbsMap(prev => {
      const next = { ...prev };
      for (const item of items) {
        (next[item.folderName] || []).forEach(url => URL.revokeObjectURL(url));
        delete next[item.folderName];
      }
      return next;
    });
    toast.success(`Project discarded (${items.length} listing${items.length === 1 ? '' : 's'}).`);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Sort and Categorize items into cohorts for statistic metrics
  const listingsCohort = {
    total: dbListings.length,
    activePipeline: dbListings.filter(item => ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(item.status)).length,
    readyDrafts: dbListings.filter(item => item.status === 'ready').length,
    publishedHistory: dbListings.filter(item => item.status === 'published').length,
    unprocessedIdle: dbListings.filter(item => item.status === 'idle').length
  };

  // Filter listings based on chosen Status Tab
  const filteredListings = dbListings.filter(item => {
    if (filterTab === 'all') return true;
    if (filterTab === 'pipeline') return ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo', 'idle'].includes(item.status);
    if (filterTab === 'ready') return item.status === 'ready';
    if (filterTab === 'published') return item.status === 'published';
    return true;
  });

  // Session scope: the workspace dashboard shows only listings activated in
  // this browser session — the full archive lives in the Projects Hub.
  const sessionListings = dbListings.filter(item => sessionListingIds.includes(item.id));
  const sessionCohort = {
    total: sessionListings.length,
    activePipeline: sessionListings.filter(item => ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(item.status)).length,
    readyDrafts: sessionListings.filter(item => item.status === 'ready').length,
    publishedHistory: sessionListings.filter(item => item.status === 'published').length,
    unprocessedIdle: sessionListings.filter(item => item.status === 'idle').length
  };
  const sessionFilteredListings = sessionListings.filter(item => {
    if (filterTab === 'all') return true;
    if (filterTab === 'pipeline') return ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo', 'idle'].includes(item.status);
    if (filterTab === 'ready') return item.status === 'ready';
    if (filterTab === 'published') return item.status === 'published';
    return true;
  });

  // The hub groups listings into projects — one row per creation batch.
  // Listings created before the project model stand alone as one-item projects.
  const hubProjects = (() => {
    const map = new Map<string, { key: string; name: string; items: ListingMetadata[] }>();
    for (const item of dbListings) {
      const key = item.projectId || item.id;
      const entry = map.get(key);
      if (entry) {
        entry.items.push(item);
      } else {
        map.set(key, { key, name: item.projectName || item.folderName, items: [item] });
      }
    }
    return Array.from(map.values());
  })();
  const hubFilteredProjects = hubProjects.filter(project => project.items.some(item => {
    if (filterTab === 'all') return true;
    if (filterTab === 'pipeline') return ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo', 'idle'].includes(item.status);
    if (filterTab === 'ready') return item.status === 'ready';
    if (filterTab === 'published') return item.status === 'published';
    return true;
  }));
  const selectedPreview = sourcePreviewImages[selectedPreviewIndex] || sourcePreviewImages[0];

  // --- RENDERS ---

  // Loading indicator for active Firebase authentication checks
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="relative flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 bg-[#F5F1EA] border border-[#E5DEC9] rounded-2xl flex items-center justify-center mb-6">
            <Store className="w-8 h-8 text-[#191919]" />
          </div>
          <div className="w-6 h-6 border-2 border-[#191919] border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-serif font-medium text-[#191919] tracking-tight">Etsy AutoLister</h3>
          <p className="mt-3 text-xs text-[#6B655B] font-medium leading-relaxed font-sans">
            Synchronizing securely with cloud servers and retrieving active catalog sessions...
          </p>
        </div>
      </div>
    );
  }

  // Option 1: Render Introductory Landing Page if Client is NOT Authenticated
  if (!user) {
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

  // New Dashboard view for user's projects after login
  if (currentView === 'projects') {
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
                                  <div className={`relative w-12 h-9 border rounded overflow-hidden shadow-none bg-transparent group ${darkMode ? 'border-[rgba(247,241,222,0.16)]' : 'border-[rgba(21,20,15,0.16)]'}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={cover}
                                      alt="Mockup Thumbnail"
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  </div>
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
                                    onClick={() => handleDeleteProjectGroup(project.items)}
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
      </div>
    );
  }

  // Option 2: Choose Path Mode selection screen if client logged in, but has not validated path mode (Either Etsy Shop api or Manual copy panels)
  if (!selectedMode && !etsyToken) {
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

  // Option 3: Select Digital Product Type (PNG pack, printable art, photographers presets etc)
  if (selectedMode && !selectedProductType) {
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

  // Option 4: Full Interactive Workspace Panel (Logged-in, Mode Chosen, Category Type chosen)
  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#12110c] text-[#f7f1de]' : 'bg-[#efe7d2] text-[#15140f]'} pb-16 relative font-sans transition-colors duration-300`}>
      <div className={`sticky top-0 z-30 w-full backdrop-blur-md ${darkMode ? 'bg-[#12110c]/95 border-[rgba(247,241,222,0.12)]' : 'bg-[#efe7d2]/90 border-[rgba(21,20,15,0.16)]'} border-b`}>
        <div className="topbar w-full border-b-0">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 topbar-inner">
            <span><b>{darkMode ? "NIGHT ARCHIVE" : "AUTOLISTER"} / 2026</b> &nbsp;·&nbsp; Workspace Catalog Suite</span>
            <span className="hidden md:inline-flex gap-6 font-mono text-[9px] uppercase tracking-wider text-[#8b8676]">
              <span>Filed under <b className="text-[#ed6f5c]">Etsy · Automation</b></span>
              <span>Production Mode · Secure Sync</span>
              <span className="inline-flex items-center gap-1.5" title="MockupGen render server status">
                <span className={`w-1.5 h-1.5 rounded-full ${mockupServerStatus === 'online' ? 'bg-[#6e7448]' :
                  mockupServerStatus === 'offline' ? 'bg-[#ed6f5c]' :
                    'bg-[#8b8676] animate-pulse'
                  }`} />
                <span className={mockupServerStatus === 'online' ? 'text-[#6e7448]' :
                  mockupServerStatus === 'offline' ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}>
                  Mockup Engine · {mockupServerStatus === 'online' ? 'Connected' : mockupServerStatus === 'offline' ? 'Offline' : 'Checking'}
                </span>
              </span>
            </span>
            <span className="right">
              <span className="inline-flex items-center text-[10px] font-mono tracking-wider"><span className="pulse"></span>Live · v0.3.0</span>
            </span>
          </div>
        </div>

        {/* Workspace Header Panel */}
        <header className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 border ${darkMode ? 'border-[#f7f1de]' : 'border-[#15140f]'} rounded-full flex items-center justify-center font-serif italic text-lg select-none`}>
                Ø
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className={`text-base font-serif font-medium ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'} tracking-tight`}>
                    Etsy <span className="font-sans font-bold text-xs uppercase text-[#ed6f5c] tracking-wider ml-0.5">AutoLister</span>
                  </h1>
                  <span className={`text-[10px] font-mono border px-2 py-0.5 rounded uppercase font-medium ${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.16)] text-[#ece4cf]' : 'bg-[#ece4cf]/60 border-[rgba(21,20,15,0.16)] text-[#15140f]'}`}>
                    {selectedMode === 'etsy' ? 'Route A: Direct Store' : 'Route B: Manual Copy'}
                  </span>
                </div>

                <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} font-medium mt-0.5`}>
                  <span>Category:</span>
                  <span className={`font-semibold capitalize ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>
                    {selectedProductType === 'png_graphics' ? 'PNG Artwork Clipart Pack' :
                      selectedProductType === 'printable_wallart' ? 'Printable Wall Art Canvas' :
                        selectedProductType === 'presets' ? 'Lightroom Preset Bundle' : 'Agenda / E-Book Planner'}
                  </span>
                  <button
                    onClick={handleNavigateBackProductType}
                    className="text-[#ed6f5c] hover:underline font-bold text-[9px] uppercase tracking-wider ml-1"
                  >
                    [Change]
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
                variant="outline"
                onClick={handleNavigateBackRoutes}
                className={`hidden sm:inline-flex font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-[#8b8676]" /> Routes
              </Button>

              {selectedMode === 'etsy' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnectEtsy}
                  className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ed6f5c] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#ed6f5c] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Disconnect Shop
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogOut}
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#efe7d2] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
              >
                Sign Out
              </Button>
            </div>

          </div>
        </header>
      </div>

      {/* Primary Workspace main grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {activeStudioListing ? (
          <>
            {/* ============ MOCKUP STUDIO ============ */}

            {/* Studio header bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={closeStudio}
                  className="font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf] shadow-none cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-[#8b8676]" /> Workspace
                </Button>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase block">{"▪ MOCKUP STUDIO"}</span>
                  <h2 className="text-xl font-serif font-medium text-[#15140f] leading-tight max-w-[440px] truncate" title={activeStudioListing.folderName}>{activeStudioListing.folderName}</h2>
                  {activeStudioListing.pipelineStepText && (
                    <span className="text-[10px] text-[#5a5448]/80 font-medium">{activeStudioListing.pipelineStepText}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-center">
                {/* Pipeline mode preference toggle */}
                <div className="flex bg-[#ece4cf]/80 p-1 rounded-lg text-[10px] font-mono border border-[rgba(21,20,15,0.16)] uppercase tracking-wider select-none">
                  <button
                    onClick={() => { if (!studioAutopilot) toggleStudioAutopilot(); }}
                    className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${studioAutopilot ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                    title="Run the entire pipeline end-to-end automatically"
                  >
                    <Cpu className={`w-3 h-3 ${studioAutopilot ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`} /> Autopilot
                  </button>
                  <button
                    onClick={() => { if (studioAutopilot) toggleStudioAutopilot(); }}
                    className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${!studioAutopilot ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                    title="Approve each stage yourself: mockups, copy, publish"
                  >
                    <Settings className={`w-3 h-3 ${!studioAutopilot ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`} /> Guided
                  </button>
                </div>

                <span className={`inline-flex items-center px-2.5 py-1 text-[9px] font-mono font-bold rounded-full uppercase tracking-wider border select-none
                  ${activeStudioListing.status === 'idle' ? 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]' :
                    ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(activeStudioListing.status) ? 'bg-[#efe7d2] border-[#ed6f5c]/40 text-[#ed6f5c]' :
                      activeStudioListing.status === 'ready' ? 'bg-[#ed6f5c]/10 border-[#ed6f5c]/30 text-[#ed6f5c]' :
                        'bg-[#6e7448]/10 border-[#6e7448]/30 text-[#6e7448]'
                  }`}>
                  {activeStudioListing.status === 'idle' ? 'Draft Staged' :
                    activeStudioListing.status === 'ready' ? 'Ready to Publish' :
                      activeStudioListing.status === 'published' ? 'Live on Etsy' : 'Pipeline Running'}
                </span>
              </div>
            </div>

            {/* Studio stage guide stepper */}
            <Card className="bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] rounded-[18px] shadow-none p-5 font-sans">
              <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-0">
                {studioSteps.map((step, idx) => (
                  <div key={step.label} className="flex items-center flex-1 min-w-0">
                    <div
                      onClick={step.onClick}
                      className={`flex items-center gap-2.5 min-w-0 ${step.onClick ? 'cursor-pointer rounded-lg -m-1.5 p-1.5 hover:bg-[#ece4cf]/50 transition-colors' : ''}`}
                      title={step.onClick ? step.hint : undefined}
                    >
                      <span className={`relative w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold shrink-0 select-none
                        ${step.state === 'done' ? 'bg-[#6e7448] border-[#6e7448] text-white' :
                          step.state === 'active' || step.state === 'attention' ? 'bg-[#ed6f5c] border-[#ed6f5c] text-white' :
                            'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#8b8676]'}`}>
                        {step.state === 'done' ? <Check className="w-3.5 h-3.5" /> :
                          step.state === 'active' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                            step.state === 'attention' ? <ChevronRight className="w-3.5 h-3.5" /> :
                              idx + 1}
                        {step.state === 'attention' && (
                          <span className="absolute inset-0 rounded-full bg-[#ed6f5c]/50 animate-ping" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block truncate
                          ${step.state === 'done' ? 'text-[#6e7448]' :
                            step.state === 'active' || step.state === 'attention' ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`}>
                          {step.label}
                        </span>
                        <span className="text-[9px] text-[#5a5448]/80 font-medium block truncate">{step.hint}</span>
                      </div>
                    </div>
                    {idx < studioSteps.length - 1 && (
                      <div className={`hidden sm:block flex-1 h-px mx-3 ${step.state === 'done' ? 'bg-[#6e7448]/40' : 'bg-[rgba(21,20,15,0.12)]'}`} />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Studio working grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Source images panel — the user's original uploads, kept separate */}
              <Card className="lg:col-span-4 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] rounded-[18px] shadow-none p-5 space-y-4 font-sans">
                <div className="flex items-center justify-between pb-2.5 border-b border-[rgba(21,20,15,0.10)]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#ece4cf]/60 text-[#5a5448] border border-[rgba(21,20,15,0.16)]">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-widest font-bold block">{"▪ SOURCE IMAGES"}</span>
                      <span className="text-xs font-serif font-medium text-[#15140f]">{studioSourcePreviews.length} original upload{studioSourcePreviews.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => studioImageInputRef.current?.click()}
                    className="bg-[#efe7d2] border border-[rgba(21,20,15,0.16)] hover:bg-[#ece4cf] text-[#15140f] font-mono text-[9px] uppercase tracking-wider h-7 px-3 rounded-full shadow-none cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-1 text-[#ed6f5c]" /> Add
                  </Button>
                  <input
                    type="file"
                    ref={studioImageInputRef}
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handleStudioAttachImages(activeStudioListing, e)}
                  />
                </div>

                {studioSourcePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {studioSourcePreviews.map((preview) => (
                      <div key={preview.id} className="relative aspect-square rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] group" title={preview.label}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.image} alt={preview.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <button
                          type="button"
                          onClick={() => handleStudioRemoveImage(activeStudioListing, preview)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#f7f1de]/95 border border-[rgba(21,20,15,0.16)] text-[#ed6f5c] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ece4cf] cursor-pointer"
                          title={`Remove ${preview.label}`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(activeStudioListing.mockupImage || activeStudioListing.title) && (
                      <div className="p-3 rounded-xl border border-[#ed6f5c]/25 bg-[#ed6f5c]/5 text-[#5a5448] text-[10px] leading-relaxed relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ed6f5c]" />
                        <span className="font-mono font-bold text-[8.5px] uppercase tracking-wider text-[#ed6f5c] block mb-0.5 select-none">Previous Session</span>
                        This product was processed earlier. Source files live only in browser memory, so after a refresh they must be re-attached to render again — the saved draft (title, tags, cover) is untouched.
                      </div>
                    )}
                    <div className="border border-dashed border-[rgba(21,20,15,0.24)] rounded-[14px] p-6 bg-[#ece4cf]/40 text-center cursor-pointer hover:bg-[#ece4cf]/60 transition-colors" onClick={() => studioImageInputRef.current?.click()}>
                      <UploadCloud className="w-8 h-8 text-[#8b8676] mx-auto mb-2" />
                      <span className="text-xs font-medium text-[#15140f] block">Attach artwork images</span>
                      <span className="text-[10px] text-[#8b8676] mt-1 block font-mono">PNG / JPG / WEBP sources for the mockup renderer</span>
                    </div>
                  </div>
                )}

                {studioSessionFiles.files.length > 0 && (
                  <div className="p-3 border rounded-lg text-[9px] font-mono bg-[#ece4cf]/50 border-[rgba(21,20,15,0.10)] text-[#5a5448]">
                    <span className="font-bold uppercase block mb-1 font-sans text-[#15140f]">Deliverable files (not rendered):</span>
                    <ul className="list-disc pl-3.5 space-y-1 font-sans">
                      {studioSessionFiles.files.map((file, idx) => (
                        <li key={idx} className="truncate" title={file.name}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stage actions */}
                <div className="space-y-2 pt-1">
                  {studioAutopilot ? (
                    <Button
                      onClick={() => runAutomatedAIPipeline(activeStudioListing, selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined, selectedTemplateIds.length === 1 ? frameAssignments : undefined)}
                      disabled={studioBusy || studioSessionFiles.images.length === 0}
                      className="w-full bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-serif font-medium h-10 text-xs shadow-none rounded-full transition-colors cursor-pointer border-0"
                    >
                      {isRunningAutopilot || studioBusy ? (
                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Pipeline Running...</>
                      ) : (
                        <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Run Autopilot Pipeline</>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => runMockupStage(activeStudioListing, selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined, selectedTemplateIds.length === 1 ? frameAssignments : undefined)}
                        disabled={studioBusy || studioSessionFiles.images.length === 0}
                        className="w-full bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-serif font-medium h-10 text-xs shadow-none rounded-full transition-colors cursor-pointer border-0"
                      >
                        {isRenderingMockups ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Rendering Mockups...</>
                        ) : (
                          <><Camera className="w-3.5 h-3.5 mr-1.5" /> {studioMockups.length > 0 ? 'Re-render Mockups' : 'Render Mockups'}</>
                        )}
                      </Button>
                      <Button
                        onClick={() => runCopyStage(activeStudioListing.id, activeStudioListing.folderName)}
                        disabled={studioBusy}
                        variant="outline"
                        className="w-full bg-transparent border border-[#ed6f5c]/35 text-[#ed6f5c] hover:bg-[#ed6f5c]/10 font-serif font-medium h-10 text-xs shadow-none rounded-full transition-colors cursor-pointer"
                      >
                        {isRunningCopy ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Writing Copy...</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> {activeStudioListing.title ? 'Regenerate AI Copy' : 'Generate AI Copy'}</>
                        )}
                      </Button>
                    </>
                  )}

                  {(activeStudioListing.title || ['ready', 'published'].includes(activeStudioListing.status)) && (
                    <Button
                      onClick={() => openPreviewPanel(activeStudioListing)}
                      disabled={studioBusy}
                      variant="outline"
                      className="w-full bg-[#efe7d2] border border-[rgba(21,20,15,0.16)] hover:bg-[#ece4cf] text-[#15140f] font-serif font-medium h-10 text-xs shadow-none rounded-full transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5 text-[#ed6f5c]" /> Open Draft Review
                    </Button>
                  )}
                </div>
              </Card>

              {/* Mockup Lab — template picking + rendered results review */}
              <Card className="lg:col-span-8 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] rounded-[18px] shadow-none p-5 space-y-5 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[rgba(21,20,15,0.10)]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#ece4cf]/60 text-[#ed6f5c] border border-[rgba(21,20,15,0.16)]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-widest font-bold block">{"▪ MOCKUP LAB"}</span>
                      <span className="text-xs font-serif font-medium text-[#15140f]">
                        {selectedTemplateIds.length > 0
                          ? <>Manual selection · <span className="text-[#ed6f5c]">{selectedTemplateIds.length} template{selectedTemplateIds.length === 1 ? '' : 's'}</span></>
                          : studioSessionFiles.images.length > 1
                            ? <>Set of <span className="text-[#ed6f5c]">{studioSessionFiles.images.length}</span> — all images in one scene, auto-matched</>
                            : <>Auto Match — best template per image ratio</>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <span className={`w-1.5 h-1.5 rounded-full ${mockupServerStatus === 'online' ? 'bg-[#6e7448]' : mockupServerStatus === 'offline' ? 'bg-[#ed6f5c]' : 'bg-[#8b8676] animate-pulse'}`} />
                      <span className={mockupServerStatus === 'online' ? 'text-[#6e7448]' : mockupServerStatus === 'offline' ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}>
                        {mockupServerStatus === 'online' ? 'Renderer Online' : mockupServerStatus === 'offline' ? 'Renderer Offline' : 'Checking...'}
                      </span>
                    </span>
                    {selectedTemplateIds.length > 0 && (
                      <Button type="button" size="xs" variant="ghost" onClick={clearTemplateSelection} className="text-[#ed6f5c] hover:text-[#e25e4a] text-[9px] font-mono uppercase h-6 hover:bg-transparent cursor-pointer">
                        Clear
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setIsBrowsingTemplates(prev => !prev)}
                      className={`font-mono text-[9px] uppercase tracking-wider h-7 px-3 rounded-full shadow-none cursor-pointer border ${isBrowsingTemplates ? 'bg-[#ed6f5c] text-white border-[#ed6f5c] hover:bg-[#e25e4a]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] hover:bg-[#ece4cf] text-[#15140f]'}`}
                    >
                      <Grid className={`w-3 h-3 mr-1 ${isBrowsingTemplates ? 'text-white' : 'text-[#ed6f5c]'}`} /> {isBrowsingTemplates ? 'Close Browser' : 'Browse Templates'}
                    </Button>
                  </div>
                </div>

                {/* Fit mode — how artworks fill their frames */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-widest font-bold select-none">{"▪ FIT MODE"}</span>
                  <div className="flex bg-[#ece4cf]/80 p-1 rounded-lg text-[9px] font-mono border border-[rgba(21,20,15,0.16)] uppercase tracking-wider select-none">
                    {([
                      { mode: 'stretch', label: 'Stretch', hint: 'Fill the frame exactly — may distort proportions' },
                      { mode: 'auto', label: 'Auto', hint: 'Renderer picks the best fit per frame' },
                      { mode: 'cover', label: 'Cover', hint: 'Fill the frame — edges may be cropped' },
                      { mode: 'contain', label: 'Contain', hint: 'Whole image visible — may leave margins' }
                    ] as { mode: MockupFitMode; label: string; hint: string }[]).map(option => (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => changeStudioFitMode(option.mode)}
                        title={option.hint}
                        className={`px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer ${studioFitMode === option.mode
                          ? 'bg-[#f7f1de] text-[#ed6f5c] border border-[rgba(21,20,15,0.16)] font-bold'
                          : 'text-[#5a5448] hover:text-[#15140f]'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-[#8b8676] font-mono select-none">applies to every render, including bulk runs</span>
                </div>

                {/* Template browser */}
                {isBrowsingTemplates && (
                  <div className="space-y-3 border border-[rgba(21,20,15,0.12)] rounded-xl p-4 bg-[#ece4cf]/30">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setStudioTemplateFilter('all')}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${studioTemplateFilter === 'all' ? 'bg-[#ed6f5c] text-white border-[#ed6f5c] font-bold' : 'bg-[#efe7d2] text-[#5a5448] border-[rgba(21,20,15,0.16)] hover:text-[#15140f]'}`}
                      >
                        All ({studioTemplates.length})
                      </button>
                      {studioCategories.map(category => (
                        <button
                          key={category.slug}
                          onClick={() => setStudioTemplateFilter(category.slug)}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${studioTemplateFilter === category.slug ? 'bg-[#ed6f5c] text-white border-[#ed6f5c] font-bold' : 'bg-[#efe7d2] text-[#5a5448] border-[rgba(21,20,15,0.16)] hover:text-[#15140f]'}`}
                        >
                          {category.name} ({category.template_count})
                        </button>
                      ))}
                    </div>

                    {filteredStudioTemplates.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                        {filteredStudioTemplates.map(template => {
                          const isSelected = selectedTemplateIds.includes(template.template_id);
                          return (
                            <button
                              key={template.template_id}
                              type="button"
                              onClick={() => toggleTemplateSelection(template.template_id)}
                              className={`relative text-left rounded-lg overflow-hidden border transition-all cursor-pointer group ${isSelected ? 'border-[#ed6f5c] ring-1 ring-[#ed6f5c]' : 'border-[rgba(21,20,15,0.14)] hover:border-[#ed6f5c]/45'}`}
                              title={template.name}
                            >
                              <div className="aspect-square bg-[#efe7d2] overflow-hidden flex items-center justify-center p-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={resolveMockupUrl(template.preview_url)} alt={template.name} loading="lazy" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.03]" />
                              </div>
                              <div className="px-2 py-1.5 bg-[#f7f1de]">
                                <span className="text-[9px] font-medium text-[#15140f] block truncate">{template.name}</span>
                                <span className="text-[8px] font-mono uppercase tracking-wider text-[#8b8676]">{template.orientation}</span>
                              </div>
                              {isSelected && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#ed6f5c] text-white flex items-center justify-center shadow-sm">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 space-y-2">
                        <Layers2 className="w-8 h-8 text-[#8b8676] mx-auto opacity-60" />
                        <p className="text-xs text-[#5a5448]">
                          {mockupServerStatus === 'offline'
                            ? 'MockupGen server is offline — start it and reopen the Studio to browse templates.'
                            : 'No templates found in this category.'}
                        </p>
                      </div>
                    )}

                    <p className="text-[9px] text-[#8b8676] font-mono leading-relaxed select-none">
                      {studioSessionFiles.images.length > 1
                        ? 'Multiple source images render together as ONE set mockup — pick exactly one template to assign images to its numbered frames.'
                        : 'Pick templates to render your image into each selection · leave empty for automatic ratio matching.'}
                    </p>
                  </div>
                )}

                {/* Frame picker — assign set artworks to the template's numbered frames */}
                {frameTemplate && frameTemplate.frames.length > 1 && studioSessionFiles.images.length > 1 && (
                  <div className="space-y-3 border border-[rgba(21,20,15,0.12)] rounded-xl p-4 bg-[#ece4cf]/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-widest font-bold">
                        {"▪ FRAME ASSIGNMENT"} — <span className="text-[#ed6f5c]">{frameTemplate.name}</span>
                      </span>
                      {Object.keys(frameAssignments).length > 0 && (
                        <Button type="button" size="xs" variant="ghost" onClick={() => { setFrameAssignments({}); saveStudioPrefs(selectedTemplateIds, {}); }} className="text-[#ed6f5c] hover:text-[#e25e4a] text-[9px] font-mono uppercase h-6 hover:bg-transparent cursor-pointer">
                          Reset to Auto
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* Template preview with numbered frame badges */}
                      <div className="relative shrink-0 w-full sm:w-[280px] rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveMockupUrl(frameTemplate.preview_url)} alt={frameTemplate.name} className="w-full h-auto block" />
                        {frameTemplate.frames.map(frame => (
                          <span
                            key={frame.frame}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#ed6f5c] text-white text-[11px] font-mono font-bold flex items-center justify-center border-2 border-[#f7f1de] shadow-sm select-none"
                            style={{
                              left: `${((frame.x + frame.width / 2) / frameTemplate.canvas_width) * 100}%`,
                              top: `${((frame.y + frame.height / 2) / frameTemplate.canvas_height) * 100}%`
                            }}
                            title={`Frame ${frame.frame} · ${frame.orientation} · ratio ${frame.ratio}`}
                          >
                            {frame.frame}
                          </span>
                        ))}
                      </div>

                      {/* Per-frame artwork selection */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {frameTemplate.frames.map(frame => (
                          <div key={frame.frame} className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-[#ed6f5c] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 select-none">
                              {frame.frame}
                            </span>
                            <select
                              value={frameAssignments[frame.frame] || ''}
                              onChange={(e) => assignArtworkToFrame(frame.frame, e.target.value)}
                              className="flex-1 w-full min-w-0 max-w-full h-8 rounded-lg border border-[rgba(21,20,15,0.16)] bg-[#efe7d2] text-[#15140f] text-[11px] px-2 truncate focus:outline-none focus:border-[#ed6f5c] cursor-pointer"
                            >
                              <option value="">Auto — best ratio match</option>
                              {studioSessionFiles.images.filter(isMockupGenSupportedImage).map(image => (
                                <option key={image.name} value={image.name}>{image.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        <p className="text-[9px] text-[#8b8676] font-mono leading-relaxed select-none pt-1">
                          Each image can occupy one frame · frames left on Auto are filled by closest aspect ratio.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated mockups gallery */}
                <div className="space-y-2.5">
                  <div className="flex items-end justify-between">
                    <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-widest font-bold">{"▪ GENERATED MOCKUPS"}</span>
                    <span className="text-[10px] text-[#8b8676] font-mono">{studioMockups.length} render{studioMockups.length === 1 ? '' : 's'} in session</span>
                  </div>

                  {studioMockups.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {studioMockups.map(mockup => (
                        <div key={mockup.id} className="relative rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] group">
                          <div className="aspect-square overflow-hidden cursor-pointer bg-[#ece4cf]/60 flex items-center justify-center p-1.5" onClick={() => setStudioZoomMockup(mockup)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mockup.url} alt={mockup.file.name} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.03]" />
                          </div>
                          <div className="px-2.5 py-2 bg-[#f7f1de] border-t border-[rgba(21,20,15,0.10)]">
                            <span className="text-[9px] font-medium text-[#15140f] block truncate" title={studioTemplateName(mockup.templateId)}>
                              {studioTemplateName(mockup.templateId)}
                            </span>
                            <span
                              className="text-[8px] font-mono text-[#8b8676] block truncate"
                              title={mockup.frameAssignment?.length
                                ? mockup.frameAssignment.map((name, idx) => `Frame ${idx + 1}: ${name}`).join('\n')
                                : mockup.sourceFileNames.join(', ')}
                            >
                              {mockup.sourceFileNames.length > 1
                                ? <><span className="text-[#ed6f5c] font-bold">SET</span> · {mockup.sourceFileNames.length} artworks in one scene</>
                                : <>src: {mockup.sourceFileNames[0] || 'unknown'}</>}
                            </span>
                          </div>
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setStudioZoomMockup(mockup)}
                              className="w-6 h-6 rounded-full bg-[#f7f1de]/95 border border-[rgba(21,20,15,0.16)] text-[#15140f] flex items-center justify-center hover:bg-[#ece4cf] cursor-pointer"
                              title="Inspect quality"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = mockup.url;
                                link.download = mockup.file.name;
                                link.click();
                                toast.success(`${mockup.file.name} downloaded!`);
                              }}
                              className="w-6 h-6 rounded-full bg-[#f7f1de]/95 border border-[rgba(21,20,15,0.16)] text-[#15140f] flex items-center justify-center hover:bg-[#ece4cf] cursor-pointer"
                              title="Download mockup"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRetryMockup(activeStudioListing.folderName, mockup)}
                              className="w-6 h-6 rounded-full bg-[#f7f1de]/95 border border-[rgba(21,20,15,0.16)] text-[#15140f] flex items-center justify-center hover:bg-[#ece4cf] cursor-pointer"
                              title="Re-render this mockup"
                            >
                              <History className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMockup(activeStudioListing.folderName, mockup.id)}
                              className="w-6 h-6 rounded-full bg-[#f7f1de]/95 border border-[rgba(21,20,15,0.16)] text-[#ed6f5c] flex items-center justify-center hover:bg-[#ece4cf] cursor-pointer"
                              title="Discard mockup"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeStudioListing.mockupImage ? (
                    <div className="border border-dashed border-[rgba(21,20,15,0.24)] rounded-[14px] p-5 bg-[#ece4cf]/40 text-center space-y-3">
                      <span className="text-[10px] text-[#8b8676] font-mono block leading-relaxed max-w-md mx-auto">
                        Full renders from the previous session are not kept in browser memory — this is the saved listing cover:
                      </span>
                      <div className="max-w-[280px] mx-auto rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeStudioListing.mockupImage} alt="Saved listing cover" className="w-full h-auto object-contain" />
                      </div>
                      <span className="text-[10px] text-[#5a5448] font-medium block">
                        Re-attach source images on the left and render again for fresh full-quality mockups.
                      </span>
                    </div>
                  ) : (
                    <div className="border border-dashed border-[rgba(21,20,15,0.24)] rounded-[14px] p-8 bg-[#ece4cf]/40 text-center">
                      <Camera className="w-8 h-8 text-[#8b8676] mx-auto mb-2" />
                      <span className="text-xs font-medium text-[#15140f] block">No mockups rendered yet in this session</span>
                      <span className="text-[10px] text-[#8b8676] mt-1 block font-mono max-w-sm mx-auto leading-relaxed">
                        {studioAutopilot
                          ? 'Run the Autopilot pipeline, or browse templates first to pin specific scenes.'
                          : 'Pick templates (optional) and press Render Mockups to preview your artwork in real scenes.'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Mockup quality inspection lightbox */}
            <Dialog open={!!studioZoomMockup} onOpenChange={(open) => { if (!open) setStudioZoomMockup(null); }}>
              <DialogContent className="!max-w-4xl p-0 overflow-hidden bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] sm:rounded-[24px]">
                {studioZoomMockup && (
                  <>
                    <DialogHeader className="px-6 pt-5 pb-3 border-b border-[rgba(21,20,15,0.12)]">
                      <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Quality Inspection</span>
                      <DialogTitle className="text-lg font-serif font-medium text-[#15140f]">{studioTemplateName(studioZoomMockup.templateId)}</DialogTitle>
                      <DialogDescription className="text-[#5a5448] text-xs font-sans">
                        {studioZoomMockup.frameAssignment?.length
                          ? studioZoomMockup.frameAssignment.map((name, idx) => `Frame ${idx + 1}: ${name}`).join(' · ')
                          : `Source artwork: ${studioZoomMockup.sourceFileNames.join(', ') || 'unknown'}`} · {studioZoomMockup.file.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-[#ece4cf]/40 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={studioZoomMockup.url} alt={studioZoomMockup.file.name} className="max-w-full max-h-[72vh] w-auto h-auto object-contain rounded-lg border border-[rgba(21,20,15,0.14)]" />
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>

            {/* Workspace Redirect Alert */}
            {selectedMode === 'etsy' && (
              <Card className="bg-[#ece4cf]/30 border-[rgba(21,20,15,0.16)] shadow-none relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-[#ed6f5c] h-full" />
                <CardHeader className="py-4 px-6">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-[#8C6D4F]">Active Redirect Endpoint for Etsy Developer Portal</CardTitle>
                  <CardDescription className="text-[#6B655B] text-xs mt-1">
                    Confirm your callback settings matches this secure host:
                  </CardDescription>
                  <div className="pt-2">
                    <code className="bg-[#FAF8F5] text-[#191919] px-3 py-1 border border-[#E5DEC9] rounded font-mono text-[11px] inline-block shadow-none">
                      {globalAppUrl}/api/auth/etsy/callback
                    </code>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Studio floor: intake rail (left) + production area (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* ---- Intake rail ---- */}
              <div className="lg:col-span-4 space-y-6">

                {/* Staging tray: mix sets and singles — each card becomes a product */}
                <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none flex flex-col">
                  <CardHeader className="pb-3 p-5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#ed6f5c] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Product Staging Tray</CardTitle>
                        <CardDescription className="text-[#5a5448] dark:text-[#ece4cf] text-xs mt-0.5">
                          Mix sets and singles freely — every card below becomes its own product.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4">

                    {/* Two intake actions: singles vs a set */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        className="border border-dashed border-[rgba(21,20,15,0.24)] dark:border-[rgba(247,241,222,0.24)] rounded-[14px] p-3.5 bg-[#ece4cf]/40 dark:bg-[#22211b]/40 hover:bg-[#ece4cf]/60 dark:hover:bg-[#22211b]/60 transition-colors cursor-pointer text-center"
                        onClick={() => rawFileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-5 h-5 text-[#ed6f5c] mx-auto mb-1" />
                        <span className="text-[11px] font-medium text-[#15140f] dark:text-[#f7f1de] block">Add Singles</span>
                        <span className="text-[8.5px] text-[#8b8676] dark:text-[#a39e8f] block font-mono mt-0.5">each image → product</span>
                      </div>
                      <div
                        className="border border-dashed border-[rgba(21,20,15,0.24)] dark:border-[rgba(247,241,222,0.24)] rounded-[14px] p-3.5 bg-[#ece4cf]/40 dark:bg-[#22211b]/40 hover:bg-[#ece4cf]/60 dark:hover:bg-[#22211b]/60 transition-colors cursor-pointer text-center"
                        onClick={() => setFileInputRef.current?.click()}
                      >
                        <Layers className="w-5 h-5 text-[#ed6f5c] mx-auto mb-1" />
                        <span className="text-[11px] font-medium text-[#15140f] dark:text-[#f7f1de] block">Add a Set</span>
                        <span className="text-[8.5px] text-[#8b8676] dark:text-[#a39e8f] block font-mono mt-0.5">picked files → one product</span>
                      </div>
                    </div>
                    <input type="file" ref={rawFileInputRef} accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleAddSingleProducts} />
                    <input type="file" ref={setFileInputRef} multiple className="hidden" onChange={handleAddSetProduct} />

                    {stagedProducts.length > 0 ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#5a5448] dark:text-[#ece4cf] font-bold">
                            {"▪ STAGED PRODUCTS"} ({stagedProducts.length})
                          </span>
                          <Button type="button" size="xs" variant="ghost" onClick={clearStagedProducts} className="text-[#ed6f5c] hover:text-[#e25e4a] text-[9px] font-mono uppercase h-6 hover:bg-transparent cursor-pointer">
                            Discard All
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {stagedProducts.map(product => {
                            const isSelected = stagedSelection.includes(product.id);
                            return (
                              <div
                                key={product.id}
                                onClick={() => toggleStagedSelect(product.id)}
                                className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${isSelected
                                  ? 'border-[#ed6f5c] ring-1 ring-[#ed6f5c] bg-[#ed6f5c]/5'
                                  : 'border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] bg-[#efe7d2]/40 dark:bg-[#12110c]/40 hover:border-[#ed6f5c]/40'
                                  }`}
                                title={product.name}
                              >
                                {/* Collage thumbnail: single image or up-to-4 set grid */}
                                <div
                                  className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] bg-[#efe7d2] dark:bg-[#12110c] cursor-zoom-in"
                                  onMouseEnter={(e) => setHoverThumb({
                                    urls: product.images.slice(0, 4).map(img => img.url),
                                    label: product.name,
                                    x: Math.min(e.clientX, window.innerWidth - 320),
                                    y: e.clientY
                                  })}
                                  onMouseLeave={() => setHoverThumb(null)}
                                >
                                  {product.images.length === 1 ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px">
                                      {product.images.slice(0, 4).map(img => (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img key={img.id} src={img.url} alt="" className="w-full h-full object-cover" />
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <span className="text-[10.5px] font-medium text-[#15140f] dark:text-[#f7f1de] block truncate">{product.name}</span>
                                  <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${product.kind === 'set' ? 'text-[#ed6f5c]' : 'text-[#8b8676] dark:text-[#a39e8f]'}`}>
                                    {product.kind === 'set' ? `Set · ${product.images.length} images` : 'Single'}
                                    {product.files.length > 0 ? ` · ${product.files.length} file${product.files.length === 1 ? '' : 's'}` : ''}
                                  </span>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  {product.kind === 'set' && product.images.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); ungroupStagedSet(product.id); }}
                                      className="w-6 h-6 rounded-full text-[#8b8676] hover:text-[#ed6f5c] flex items-center justify-center cursor-pointer transition-colors"
                                      title="Split back into singles"
                                    >
                                      <Layers2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeStagedProduct(product.id); }}
                                    className="w-6 h-6 rounded-full text-[#8b8676] hover:text-[#ed6f5c] flex items-center justify-center cursor-pointer transition-colors"
                                    title="Remove from tray"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <p className="text-[9px] text-[#8b8676] dark:text-[#a39e8f] font-mono leading-relaxed select-none">
                          Tip: click cards to select, then merge them into one set.
                        </p>

                        {stagedSelection.length >= 2 && (
                          <Button
                            type="button"
                            onClick={mergeSelectedIntoSet}
                            variant="outline"
                            className="w-full bg-transparent border border-[#ed6f5c]/35 text-[#ed6f5c] hover:bg-[#ed6f5c]/10 font-mono text-[10px] uppercase tracking-wider h-9 rounded-full shadow-none cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5 mr-1.5" /> Merge {stagedSelection.length} into one set
                          </Button>
                        )}

                        {activeProject ? (
                          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] bg-[#efe7d2] dark:bg-[#12110c]">
                            <div className="min-w-0">
                              <span className="text-[8px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f] block select-none">Active Project</span>
                              <span className="text-xs font-serif font-medium text-[#15140f] dark:text-[#f7f1de] block truncate" title={activeProject.name}>{activeProject.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setActiveProject(null); toast.info('Next creation will start a new project.'); }}
                              className="text-[9px] font-mono uppercase tracking-wider text-[#ed6f5c] hover:text-[#e25e4a] font-bold shrink-0 cursor-pointer select-none"
                              title="Detach — the next creation starts a fresh project"
                            >
                              Start New
                            </button>
                          </div>
                        ) : (
                          <Input
                            value={projectNameInput}
                            onChange={(e) => setProjectNameInput(e.target.value)}
                            placeholder="Project name (optional) — e.g. June Portraits Batch"
                            className="border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] bg-[#efe7d2] dark:bg-[#12110c] text-[#15140f] dark:text-[#f7f1de] placeholder-[#8b8676]/70 dark:placeholder-[#a39e8f]/70 shadow-none h-9 text-xs focus:border-[#ed6f5c] focus:ring-0 rounded-lg"
                          />
                        )}

                        <Button
                          type="button"
                          onClick={handleCreateStagedProducts}
                          disabled={isUploadingRaw}
                          className="w-full bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-serif font-medium h-10 text-xs shadow-none rounded-full transition-colors cursor-pointer border-0"
                        >
                          {isUploadingRaw ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating Products...
                            </>
                          ) : activeProject ? (
                            <>
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add {stagedProducts.length} to Project
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create {stagedProducts.length} Product{stagedProducts.length === 1 ? '' : 's'}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <span className="text-[10px] text-[#8b8676] dark:text-[#a39e8f] font-mono block leading-relaxed select-none">
                          Nothing staged yet. Example: add 3 sets + 10 singles<br />→ 13 products created in one click.
                        </span>
                      </div>
                    )}
                  </CardContent>

                </Card>

              </div>

              {/* ---- Production area ---- */}
              <div className="lg:col-span-8 space-y-6">

                {/* Compact portfolio statistics strip */}
                <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none px-5 py-3.5 font-sans">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-lg flex items-center justify-center text-[#5a5448] dark:text-[#ece4cf] shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de] leading-none">{sessionCohort.total}</h3>
                        <p className="text-[8.5px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f] mt-0.5 truncate">In Session</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#efe7d2] dark:bg-[#12110c] border border-[#ed6f5c]/20 rounded-lg flex items-center justify-center text-[#ed6f5c] shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-serif font-medium text-[#ed6f5c] leading-none">{sessionCohort.activePipeline + sessionCohort.unprocessedIdle}</h3>
                        <p className="text-[8.5px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f] mt-0.5 truncate">Processing</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-lg flex items-center justify-center text-[#ed6f5c] shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de] leading-none">{sessionCohort.readyDrafts}</h3>
                        <p className="text-[8.5px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f] mt-0.5 truncate">Ready Drafts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[#6e7448]/20 rounded-lg flex items-center justify-center text-[#6e7448] dark:text-[#9ea671] shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de] leading-none">{sessionCohort.publishedHistory}</h3>
                        <p className="text-[8.5px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f] mt-0.5 truncate">Live on Etsy</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Categories Tab and Database portfolio table list */}
                <Card className="bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] rounded-[18px] shadow-none overflow-hidden">
                  <CardHeader className="pb-4 border-b border-[rgba(21,20,15,0.14)] p-6 font-sans">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-serif font-medium text-[#15140f]">Active Session Listings</CardTitle>
                        <CardDescription className="text-[#5a5448] text-xs mt-1 leading-relaxed font-sans">
                          Products you activated in this session. The full archive lives in the Projects Hub.
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-center flex-wrap">
                        {/* Bulk compile — the primary production action */}
                        <Button
                          onClick={runAllIdleListings}
                          disabled={!!bulkProgress || isRunningAutopilot || sessionCohort.unprocessedIdle === 0}
                          className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0 text-xs h-9 flex items-center shadow-none font-serif font-medium px-5 rounded-full cursor-pointer transition-colors"
                        >
                          {bulkProgress ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Compiling {bulkProgress.done}/{bulkProgress.total}...</>
                          ) : (
                            <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Compile All ({sessionCohort.unprocessedIdle})</>
                          )}
                        </Button>

                        {/* Status Tabs Category Selection */}
                        <div className="flex bg-[#ece4cf]/80 p-1 rounded-lg text-xs font-mono border border-[rgba(21,20,15,0.16)] overflow-x-auto uppercase tracking-wider">
                          <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'all' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                          >
                            All ({sessionCohort.total})
                          </button>
                          <button
                            onClick={() => setFilterTab('pipeline')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${filterTab === 'pipeline' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                          >
                            <Loader2 className={`w-3 h-3 ${sessionCohort.activePipeline > 0 ? "animate-spin text-[#ed6f5c]" : ""}`} />
                            Active ({sessionCohort.activePipeline + sessionCohort.unprocessedIdle})
                          </button>
                          <button
                            onClick={() => setFilterTab('ready')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'ready' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                          >
                            Ready ({sessionCohort.readyDrafts})
                          </button>
                          <button
                            onClick={() => setFilterTab('published')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'published' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                          >
                            Live ({sessionCohort.publishedHistory})
                          </button>
                        </div>
                      </div>

                    </div>
                  </CardHeader>

                  <CardContent className="px-0 py-0">
                    {sessionFilteredListings.length === 0 ? (
                      <div className="text-center py-16 px-4 space-y-3">
                        <FileText className="w-10 h-10 text-[#8b8676] mx-auto opacity-60" />
                        <h3 className="text-[#15140f] font-serif font-medium text-sm">No active listings in this session</h3>
                        <p className="text-[#5a5448] text-xs max-w-xs mx-auto font-sans">
                          Stage products in the tray on the left, or continue an existing one from the Projects Hub.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[rgba(21,20,15,0.14)] bg-[#ece4cf]/30 hover:bg-transparent">
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] pl-6 h-10">Collection / Folder</TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] h-10">Class</TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] h-10">Task Level</TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] h-10">Live Mockup Thumb</TableHead>
                            <TableHead className="text-right text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] pr-6 h-10">Workflow Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionFilteredListings.map((listingItem) => {
                            const sessionItem = localFilesMap[listingItem.folderName];
                            const activeSessionCount = sessionItem
                              ? `${sessionItem.images.length} Image(s), ${sessionItem.files.length} Template(s)`
                              : "Ready to run optimization";

                            // Flag corresponding to progress styles
                            const isInProgressPipeline = ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(listingItem.status);

                            return (
                              <TableRow key={listingItem.id} className="border-[rgba(21,20,15,0.12)] bg-transparent hover:bg-[#ece4cf]/30 transition-colors">

                                {/* Title of Listing / Folder name + source thumbnail */}
                                <TableCell className="pl-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] cursor-zoom-in"
                                      onMouseEnter={(e) => {
                                        const urls = sourceThumbsMap[listingItem.folderName] || [];
                                        if (urls.length > 0) {
                                          setHoverThumb({ urls, label: listingItem.folderName, x: Math.min(e.clientX, window.innerWidth - 320), y: e.clientY });
                                        }
                                      }}
                                      onMouseLeave={() => setHoverThumb(null)}
                                    >
                                      {(() => {
                                        const urls = sourceThumbsMap[listingItem.folderName] || [];
                                        if (urls.length === 0) {
                                          return <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-[#8b8676]" /></div>;
                                        }
                                        if (urls.length === 1) {
                                          /* eslint-disable-next-line @next/next/no-img-element */
                                          return <img src={urls[0]} alt={listingItem.folderName} className="w-full h-full object-cover" />;
                                        }
                                        return (
                                          <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px">
                                            {urls.slice(0, 4).map((url, idx) => (
                                              /* eslint-disable-next-line @next/next/no-img-element */
                                              <img key={idx} src={url} alt="" className="w-full h-full object-cover" />
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-serif font-medium text-[#15140f] text-sm leading-tight block max-w-[180px] truncate" title={listingItem.folderName}>{listingItem.folderName}</span>
                                      <span className="text-[10px] text-[#5a5448] font-mono mt-1 flex items-center gap-1.5 select-none" title="Linked files in browser memory">
                                        <FileCode className="w-3.5 h-3.5 text-[#8b8676]" /> {activeSessionCount}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Product Class */}
                                <TableCell className="align-middle">
                                  <span className="text-[#5a5448] font-mono text-[10px] uppercase font-bold bg-[#efe7d2] border border-[rgba(21,20,15,0.16)] px-2 py-0.5 rounded">
                                    {listingItem.productType === 'png_graphics' ? 'PNG Graphics' :
                                      listingItem.productType === 'printable_wallart' ? 'Wall Art' :
                                        listingItem.productType === 'presets' ? 'Presets Filters' : 'Journals PDF'}
                                  </span>
                                </TableCell>

                                {/* Pipelines Process Status with step-by-step progress updates */}
                                <TableCell className="align-middle">
                                  <div className="flex flex-col">

                                    {/* Standard badge indicators */}
                                    <span className={`inline-flex items-center self-start px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase tracking-wider border
                              ${listingItem.status === 'idle' ? 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]' :
                                        isInProgressPipeline ? 'bg-[#efe7d2] border-[#ed6f5c]/40 text-[#ed6f5c]' :
                                          listingItem.status === 'ready' ? 'bg-[#ed6f5c]/10 border-[#ed6f5c]/30 text-[#ed6f5c] font-bold' :
                                            'bg-[#6e7448]/10 border-[#6e7448]/30 text-[#6e7448]'
                                      }`}>
                                      {listingItem.status === 'idle' && 'Waiting to Compile'}
                                      {listingItem.status === 'scanning' && 'Scanning Blueprints'}
                                      {listingItem.status === 'mockups' && 'Framing Canvas'}
                                      {listingItem.status === 'thumbnail' && 'Branding Covers'}
                                      {listingItem.status === 'compiling' && 'Packaging ZIP File'}
                                      {listingItem.status === 'seo' && 'Analyzing SEO Metadata'}
                                      {listingItem.status === 'ready' && 'Ready to Publish'}
                                      {listingItem.status === 'published' && 'Listed live on Etsy'}
                                    </span>

                                    {/* Active textual walkthrough updates */}
                                    {listingItem.pipelineStepText && (
                                      <span className="block text-[10px] text-[#5a5448]/80 mt-1 leading-tight font-medium max-w-[200px] truncate" title={listingItem.pipelineStepText}>
                                        {listingItem.pipelineStepText}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Inline visual representation thumbnail mock indicator */}
                                <TableCell className="align-middle">
                                  {listingItem.mockupImage ? (
                                    <div className="relative w-12 h-9 border border-[rgba(21,20,15,0.16)] rounded overflow-hidden shadow-none bg-[#efe7d2] group">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={listingItem.mockupImage}
                                        alt="mockup thumb"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-[#8b8676] font-mono text-[9px] select-none tracking-tight uppercase font-medium">Pending</span>
                                  )}
                                </TableCell>

                                {/* Interactive trigger controls */}
                                <TableCell className="text-right pr-6 align-middle">
                                  <div className="flex items-center justify-end gap-1.5">

                                    {listingItem.status === 'idle' && (
                                      <>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => openStudio(listingItem)}
                                          className="text-[#8b8676] hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
                                          title="Open in Mockup Studio"
                                        >
                                          <Camera className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => runAutomatedAIPipeline(listingItem)}
                                          disabled={!!bulkProgress || isRunningAutopilot || !localFilesMap[listingItem.folderName]?.images.length}
                                          className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0 text-xs max-h-8 flex items-center shadow-none font-serif font-medium px-4 rounded-full cursor-pointer transition-colors"
                                        >
                                          <Wand2 className="w-3.5 h-3.5 mr-1 text-white" />
                                          <span>Run</span>
                                        </Button>
                                      </>
                                    )}

                                    {isInProgressPipeline && (
                                      <Button size="sm" disabled variant="outline" className="border-[rgba(21,20,15,0.16)] bg-[#ece4cf]/30 text-[#5a5448] text-xs max-h-8 rounded-lg select-none">
                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-[#ed6f5c]" />
                                        <span>Running AI...</span>
                                      </Button>
                                    )}

                                    {['ready', 'published'].includes(listingItem.status) && (
                                      <>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => openStudio(listingItem)}
                                          className="text-[#8b8676] hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
                                          title="Open in Mockup Studio"
                                        >
                                          <Camera className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => openPreviewPanel(listingItem)}
                                          className={`text-xs max-h-8 font-serif font-medium rounded-full cursor-pointer transition-colors ${listingItem.status === 'published' ? 'border border-[rgba(21,20,15,0.16)] text-[#5a5448] hover:bg-[#ece4cf] bg-transparent' : 'bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0'}`}
                                          variant="default"
                                        >
                                          {listingItem.status === 'published' ? <Eye className="w-3.5 h-3.5 mr-1 text-[#8b8676]" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-white" />}
                                          <span>{listingItem.status === 'published' ? 'Review Listed' : 'Open Draft'}</span>
                                        </Button>
                                      </>
                                    )}

                                    {/* Discard / Delete element */}
                                    {!isInProgressPipeline && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDeleteListingDraft(listingItem)}
                                        className="text-[#8b8676] hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
                                        title="Discard listing task"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}

                                  </div>
                                </TableCell>

                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

              </div>

            </div>

          </>
        )}

      </main>

      {/* Floating enlarged product thumbnail while hovering */}
      {hoverThumb && (
        <div
          className="fixed z-[120] pointer-events-none"
          style={{ left: hoverThumb.x + 18, top: Math.max(12, hoverThumb.y - 150) }}
        >
          <div className="w-[280px] rounded-xl overflow-hidden border border-[rgba(21,20,15,0.2)] bg-[#f7f1de] shadow-lg p-1.5">
            {hoverThumb.urls.length === 1 ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={hoverThumb.urls[0]} alt={hoverThumb.label} className="w-full h-auto max-h-[300px] object-contain rounded-lg bg-[#efe7d2]" />
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {hoverThumb.urls.slice(0, 4).map((url, idx) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={idx} src={url} alt="" className="w-full aspect-square object-cover rounded-md bg-[#efe7d2]" />
                ))}
              </div>
            )}
            <span className="block text-[9px] font-mono text-[#5a5448] px-1 pt-1.5 truncate select-none">{hoverThumb.label}</span>
          </div>
        </div>
      )}

      {/* Review Dialog Structure (Draft metadata + publish logic) */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSourcePreviewImages([]);
            setSelectedPreviewIndex(0);
          }
        }}
      >
        <DialogContent className="!flex !flex-col !gap-0 w-[calc(100vw-2rem)] lg:!max-w-[1380px] h-[90vh] overflow-hidden sm:rounded-[24px] p-0 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] text-[#15140f] font-sans">
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
                <section className="space-y-3 flex flex-col justify-between h-full overflow-y-auto pr-1">
                  <div className="space-y-2.5">
                    <div className="flex items-end justify-between">
                      <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-[0.18em] font-bold">Uploaded Images</span>
                      <span className="text-[10px] text-[#8b8676] font-mono">{sourcePreviewImages.length} Image{sourcePreviewImages.length === 1 ? '' : 's'}</span>
                    </div>

                    {selectedPreview ? (
                      <div className="relative h-[220px] w-full max-w-[220px] mx-auto rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] shadow-sm flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedPreview.image} alt="mockup" className="w-full h-full object-contain bg-[#efe7d2]" />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
                          <span className="bg-[#ed6f5c] text-white text-[7px] font-mono tracking-wider px-1.5 py-0.5 rounded-full uppercase font-bold">
                            {selectedPreview.id.startsWith('mockup-') ? 'Mockup' : selectedPreview.id.startsWith('extra-') ? 'Info' : 'Uploaded'}
                          </span>
                        </div>
                      </div>
                    ) : activeProduct?.mockupImage ? (
                      <div className="relative h-[220px] w-full max-w-[220px] mx-auto rounded-xl overflow-hidden border border-[rgba(21,20,15,0.14)] bg-[#efe7d2] shadow-sm flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeProduct.mockupImage} alt="persisted preview" className="w-full h-full object-contain bg-[#efe7d2]" />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
                          <span className="bg-[#ed6f5c] text-white text-[7px] font-mono tracking-wider px-1.5 py-0.5 rounded-full uppercase font-bold">
                            Mockup
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 w-full max-w-[220px] mx-auto rounded-xl flex items-center justify-center bg-[#ece4cf]/60 border border-[rgba(21,20,15,0.16)] text-[#5a5448]">
                        <span className="text-[10px] font-mono uppercase text-center px-4">No Image</span>
                      </div>
                    )}

                    {sourcePreviewImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-1 w-full max-w-[220px] mx-auto">
                        {sourcePreviewImages.map((preview, index) => (
                          <button
                            type="button"
                            key={preview.id}
                            onClick={() => setSelectedPreviewIndex(index)}
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
                    )}
                  </div>

                  <Card className="bg-[#efe7d2]/55 p-2.5 border border-[rgba(21,20,15,0.12)] rounded-xl shadow-none space-y-2">
                    <div>
                      <h4 className="text-[11px] font-serif font-medium text-[#15140f] leading-none">Compiled Etsy Package</h4>
                      <p className="text-[9px] text-[#5a5448] mt-0.5 leading-tight">
                        Includes {sourcePreviewImages.length} image{sourcePreviewImages.length === 1 ? '' : 's'} &amp; {activeProduct.files?.length || 0} deliverable{activeProduct.files?.length === 1 ? '' : 's'}.
                      </p>
                    </div>
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

    </div>
  );
}

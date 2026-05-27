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

type ListingMetadata = {
  id: string;
  folderName: string;
  title?: string;
  description?: string;
  price?: number;
  tags?: string[];
  status: 'idle' | 'scanning' | 'mockups' | 'thumbnail' | 'compiling' | 'seo' | 'ready' | 'publishing' | 'published';
  listingId?: string;
  listingUrl?: string;
  productType?: string; // 'png_graphics' | 'printable_wallart' | 'presets' | 'planners'
  pipelineStepText?: string;
  mockupImage?: string; // Base64 dataURL of simulated custom mockup!
};

// Extends ListingMetadata with in-memory selected Files during active sessions
type ProductData = ListingMetadata & {
  images: File[];
  files: File[];
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
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-tight">
            See the layout parser <br />
            and <span className="italic font-normal">SEO engine in action.</span>
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
      <ArrowRight className="w-4 h-4 -rotate-90" />
    </button>
  );
}

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
  const [activeProduct, setActiveProduct] = useState<ProductData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pipeline' | 'ready' | 'published'>('all');
  const [activeLabFilter, setActiveLabFilter] = useState<'all' | 'wallart' | 'presets' | 'stickers' | 'planners'>('all');

  // Manual raw assets uploading state
  const [uploadTitleInput, setUploadTitleInput] = useState('');
  const [isUploadingRaw, setIsUploadingRaw] = useState(false);
  const [uploadedRawFiles, setUploadedRawFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFileInputRef = useRef<HTMLInputElement>(null);

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
  };

  // Switch chosen product category type 
  const handleNavigateBackProductType = () => {
    setSelectedProductType(null);
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

  // Handle folder upload selection (Catalog Directory)
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user || !selectedProductType) return;

    const fileList = Array.from(e.target.files);
    const groups: Record<string, { images: File[]; files: File[] }> = {};

    fileList.forEach(file => {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length < 2) return; // Need inside folder relative nesting

      const folderName = parts[parts.length - 2];

      if (!groups[folderName]) {
        groups[folderName] = { images: [], files: [] };
      }

      if (file.type.startsWith('image/')) {
        groups[folderName].images.push(file);
      } else {
        groups[folderName].files.push(file);
      }
    });

    // Update in-memory session mapping containing active file objects
    setLocalFilesMap(prev => ({ ...prev, ...groups }));

    // Create a catalog entry for each folder in Firestore database
    for (const [folderName, bundle] of Object.entries(groups)) {
      if (bundle.images.length === 0 && bundle.files.length === 0) continue;

      const listingId = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase() + "_" + Date.now().toString().slice(-4);
      const docPath = `users/${user.uid}/listings/${listingId}`;
      const docRef = doc(db, docPath);

      try {
        await setDoc(docRef, {
          id: listingId,
          userId: user.uid,
          folderName,
          status: 'idle',
          productType: selectedProductType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    }

    toast.success(`Scanned directory: Syncing ${Object.keys(groups).length} products to database.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Individual Raw Files upload selection (New pipeline approach)
  const handleRawFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user || !selectedProductType) return;
    const filesArray = Array.from(e.target.files);
    setUploadedRawFiles(prev => [...prev, ...filesArray]);
    toast.info(`Imported ${filesArray.length} assets. Ready to compile listing!`);
  };

  const clearUploadedRawFiles = () => {
    setUploadedRawFiles([]);
    if (rawFileInputRef.current) rawFileInputRef.current.value = '';
  };

  // Submit and create custom Listing record from newly uploaded files
  const handleCreateListingFromRawAssets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProductType) return;

    const title = uploadTitleInput.trim() || (uploadedRawFiles[0] ? uploadedRawFiles[0].name.split('.')[0] : `Product Draft`);
    if (uploadedRawFiles.length === 0) {
      toast.error("Please add at least one raw digital asset file to compile.");
      return;
    }

    setIsUploadingRaw(true);
    const listingId = title.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase() + "_" + Date.now().toString().slice(-4);
    const docPath = `users/${user.uid}/listings/${listingId}`;
    const docRef = doc(db, docPath);

    // Differentiate images for mockup processing and binary templates
    const imagesVal = uploadedRawFiles.filter(f => f.type.startsWith('image/'));
    const filesVal = uploadedRawFiles.filter(f => !f.type.startsWith('image/'));

    // Save mapping in session
    setLocalFilesMap(prev => ({
      ...prev,
      [title]: {
        images: imagesVal.length > 0 ? imagesVal : uploadedRawFiles.slice(0, 1), // fallback
        files: filesVal.length > 0 ? filesVal : uploadedRawFiles
      }
    }));

    try {
      await setDoc(docRef, {
        id: listingId,
        userId: user.uid,
        folderName: title,
        status: 'idle',
        productType: selectedProductType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success(`Succesfully parsed raw files! New ${selectedProductType} listing is initialized in idle queue.`);
      setUploadTitleInput('');
      setUploadedRawFiles([]);
      if (rawFileInputRef.current) rawFileInputRef.current.value = '';
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
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

  // Trigger Mockups Generation Canvas and pipeline step indicators
  const runAutomatedAIPipeline = async (listingId: string, folderName: string, productType: string) => {
    if (!user) return;
    const sessionFiles = localFilesMap[folderName] || { images: [], files: [] };
    const docPath = `users/${user.uid}/listings/${listingId}`;

    try {
      // Step 1: Scanning Assets
      await setDoc(doc(db, docPath), {
        status: 'scanning',
        pipelineStepText: 'Reading digital deliverable blueprints & structures...',
        updatedAt: serverTimestamp()
      }, { merge: true });
      await new Promise(r => setTimeout(r, 1500));

      // Step 2: Creating Lifestyle Mockups
      await setDoc(doc(db, docPath), {
        status: 'mockups',
        pipelineStepText: 'Rendering premium styled lifestyle scene shadows...',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Compute the realistic canvas mockup image on-the-fly!
      const activeImg = sessionFiles.images[0];
      const dataUrl = await generateSimulatedMockup(folderName, productType, activeImg);
      await new Promise(r => setTimeout(r, 2000));

      // Step 3: Promotional thumbnail texts overlays
      await setDoc(doc(db, docPath), {
        status: 'thumbnail',
        pipelineStepText: 'Configuring Etsy 300DPI promotional cover layout badges...',
        updatedAt: serverTimestamp()
      }, { merge: true });
      await new Promise(r => setTimeout(r, 1500));

      // Step 4: Zip Packing
      await setDoc(doc(db, docPath), {
        status: 'compiling',
        pipelineStepText: 'Assembling safe high-fidelity deliverable zip packs layers...',
        updatedAt: serverTimestamp()
      }, { merge: true });
      await new Promise(r => setTimeout(r, 1500));

      // Step 5: SEO and copy generation with Gemini
      await setDoc(doc(db, docPath), {
        status: 'seo',
        pipelineStepText: 'Optimizing high-converting titles and metadata with Gemini 3.5...',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Pass the canvas preview as the base64 analysis input to Gemini so it is contextually synced!
      const base64ImagesPayload = [dataUrl];

      const res = await fetch('/api/gemini/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, images: base64ImagesPayload })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const listingData = await res.json();

      // Master complete! Sync the compiled result and custom mockup to Firestore
      await setDoc(doc(db, docPath), {
        status: 'ready',
        pipelineStepText: 'Optimization complete. Ready to publish!',
        title: listingData.title,
        description: listingData.description,
        tags: listingData.tags,
        price: listingData.price,
        mockupImage: dataUrl, // Save generated illustration
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(`Pipeline success! Constructed full Listing draft + Mockups: ${folderName}`);
    } catch (err: any) {
      toast.error('Pipeline failed: ' + (err.message || 'Unknown error'));
      await setDoc(doc(db, docPath), {
        status: 'idle',
        pipelineStepText: 'Failed during automation process. Reloading...',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => { });
    }
  };

  // Simulate mockup creation canvas engine
  const generateSimulatedMockup = (title: string, productType: string, uploadedImageFile?: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // 1. Draw elegant background based on chosen product type
      if (productType === 'printable_wallart') {
        const grad = ctx.createLinearGradient(0, 0, 0, 600);
        grad.addColorStop(0, '#EAE9E6'); // Wall color beige
        grad.addColorStop(1, '#D8D6D1');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 600);

        // Floorboard wood feel
        ctx.fillStyle = '#C4B29E';
        ctx.fillRect(0, 480, 800, 120);
        ctx.fillStyle = '#A3917F';
        ctx.fillRect(0, 480, 800, 8); // shadow line

        // Floor white board trim
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 460, 800, 20);

        // Frame shadow and outline
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 12;
        ctx.shadowOffsetY = 15;

        // Wooden frame borders
        ctx.fillStyle = '#422a1b';
        ctx.fillRect(260, 60, 310, 410);

        // Mat boards border
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(280, 80, 270, 370);

        // Insert artwork
        if (uploadedImageFile) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 295, 95, 240, 340);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          img.onerror = () => {
            drawPlaceholderArt(ctx, title);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(uploadedImageFile);
        } else {
          drawPlaceholderArt(ctx, title);
          resolve(canvas.toDataURL('image/jpeg'));
        }
      } else if (productType === 'png_graphics') {
        // Aesthetic checkered transparent background representation
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#EDF2F7';
        for (let x = 0; x < 800; x += 30) {
          for (let y = 0; y < 600; y += 30) {
            if ((x + y) % 60 === 0) {
              ctx.fillRect(x, y, 30, 30);
            }
          }
        }

        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;

        // Stickers drawing
        ctx.fillStyle = '#FFF5EE';
        ctx.fillRect(100, 100, 600, 400);
        ctx.strokeStyle = '#BC5E3B';
        ctx.lineWidth = 5;
        ctx.strokeRect(100, 100, 600, 400);

        // Graphics text banner overlay
        ctx.fillStyle = '#1A202C';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(title.substring(0, 25).toUpperCase(), 150, 180);

        ctx.fillStyle = '#718096';
        ctx.font = '14px monospace';
        ctx.fillText('• 300 DPI TRANSPARENT GRAPHICS • DIGITAL CLIPART BUNDLE', 150, 220);

        // Draw illustrative stamp badges
        ctx.fillStyle = '#E6FFFA';
        ctx.fillRect(150, 320, 220, 100);
        ctx.strokeStyle = '#319795';
        ctx.lineWidth = 2;
        ctx.strokeRect(150, 320, 220, 100);
        ctx.fillStyle = '#234E52';
        ctx.font = 'bold 13px system-ui';
        ctx.fillText('COMMERCIAL USE ALLOWED', 165, 360);
        ctx.fillText('INSTANT DIGITAL DOWNLOAD', 165, 385);

        // Insert artwork sample floating
        if (uploadedImageFile) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 450, 280, 180, 180);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          img.src = URL.createObjectURL(uploadedImageFile);
        } else {
          drawPlaceholderArt(ctx, title);
          resolve(canvas.toDataURL('image/jpeg'));
        }
      } else if (productType === 'presets') {
        // Photographer portfolio Lightroom before-after card
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 800, 600);

        // Left split (Classic plain tone)
        ctx.fillStyle = '#4B5563';
        ctx.fillRect(50, 80, 350, 440);
        ctx.fillStyle = '#D1D5DB';
        ctx.font = 'bold 15px system-ui';
        ctx.fillText('ORIGINAL RAW PHOTO', 140, 300);

        // Right split (Vibrant Lightroom warmth)
        ctx.fillStyle = '#6366F1';
        ctx.fillRect(400, 80, 350, 440);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px system-ui';
        ctx.fillText('VIBRANT PRESET KEY', 500, 300);

        // Divider
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(400, 80); ctx.lineTo(400, 520); ctx.stroke();

        ctx.fillStyle = '#BC5E3B';
        ctx.fillRect(350, 260, 100, 40);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('SPLIT KEY', 368, 285);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px system-ui';
        ctx.fillText('⚡ ' + title.toUpperCase(), 80, 565);
        resolve(canvas.toDataURL('image/jpeg'));
      } else {
        // Planner screen tablet mockup layout
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, 800, 600);

        // Drawn tablet body
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(180, 60, 440, 480);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(200, 80, 400, 440);

        // Weekly header representation
        ctx.fillStyle = '#FEF3C7';
        ctx.fillRect(220, 100, 360, 50);
        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('MY INTERACTIVE PLANNER / E-BOOK', 270, 130);

        // Text mock guidelines
        ctx.fillStyle = '#94A3B8';
        for (let y = 180; y < 460; y += 38) {
          ctx.fillRect(240, y, 70, 12);
          ctx.fillRect(320, y, 220, 2);
        }

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('📅 ' + title, 150, 570);
        resolve(canvas.toDataURL('image/jpeg'));
      }
    });
  };

  const drawPlaceholderArt = (ctx: CanvasRenderingContext2D, title: string) => {
    ctx.fillStyle = '#FCA5A5';
    ctx.beginPath();
    ctx.arc(380, 240, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(300, 420);
    ctx.lineTo(390, 280);
    ctx.lineTo(480, 420);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold italic 13px serif';
    ctx.fillText(title || 'Artwork Preview', 320, 390);
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

      sessionFiles.images.forEach(file => formData.append('image', file));
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
      images: sessionFiles.images,
      files: sessionFiles.files
    });
    setIsDialogOpen(true);
  };

  // Resume a project inside the core Workspace
  const handleContinueProject = (project: ListingMetadata) => {
    setSelectedProductType(project.productType || 'png_graphics');
    // If we have an Etsy token connected, we use Direct Store Mode, else Manual Mode
    setSelectedMode(etsyToken ? 'etsy' : 'manual');
    setCurrentView('workspace');

    // Set activeProduct
    const sessionFiles = localFilesMap[project.folderName] || { images: [], files: [] };
    setActiveProduct({
      ...project,
      images: sessionFiles.images,
      files: sessionFiles.files
    });

    toast.success(`Resumed pipeline workspace for "${project.folderName}"`);
  };

  // Preview completed metadata & mockups from Dashboard
  const handlePreviewProject = (project: ListingMetadata) => {
    const sessionFiles = localFilesMap[project.folderName] || { images: [], files: [] };
    setActiveProduct({
      ...project,
      images: sessionFiles.images,
      files: sessionFiles.files
    });
    setIsDialogOpen(true);
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

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.8rem] xl:text-[4.75rem] text-[#15140f] dark:text-[#f7f1de] leading-[1] select-none text-left max-w-5xl" data-reveal="">
                <strong>Upload raw </strong><em className="text-[#15140f] dark:text-[#f7f1de]">products,</em><strong> generate </strong><em className="text-[#ed6f5c]">mockups & metadata</em><strong> instantly</strong><span className="text-[#ed6f5c] font-sans inline-block">.</span>
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
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-tight">
                Architectural integrity <br />
                for <span className="italic font-normal">high-volume cataloging.</span>
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
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-tight">
              A smarter route <br />
              to the <span className="italic font-normal">marketplace storefront.</span>
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
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold tracking-tight text-[#15140f] dark:text-[#f7f1de] leading-none">
                We treat your digital catalog as a <span className="font-serif italic font-light">curated gallery,</span> not a raw dump.
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
              <h2 className="text-3xl sm:text-4xl font-sans font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-none">
                Specialized asset pipelines for <span className="font-serif italic font-light">Etsy creators.</span>
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
              <h2 className="text-3xl sm:text-4xl font-sans font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-none">
                Explore our catalog template <span className="font-serif italic font-light">preset directory.</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16" data-reveal="">
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase mb-4 leading-none">
                <span className="w-5 h-[1px] bg-[#ed6f5c]"></span>
                <span>The Automated High-Fidelity Pipeline · Nº 05</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight leading-none">
                Four step execution <span className="font-serif italic font-light">to storefront sync.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 flex items-start gap-3 pt-2 text-left">
              <span className="text-lg text-[#ed6f5c] font-sans font-bold">+</span>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-mono uppercase tracking-wider">
                Every stage runs client-side inside secure sandbox memory. Composed assets are transported explicitly on your command.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left relative pt-10">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="font-serif italic text-4xl sm:text-5xl lg:text-6xl text-[#ed6f5c] leading-none mb-2 select-none">01</div>
              <h4 className="text-lg font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight">Ingest Raw Assets</h4>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                Drag-and-drop raw photo filters dng, digital templates pdf, transparency decal png, or vectors.
              </p>
            </div>
            {/* Step 2 */}
            <div className="space-y-4">
              <div className="font-serif italic text-4xl sm:text-5xl lg:text-6xl text-[#ed6f5c] leading-none mb-2 select-none">02</div>
              <h4 className="text-lg font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight">Frame Canvas Mat</h4>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                Apply premium drop shadow matrices, frame wood types, floating mats, or tablet bezels cleanly in one click.
              </p>
            </div>
            {/* Step 3 */}
            <div className="space-y-4">
              <div className="font-serif italic text-4xl sm:text-5xl lg:text-6xl text-[#ed6f5c] leading-none mb-2 select-none">03</div>
              <h4 className="text-lg font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight">Compute Gemini Copy</h4>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                AI parses texture metrics to formulate SEO-ranked titles, comprehensive meta descriptions, and 13 targeted tags.
              </p>
            </div>
            {/* Step 4 */}
            <div className="space-y-4">
              <div className="font-serif italic text-4xl sm:text-5xl lg:text-6xl text-[#ed6f5c] leading-none mb-2 select-none">04</div>
              <h4 className="text-lg font-bold text-[#15140f] dark:text-[#f7f1de] tracking-tight">Sovereign Direct Sync</h4>
              <p className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed font-sans">
                Sync generated images and complete copywriting as active digital listings draft structure via Google OAuth APIs.
              </p>
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
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-[#15140f] dark:text-[#f7f1de] leading-none tracking-tight">
                High-margin structures built inside <span className="font-serif italic font-light">the studio.</span>
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
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-sans font-bold text-[#15140f] dark:text-[#f7f1de] leading-none tracking-tight">
                Let&apos;s construct something <span className="font-serif italic font-light">expressive & profitable.</span>
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
              <div className="flex items-center gap-2.5 hover:opacity-95 transition-opacity duration-150 cursor-pointer">
                <div className={`w-9 h-9 border ${darkMode ? 'border-[#f7f1de] text-[#f7f1de]' : 'border-[#15140f] text-[#15140f]'} rounded-full flex items-center justify-center font-serif italic text-lg shadow-sm font-semibold`}>
                  Ø
                </div>
                <span className={`text-lg font-serif italic font-medium tracking-tight ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>
                  Etsy <span className="font-sans font-extrabold not-italic text-xs uppercase tracking-widest text-[#ed6f5c] ml-1 bg-[#ed6f5c]/10 px-2 py-0.5 rounded">AutoLister</span>
                </span>
              </div>
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
                {filteredListings.length === 0 ? (
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
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} pl-6 h-11`}>Collection / Folder Name</TableHead>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} h-11`}>Product Format</TableHead>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} h-11`}>Listing Status</TableHead>
                          <TableHead className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} h-11`}>Mockup Cover</TableHead>
                          <TableHead className={`text-right text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} pr-6 h-11`}>Manage Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredListings.map((listingItem) => {
                          const isComplete = listingItem.status === 'published';
                          const sessionItem = localFilesMap[listingItem.folderName];
                          const activeSessionCount = sessionItem
                            ? `${sessionItem.images.length} Image(s), ${sessionItem.files.length} Template(s)`
                            : "Ready to run optimization";
                          const isInProgressPipeline = ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(listingItem.status);

                          return (
                            <TableRow key={listingItem.id} className={`${darkMode ? 'border-[rgba(247,241,222,0.10)] text-[#f7f1de]' : 'border-[rgba(21,20,15,0.12)] text-[#15140f]'} bg-transparent hover:bg-[#ece4cf]/15 dark:hover:bg-[#22211b]/30 h-16 transition-colors`}>

                              {/* Title / Folder Name */}
                              <TableCell className="pl-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-serif font-medium text-sm leading-tight">{listingItem.folderName}</span>
                                  <span className={`text-[10px] ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'} font-mono mt-1 flex items-center gap-1.5`}>
                                    <FileCode className={`w-3.5 h-3.5 ${darkMode ? 'text-[#807b6c]' : 'text-[#8b8676]'}`} /> {activeSessionCount}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Format Class */}
                              <TableCell className="align-middle">
                                <span className={`text-[10px] font-mono uppercase font-bold border px-2 py-0.5 rounded ${darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.16)] text-[#ece4cf]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]'}`}>
                                  {listingItem.productType === 'png_graphics' ? 'PNG Graphics' :
                                    listingItem.productType === 'printable_wallart' ? 'Wall Art' :
                                      listingItem.productType === 'presets' ? 'Presets' : 'Planner PDF'}
                                </span>
                              </TableCell>

                              {/* Status Badge */}
                              <TableCell className="align-middle">
                                <div className="flex flex-col">
                                  <span className={`inline-flex items-center self-start px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase tracking-wider border
                                    ${listingItem.status === 'idle' ? (darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.16)] text-[#a39e8f]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]') :
                                      isInProgressPipeline ? 'bg-[#efe7d2]/10 border-[#ed6f5c]/40 text-[#ed6f5c]' :
                                        listingItem.status === 'ready' ? 'bg-[#ed6f5c]/10 border-[#ed6f5c]/30 text-[#ed6f5c] font-bold' :
                                          `bg-[#6e7448]/10 border-[#6e7448]/30 text-[#6e7448] ${darkMode ? 'dark:text-[#9ea671]' : ''} font-bold`
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
                                  {listingItem.pipelineStepText && (
                                    <span className={`text-[10px] ${darkMode ? 'text-[#a39e8f]/80' : 'text-[#5a5448]/80'} mt-1 font-medium leading-tight max-w-[180px] break-words`}>
                                      {listingItem.pipelineStepText}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Thumbnail Mockup Preview */}
                              <TableCell className="align-middle">
                                {listingItem.mockupImage ? (
                                  <div className={`relative w-12 h-9 border rounded overflow-hidden shadow-none bg-transparent group ${darkMode ? 'border-[rgba(247,241,222,0.16)]' : 'border-[rgba(21,20,15,0.16)]'}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={listingItem.mockupImage}
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
                                  {isComplete ? (
                                    // Complete status -> Action: Preview
                                    <Button
                                      onClick={() => handlePreviewProject(listingItem)}
                                      size="sm"
                                      variant="outline"
                                      className={`font-mono text-[9px] uppercase tracking-wider h-8.5 px-3.5 rounded-full cursor-pointer flex items-center gap-1.5 bg-transparent hover:bg-[#6e7448]/10 hover:text-[#6e7448] dark:hover:text-[#9ea671] border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448]'} transition-all`}
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#ed6f5c]" /> Preview Live
                                    </Button>
                                  ) : (
                                    // In-complete status -> Action: Continue Project
                                    <Button
                                      onClick={() => handleContinueProject(listingItem)}
                                      size="sm"
                                      className="bg-[#15140f] dark:bg-[#f7f1de] hover:bg-[#2a2620] dark:hover:bg-[#ece4cf] text-[#f7f1de] dark:text-[#15140f] font-mono text-[9px] uppercase tracking-wider h-8.5 px-3.5 rounded-full cursor-pointer border-0 inline-flex items-center gap-1.5 transition-all"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5 text-[#ed6f5c]" /> Continue project
                                    </Button>
                                  )}

                                  <Button
                                    onClick={() => handleDeleteListingDraft(listingItem)}
                                    size="xs"
                                    variant="ghost"
                                    className={`h-7 px-2 rounded-full hover:bg-[#ed6f5c]/10 text-[#ed6f5c] hover:text-[#e25e4a] cursor-pointer`}
                                    title="Discard draft listing"
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

        {/* Dynamic Dual Files Upload Panel (Both directory scan and custom raw upload) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Module A: Upload Raw Digital Asset (Recommended pipeline) */}
          <Card className="lg:col-span-7 bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none flex flex-col justify-between">
            <CardHeader className="pb-3 p-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#ed6f5c] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Upload Raw Product Elements</CardTitle>
              </div>
              <CardDescription className="text-[#5a5448] dark:text-[#ece4cf] text-xs mt-1">
                Provide your raw printable PDFs, JPEGs, or clipart overlays. The AutoLister pipeline formats structural packages and constructs high-fidelity mockups automatically.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreateListingFromRawAssets} className="space-y-4">

                {/* Title element */}
                <div className="space-y-1.5">
                  <Label htmlFor="manualTitle" className="text-xs font-mono uppercase tracking-wider text-[#5a5448] dark:text-[#ece4cf]">Product Clipart / Collection Name</Label>
                  <Input
                    id="manualTitle"
                    value={uploadTitleInput}
                    onChange={(e) => setUploadTitleInput(e.target.value)}
                    placeholder="e.g. Handmade Autumn Watercolor Forest"
                    className="border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] bg-[#efe7d2] dark:bg-[#12110c] text-[#15140f] dark:text-[#f7f1de] placeholder-[#8b8676]/70 dark:placeholder-[#a39e8f]/70 shadow-none h-10 text-sm focus:border-[#ed6f5c] focus:ring-0 rounded-lg"
                  />
                </div>

                {/* File box trigger */}
                <div
                  className="border border-dashed border-[rgba(21,20,15,0.24)] dark:border-[rgba(247,241,222,0.24)] rounded-[14px] p-6 bg-[#ece4cf]/40 dark:bg-[#22211b]/40 hover:bg-[#ece4cf]/60 dark:hover:bg-[#22211b]/60 transition-colors cursor-pointer text-center"
                  onClick={() => rawFileInputRef.current?.click()}
                >
                  <UploadCloud className="w-8 h-8 text-[#8b8676] dark:text-[#a39e8f] mx-auto mb-2" />
                  <span className="text-xs font-medium text-[#15140f] dark:text-[#f7f1de] block">Drag or Click to Choose Files</span>
                  <span className="text-[10px] text-[#8b8676] dark:text-[#a39e8f] mt-1 block font-mono">Supports PNG, PDF, JPG, or ZIP deliverable assets</span>

                  <input
                    type="file"
                    ref={rawFileInputRef}
                    onChange={handleRawFilesUpload}
                    multiple
                    className="hidden"
                  />
                </div>

                {/* Display list of uploaded raw items */}
                {uploadedRawFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#5a5448] dark:text-[#ece4cf]">Ready Assets for Processing ({uploadedRawFiles.length})</span>
                      <Button type="button" size="xs" variant="ghost" onClick={clearUploadedRawFiles} className="text-[#ed6f5c] hover:text-[#e25e4a] text-[9px] font-mono uppercase h-6 hover:bg-transparent">
                        Discard All
                      </Button>
                    </div>

                    <div className="max-h-24 overflow-y-auto border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] rounded-lg p-2 bg-[#efe7d2] dark:bg-[#12110c] space-y-1">
                      {uploadedRawFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.12)] p-1.5 rounded px-2">
                          <span className="text-[#15140f] dark:text-[#f7f1de] truncate font-medium max-w-[200px]" title={file.name}>{file.name}</span>
                          <span className="text-[#8b8676] dark:text-[#a39e8f] uppercase font-bold text-[8px] tracking-wider font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={uploadedRawFiles.length === 0 || isUploadingRaw}
                    className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-serif font-medium h-10 px-6 text-xs shadow-none rounded-full transition-colors cursor-pointer border-0"
                  >
                    {isUploadingRaw ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Assembling Workspace...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Assemble Draft Listing
                      </>
                    )}
                  </Button>
                </div>

              </form>
            </CardContent>

          </Card>

          {/* Module B: Directory Folder Catalog scanner */}
          <Card className="lg:col-span-5 bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none flex flex-col justify-between">
            <CardHeader className="pb-3 p-6 font-sans">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#ece4cf]/60 dark:bg-[#22211b] text-[#5a5448] dark:text-[#ece4cf] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)]">
                  <FolderUp className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Or Scan Directory Folders</CardTitle>
              </div>
              <CardDescription className="text-[#5a5448] dark:text-[#ece4cf] text-xs mt-1">
                Select your structured product subfolders. Files inside are categorized as thumbnails vs digital printable deliverables automatically.
              </CardDescription>
            </CardHeader>

            <CardContent className="h-full flex flex-col justify-center p-6 pt-0 font-sans">
              <div
                className="border border-dashed border-[rgba(21,20,15,0.24)] dark:border-[rgba(247,241,222,0.24)] rounded-[14px] p-8 bg-[#ece4cf]/40 dark:bg-[#22211b]/40 hover:bg-[#ece4cf]/60 dark:hover:bg-[#22211b]/60 cursor-pointer transition-colors text-center relative py-12"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderUp className="w-10 h-10 text-[#8b8676] dark:text-[#a39e8f] mx-auto mb-3" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#15140f] dark:text-[#f7f1de] mb-1 font-sans">Upload Catalog Folders</h4>
                <p className="text-[10px] text-[#5a5448] dark:text-[#ece4cf] leading-relaxed max-w-[200px] mx-auto font-sans">
                  Processes and syncs folders in one click to compile active listings.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  // @ts-ignore - directory attributes
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  onChange={handleFolderSelect}
                  className="hidden"
                />
              </div>
            </CardContent>

            <CardFooter className="py-4 border-t border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.12)] bg-[#ece4cf]/30 dark:bg-[#22211b]/35 flex justify-center rounded-b-[18px]">
              <span className="text-[10px] text-[#8b8676] dark:text-[#a39e8f] font-mono tracking-wide flex items-center gap-1 select-none">
                ✓ Syncs immediately with Cloud Firestore
              </span>
            </CardFooter>
          </Card>

        </div>

        {/* Global Statistics Portfolio Summary banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 font-sans">

          <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none p-5 flex items-center justify-between hover:translate-y-[-2px] transition-transform duration-200">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f]">Scanned Portfolio</p>
              <h3 className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de] mt-1">{listingsCohort.total} Products</h3>
            </div>
            <div className="w-8 h-8 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-lg flex items-center justify-center text-[#5a5448] dark:text-[#ece4cf]">
              <FolderOpen className="w-4 h-4" />
            </div>
          </Card>

          <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none p-5 flex items-center justify-between hover:translate-y-[-2px] transition-transform duration-200">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f]">Active Pipeline</p>
              <h3 className="text-lg font-serif font-medium text-[#ed6f5c] mt-1">{listingsCohort.activePipeline + listingsCohort.unprocessedIdle} Processing</h3>
            </div>
            <div className="w-8 h-8 bg-[#efe7d2] dark:bg-[#12110c] border border-[#ed6f5c]/20 rounded-lg flex items-center justify-center text-[#ed6f5c]">
              <Cpu className="w-4 h-4" />
            </div>
          </Card>

          <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none p-5 flex items-center justify-between hover:translate-y-[-2px] transition-transform duration-200">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f]">Ready to Launch</p>
              <h3 className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de] mt-1">{listingsCohort.readyDrafts} Drafts</h3>
            </div>
            <div className="w-8 h-8 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-lg flex items-center justify-center text-[#ed6f5c]">
              <Sparkles className="w-4 h-4" />
            </div>
          </Card>

          <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] rounded-[18px] shadow-none p-5 flex items-center justify-between hover:translate-y-[-2px] transition-transform duration-200">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] dark:text-[#a39e8f]">Successful Listings</p>
              <h3 className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de] mt-1">{listingsCohort.publishedHistory} Live</h3>
            </div>
            <div className="w-8 h-8 bg-[#ece4cf]/60 dark:bg-[#22211b] border border-[#6e7448]/20 rounded-lg flex items-center justify-center text-[#6e7448] dark:text-[#9ea671] font-sans">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </Card>

        </div>

        {/* Categories Tab and Database portfolio table list */}
        <Card className="bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] rounded-[18px] shadow-none overflow-hidden">
          <CardHeader className="pb-4 border-b border-[rgba(21,20,15,0.14)] p-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-serif font-medium text-[#15140f]">Portfolio Listing Database</CardTitle>
                <CardDescription className="text-[#5a5448] text-xs mt-1 leading-relaxed font-sans">
                  Your synced portfolio workspace. Review completed listings, monitor background tasks, or run AI mockup compilations.
                </CardDescription>
              </div>

              {/* Status Tabs Category Selection */}
              <div className="flex bg-[#ece4cf]/80 p-1 rounded-lg text-xs font-mono border border-[rgba(21,20,15,0.16)] overflow-x-auto self-start uppercase tracking-wider">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'all' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                >
                  All ({listingsCohort.total})
                </button>
                <button
                  onClick={() => setFilterTab('pipeline')}
                  className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${filterTab === 'pipeline' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                >
                  <Loader2 className={`w-3 h-3 ${listingsCohort.activePipeline > 0 ? "animate-spin text-[#ed6f5c]" : ""}`} />
                  Active ({listingsCohort.activePipeline + listingsCohort.unprocessedIdle})
                </button>
                <button
                  onClick={() => setFilterTab('ready')}
                  className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'ready' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                >
                  Ready ({listingsCohort.readyDrafts})
                </button>
                <button
                  onClick={() => setFilterTab('published')}
                  className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'published' ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] shadow-none font-bold' : 'text-[#5a5448] hover:text-[#15140f]'}`}
                >
                  Live ({listingsCohort.publishedHistory})
                </button>
              </div>

            </div>
          </CardHeader>

          <CardContent className="px-0 py-0">
            {filteredListings.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <FileText className="w-10 h-10 text-[#8b8676] mx-auto opacity-60" />
                <h3 className="text-[#15140f] font-serif font-medium text-sm">No listings found in this category</h3>
                <p className="text-[#5a5448] text-xs max-w-xs mx-auto font-sans">
                  Drag files into the Upload box above, or select catalog folder to assemble and queue listing tasks!
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
                  {filteredListings.map((listingItem) => {
                    const sessionItem = localFilesMap[listingItem.folderName];
                    const activeSessionCount = sessionItem
                      ? `${sessionItem.images.length} Image(s), ${sessionItem.files.length} Template(s)`
                      : "Ready to run optimization";

                    // Flag corresponding to progress styles
                    const isInProgressPipeline = ['scanning', 'mockups', 'thumbnail', 'compiling', 'seo'].includes(listingItem.status);

                    return (
                      <TableRow key={listingItem.id} className="border-[rgba(21,20,15,0.12)] bg-transparent hover:bg-[#ece4cf]/30 transition-colors">

                        {/* Title of Listing / Folder name */}
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-serif font-medium text-[#15140f] text-sm leading-tight">{listingItem.folderName}</span>
                            <span className="text-[10px] text-[#5a5448] font-mono mt-1 flex items-center gap-1.5 select-none" title="Linked files in browser memory">
                              <FileCode className="w-3.5 h-3.5 text-[#8b8676]" /> {activeSessionCount}
                            </span>
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
                              <span className="text-[10px] text-[#5a5448]/80 mt-1 leading-tight font-medium max-w-[200px]">
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
                              <Button
                                size="sm"
                                onClick={() => runAutomatedAIPipeline(listingItem.id, listingItem.folderName, listingItem.productType || selectedProductType || 'png_graphics')}
                                className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0 text-xs max-h-8 flex items-center shadow-none font-serif font-medium px-4 rounded-full cursor-pointer transition-colors"
                              >
                                <Wand2 className="w-3.5 h-3.5 mr-1 text-white" />
                                <span>Compile Listing</span>
                              </Button>
                            )}

                            {isInProgressPipeline && (
                              <Button size="sm" disabled variant="outline" className="border-[rgba(21,20,15,0.16)] bg-[#ece4cf]/30 text-[#5a5448] text-xs max-h-8 rounded-lg select-none">
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-[#ed6f5c]" />
                                <span>Running AI...</span>
                              </Button>
                            )}

                            {['ready', 'published'].includes(listingItem.status) && (
                              <Button
                                size="sm"
                                onClick={() => openPreviewPanel(listingItem)}
                                className={`text-xs max-h-8 font-serif font-medium rounded-full cursor-pointer transition-colors ${listingItem.status === 'published' ? 'border border-[rgba(21,20,15,0.16)] text-[#5a5448] hover:bg-[#ece4cf] bg-transparent' : 'bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0'}`}
                                variant="default"
                              >
                                {listingItem.status === 'published' ? <Eye className="w-3.5 h-3.5 mr-1 text-[#8b8676]" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-white" />}
                                <span>{listingItem.status === 'published' ? 'Review Listed' : 'Open Draft'}</span>
                              </Button>
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

      </main>

      {/* Review Dialog Structure (Draft metadata + publish logic) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto sm:rounded-[18px] p-6 bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] text-[#15140f] font-sans">

          <DialogHeader className="pb-4 border-b border-[rgba(21,20,15,0.14)]">
            <div className="flex justify-between items-start gap-3">
              <div>
                <DialogTitle className="text-lg font-serif font-medium text-[#15140f]">Etsy Catalog Listing Review</DialogTitle>
                <DialogDescription className="text-[#5a5448] text-xs mt-1 font-sans">
                  Generated layout details, compiled download package, and keyword analysis suite.
                </DialogDescription>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider bg-[#6e7448]/10 text-[#6e7448] px-2.5 py-0.5 rounded border border-[#6e7448]/30 shrink-0 font-medium select-none">
                {activeProduct?.status === 'published' ? 'Live Draft Generated' : 'Draft Prepared'}
              </span>
            </div>
          </DialogHeader>

          {activeProduct && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">

              {/* Left Side: Mockup Image rendering container & download options */}
              <div className="space-y-4">
                <span className="text-[9px] font-mono uppercase text-[#8b8676] tracking-widest block font-bold select-none">Simulated Lifestyle Cover Thumbnail</span>

                {activeProduct.mockupImage ? (
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[rgba(21,20,15,0.16)] bg-[#efe7d2] shadow-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeProduct.mockupImage}
                      alt="lifestyle design template"
                      className="w-full h-full object-cover"
                    />

                    {/* Badge Stamp on the generated cover */}
                    <div className="absolute top-3 left-3 bg-[#ed6f5c] text-white text-[9px] font-mono tracking-wider px-2.5 py-1 rounded shadow-none uppercase font-bold">
                      ✓ Compiled & Verified
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-xl flex items-center justify-center bg-[#ece4cf]/60 border border-[rgba(21,20,15,0.16)] text-[#5a5448] font-sans">
                    <span className="text-xs font-mono">Thumbnail layout syncing...</span>
                  </div>
                )}

                {/* Simulated downloadable compilation items */}
                <Card className="bg-[#efe7d2]/60 p-4 border border-[rgba(21,20,15,0.16)] border-dashed space-y-3 rounded-xl shadow-none">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] text-[#ed6f5c] flex items-center justify-center shrink-0">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif font-medium text-[#15140f] uppercase tracking-wider">Compiled Etsy Shop Package</h4>
                      <p className="text-[10px] text-[#5a5448] mt-0.5 font-sans leading-relaxed">Includes {activeProduct.images.length} mockup JPGs + deliverable files bundle.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (activeProduct.mockupImage) {
                          const link = document.createElement('a');
                          link.href = activeProduct.mockupImage;
                          link.download = `${activeProduct.folderName.toLowerCase()}_thumbnail.jpg`;
                          link.click();
                          toast.success("Downloadable listing cover downloaded!");
                        }
                      }}
                      size="sm"
                      className="flex-1 bg-transparent border border-[rgba(21,20,15,0.16)] hover:bg-[#ece4cf] text-[#5a5448] font-mono text-[10px] py-1.5 rounded-lg transition-colors uppercase tracking-wider cursor-pointer"
                      variant="outline"
                    >
                      <Download className="w-3.5 h-3.5 mr-1 text-[#8b8676]" /> Download Cover
                    </Button>

                    <Button
                      onClick={() => {
                        toast.success(`Successfully saved client package zip: ${activeProduct.folderName.toLowerCase()}_etsy_package.zip`);
                      }}
                      size="sm"
                      className="flex-1 bg-transparent border border-[#ed6f5c]/30 text-[#ed6f5c] hover:bg-[#ed6f5c]/10 font-mono text-[10px] py-1.5 rounded-lg transition-colors uppercase tracking-wider cursor-pointer"
                      variant="outline"
                    >
                      <FileCode className="w-3.5 h-3.5 mr-1" /> Get ZIP Package
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Right Side: SEO Title, description, Pricing tags copies */}
              <div className="space-y-4">

                {/* Product Class header */}
                <div className="flex justify-between items-center bg-[#ece4cf]/60 p-2.5 rounded-lg border border-[rgba(21,20,15,0.16)] font-mono">
                  <span className="text-xs text-[#5a5448]">Framework:</span>
                  <span className="text-[10px] font-bold text-[#ed6f5c] uppercase">
                    {activeProduct.productType === 'png_graphics' ? '🎨 Transparent PNG Pack' :
                      activeProduct.productType === 'printable_wallart' ? '🖼️ Printable Wall Art' :
                        activeProduct.productType === 'presets' ? '📸 Lightroom Preset' : '📅 agenda planner'}
                  </span>
                </div>

                {/* Title */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="title" className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider font-bold">SEO Optimized Title</Label>
                    <button
                      onClick={() => handleCopyText(activeProduct.title || '', 'Title')}
                      className="text-[10px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy Title
                    </button>
                  </div>
                  <Input
                    id="title"
                    value={activeProduct.title || ''}
                    readOnly
                    className="w-full text-xs border-[rgba(21,20,15,0.16)] bg-[#efe7d2] font-serif font-medium text-[#15140f] shadow-none h-10 rounded-lg focus:ring-0 focus:border-[rgba(21,20,15,0.16)]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="desc" className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider font-bold">Sales Copy Description</Label>
                    <button
                      onClick={() => handleCopyText(activeProduct.description || '', 'Description')}
                      className="text-[10px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy Promo Code
                    </button>
                  </div>
                  <textarea
                    id="desc"
                    value={activeProduct.description || ''}
                    readOnly
                    rows={6}
                    className="flex w-full rounded-lg border border-[rgba(21,20,15,0.16)] bg-[#efe7d2] px-3 py-2 text-xs shadow-none resize-none text-[#5a5448] leading-relaxed font-sans focus:outline-none"
                  />
                </div>

                {/* Price and Keywords */}
                <div className="grid grid-cols-2 gap-4 font-sans">

                  <div className="space-y-1 bg-[#ece4cf]/40 p-3 rounded-lg border border-[rgba(21,20,15,0.16)] flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider block font-bold">Est. Market Price</span>
                      <span className="text-base font-serif font-medium text-[#15140f] block mt-1">${(activeProduct.price || 5.95).toFixed(2)} USD</span>
                    </div>
                    <button
                      onClick={() => handleCopyText((activeProduct.price || 5.95).toFixed(2), 'Price')}
                      className="text-[9px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 mt-1.5 uppercase tracking-wider cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy Price
                    </button>
                  </div>

                  <div className="space-y-1 bg-[#ece4cf]/40 p-3 rounded-lg border border-[rgba(21,20,15,0.16)] flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase text-[#8b8676] font-mono tracking-wider block font-bold">Tag Keywords (13)</span>
                      <div className="max-h-20 overflow-y-auto flex flex-wrap gap-1 mt-1.5">
                        {(activeProduct.tags || []).map((tag, i) => (
                          <span key={i} className="text-[8px] bg-[#efe7d2] text-[#5a5448] border border-[rgba(21,20,15,0.16)] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyText((activeProduct.tags || []).join(', '), 'Tags list')}
                      className="text-[9px] font-mono font-bold text-[#ed6f5c] hover:underline flex items-center gap-1 mt-1.5 uppercase tracking-wider cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy Tags
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          <div className="mt-4 flex justify-between items-center border-t border-[rgba(21,20,15,0.14)] pt-4 font-sans">

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

            <div className="flex gap-2">
              <Button variant="ghost" className="text-[#5a5448] hover:bg-[#ece4cf] hover:text-[#15140f] text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded" onClick={() => setIsDialogOpen(false)}>Close Review</Button>

              {selectedMode === 'etsy' ? (
                activeProduct?.status === 'published' ? (
                  <Button variant="outline" disabled className="text-[#6e7448] border-[#6e7448]/35 bg-[#efe7d2] font-mono text-[10px] uppercase tracking-wider rounded-lg">
                    <Check className="w-4 h-4 mr-1 text-[#6e7448]" /> Active Draft Added
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (activeProduct) publishToEtsySnapshot(activeProduct);
                    }}
                    disabled={activeProduct?.status === 'publishing'}
                    className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-[10px] rounded-full px-5 transition-colors uppercase tracking-wider cursor-pointer border-0"
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
                  className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-[10px] rounded-full px-5 transition-colors uppercase tracking-wider cursor-pointer border-0"
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

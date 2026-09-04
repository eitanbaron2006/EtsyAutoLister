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
  Wand2,
  UploadCloud,
  CheckCircle2,
  ChevronRight,
  Lock,
  LogOut,
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
  Eye,
  Camera,
  Layers2,
  Settings,
  Image as ImageIcon,
  Bookmark,
  BookOpen,
  FolderOpen,
  Cpu,
  Sun,
  Moon,
  RotateCcw,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

// Supabase auth + data access. The UI never touches the SDK directly:
// auth goes through lib/auth, all reads/writes through lib/listings-repo.
import {
  onAuthStateChange,
  signInWithGoogle,
  ProviderNotEnabledError,
  signInWithPassword,
  signOut,
  type AppUser
} from '@/lib/auth';
import {
  createListing,
  createProfile,
  deleteListing,
  getProfile,
  recoverStalledListings,
  resetListingToIdle,
  subscribeToListings,
  updateListing,
  updateProfile
} from '@/lib/listings-repo';
import JSZip from 'jszip';
import { DevSignInDialog } from '@/components/dev-signin-dialog';
import { createUploadedPreviews, type UploadedPreview } from '@/lib/uploaded-previews';
import { mockupsAlreadyCover } from '@/lib/mockup-reuse';
import { readStudioPrefs } from '@/lib/studio-prefs';
import { PREF_KEYS, flushPrefs, readCached, readStoredPrefs, rememberStoredPrefs, savePref, type UiPrefs } from '@/lib/ui-prefs';
import {
  deleteListingAssets,
  loadAllMockups,
  loadAllSources,
  persistMockups,
  persistSources,
  syncFromCloud,
  backfillToCloud,
  clearStagingTray,
  loadStagingTray,
  saveStagingTray,
  type StoredMockup
} from '@/lib/asset-store';
import { askForDurableStorage, browserStorageUse } from '@/lib/asset-cloud';
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

import { SandboxPlayground } from '@/components/sandbox-playground';
import { ScrollToTop } from '@/components/scroll-to-top';
import { PhotoLightbox, type LightboxState } from '@/components/photo-lightbox';
import { TipFillerCard, TipPanel } from '@/components/studio-tips';
import { DeleteConfirmDialog, type ConfirmRequest } from '@/components/delete-confirm-dialog';
import { MockupViewerDialog } from '@/components/mockup-viewer-dialog';
import { GalleryInspectorDialog } from '@/components/gallery-inspector-dialog';
import { ListingReviewDialog } from '@/components/listing-review-dialog';
import { LandingPage } from '@/components/landing-page';
import { AccountView } from '@/components/account-view';
import { RouteSelectView } from '@/components/route-select-view';
import { CategorySelectView } from '@/components/category-select-view';
import { useLightbox } from '@/hooks/use-lightbox';
import { useStudioPrefs } from '@/hooks/use-studio-prefs';
import { useSavedTips } from '@/hooks/use-saved-tips';
import { ProjectsHubView } from '@/components/projects-hub-view';
import { balancedGridColumns } from '@/lib/grid';
import { getFormattedPlainTextDescription, renderFormattedDescription } from '@/lib/listing-format';
import type { GeneratedMockup, ListingMetadata, ProductData, StagedImage, StagedProduct } from '@/lib/listing-types';

// Thrown at each pipeline checkpoint so a stopped run unwinds in one place.
// Declared at module scope: the React Compiler skips any component containing
// an inline class declaration.
class RunCancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'RunCancelled';
  }
}

const ETSY_CONNECTED = 'connected';

export default function Home() {
  // Authentication & Configuration States
  const [user, setUser] = useState<AppUser | null>(null);
  const [showDevSignIn, setShowDevSignIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Selection Pathways variables
  const [selectedMode, setSelectedMode] = useState<'etsy' | 'manual' | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null); // e.g. 'png_graphics' | 'printable_wallart' | 'presets' | 'planners'

  // Not a token. The page needs to know an Etsy account is connected -- every
  // check here is `!etsyToken` -- and the secret itself now stays on the
  // server, so this stands in for it.
  const [etsyToken, setEtsyToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [globalAppUrl, setGlobalAppUrl] = useState('');

  // Brand New Dark Mode & Projects view states represent user's workspace preferences:
  // The cache paints the first frame; the stored preference wins when the
  // profile lands a moment later.
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return readCached(PREF_KEYS.theme) === 'dark';
    }
    return false;
  });
  const [storedPrefs, setStoredPrefs] = useState<UiPrefs | undefined>(undefined);
  const [currentView, setCurrentView] = useState<'projects' | 'routes' | 'category' | 'workspace' | 'account'>('projects');

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
  // Pipeline mode + default fit mode (persisted per browser)
  const { studioAutopilot, toggleStudioAutopilot, studioFitMode, changeStudioFitMode } = useStudioPrefs(user?.uid, storedPrefs);
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
  const [isBrowsingTemplates, setIsBrowsingTemplates] = useState(false);
  const [isRenderingMockups, setIsRenderingMockups] = useState(false);
  const [isRunningCopy, setIsRunningCopy] = useState(false);
  const [isRunningAutopilot, setIsRunningAutopilot] = useState(false);

  // Stop support for a run in flight. `cancelledRuns` is what the pipeline
  // checks between stages; `runAborts` aborts the request that is actually
  // open right now, so a stuck Gemini call ends immediately instead of after
  // its full 75s timeout. Refs, not state: the running async pipeline closes
  // over these and must observe writes made after it started.
  const cancelledRunsRef = useRef<Set<string>>(new Set());
  const runAbortsRef = useRef<Map<string, AbortController>>(new Map());

  const stopRun = async (listingId: string) => {
    cancelledRunsRef.current.add(listingId);
    runAbortsRef.current.get(listingId)?.abort();
    runAbortsRef.current.delete(listingId);
    if (user) await resetListingToIdle(user.uid, listingId).catch(() => { });
  };
  const [studioZoomMockup, setStudioZoomMockup] = useState<GeneratedMockup | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('preview');
  const [isPackingZip, setIsPackingZip] = useState(false);
  const [isGalleryInspectorOpen, setIsGalleryInspectorOpen] = useState(false);
  // Mockup viewer dialog opened from the table's Live Mockup Thumb column
  const [mockupViewerListing, setMockupViewerListing] = useState<ListingMetadata | null>(null);
  // Fullscreen lightbox with prev/next navigation over a set of photos
  const { lightbox, setLightbox } = useLightbox();
  // Saved tips + subscription plan (Firestore-synced)
  const { savedTips, setSavedTips, accountPlan, setAccountPlan, handleToggleSavedTip } = useSavedTips(user);
  // Pending destructive action awaiting user confirmation
  const [deleteRequest, setDeleteRequest] = useState<ConfirmRequest | null>(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [sourcePreviewImages, setSourcePreviewImages] = useState<UploadedPreview[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pipeline' | 'ready' | 'published'>('all');
  const [activeLabFilter, setActiveLabFilter] = useState<'all' | 'wallart' | 'presets' | 'stickers' | 'planners'>('all');

  // Staging tray state — mixed batch of sets and singles before creation
  const [isUploadingRaw, setIsUploadingRaw] = useState(false);
  const [stagedProducts, setStagedProducts] = useState<StagedProduct[]>([]);
  const [stagedSelection, setStagedSelection] = useState<string[]>([]);
  // Saving must not start before the restore has had its say, or an empty
  // first render would wipe the tray it is about to bring back.
  const stagingRestoredRef = useRef(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  // The project this session works inside — set by the first creation or by
  // continuing a project from the hub; later creations join it.
  const [activeProject, setActiveProject] = useState<{ id: string; name: string } | null>(null);

  const rawFileInputRef = useRef<HTMLInputElement>(null);
  const setFileInputRef = useRef<HTMLInputElement>(null);
  const studioImageInputRef = useRef<HTMLInputElement>(null);

  // Review-dialog source-preview object URLs are revoked only when the dialog
  // closes (see onOpenChange) — revoking on every gallery change broke the
  // open dialog's images when the async info-extras append updated the array.

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
      })
      .then(async () => {
        if (cancelled || !user) return;
        // Whatever this browser is missing comes down from the bucket. On a
        // machine that already has the files this downloads nothing; on one
        // that has never seen them it is the difference between the session
        // working and "assets missing in this browser".
        const filled = await syncFromCloud(user.uid).catch(() => null);
        if (cancelled || !filled || filled.files === 0) return;

        const [sources, storedMockups] = await Promise.all([
          loadAllSources(user.uid),
          loadAllMockups(user.uid),
        ]);
        if (cancelled) return;
        setLocalFilesMap(prev => ({ ...sources, ...prev }));
        setSourceThumbsMap(prev => {
          const restored: Record<string, string[]> = {};
          for (const [folderName, bundle] of Object.entries(sources)) {
            if (prev[folderName]) continue;
            restored[folderName] = bundle.images.slice(0, 4).map(file => URL.createObjectURL(file));
          }
          return { ...restored, ...prev };
        });
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
        toast.success(
          filled.folders.length === 1
            ? `Restored ${filled.files} file${filled.files === 1 ? '' : 's'} for 1 listing from your account.`
            : `Restored ${filled.files} files across ${filled.folders.length} listings from your account.`,
        );
      })
      .then(async () => {
        if (cancelled || !user) return;
        // Then the other direction: anything this browser holds that the
        // account does not. Everything stored before the buckets existed is
        // in IndexedDB and nowhere else, and without this pass those listings
        // -- the ones with real work in them -- stay as fragile as they were.
        const sent = await backfillToCloud(user.uid).catch(() => null);
        if (cancelled || !sent || sent.uploaded === 0) return;
        toast.success(
          `Backed up ${sent.uploaded} file${sent.uploaded === 1 ? '' : 's'} from this browser to your account.`,
        );
      })
      .then(async () => {
        if (cancelled) return;
        // The cache is not the record any more, so a full browser store is no
        // longer a threat to the work -- but it is still worth knowing, since
        // eviction means re-downloading everything.
        const room = await browserStorageUse();
        if (room.quotaBytes > 0 && room.usedBytes / room.quotaBytes > 0.8) {
          const used = Math.round(room.usedBytes / 1024 / 1024);
          const quota = Math.round(room.quotaBytes / 1024 / 1024);
          toast.warning(
            `This browser is holding ${used}MB of ${quota}MB. Your files are safe in your account; the local copy may be cleared.`,
          );
        }
      });
    // A browser evicts storage under disk pressure without asking. The bucket
    // survives that, but asking to be spared saves a re-download.
    void askForDurableStorage();
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

  // The staging tray, kept as it is worked on.
  //
  // Files chosen, sets merged, groups split, names typed -- all before
  // "Create Listings" writes anything anywhere. It was React state and nothing
  // else, so a refresh at that moment threw the lot away. Debounced, because
  // renaming a product should not write a folder of images per keystroke.
  useEffect(() => {
    if (!user || !stagingRestoredRef.current) return;
    const timer = window.setTimeout(() => {
      if (stagedProducts.length === 0) {
        void clearStagingTray(user.uid).catch(() => { });
        return;
      }
      void saveStagingTray(
        user.uid,
        stagedProducts.map(product => ({
          id: product.id,
          name: product.name,
          kind: product.kind,
          images: product.images.map(image => ({ id: image.id, file: image.file })),
          files: product.files,
        })),
      ).catch(() => { });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [stagedProducts, user]);

  // ...and offered back on the next visit.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadStagingTray(user.uid)
      .then(restored => {
        if (cancelled) return;
        stagingRestoredRef.current = true;
        if (restored.length === 0) return;
        setStagedProducts(prev => {
          // Anything already staged in this session is the newer truth.
          if (prev.length > 0) {
            restored.forEach(product => product.images.forEach(image => URL.revokeObjectURL(image.url)));
            return prev;
          }
          return restored as StagedProduct[];
        });
        toast.info(
          restored.length === 1
            ? 'Restored 1 product you had staged but not created yet.'
            : `Restored ${restored.length} products you had staged but not created yet.`,
        );
      })
      .catch(() => {
        stagingRestoredRef.current = true;
      });
    return () => { cancelled = true; };
  }, [user]);

  // A preference changed a moment before the tab closes is still worth keeping.
  useEffect(() => {
    const send = () => flushPrefs(user?.uid);
    window.addEventListener('pagehide', send);
    return () => window.removeEventListener('pagehide', send);
  }, [user]);

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
    const isDark = readCached(PREF_KEYS.theme) === 'dark';
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
    document.documentElement.classList.toggle('dark', nextVal);
    savePref(user?.uid, { theme: nextVal ? 'dark' : 'light' }, {
      [PREF_KEYS.theme]: nextVal ? 'dark' : 'light',
    });
    toast.success(nextVal ? "Dark Mode activated." : "Light Mode activated.");
  };

  // Monitor Authentication and profile sync
  useEffect(() => {
    // The OAuth message handler below lives in this same effect (deps: []), so
    // it cannot read `user` state without going stale. Track the id here.
    let signedInUid: string | null = null;

    const unsub = onAuthStateChange(async (currentUser) => {
      signedInUid = currentUser?.uid ?? null;
      setUser(currentUser);
      setLoadingAuth(false);

      if (currentUser) {
        // Logged in: load the profile. The on_auth_user_created trigger creates
        // the row at signup, so createProfile here is only a legacy safety net.
        try {
          let profile = await getProfile(currentUser.uid);
          if (!profile) {
            await createProfile(currentUser.uid, currentUser.email);
            profile = await getProfile(currentUser.uid);
            toast.info("Created your cloud database account.");
          }
          if (profile) {
            // The stored preferences win over the cache that painted the
            // first frame.
            const prefs = readStoredPrefs(profile.uiPrefs);
            rememberStoredPrefs(prefs);
            setStoredPrefs(prefs);
            if (prefs.theme) {
              const wantsDark = prefs.theme === 'dark';
              setDarkMode(wantsDark);
              document.documentElement.classList.toggle('dark', wantsDark);
              window.localStorage?.setItem(PREF_KEYS.theme, prefs.theme);
            }
            if (profile.etsyConnected) {
              setEtsyToken(ETSY_CONNECTED);
              setSelectedMode('etsy');
            }
            if (profile.lastProductType) {
              setSelectedProductType(profile.lastProductType);
            }
            if (profile.savedTips) {
              setSavedTips(profile.savedTips);
            }
            if (profile.plan) {
              setAccountPlan(profile.plan);
            }
          }
        } catch (err) {
          console.error("User profile sync error", err);
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
        setSavedTips([]);
        setAccountPlan('free');
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
      if (event.data.type === 'OAUTH_AUTH_SUCCESS' && signedInUid) {
        // The real token never arrives here any more: the callback stored it
        // server-side and the publish route reads it from there. What the page
        // holds is the fact of being connected, which is all it ever used the
        // token for.
        setEtsyToken(ETSY_CONNECTED);
        setIsConnecting(false);
        setSelectedMode('etsy');

        // Save connection back to the user profile
        updateProfile(signedInUid, {
          etsyConnected: true,
        }).catch(err => {
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
    // setSavedTips/setAccountPlan are stable hook setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to the User's Saved Listings in real time
  useEffect(() => {
    if (!user) return;

    // A pipeline run only advances while a tab is driving it, so anything still
    // marked in-flight on load was orphaned by a refresh or a crash. Release it
    // before subscribing, otherwise the row renders a dead "Running AI..." button.
    void recoverStalledListings(user.uid).then(released => {
      if (released.length > 0) {
        toast.info(
          released.length === 1
            ? 'Released 1 listing left mid-run. You can start it again.'
            : `Released ${released.length} listings left mid-run. You can start them again.`,
        );
      }
    });

    const unsubSnap = subscribeToListings(
      user.uid,
      setDbListings,
      (error) => {
        console.error('Listing subscription failed', error);
        toast.error('Lost sync with your saved listings.');
      },
    );

    return () => unsubSnap();
  }, [user]);

  // Handle Google Login Flow. When the Supabase stack has no Google provider
  // configured, fall back to the local email/password dialog rather than
  // dead-ending on "provider is not enabled".
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success("Welcome aboard!");
    } catch (err: any) {
      if (err instanceof ProviderNotEnabledError) {
        setShowDevSignIn(true);
        return;
      }
      toast.error(err?.message || "Failed to log in with Google.");
    }
  };

  const handleDevSignIn = async (email: string, password: string) => {
    try {
      await signInWithPassword(email, password);
      setShowDevSignIn(false);
      toast.success("Welcome aboard!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign in.");
    }
  };

  // Handle Log Out
  const handleLogOut = async () => {
    try {
      await signOut();
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
        await updateProfile(user.uid, {
          etsyConnected: true,
          etsyToken: 'DEMO_TOKEN'
        });

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
      await updateProfile(user.uid, {
        etsyConnected: false,
      });
      // The stored token goes too, not just the flag.
      await fetch('/api/etsy/disconnect', { method: 'POST' }).catch(() => { });
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
        await updateProfile(user.uid, {
          lastProductType: type,
        });
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
    // The saved copy goes with it, or the next load would offer back a tray
    // whose products are already listings.
    if (user) void clearStagingTray(user.uid).catch(() => { });
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
        try {
          await createListing(user.uid, {
            id: listingId,
            folderName: productName,
            projectId: projectId,
            projectName: projectName,
            status: 'idle',
            productType: selectedProductType
          });
          created++;
          createdIds.push(listingId);
        } catch (err) {
          // createListing already logged the structured error before throwing
          console.error('Failed to create listing', listingId, err);
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
      // Rejecting with the raw ProgressEvent hides the failure reason (it has
      // no .message/.code), which later surfaces as an empty "{}" error log.
      reader.onerror = () => reject(new Error(
        `Failed to read "${file.name}" (${file.type || 'unknown type'}, ${Math.round(file.size / 1024)} KB). ` +
        'The file may have been moved, deleted or locked since it was staged.'
      ));
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
        reject(new Error(
          `Failed to decode image (${blob.type || 'unknown type'}, ${Math.round(blob.size / 1024)} KB) — the browser can't render this file`
        ));
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

  // Template catalog for client-side planning. Always fetched fresh — the
  // admin re-categorizes and adds templates on the render server, and a
  // session-long cache made the planner use stale MAIN/orientation data.
  const getTemplateCatalog = async (): Promise<MockupTemplateSummary[]> => {
    try {
      const templates = await listMockupTemplates();
      setStudioTemplates(templates);
      return templates;
    } catch {
      // Server unreachable — fall back to whatever the session already has
      return studioTemplates;
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
  ): Promise<{ mockups: GeneratedMockup[]; shortfallNote: string | null }> => {
    const artworks = images.filter(isMockupGenSupportedImage);
    if (artworks.length === 0) return { mockups: [], shortfallNote: null };

    const healthy = await checkMockupGenHealth();
    setMockupServerStatus(healthy ? 'online' : 'offline');
    if (!healthy) {
      toast.warning('MockupGen server is offline — skipping mockup rendering for this run.');
      return { mockups: [], shortfallNote: null };
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

    // MAIN cover + top-up apply only to fresh plans — a re-render of one
    // specific mockup (options.append) must not grow into a whole package.
    let shortfallNote: string | null = null;
    if (!options?.append) {
      // MAIN cover: every product leads with exactly ONE thumbnail mockup
      // from a main-* category, matched to the lead artwork's orientation —
      // it becomes the Etsy cover. The rest of the plan never touches main
      // templates.
      //
      // Matched on the template's own orientation rather than on a category
      // slug: the studio renamed its shelves (main-vertical -> main-portrait,
      // main-horizontal -> main-wide) and the hardcoded names silently matched
      // nothing, which cost every portrait and landscape listing its cover.
      const catalog = await getTemplateCatalog();
      const isMainTemplate = (t: MockupTemplateSummary) => t.product_type.startsWith('main-');
      const planArtworks = artworks.slice(0, MAX_SET_ARTWORKS);
      const planOrientations = await Promise.all(planArtworks.map(file => getImageOrientation(file)));
      const userPickedMain = (templateIds || []).some(id => {
        const picked = catalog.find(t => t.template_id === id);
        return picked ? isMainTemplate(picked) : false;
      });
      if (!userPickedMain && catalog.length > 0) {
        const leadOrientation = planOrientations[0];
        // The cover is always a single-frame scene of the lead artwork
        const pool = catalog.filter(t =>
          isMainTemplate(t) && t.orientation === leadOrientation && (t.frame_count ?? 1) === 1
        );
        if (pool.length > 0) {
          // Seeded by the artwork file so bulk products get varied covers
          // while staying deterministic per product
          const seed = artworks[0].size + artworks[0].lastModified + artworks[0].name.length;
          const mainTemplate = pool[seed % pool.length];
          fileMap['artwork_0'] = artworks[0];
          fieldToName['artwork_0'] = artworks[0].name;
          items.unshift({ id: `main-${mainTemplate.template_id}`, artworks: 'artwork_0', template_id: mainTemplate.template_id });
        }
      }

      // Top up towards MIN_MOCKUPS using ONLY orientation-matched, non-main
      // templates. Never force unsuitable templates just to reach the count —
      // a shortfall is reported on the listing for the admin instead.
      if (items.length < MIN_MOCKUPS) {
        const fillCatalog = catalog.filter(t => !isMainTemplate(t));
        if (fillCatalog.length > 0) {
          const usedTemplates = new Set<string>(
            items.map(item => item.template_id).filter((id): id is string => Boolean(id))
          );
          let cursor = 0;
          let guard = 0;
          let consecutiveMisses = 0;
          while (items.length < Math.min(MIN_MOCKUPS, MAX_ITEMS) && guard < fillCatalog.length * 2) {
            guard++;
            const index = cursor % planArtworks.length;
            const field = `artwork_${index}`;
            const orientation = planOrientations[index];
            // Strict match: same orientation AND a single frame — multi-frame
            // set scenes must never receive one repeated artwork
            const pick = fillCatalog.find(t =>
              !usedTemplates.has(t.template_id) &&
              t.orientation === orientation &&
              (t.frame_count ?? 1) === 1);
            if (!pick) {
              consecutiveMisses++;
              if (consecutiveMisses >= planArtworks.length) break; // no artwork has matches left
              cursor++;
              continue;
            }
            consecutiveMisses = 0;
            fileMap[field] = planArtworks[index];
            fieldToName[field] = planArtworks[index].name;
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

      if (items.length < MIN_MOCKUPS) {
        const neededOrientations = Array.from(new Set(planOrientations)).join(' / ');
        shortfallNote = `Only ${items.length} of ${MIN_MOCKUPS} suitable mockups — add more ${neededOrientations} templates on the render server.`;
        toast.info(shortfallNote);
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
    return { mockups: results, shortfallNote };
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
      const { mockups: replacements } = await generateListingMockups(
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

  // A mockup is the Etsy "cover" when its template is a main-* category
  const isMainTemplate = (templateId: string) =>
    studioTemplates.find(t => t.template_id === templateId)?.product_type?.startsWith('main-') ?? false;

  // Signature of the mockup the Add flow WOULD produce for a template:
  // `templateId::sorted(actual source artworks)`. A set is trimmed to the
  // template's frame_count (mirrors generateListingMockups' slice), so this
  // predicts the real variation — two renders only collide when the template
  // AND the exact image variation match (same image in different variations is
  // a distinct, allowed mockup).
  const MAX_SET_ARTWORKS = 12;
  const mockupSignatureForAdd = (templateId: string, images: File[], catalog: MockupTemplateSummary[]) => {
    const names = images.filter(isMockupGenSupportedImage).map(f => f.name);
    if (names.length <= 1) return `${templateId}::${names.join('|')}`;
    const frameCount = catalog.find(t => t.template_id === templateId)?.frame_count ?? names.length;
    const used = names.slice(0, Math.min(frameCount, names.length, MAX_SET_ARTWORKS));
    return `${templateId}::${[...used].sort().join('|')}`;
  };

  // Etsy photo caps: exactly 1 MAIN cover + up to 19 regular = 20 total
  const MAX_REGULAR_MOCKUPS = 19;

  // Safety net run after every commit: enforce 1 MAIN + ≤19 regular,
  // deterministically dropping extras (and revoking their object URLs).
  const clampPool = (folderName: string) => {
    setMockupResultsMap(prev => {
      const pool = prev[folderName] || [];
      const mains = pool.filter(m => isMainTemplate(m.templateId));
      const regulars = pool.filter(m => !isMainTemplate(m.templateId));
      const keptMain = mains.slice(0, 1);
      const keptRegular = regulars.slice(0, MAX_REGULAR_MOCKUPS);
      const dropped = [...mains.slice(1), ...regulars.slice(MAX_REGULAR_MOCKUPS)];
      if (dropped.length === 0) return prev;
      dropped.forEach(m => URL.revokeObjectURL(m.url));
      pendingPersistRef.current.mockups.add(folderName);
      // Cover (MAIN) stays first
      return { ...prev, [folderName]: [...keptMain, ...keptRegular] };
    });
  };

  // Manual "Add" path (Studio, pool non-empty + templates selected): render the
  // selected templates and append them, enforcing the caps with a confirm
  // dialog when the add would overwrite existing mockups.
  const handleAddMockups = async (
    listing: ListingMetadata,
    requestedTemplateIds: string[],
    assignments?: Record<number, string>
  ) => {
    const catalog = await getTemplateCatalog();
    const isMain = (id: string) => catalog.find(t => t.template_id === id)?.product_type?.startsWith('main-') ?? false;

    const pool = mockupResultsMap[listing.folderName] || [];

    // Prevent duplicates: skip a template only if it already holds this EXACT
    // image variation (frame-trimmed). The same template with a different
    // variation (e.g. set images 1+2 vs 2+3) is a valid distinct mockup.
    const sessionImages = localFilesMap[listing.folderName]?.images || [];
    const existingSigs = new Set(pool.map(m => `${m.templateId}::${[...m.sourceFileNames].sort().join('|')}`));
    const templateIds = requestedTemplateIds.filter(id => !existingSigs.has(mockupSignatureForAdd(id, sessionImages, catalog)));
    const skipped = requestedTemplateIds.length - templateIds.length;
    if (templateIds.length === 0) {
      toast.info(skipped === 1
        ? 'That template is already in this product\'s mockups.'
        : 'Those templates are already in this product\'s mockups.');
      return;
    }
    if (skipped > 0) {
      toast.info(`${skipped} template${skipped === 1 ? '' : 's'} already in the pool ${skipped === 1 ? 'was' : 'were'} skipped.`);
    }

    const newMain = templateIds.filter(isMain).length;
    const newRegular = templateIds.length - newMain;
    const existingMains = pool.filter(m => isMainTemplate(m.templateId));
    const existingRegulars = pool.filter(m => !isMainTemplate(m.templateId));

    // Decide which existing mockups must be overwritten to honour the caps
    const doomedIds: string[] = [];
    const warnings: string[] = [];
    if (newMain > 0 && existingMains.length > 0) {
      existingMains.forEach(m => doomedIds.push(m.id));
      warnings.push('your current MAIN cover will be replaced');
    }
    const regularOverflow = Math.max(0, existingRegulars.length + newRegular - MAX_REGULAR_MOCKUPS);
    if (regularOverflow > 0) {
      // Overwrite the oldest existing regulars to make room
      existingRegulars.slice(0, regularOverflow).forEach(m => doomedIds.push(m.id));
      warnings.push(`${regularOverflow} existing mockup${regularOverflow === 1 ? '' : 's'} will be overwritten`);
    }

    const commit = async () => {
      // Remove the doomed existing mockups first, then append the new renders
      if (doomedIds.length > 0) {
        setMockupResultsMap(prev => {
          const existing = prev[listing.folderName] || [];
          existing.filter(m => doomedIds.includes(m.id)).forEach(m => URL.revokeObjectURL(m.url));
          return { ...prev, [listing.folderName]: existing.filter(m => !doomedIds.includes(m.id)) };
        });
      }
      setIsRenderingMockups(true);
      try {
        const sessionFiles = localFilesMap[listing.folderName] || { images: [], files: [] };
        const { mockups: added } = await generateListingMockups(
          listing.folderName,
          sessionFiles.images,
          templateIds,
          { append: true, frameAssignments: assignments }
        );
        if (added.length > 0) {
          clampPool(listing.folderName); // final safety: 1 MAIN + ≤19 regular
          toast.success(`Added ${added.length} mockup${added.length === 1 ? '' : 's'}.`);
        }
      } catch (err: any) {
        toast.error('Add failed: ' + (err.message || 'Unknown error'));
      } finally {
        setIsRenderingMockups(false);
      }
    };

    if (warnings.length > 0) {
      setDeleteRequest({
        eyebrow: 'Confirm Overwrite',
        title: 'This exceeds the 20-photo limit',
        description: `Adding these mockups means ${warnings.join(' and ')}. Consider deleting some mockups first if you want to keep them. Continue?`,
        confirmLabel: 'Yes, Overwrite',
        action: () => { void commit(); }
      });
    } else {
      await commit();
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
    const { mockups: results, shortfallNote } = await generateListingMockups(folderName, sessionFiles.images, templateIds, { frameAssignments: assignments });

    // Fresh builds can over-produce if many templates were picked — enforce the cap
    if (results.length > 0) clampPool(folderName);

    if (user) {
      // Record (or clear) the admin note about missing suitable templates
      await updateListing(user.uid, listingId, {
        mockupNote: shortfallNote,
      }).catch(() => { });
    }

    if (results.length > 0 && user) {
      try {
        const thumbnail = await blobToScaledJpegDataUrl(results[0].file, 480, 0.8);
        await updateListing(user.uid, listingId, {
          mockupImage: thumbnail,
        });
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
    const targetId = listing.id;
    // Re-rendering mockups must not demote an already compiled draft
    const restoreStatus = ['ready', 'published'].includes(listing.status) ? listing.status : 'idle';
    setIsRenderingMockups(true);
    try {
      await updateListing(user.uid, targetId, {
        status: 'mockups',
        pipelineStepText: 'Rendering high-fidelity mockup frames on the MockupGen server...',
      });

      const results = await renderMockupsForListing(listing.id, listing.folderName, templateIds, assignments);

      await updateListing(user.uid, targetId, {
        status: restoreStatus,
        pipelineStepText: results.length > 0
          ? 'Mockups rendered — review them in the Studio.'
          : 'Mockup render returned no results.',
      });
    } catch (err: any) {
      toast.error('Mockup stage failed: ' + (err.message || 'Unknown error'));
      await updateListing(user.uid, targetId, {
        status: restoreStatus,
        pipelineStepText: 'Mockup rendering failed — retry from the Studio.',
      }).catch(() => { });
    } finally {
      setIsRenderingMockups(false);
    }
  };

  // Parse the server error response to extract structured error info
  const parseServerError = async (res: Response): Promise<{ message: string; code?: string; retryable?: boolean }> => {
    try {
      const body = await res.json();
      return {
        message: body.error || `Server error (${res.status})`,
        code: body.code,
        retryable: body.retryable,
      };
    } catch {
      return { message: `Server error (${res.status})` };
    }
  };

  // Describe any thrown value — including non-Error rejections such as
  // FileReader ProgressEvents, which carry no .message/.code and would
  // otherwise collapse into an empty "{}" in logs, toasts and Firestore.
  const describeCaughtError = (err: any): string => {
    if (err == null) return 'Unknown error (empty rejection)';
    if (err instanceof Error) return `${err.name}: ${err.message}`;
    if (typeof err === 'string') return err;
    const bits: string[] = [];
    if (err.constructor?.name && err.constructor.name !== 'Object') bits.push(err.constructor.name);
    if (err.type) bits.push(`(${err.type})`);
    if (err.message) bits.push(String(err.message));
    if (err.code !== undefined && err.code !== '') bits.push(`code=${err.code}`);
    if (err.status !== undefined) bits.push(`status=${err.status}`);
    return bits.join(' ') || JSON.stringify(err) || String(err);
  };

  // Guided Studio stage: Gemini SEO copywriting
  const runCopyStage = async (listingId: string, folderName: string) => {
    if (!user) return;
    const targetId = listingId;
    const sessionFiles = localFilesMap[folderName] || { images: [], files: [] };
    setIsRunningCopy(true);

    // Show the user that we're starting the AI process
    toast.info('Connecting to Gemini AI to generate SEO-optimized listing copy...', { duration: 3000 });

    try {
      // Update Firestore with initial status
      await updateListing(user.uid, targetId, {
        status: 'seo',
        pipelineStepText: 'Connecting to Gemini AI — generating SEO title, description & tags...',
      });

      // Downscale before sending to Gemini — full-resolution uploads can
      // blow past model limits and come back as an empty response.
      const uploadedImageDataUrls = await Promise.all(
        sessionFiles.images
          .filter(file => file.type.startsWith('image/'))
          .map(file => blobToScaledJpegDataUrl(file, 1024, 0.85).catch(() => convertFileToBase64(file)))
      );

      // Update status to show we're sending data to AI
      await updateListing(user.uid, targetId, {
        pipelineStepText: 'Sending images to Gemini AI for analysis (each attempt has an 8s timeout, up to 3 retries)...',
      });

      const controller = new AbortController();
      runAbortsRef.current.set(targetId, controller);
      let res: Response;
      try {
        res = await fetch('/api/gemini/generate-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName, images: uploadedImageDataUrls }),
          signal: controller.signal
        });
      } finally {
        runAbortsRef.current.delete(targetId);
      }

      if (!res.ok) {
        const errorInfo = await parseServerError(res);
        throw { ...errorInfo, status: res.status };
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
      await updateListing(user.uid, targetId, {
        status: 'ready',
        pipelineStepText: 'Optimization complete. Ready to publish!',
        title: safeTitle,
        description: getFormattedPlainTextDescription(safeDescription),
        tags: safeTags,
        price: safePrice,
      });

      toast.success(`Listing copy compiled for "${folderName}"!`);
    } catch (err: any) {
      // A user-requested stop is not a failure: stopRun already reset the row.
      if (err?.name === 'AbortError' || cancelledRunsRef.current.has(targetId)) {
        throw Object.assign(new Error('cancelled'), { name: 'RunCancelled' });
      }
      // Determine the right user-facing message based on error type
      const code = err.code || '';
      const isTimeout = code === 'AI_TIMEOUT' || err.message?.includes('timeout');
      const isQuota = code === 'QUOTA_EXCEEDED' || err.message?.includes('quota');

      let userMessage: string;
      let detailMessage: string;

      if (isTimeout) {
        userMessage = 'The AI server took too long to respond';
        detailMessage = 'Gemini AI did not respond after multiple attempts. The server may be overloaded. Try again later or use fewer/smaller images.';
        toast.error(userMessage, { duration: 6000, description: 'Retried 3 times with no response.' });
      } else if (isQuota) {
        userMessage = 'AI API quota exceeded';
        detailMessage = 'Your Gemini AI usage limit has been reached. Please try again later or check your billing plan.';
        toast.error(userMessage, { duration: 6000, description: 'API quota limit reached.' });
      } else if (err.message?.includes('empty response')) {
        userMessage = 'AI returned an empty response';
        detailMessage = 'Gemini could not generate the listing with the provided images. Try with fewer or smaller images.';
        toast.error(userMessage, { duration: 6000, description: 'Empty response from AI.' });
      } else {
        // Generic error — include the raw message for debugging
        userMessage = 'AI copy stage failed';
        detailMessage = err.message || describeCaughtError(err);
        toast.error(`${userMessage}: ${detailMessage}`, { duration: 6000 });
      }

      // Log losslessly: non-Error rejections (e.g. FileReader ProgressEvents)
      // used to stringify as an empty "{}", hiding the real failure cause.
      console.error('AI copy stage failed:', describeCaughtError(err), {
        code,
        message: err.message,
        status: err.status,
        error: err,
      });

      // Update Firestore with helpful status text
      await updateListing(user.uid, targetId, {
        status: 'idle',
        pipelineStepText: isTimeout
          ? 'Copy generation timed out — Gemini did not respond. Try again, or use fewer/smaller images.'
          : isQuota
            ? 'Copy generation failed — API quota exceeded. Try again later.'
            : `Copy generation failed — ${detailMessage}.`,
      }).catch(() => { });
    } finally {
      setIsRunningCopy(false);
    }
  };

  // Autopilot: the full chained pipeline with step-by-step status updates
  const runAutomatedAIPipeline = async (listing: ListingMetadata, templateIds?: string[], assignments?: Record<number, string>) => {
    if (!user) return;
    const targetId = listing.id;

    // A fresh run clears any stop left over from a previous one.
    cancelledRunsRef.current.delete(targetId);
    const checkpoint = () => {
      if (cancelledRunsRef.current.has(targetId)) throw new RunCancelled();
    };

    setIsRunningAutopilot(true);
    try {
      // Step 1: Scanning Assets
      await updateListing(user.uid, targetId, {
        status: 'scanning',
        pipelineStepText: 'Reading digital deliverable blueprints & structures...',
      });
      await new Promise(r => setTimeout(r, 1200));

      // Step 2: mockups on the local MockupGen server -- but only the ones that
      // do not exist yet.
      //
      // This used to render fresh on every run, on the reasoning that mockups
      // are part of what a run regenerates. That was reversed deliberately:
      // rendering is the slowest step by far, and a re-run after an
      // interruption, a copy retry or a tweak to the description was paying
      // for images that were already sitting there unchanged.
      //
      // "Already there" means the folder has mockups and they cover the
      // templates this run asked for. Ask for a template that has not been
      // rendered and the step runs; press Render in the studio and it always
      // runs, because that is an explicit instruction rather than a step in a
      // chain.
      checkpoint();
      const existingMockups = mockupResultsMap[listing.folderName] || [];
      const wantedTemplateIds = templateIds && templateIds.length > 0 ? templateIds : null;
      if (mockupsAlreadyCover(existingMockups, wantedTemplateIds)) {
        await updateListing(user.uid, targetId, {
          status: 'mockups',
          pipelineStepText: `Using the ${existingMockups.length} mockup${existingMockups.length === 1 ? '' : 's'} already rendered for this product...`,
        });
      } else {
        await updateListing(user.uid, targetId, {
          status: 'mockups',
          pipelineStepText: 'Rendering high-fidelity mockup frames on the MockupGen server...',
        });

        try {
          await renderMockupsForListing(listing.id, listing.folderName, templateIds, assignments);
        } catch (mockupErr: any) {
          // Mockup rendering is best-effort: keep the rest of the pipeline alive
          toast.warning('Mockup rendering failed: ' + (mockupErr.message || 'Unknown error'));
        }
      }

      checkpoint();
      // Step 3: Promotional thumbnail texts overlays
      await updateListing(user.uid, targetId, {
        status: 'thumbnail',
        pipelineStepText: 'Configuring Etsy 300DPI promotional cover layout badges...',
      });
      await new Promise(r => setTimeout(r, 1200));

      checkpoint();
      // Step 4: Zip Packing
      await updateListing(user.uid, targetId, {
        status: 'compiling',
        pipelineStepText: 'Assembling safe high-fidelity deliverable zip packs layers...',
      });
      await new Promise(r => setTimeout(r, 1200));

      checkpoint();
      // Step 5: SEO and copy generation with Gemini (manages its own statuses)
      await runCopyStage(listing.id, listing.folderName);
    } catch (err: any) {
      if (err?.name === 'RunCancelled' || err?.name === 'AbortError') {
        // stopRun already reset the row; nothing here should overwrite it.
        toast.info(`Run stopped for "${listing.folderName}".`);
        return;
      }
      toast.error('Pipeline failed: ' + (err.message || 'Unknown error'));
      await updateListing(user.uid, targetId, {
        status: 'idle',
        pipelineStepText: 'Failed during automation process. Reloading...',
      }).catch(() => { });
    } finally {
      cancelledRunsRef.current.delete(targetId);
      runAbortsRef.current.delete(targetId);
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
    // This session's choice first, then what was stored with the listing.
    // Read rather than trusted: the column defaults to an empty object, so a
    // product that has never been through the studio arrives as `{}` -- not as
    // undefined, which is what the optional chaining below assumed.
    const prefs = readStudioPrefs(studioPrefsMap[listing.id] ?? listing.studioPrefs);
    setSelectedTemplateIds(prefs.templateIds);
    setFrameAssignments(prefs.assignments);
    if (prefs.templateIds.length === 1) {
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

  // Remember the studio's template/frame choices for this listing so they
  // survive leaving and re-entering the Studio within the session
  const saveStudioPrefs = (templateIds: string[], assignments: Record<number, string>) => {
    if (!studioListingId) return;
    setStudioPrefsMap(prev => ({ ...prev, [studioListingId]: { templateIds, assignments } }));
    // ...and to the listing, so the choice survives a refresh. Not awaited:
    // picking a template should never wait on the network.
    if (user) {
      void updateListing(user.uid, studioListingId, {
        studioPrefs: { templateIds, assignments },
      }).catch(() => { });
    }
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
  // A template is "in pool" only if it already holds the EXACT image variation
  // the Add flow would create — same template with a different variation stays
  // selectable. Compared against the real (frame-trimmed) signature.
  const studioPoolSignatures = new Set(
    studioMockups.map(m => `${m.templateId}::${[...m.sourceFileNames].sort().join('|')}`)
  );
  const isTemplateInPool = (templateId: string) =>
    studioPoolSignatures.has(mockupSignatureForAdd(templateId, studioSessionFiles.images, studioTemplates));
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
      const targetId = activeProduct.id;
      try {
        await updateListing(user.uid, targetId, {
          [key]: value,
        });
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

    const targetId = item.id;
    try {
      await updateListing(user.uid, targetId, {
        status: 'publishing',
        pipelineStepText: 'Exporting digital listing data straight to Connected Etsy Shop...',
      });

      const formData = new FormData();
      // Only the demo path names a token; the real one is read on the server.
      if (etsyToken === 'DEMO_TOKEN') formData.append('token', etsyToken);
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
      await updateListing(user.uid, targetId, {
        status: 'published',
        listingId: result.listingId,
        listingUrl: result.url,
        pipelineStepText: 'Finished layout. Successfully listed!',
      });

      toast.success('Successfully uploaded files and published draft to Etsy!');
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error('Failed to publish to store: ' + (err.message || 'Unknown error'));
      await updateListing(user.uid, targetId, {
        status: 'ready',
        pipelineStepText: 'Published aborted. Review your draft metadata settings.',
      }).catch(() => { });
    }
  };

  // Delete Listing from cloud collection and local states
  const handleDeleteListingDraft = async (item: ListingMetadata) => {
    if (!user) return;
    const targetId = item.id;
    try {
      await deleteListing(user.uid, targetId);
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
      const targetId = item.id;
      try {
        await deleteListing(user.uid, targetId);
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
      <>
        <LandingPage
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          handleGoogleSignIn={handleGoogleSignIn}
          activeLabFilter={activeLabFilter}
          setActiveLabFilter={setActiveLabFilter}
        />
        {/* Signed-out branch returns early, so the sign-in dialog has to live
            here as well as at the bottom of the authenticated tree. */}
        <DevSignInDialog
          open={showDevSignIn}
          onClose={() => setShowDevSignIn(false)}
          onSubmit={handleDevSignIn}
        />
      </>
    );
  }

  // New Dashboard view for user's projects after login
  // Projects Hub (extracted component)
  if (currentView === 'projects') {
    return (
      <ProjectsHubView
        user={user}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        dbListings={dbListings}
        listingsCohort={listingsCohort}
        hubFilteredProjects={hubFilteredProjects}
        filterTab={filterTab}
        setFilterTab={setFilterTab}
        mockupResultsMap={mockupResultsMap}
        studioTemplateName={studioTemplateName}
        handleContinueProjectGroup={handleContinueProjectGroup}
        handleDeleteProjectGroup={handleDeleteProjectGroup}
        deleteRequest={deleteRequest}
        setDeleteRequest={setDeleteRequest}
        lightbox={lightbox}
        setLightbox={setLightbox}
        setCurrentView={setCurrentView}
        setSelectedMode={setSelectedMode}
        setSelectedProductType={setSelectedProductType}
        handleLogOut={handleLogOut}
      />
    );
  }

  // Personal account & settings page (extracted component)
  if (currentView === 'account' && user) {
    return (
      <AccountView
        user={user}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        accountPlan={accountPlan}
        savedTips={savedTips}
        handleToggleSavedTip={handleToggleSavedTip}
        etsyToken={etsyToken}
        handleDisconnectEtsy={handleDisconnectEtsy}
        mockupServerStatus={mockupServerStatus}
        studioAutopilot={studioAutopilot}
        toggleStudioAutopilot={toggleStudioAutopilot}
        studioFitMode={studioFitMode}
        changeStudioFitMode={changeStudioFitMode}
        setCurrentView={setCurrentView}
        handleLogOut={handleLogOut}
      />
    );
  }

  // Option 2: route selection (extracted component)
  if (!selectedMode && !etsyToken) {
    return (
      <RouteSelectView
        darkMode={darkMode}
        selectedMode={selectedMode}
        handleConnectEtsy={handleConnectEtsy}
        setSelectedMode={setSelectedMode}
        setCurrentView={setCurrentView}
        handleLogOut={handleLogOut}
      />
    );
  }

  // Option 3: product category selection (extracted component)
  if (selectedMode && !selectedProductType) {
    return (
      <CategorySelectView
        darkMode={darkMode}
        selectedMode={selectedMode}
        handleSelectProductType={handleSelectProductType}
        setSelectedProductType={setSelectedProductType}
        handleNavigateBackRoutes={handleNavigateBackRoutes}
        setCurrentView={setCurrentView}
        setSelectedMode={setSelectedMode}
        setStudioListingId={setStudioListingId}
        setActiveProject={setActiveProject}
      />
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
                onClick={() => setCurrentView('account')}
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
                title="Account & settings"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-[#ed6f5c]" /> Account
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
          <div className="mockup-studio-shell space-y-10">
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
                        onClick={() => {
                          // Pool non-empty + templates picked → ADD to the pool (cap-aware);
                          // otherwise fresh build / rebuild via the stage pipeline.
                          if (studioMockups.length > 0 && selectedTemplateIds.length > 0) {
                            handleAddMockups(activeStudioListing, selectedTemplateIds, selectedTemplateIds.length === 1 ? frameAssignments : undefined);
                          } else {
                            runMockupStage(activeStudioListing, selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined, selectedTemplateIds.length === 1 ? frameAssignments : undefined);
                          }
                        }}
                        disabled={studioBusy || studioSessionFiles.images.length === 0}
                        className="w-full bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-serif font-medium h-10 text-xs shadow-none rounded-full transition-colors cursor-pointer border-0"
                      >
                        {isRenderingMockups ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Rendering Mockups...</>
                        ) : studioMockups.length > 0 && selectedTemplateIds.length > 0 ? (
                          <><Camera className="w-3.5 h-3.5 mr-1.5" /> Add {selectedTemplateIds.length} Mockup{selectedTemplateIds.length === 1 ? '' : 's'}</>
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

                {/* Admin note: the server lacks enough suitable templates */}
                {activeStudioListing.mockupNote && (
                  <div className="p-3 rounded-xl border border-[#ed6f5c]/25 bg-[#ed6f5c]/5 text-[#5a5448] text-[10px] leading-relaxed relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ed6f5c]" />
                    <span className="font-mono font-bold text-[8.5px] uppercase tracking-wider text-[#ed6f5c] block mb-0.5 select-none">Template Shortage</span>
                    {activeStudioListing.mockupNote}
                  </div>
                )}

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
                          // Already rendered with this exact source set → can't add again.
                          // (Same template with DIFFERENT artwork stays allowed.)
                          const inPool = isTemplateInPool(template.template_id);
                          return (
                            <button
                              key={template.template_id}
                              type="button"
                              disabled={inPool}
                              onClick={() => { if (!inPool) toggleTemplateSelection(template.template_id); }}
                              className={`relative text-left rounded-lg overflow-hidden border transition-all group ${inPool
                                ? 'border-[rgba(21,20,15,0.14)] opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-[#ed6f5c] ring-1 ring-[#ed6f5c] cursor-pointer'
                                  : 'border-[rgba(21,20,15,0.14)] hover:border-[#ed6f5c]/45 cursor-pointer'}`}
                              title={inPool ? `${template.name} — already in this product's mockups` : template.name}
                            >
                              <div className="aspect-square bg-[#efe7d2] overflow-hidden flex items-center justify-center p-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={resolveMockupUrl(template.preview_url)} alt={template.name} loading="lazy" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.03]" />
                              </div>
                              <div className="px-2 py-1.5 bg-[#f7f1de]">
                                <span className="text-[9px] font-medium text-[#15140f] block truncate">{template.name}</span>
                                <span className="text-[8px] font-mono uppercase tracking-wider text-[#8b8676]">
                                  {template.orientation}
                                  {(template.frame_count ?? 1) > 1 && (
                                    <span className="text-[#ed6f5c] font-bold"> · {template.frame_count} frames</span>
                                  )}
                                </span>
                              </div>
                              {inPool ? (
                                <span className="absolute top-1.5 right-1.5 text-[7px] font-mono uppercase tracking-wider font-bold bg-[#6e7448] text-white px-1.5 py-0.5 rounded-full shadow-sm select-none">
                                  In pool
                                </span>
                              ) : isSelected ? (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#ed6f5c] text-white flex items-center justify-center shadow-sm">
                                  <Check className="w-3 h-3" />
                                </span>
                              ) : null}
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
              <DialogContent className="mockup-studio-shell !max-w-4xl p-0 overflow-hidden bg-[#f7f1de] border border-[rgba(21,20,15,0.16)] sm:rounded-[24px]">
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
          </div>
        ) : (
          <>

            {/* Workspace Redirect Alert */}
            {selectedMode === 'etsy' && (
              <Card className="bg-[#ece4cf]/30 dark:bg-[#22211b]/30 border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] shadow-none relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-[#ed6f5c] h-full" />
                <CardHeader className="py-4 px-6">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-[#8C6D4F] dark:text-[#ece4cf]">Active Redirect Endpoint for Etsy Developer Portal</CardTitle>
                  <CardDescription className="text-[#6B655B] dark:text-[#a39e8f] text-xs mt-1">
                    Confirm your callback settings matches this secure host:
                  </CardDescription>
                  <div className="pt-2">
                    <code className="bg-[#FAF8F5] dark:bg-[#12110c] text-[#191919] dark:text-[#f7f1de] px-3 py-1 border border-[#E5DEC9] dark:border-[rgba(247,241,222,0.14)] rounded font-mono text-[11px] inline-block shadow-none">
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
                <Card className="bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] rounded-[18px] shadow-none overflow-hidden">
                  <CardHeader className="pb-4 border-b border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.10)] bg-transparent dark:bg-[#201e18]/20 p-6 font-sans">
                    <div className="flex flex-row items-center justify-between gap-3 flex-nowrap">
                      <div className="min-w-0 shrink">
                        <CardTitle className="text-base font-serif font-medium text-[#15140f] dark:text-[#f7f1de] truncate">Active Session Listings</CardTitle>
                        <CardDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs mt-1 leading-relaxed font-sans truncate">
                          Products you activated in this session. The full archive lives in the Projects Hub.
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Status Tabs Category Selection */}
                        <div className="flex bg-[#ece4cf]/80 dark:bg-[#12110c] p-1 rounded-lg text-xs font-mono border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] overflow-x-auto uppercase tracking-wider">
                          <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'all' ? 'bg-[#f7f1de] dark:bg-[#1a1914] text-[#15140f] dark:text-[#f7f1de] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-none font-bold' : 'text-[#5a5448] dark:text-[#a39e8f] hover:text-[#15140f] dark:hover:text-[#f7f1de]'}`}
                          >
                            All ({sessionCohort.total})
                          </button>
                          <button
                            onClick={() => setFilterTab('pipeline')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${filterTab === 'pipeline' ? 'bg-[#f7f1de] dark:bg-[#1a1914] text-[#15140f] dark:text-[#f7f1de] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-none font-bold' : 'text-[#5a5448] dark:text-[#a39e8f] hover:text-[#15140f] dark:hover:text-[#f7f1de]'}`}
                          >
                            <Loader2 className={`w-3 h-3 ${sessionCohort.activePipeline > 0 ? "animate-spin text-[#ed6f5c]" : ""}`} />
                            Active ({sessionCohort.activePipeline + sessionCohort.unprocessedIdle})
                          </button>
                          <button
                            onClick={() => setFilterTab('ready')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'ready' ? 'bg-[#f7f1de] dark:bg-[#1a1914] text-[#15140f] dark:text-[#f7f1de] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-none font-bold' : 'text-[#5a5448] dark:text-[#a39e8f] hover:text-[#15140f] dark:hover:text-[#f7f1de]'}`}
                          >
                            Ready ({sessionCohort.readyDrafts})
                          </button>
                          <button
                            onClick={() => setFilterTab('published')}
                            className={`px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${filterTab === 'published' ? 'bg-[#f7f1de] dark:bg-[#1a1914] text-[#15140f] dark:text-[#f7f1de] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.12)] shadow-none font-bold' : 'text-[#5a5448] dark:text-[#a39e8f] hover:text-[#15140f] dark:hover:text-[#f7f1de]'}`}
                          >
                            Live ({sessionCohort.publishedHistory})
                          </button>
                        </div>

                        {/* Bulk compile — the primary action, rightmost */}
                        <Button
                          onClick={runAllIdleListings}
                          disabled={!!bulkProgress || isRunningAutopilot || sessionCohort.unprocessedIdle === 0}
                          className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0 text-xs h-9 flex items-center shadow-none font-serif font-medium px-5 rounded-full cursor-pointer transition-colors shrink-0"
                        >
                          {bulkProgress ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Compiling {bulkProgress.done}/{bulkProgress.total}...</>
                          ) : (
                            <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Compile All ({sessionCohort.unprocessedIdle})</>
                          )}
                        </Button>
                      </div>

                    </div>
                  </CardHeader>

                  <CardContent className="px-0 py-0">
                    {sessionFilteredListings.length === 0 ? (
                      <div className="text-center py-16 px-4 space-y-3">
                        <FileText className="w-10 h-10 text-[#8b8676] dark:text-[#807b6c] mx-auto opacity-60" />
                        <h3 className="text-[#15140f] dark:text-[#f7f1de] font-serif font-medium text-sm">No active listings in this session</h3>
                        <p className="text-[#5a5448] dark:text-[#a39e8f] text-xs max-w-xs mx-auto font-sans">
                          Stage products in the tray on the left, or continue an existing one from the Projects Hub.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.12)] bg-[#ece4cf]/30 dark:bg-[#1e1d17]/50 hover:bg-transparent">
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] dark:text-[#a39e8f] pl-6 h-10">Collection / Folder</TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] dark:text-[#a39e8f] h-10">Class</TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] dark:text-[#a39e8f] h-10">Task Level</TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] dark:text-[#a39e8f] h-10">Live Mockup Thumb</TableHead>
                            <TableHead className="text-right text-[10px] font-mono font-bold uppercase tracking-wider text-[#5a5448] dark:text-[#a39e8f] pr-6 h-10">Workflow Action</TableHead>
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
                              <TableRow key={listingItem.id} className="border-[rgba(21,20,15,0.12)] dark:border-[rgba(247,241,222,0.10)] bg-transparent hover:bg-[#ece4cf]/30 dark:hover:bg-[#22211b]/30 text-[#15140f] dark:text-[#f7f1de] transition-colors">

                                {/* Title of Listing / Folder name + source thumbnail */}
                                <TableCell className="pl-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-[rgba(21,20,15,0.14)] dark:border-[rgba(247,241,222,0.14)] bg-[#efe7d2] dark:bg-[#12110c] cursor-zoom-in"
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
                                          return <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-[#8b8676] dark:text-[#807b6c]" /></div>;
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
                                      <span className="font-serif font-medium text-[#15140f] dark:text-[#f7f1de] text-sm leading-tight block max-w-[180px] truncate" title={listingItem.folderName}>{listingItem.folderName}</span>
                                      <span className="text-[10px] text-[#5a5448] dark:text-[#a39e8f] font-mono mt-1 flex items-center gap-1.5 select-none" title="Linked files in browser memory">
                                        <FileCode className="w-3.5 h-3.5 text-[#8b8676] dark:text-[#807b6c]" /> {activeSessionCount}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Product Class */}
                                <TableCell className="align-middle">
                                  <span className="text-[#5a5448] dark:text-[#ece4cf] font-mono text-[10px] uppercase font-bold bg-[#efe7d2] dark:bg-[#22211b] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] px-2 py-0.5 rounded">
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
                              ${listingItem.status === 'idle' ? 'bg-[#efe7d2] dark:bg-[#22211b] border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] text-[#5a5448] dark:text-[#a39e8f]' :
                                        isInProgressPipeline ? 'bg-[#efe7d2] dark:bg-[#12110c] border-[#ed6f5c]/40 text-[#ed6f5c]' :
                                          listingItem.status === 'ready' ? 'bg-[#ed6f5c]/10 border-[#ed6f5c]/30 text-[#ed6f5c] font-bold' :
                                            'bg-[#6e7448]/10 border-[#6e7448]/30 text-[#6e7448] dark:text-[#9ea671]'
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
                                      <span className="block text-[10px] text-[#5a5448]/80 dark:text-[#a39e8f]/90 mt-1 leading-tight font-medium max-w-[200px] truncate" title={listingItem.pipelineStepText}>
                                        {listingItem.pipelineStepText}
                                      </span>
                                    )}
                                    {listingItem.mockupNote && (
                                      <span className="block text-[9px] text-[#ed6f5c] mt-1 leading-tight font-bold max-w-[200px] truncate" title={listingItem.mockupNote}>
                                        {"⚠ "}{listingItem.mockupNote}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Inline visual representation thumbnail mock indicator */}
                                <TableCell className="align-middle">
                                  {(listingItem.mockupImage || (mockupResultsMap[listingItem.folderName] || []).length > 0) ? (
                                    <button
                                      type="button"
                                      onClick={() => setMockupViewerListing(listingItem)}
                                      className="relative w-12 h-12 border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] rounded overflow-hidden shadow-none bg-[#efe7d2] dark:bg-[#12110c] group cursor-zoom-in"
                                      title="View all generated mockups"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={(mockupResultsMap[listingItem.folderName] || [])[0]?.url || listingItem.mockupImage}
                                        alt="mockup thumb"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      />
                                      {(mockupResultsMap[listingItem.folderName] || []).length > 1 && (
                                        <span className="absolute bottom-0 right-0 bg-[#ed6f5c] text-white text-[8px] font-mono font-bold px-1 rounded-tl select-none">
                                          {(mockupResultsMap[listingItem.folderName] || []).length}
                                        </span>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-[#8b8676] dark:text-[#807b6c] font-mono text-[9px] select-none tracking-tight uppercase font-medium">Pending</span>
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
                                          className="text-[#8b8676] dark:text-[#807b6c] hover:text-[#ed6f5c] dark:hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
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
                                      <>
                                        <Button size="sm" disabled variant="outline" className="border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] bg-[#ece4cf]/30 dark:bg-[#22211b]/40 text-[#5a5448] dark:text-[#a39e8f] text-xs max-h-8 rounded-lg select-none">
                                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-[#ed6f5c]" />
                                          <span>Running AI...</span>
                                        </Button>
                                        {/* Escape hatch: a run whose tab died leaves the row stuck here
                                            until the staleness sweep catches it. This releases it now. */}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={async () => {
                                            try {
                                              await stopRun(listingItem.id);
                                              toast.success('Run stopped — you can start it again.');
                                            } catch {
                                              toast.error('Could not stop the run.');
                                            }
                                          }}
                                          className="text-[#8b8676] dark:text-[#807b6c] hover:text-[#ed6f5c] dark:hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
                                          title="Stop this run and make the listing runnable again"
                                        >
                                          <Square className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}

                                    {['ready', 'published'].includes(listingItem.status) && (
                                      <>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => openStudio(listingItem)}
                                          className="text-[#8b8676] dark:text-[#807b6c] hover:text-[#ed6f5c] dark:hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
                                          title="Open in Mockup Studio"
                                        >
                                          <Camera className="w-4 h-4" />
                                        </Button>
                                        {/* Re-run. A finished listing had no way back into the
                                            pipeline, so a bad AI result meant discarding it.
                                            Re-runs the full pipeline, mockups included. Publishing
                                            is irreversible on Etsy's side, so a published row asks
                                            first. */}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          disabled={!!bulkProgress || isRunningAutopilot || !localFilesMap[listingItem.folderName]?.images.length}
                                          onClick={() => {
                                            if (listingItem.status === 'published') {
                                              setDeleteRequest({
                                                eyebrow: 'Confirm Re-run',
                                                title: 'Re-run this published listing?',
                                                description: `"${listingItem.folderName}" is already live on Etsy. Re-running regenerates its title, description, tags and price locally. The live listing is not touched until you publish again.`,
                                                confirmLabel: 'Yes, Re-run',
                                                action: () => runAutomatedAIPipeline(listingItem)
                                              });
                                            } else {
                                              runAutomatedAIPipeline(listingItem);
                                            }
                                          }}
                                          className="text-[#8b8676] dark:text-[#807b6c] hover:text-[#ed6f5c] dark:hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors disabled:opacity-40"
                                          title={localFilesMap[listingItem.folderName]?.images.length
                                            ? 'Re-run the whole pipeline, including fresh mockups'
                                            : 'Source files are no longer in this browser session — re-stage them to run again'}
                                        >
                                          <RotateCcw className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => openPreviewPanel(listingItem)}
                                          className={`text-xs max-h-8 font-serif font-medium rounded-full cursor-pointer transition-colors ${listingItem.status === 'published' ? 'border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.16)] text-[#5a5448] dark:text-[#ece4cf] hover:bg-[#ece4cf] dark:hover:bg-[#22211b] bg-transparent' : 'bg-[#ed6f5c] hover:bg-[#e25e4a] text-white border-0'}`}
                                          variant="default"
                                        >
                                          {listingItem.status === 'published' ? <Eye className="w-3.5 h-3.5 mr-1 text-[#8b8676] dark:text-[#a39e8f]" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-white" />}
                                          <span>{listingItem.status === 'published' ? 'Review Listed' : 'Open Draft'}</span>
                                        </Button>
                                      </>
                                    )}

                                    {/* Discard / Delete element */}
                                    {!isInProgressPipeline && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setDeleteRequest({
                                          title: 'Discard this listing?',
                                          description: `"${listingItem.folderName}" will be permanently removed, including its saved draft, cover and browser assets. This cannot be undone.`,
                                          action: () => handleDeleteListingDraft(listingItem)
                                        })}
                                        className="text-[#8b8676] dark:text-[#807b6c] hover:text-[#ed6f5c] dark:hover:text-[#ed6f5c] hover:bg-transparent max-h-8 max-w-8 cursor-pointer transition-colors"
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
          <div className="w-[280px] rounded-xl overflow-hidden border border-[rgba(21,20,15,0.2)] dark:border-[rgba(247,241,222,0.18)] bg-[#f7f1de] dark:bg-[#1a1914] shadow-lg p-1.5">
            {hoverThumb.urls.length === 1 ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={hoverThumb.urls[0]} alt={hoverThumb.label} className="w-full h-auto max-h-[300px] object-contain rounded-lg bg-[#efe7d2] dark:bg-[#12110c]" />
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {hoverThumb.urls.slice(0, 4).map((url, idx) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={idx} src={url} alt="" className="w-full aspect-square object-cover rounded-md bg-[#efe7d2] dark:bg-[#12110c]" />
                ))}
              </div>
            )}
            <span className="block text-[9px] font-mono text-[#5a5448] dark:text-[#a39e8f] px-1 pt-1.5 truncate select-none">{hoverThumb.label}</span>
          </div>
        </div>
      )}

      {/* Review Dialog (extracted component) */}
      <ListingReviewDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        setIsGalleryInspectorOpen={setIsGalleryInspectorOpen}
        setSourcePreviewImages={setSourcePreviewImages}
        setSelectedPreviewIndex={setSelectedPreviewIndex}
        activeProduct={activeProduct}
        sourcePreviewImages={sourcePreviewImages}
        selectedPreview={selectedPreview}
        setLightbox={setLightbox}
        handleCopyText={handleCopyText}
        handleUpdateActiveProduct={handleUpdateActiveProduct}
        descTab={descTab}
        setDescTab={setDescTab}
        isPackingZip={isPackingZip}
        handleDownloadZipPackage={handleDownloadZipPackage}
        publishToEtsySnapshot={publishToEtsySnapshot}
        selectedMode={selectedMode}
      />

      {/* Mockup viewer — all renders for one listing (extracted component) */}
      <MockupViewerDialog
        listing={mockupViewerListing ? (dbListings.find(l => l.id === mockupViewerListing.id) || mockupViewerListing) : null}
        mockups={mockupViewerListing ? (mockupResultsMap[mockupViewerListing.folderName] || []) : []}
        isRendering={isRenderingMockups}
        templateName={studioTemplateName}
        savedTips={savedTips}
        onToggleSaveTip={handleToggleSavedTip}
        onClose={() => setMockupViewerListing(null)}
        onOpenStudio={(target) => { setMockupViewerListing(null); openStudio(target); }}
        onOpenLightbox={setLightbox}
      />

      {/* Listing photo inspector (extracted component) */}
      <GalleryInspectorDialog
        open={isGalleryInspectorOpen}
        title={activeProduct?.folderName || 'Listing photos'}
        photos={sourcePreviewImages}
        savedTips={savedTips}
        onToggleSaveTip={handleToggleSavedTip}
        onOpenChange={setIsGalleryInspectorOpen}
        onOpenLightbox={setLightbox}
      />

      {/* Fullscreen photo lightbox (shared component) */}
      <PhotoLightbox lightbox={lightbox} setLightbox={setLightbox} />

      {/* Destructive action confirmation */}
      <DeleteConfirmDialog request={deleteRequest} onClose={() => setDeleteRequest(null)} />

      <DevSignInDialog
        open={showDevSignIn}
        onClose={() => setShowDevSignIn(false)}
        onSubmit={handleDevSignIn}
      />

    </div>
  );
}

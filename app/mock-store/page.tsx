'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  ArrowLeft, 
  RefreshCw, 
  Trash2, 
  Tag, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  Heart,
  ShoppingBag,
  ShoppingCart,
  Search,
  Star,
  Flame,
  ShieldCheck,
  Download,
  Share2,
  Check,
  SlidersHorizontal,
  Play,
  Flag,
  CreditCard,
  HelpCircle,
  Award,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

interface MockListing {
  id: string;
  timestamp: number;
  dateFormatted: string;
  title: string;
  price: string;
  quantity: string;
  state: string;
  taxonomyId: string;
  whoMade: string;
  whenMade: string;
  isSupply: boolean;
  description: string;
  tags: string[];
  images: { filename: string; url: string }[];
  files: { filename: string }[];
  imagesCount: number;
  filesCount: number;
  url: string;
}

interface RawRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: number;
  dateFormatted: string;
}

export default function MockStorePage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [wiremockUrl, setWiremockUrl] = useState('http://127.0.0.1:8080');
  const [listings, setListings] = useState<MockListing[]>([]);
  const [rawRequests, setRawRequests] = useState<RawRequest[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [selectedListingIndex, setSelectedListingIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'product' | 'storefront' | 'requests'>('product');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Accordion states for the right sidebar
  const [openSections, setOpenSections] = useState({
    itemDetails: true,
    delivery: true,
    didYouKnow: true,
    faqs: false,
    meetSeller: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchStoreData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/mock-store');
      const data = await res.json();
      setConnected(data.connected);
      if (data.wiremockUrl) setWiremockUrl(data.wiremockUrl);
      setListings(data.listings || []);
      setRawRequests(data.rawRequests || []);
      setTotalRequests(data.totalRequests || 0);

      if (!data.connected && showLoading) {
        toast.error('WireMock אינו זמין בפורט 8080. ודא ש-start.bat פועל');
      }
    } catch (err: any) {
      setConnected(false);
      if (showLoading) toast.error('שגיאה בחיבור ל-WireMock: ' + err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const res = await fetch('/api/mock-store');
        const data = await res.json();
        if (!isMounted) return;
        setConnected(data.connected);
        if (data.wiremockUrl) setWiremockUrl(data.wiremockUrl);
        setListings(data.listings || []);
        setRawRequests(data.rawRequests || []);
        setTotalRequests(data.totalRequests || 0);
      } catch {
        if (isMounted) setConnected(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitial();

    const interval = setInterval(() => {
      loadInitial();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleReset = async () => {
    if (!confirm('האם אתה בטוח שברצונך לאפס את נתוני החנות ולמחוק את כל הליסטינגס שנשמרו ב-WireMock?')) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/mock-store', { method: 'DELETE' });
      if (res.ok) {
        toast.success('חנות הדמי אופסה בהצלחה!');
        await fetchStoreData(false);
      } else {
        toast.error('שגיאה באיפוס נתוני החנות');
      }
    } catch (err: any) {
      toast.error('שגיאה: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(text);
    toast.success(`${label} הועתק ללוח!`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const activeListing = listings[selectedListingIndex] || listings[0];
  const images = activeListing?.images || [];
  const currentImage = images[selectedImageIndex] || images[0];

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans antialiased selection:bg-[#F1641E]/20" dir="ltr">
      
      {/* 1. TOP SIMULATOR CONTROL BAR */}
      <div className="bg-[#1E1E24] text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">Back to EtsyAutoLister</span>
          </Link>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#F1641E] text-white">
              SIMULATOR
            </span>
            <span className="font-semibold text-gray-200 hidden md:inline">
              Etsy Live Simulation (WireMock Local)
            </span>
            <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Status: DRAFT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-black/30 p-0.5 rounded-lg border border-white/10 text-[11px]">
            <button
              onClick={() => setViewMode('product')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'product' ? 'bg-white text-black font-bold shadow-xs' : 'text-gray-300 hover:text-white'
              }`}
            >
              Product Page
            </button>
            <button
              onClick={() => setViewMode('storefront')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'storefront' ? 'bg-white text-black font-bold shadow-xs' : 'text-gray-300 hover:text-white'
              }`}
            >
              Shop Grid ({listings.length})
            </button>
            <button
              onClick={() => setViewMode('requests')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'requests' ? 'bg-white text-black font-bold shadow-xs' : 'text-gray-300 hover:text-white'
              }`}
            >
              API Journal ({totalRequests})
            </button>
          </div>

          {/* Status badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${
              connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="hidden lg:inline">{connected ? 'Port 8080 Live' : 'Disconnected'}</span>
          </div>

          <button
            onClick={() => fetchStoreData(false)}
            disabled={loading}
            className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh from WireMock"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F1641E]' : ''}`} />
          </button>

          <button
            onClick={handleReset}
            disabled={resetting || listings.length === 0}
            className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-600/30 transition-colors disabled:opacity-30"
            title="Reset Mock Store"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. AUTHENTIC ETSY NAVBAR (EXACTLY MATCHING ETSY SCREENSHOT) */}
      <header className="bg-white border-b border-[#E1E1E1] sticky top-8 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Main search & logo line */}
          <div className="flex items-center justify-between h-17 gap-3 sm:gap-6">
            
            {/* Etsy Logo */}
            <div className="flex items-center gap-4 shrink-0">
              <Link href="/mock-store" className="text-[#F1641E] font-serif text-3xl sm:text-4xl font-black tracking-tighter hover:opacity-95 transition-opacity">
                Etsy
              </Link>
              <button className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#222222] hover:bg-gray-100 px-3 py-2 rounded-full transition-colors">
                <span className="text-base">☰</span>
                <span>Categories</span>
              </button>
            </div>

            {/* Pill Search Bar with orange round search button on the right */}
            <div className="flex-1 max-w-3xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search for anything"
                  defaultValue={activeListing?.tags?.[0] || 'moody botanical art prints'}
                  className="w-full bg-white hover:border-[#888888] focus:border-[#222222] border border-[#222222] rounded-full py-2.5 pl-5 pr-13 text-sm text-[#222222] placeholder-gray-500 transition-all outline-none"
                />
                <button className="absolute right-1.5 bg-[#F1641E] hover:bg-[#D8520F] text-white p-2 rounded-full transition-colors flex items-center justify-center shadow-xs">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right icons (Heart, Bell, Shop icon, Avatar, Cart) */}
            <div className="flex items-center gap-3 sm:gap-4 text-[#222222] shrink-0">
              <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors" title="Favorites">
                <Heart className="w-5 h-5 text-[#222222]" />
              </div>
              <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors relative" title="Updates">
                <span className="w-2 h-2 bg-[#F1641E] rounded-full absolute top-2 right-2 border-2 border-white" />
                <span className="text-lg">🔔</span>
              </div>
              <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors hidden sm:block" title="Shop Manager">
                <Store className="w-5 h-5 text-[#222222]" />
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  EB
                </div>
                <ChevronDown className="w-3 h-3 text-gray-600" />
              </div>
              <div className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors relative" title="Basket">
                <ShoppingBag className="w-5 h-5 text-[#222222]" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#F1641E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  1
                </span>
              </div>
            </div>
          </div>

          {/* Subheader category pills strip from screenshot */}
          <nav className="hidden md:flex items-center justify-center gap-6 text-xs text-[#595959] py-2.5 border-t border-[#F1EFEA] font-medium">
            <span className="hover:text-black cursor-pointer flex items-center gap-1">
              <span>🎁</span> Gifts
            </span>
            <span className="hover:text-black cursor-pointer flex items-center gap-1">
              <span>📍</span> Shop Local
            </span>
            <span className="hover:text-black cursor-pointer">Sellers to Watch</span>
            <span className="hover:text-black cursor-pointer">Home Favorites</span>
            <span className="hover:text-black cursor-pointer">Fashion Finds</span>
            <span className="hover:text-black cursor-pointer">Vintage</span>
            <span className="hover:text-black cursor-pointer">Registry</span>
          </nav>
        </div>
      </header>

      {/* 3. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* NO LISTINGS EMPTY STATE */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E1DBCB] p-12 text-center max-w-2xl mx-auto my-12 shadow-sm">
            <div className="w-20 h-20 bg-amber-50 text-[#F1641E] rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-200 shadow-inner">
              <Store className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-[#222222] mb-2">No Listings in Mock Store Yet</h3>
            <p className="text-sm text-[#595959] leading-relaxed mb-6">
              You haven&apos;t uploaded any listings to WireMock yet. Open EtsyAutoLister, prepare your artwork and mockups, and click <strong>Publish Draft</strong>.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#222222] hover:bg-black text-white px-6 py-3 rounded-full font-medium text-sm transition-all shadow-md hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to EtsyAutoLister & Publish</span>
            </Link>
          </div>
        ) : viewMode === 'product' && activeListing ? (
          
          /* ========================================================== */
          /* 3A. AUTHENTIC ETSY PRODUCT LISTING VIEW                    */
          /* ========================================================== */
          <div>
            {/* Breadcrumbs (Centered as seen in screenshot) */}
            <div className="flex items-center justify-center text-xs text-[#595959] mb-6 gap-1.5 font-sans">
              <span className="text-amber-800 font-bold">|</span>
              <span className="hover:underline cursor-pointer">Homepage</span>
              <span>›</span>
              <span className="hover:underline cursor-pointer">Art & Collectibles</span>
              <span>›</span>
              <span className="hover:underline cursor-pointer">Prints</span>
              <span>›</span>
              <span className="hover:underline cursor-pointer font-medium text-[#222222]">Digital Prints</span>
            </div>

            {/* TWO COLUMN ETSY GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              
              {/* ======================================================== */}
              {/* LEFT COLUMN: 7 COLUMNS - GALLERY & REVIEWS (UNDER GALLERY)*/}
              {/* ======================================================== */}
              <div className="lg:col-span-7 space-y-10">
                
                {/* Image Showcase */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 items-start">
                  
                  {/* Vertical Thumbnails list on far left (matching screenshot) */}
                  <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[640px] pb-2 sm:pb-0 shrink-0 w-full sm:w-16">
                    {/* Simulated video thumbnail if images exist */}
                    <button
                      onClick={() => setSelectedImageIndex(0)}
                      className={`w-14 h-14 sm:w-15 sm:h-15 rounded-lg overflow-hidden border transition-all bg-gray-100 shrink-0 relative flex items-center justify-center group ${
                        selectedImageIndex === -1 ? 'border-2 border-black' : 'border-[#E1E1E1] hover:border-gray-500'
                      }`}
                      title="Product Video"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-gray-700">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </button>

                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-14 h-14 sm:w-15 sm:h-15 rounded-lg overflow-hidden border transition-all bg-[#F9F9F9] shrink-0 relative ${
                          selectedImageIndex === idx
                            ? 'border-2 border-black shadow-xs'
                            : 'border-[#E1E1E1] hover:border-gray-500 opacity-90 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={`Mockup preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Main Large Image Container */}
                  <div className="flex-1 w-full bg-[#F5F2EC] rounded-2xl overflow-hidden relative shadow-xs min-h-[460px] sm:min-h-[580px] flex items-center justify-center group border border-[#E2DCC8]">
                    
                    {/* Etsy's Pick badge (top left) */}
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-[#FDE047] text-[#1F2937] text-xs font-bold px-3 py-1.5 rounded-r-full rounded-l-md shadow-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 fill-current text-amber-800" />
                        <span>Etsy&apos;s Pick</span>
                      </div>
                    </div>

                    {/* Circular Favorite Heart Button (top right, matching screenshot) */}
                    <button
                      onClick={() => setIsFavorited(!isFavorited)}
                      className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md flex items-center justify-center transition-transform hover:scale-105"
                      title="Add to collection"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          isFavorited ? 'fill-[#E11D48] text-[#E11D48]' : 'text-gray-700 hover:text-black'
                        }`}
                      />
                    </button>

                    {/* Main Image */}
                    {currentImage?.url ? (
                      <img
                        src={currentImage.url}
                        alt={activeListing.title}
                        className="w-full h-full object-contain max-h-[640px]"
                      />
                    ) : (
                      <div className="text-center p-8 text-gray-400">
                        <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Mockup preview will appear here</p>
                      </div>
                    )}

                    {/* Next / Previous circular floating buttons on left & right */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center transition-all hover:bg-gray-50 border border-gray-100"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-800" />
                        </button>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center transition-all hover:bg-gray-50 border border-gray-100"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-800" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Report link under main image (matching screenshot) */}
                <div className="flex justify-end pt-1">
                  <button className="text-xs text-[#595959] hover:text-black flex items-center gap-1 font-medium">
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report this item to Etsy</span>
                  </button>
                </div>

                {/* ======================================================== */}
                {/* REVIEWS FOR THIS ITEM (EXACTLY UNDER THE GALLERY!)       */}
                {/* ======================================================== */}
                <div className="border-t border-[#E1E1E1] pt-8 space-y-6">
                  
                  <h2 className="text-xl font-bold text-[#222222]">
                    Reviews for this item
                  </h2>

                  {/* What buyers say, summarized by AI box */}
                  <div className="bg-[#F7F7F7] p-4 rounded-xl text-xs space-y-2 border border-[#EBEBEB]">
                    <div className="font-bold text-[#222222]">
                      What buyers say, summarized by AI:
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-gray-700 font-medium">
                      <span>✓ Looks great</span>
                      <span>✓ Love it</span>
                      <span>✓ Great quality</span>
                      <span>✓ Easy and quick download</span>
                      <span>✓ As described</span>
                      <span>✓ Helpful seller</span>
                      <span>✓ Great design</span>
                    </div>
                  </div>

                  {/* Rating Breakdown Circles (Matching screenshot) */}
                  <div className="flex flex-wrap items-center gap-6 pt-2 pb-4">
                    {/* Overall score */}
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-[#222222]">5.0</span>
                      <div>
                        <div className="flex text-amber-500 text-sm">
                          {'★★★★★'}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium">
                          Item average (107 reviews)
                        </div>
                      </div>
                    </div>

                    <div className="h-10 w-px bg-gray-200 hidden sm:block" />

                    {/* Quality Circle */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-500 flex items-center justify-center font-bold text-xs text-[#222222]">
                        5.0
                      </div>
                      <span className="text-xs text-gray-600">Item quality</span>
                    </div>

                    {/* Shipping Circle */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-500 flex items-center justify-center font-bold text-xs text-[#222222]">
                        4.9
                      </div>
                      <span className="text-xs text-gray-600">Shipping</span>
                    </div>

                    {/* Customer Service Circle */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-500 flex items-center justify-center font-bold text-xs text-[#222222]">
                        5.0
                      </div>
                      <span className="text-xs text-gray-600">Customer service</span>
                    </div>

                    {/* Recommend Circle */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-500 flex items-center justify-center font-bold text-[11px] text-[#222222]">
                        100%
                      </div>
                      <span className="text-xs text-gray-600">Buyers recommend</span>
                    </div>
                  </div>

                  {/* Review Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
                    <button className="px-3.5 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#222222] font-semibold shrink-0">
                      Suggested ▾
                    </button>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F5F5F5] hover:bg-gray-200 text-gray-700 shrink-0">
                      Appearance (47)
                    </button>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F5F5F5] hover:bg-gray-200 text-gray-700 shrink-0">
                      Quality (20)
                    </button>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F5F5F5] hover:bg-gray-200 text-gray-700 shrink-0">
                      Ease of use (14)
                    </button>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F5F5F5] hover:bg-gray-200 text-gray-700 shrink-0">
                      Description accuracy (10)
                    </button>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#F5F5F5] hover:bg-gray-200 text-gray-700 shrink-0">
                      Seller service (4) ›
                    </button>
                  </div>

                  {/* Individual Buyer Reviews (Matching screenshot) */}
                  <div className="space-y-6 pt-2 divide-y divide-gray-100">
                    
                    {/* Review 1 */}
                    <div className="pt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-500 text-xs">{'★★★★★'}</div>
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            This item
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
                          <span className="font-semibold text-gray-700">Shirley</span>
                          <span>May 31, 2026</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">
                        loved Andrea&apos;s quick response to my question
                      </p>
                    </div>

                    {/* Review 2 */}
                    <div className="pt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-500 text-xs">{'★★★★★'}</div>
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            This item
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                          <span className="font-semibold text-gray-700">Rose</span>
                          <span>Sep 22, 2025</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">
                        Great print for my daughter&apos;s room!
                      </p>
                    </div>

                    {/* Review 3 */}
                    <div className="pt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-500 text-xs">{'★★★★★'}</div>
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            This item
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                          <span className="font-semibold text-gray-700">Kayla</span>
                          <span>Aug 24, 2025</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">
                        Great print paired alongside others from this seller.
                      </p>
                    </div>

                    {/* Review 4 */}
                    <div className="pt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-500 text-xs">{'★★★★★'}</div>
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            This item
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
                          <span className="font-semibold text-gray-700">Susan</span>
                          <span>Jul 31, 2025</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">
                        These look great - love them!
                      </p>
                    </div>
                  </div>

                  {/* View all reviews button */}
                  <div className="pt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500 underline cursor-pointer">
                      Why these reviews? ⓘ
                    </span>
                    <button className="px-5 py-2.5 rounded-full border border-black hover:bg-gray-50 text-xs font-semibold text-black transition-colors">
                      View all reviews for this item
                    </button>
                  </div>

                  {/* Photos from reviews carousel snippet */}
                  <div className="pt-6">
                    <h3 className="text-sm font-bold text-[#222222] mb-3">
                      Photos from reviews
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {images.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                          <img src={img.url} alt={`Buyer photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* 13 SEO TAGS (EXPLORE RELATED SEARCHES AT BOTTOM OF LEFT COLUMN) */}
                <div className="border-t border-[#E1E1E1] pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-[#222222] flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#F1641E]" />
                        <span>Explore related searches (13 SEO Tags)</span>
                      </h3>
                      <p className="text-xs text-gray-500">Keywords uploaded to Etsy search engine</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(activeListing.tags.join(', '), 'All 13 Tags')}
                      className="text-xs font-semibold text-[#F1641E] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy all</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeListing.tags.map((tag, tIdx) => (
                      <button
                        key={tIdx}
                        onClick={() => copyToClipboard(tag, `Tag "${tag}"`)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#F5F5F5] hover:bg-gray-200 text-[#222222] border border-gray-200 hover:border-black transition-colors flex items-center gap-1.5"
                      >
                        <span>{tag}</span>
                        {copiedTag === tag ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* ======================================================== */}
              {/* RIGHT COLUMN: 5 COLUMNS - BUY BOX & ACCORDIONS           */}
              {/* ======================================================== */}
              <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
                
                {/* 1. Urgency indicator ("In 5 carts" in red) */}
                <div className="text-xs font-bold text-[#A61A24]">
                  In 5 carts
                </div>

                {/* 2. Price section */}
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl sm:text-3xl font-bold text-[#222222]">
                      Now ₪{(parseFloat(activeListing.price) * 3.7).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      ₪{(parseFloat(activeListing.price) * 7.4).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#166534] mt-0.5">
                    50% off • Sale ends in 3 days
                  </div>
                </div>

                {/* 3. Product Title */}
                <h1 className="text-base sm:text-[17px] font-normal text-[#222222] leading-snug">
                  {activeListing.title}
                </h1>

                {/* 4. Shop name & stars */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-[#222222] hover:underline cursor-pointer">
                    BaronArtPrintStudio
                  </span>
                  <span className="w-3 h-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold">
                    ✦
                  </span>
                  <div className="flex text-amber-500 text-xs">
                    {'★★★★★'}
                  </div>
                </div>

                {/* 5. Primary Action Buttons (Matching screenshot) */}
                <div className="space-y-2.5 pt-2">
                  {/* Buy it now button (White pill with black border) */}
                  <button
                    onClick={() => toast.info('Simulated Buy It Now on Mock Store')}
                    className="w-full bg-white hover:bg-gray-50 text-[#222222] font-semibold text-sm py-3 px-6 rounded-full border border-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Buy it now |</span>
                    <CreditCard className="w-4 h-4 text-rose-600" />
                    <span className="font-mono text-xs text-gray-600">...8511</span>
                  </button>

                  {/* Add to cart button (Solid dark charcoal rounded pill) */}
                  <button
                    onClick={() => toast.success('Added to simulated cart!')}
                    className="w-full bg-[#222222] hover:bg-black text-white font-bold text-sm py-3.5 px-6 rounded-full transition-all shadow-sm cursor-pointer"
                  >
                    Add to cart
                  </button>

                  {/* Add to collection button */}
                  <div className="flex justify-center pt-1">
                    <button
                      onClick={() => setIsFavorited(!isFavorited)}
                      className="text-xs font-semibold text-[#222222] hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#E11D48] fill-[#E11D48]" />
                      <span>Add to collection</span>
                    </button>
                  </div>
                </div>

                {/* 6. Star Seller Banner (Matching screenshot) */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#E1E1E1] flex items-start gap-3 text-xs leading-relaxed text-[#222222]">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <strong>Star Seller.</strong> This seller consistently earned 5-star reviews, shipped on time, and replied quickly to any messages they received.
                  </div>
                </div>

                {/* ======================================================== */}
                {/* 7. ACCORDIONS SECTION (WHERE DESCRIPTION BELONGS!)       */}
                {/* ======================================================== */}
                <div className="border-t border-[#E1E1E1] divide-y divide-[#E1E1E1]">
                  
                  {/* ACCORDION 1: ITEM DETAILS (OPEN BY DEFAULT) */}
                  <div className="py-4">
                    <button
                      onClick={() => toggleSection('itemDetails')}
                      className="w-full flex items-center justify-between text-sm font-bold text-[#222222] text-left"
                    >
                      <span>Item details</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.itemDetails ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.itemDetails && (
                      <div className="pt-4 space-y-4 text-xs text-[#222222]">
                        
                        {/* Highlights (Designed by, Digital download, File types) */}
                        <div className="space-y-2">
                          <div className="font-bold text-[#222222]">Highlights</div>
                          <div className="space-y-1.5 text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">🎨</span>
                              <span>Designed by <strong>BaronArtPrintStudio</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Download className="w-3.5 h-3.5 text-gray-500" />
                              <span>Digital download</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-gray-500" />
                              <span>Digital file type(s): {activeListing.filesCount || 6} JPG, PDF, ZIP</span>
                            </div>
                          </div>
                        </div>

                        {/* Deliverable files summary */}
                        {activeListing.files.length > 0 && (
                          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-900 space-y-1.5">
                            <div className="font-bold text-[11px] flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span>Attached Files ({activeListing.files.length})</span>
                            </div>
                            <div className="font-mono text-[10px] space-y-0.5 text-purple-800">
                              {activeListing.files.map((f, i) => (
                                <div key={i} className="truncate">• {f.filename}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* DESCRIPTION TEXT (EXACTLY AS IN SCREENSHOT) */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className={`text-xs text-gray-700 leading-relaxed whitespace-pre-line ${isDescExpanded ? '' : 'line-clamp-6'}`}>
                            {activeListing.description}
                          </div>

                          <button
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="mt-3 text-xs font-bold text-[#222222] hover:underline block text-center w-full py-1 bg-gray-50 rounded-lg"
                          >
                            {isDescExpanded ? 'Show less' : 'Learn more about this item'}
                          </button>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* ACCORDION 2: DELIVERY (INSTANT DOWNLOAD) */}
                  <div className="py-4">
                    <button
                      onClick={() => toggleSection('delivery')}
                      className="w-full flex items-center justify-between text-sm font-bold text-[#222222] text-left"
                    >
                      <span>Delivery</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.delivery ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.delivery && (
                      <div className="pt-3 space-y-2.5 text-xs text-gray-700 leading-relaxed">
                        <div className="font-bold text-black text-sm">Instant Download</div>
                        <p>
                          Your files will be available to download once payment is confirmed.{' '}
                          <span className="underline cursor-pointer font-medium text-black">Here&apos;s how.</span>
                        </p>
                        <p className="text-gray-500 text-[11px]">
                          Instant download items don&apos;t accept returns, exchanges or cancellations. Please contact the seller about any problems with your order.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ACCORDION 3: DID YOU KNOW? (PURCHASE PROTECTION) */}
                  <div className="py-4">
                    <button
                      onClick={() => toggleSection('didYouKnow')}
                      className="w-full flex items-center justify-between text-sm font-bold text-[#222222] text-left"
                    >
                      <span>Did you know?</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.didYouKnow ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.didYouKnow && (
                      <div className="pt-3 space-y-3 text-xs text-gray-700">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <strong className="text-black block mb-0.5">Etsy Purchase Protection</strong>
                            Shop confidently on Etsy knowing if something goes wrong with an order, we&apos;ve got your back for all eligible purchases —{' '}
                            <span className="underline cursor-pointer">see program terms</span>
                          </div>
                        </div>

                        <button className="w-full py-2 px-4 rounded-full border border-black hover:bg-gray-50 text-xs font-semibold text-black transition-colors text-center">
                          View additional shop policies
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ACCORDION 4: FAQS (COLLAPSED) */}
                  <div className="py-4">
                    <button
                      onClick={() => toggleSection('faqs')}
                      className="w-full flex items-center justify-between text-sm font-bold text-[#222222] text-left"
                    >
                      <span>FAQs</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.faqs ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.faqs && (
                      <div className="pt-3 text-xs text-gray-600 space-y-2">
                        <p><strong>What sizes can I print?</strong> You can scale the high-resolution files to over 20+ standard frame dimensions.</p>
                        <p><strong>How do I receive the download?</strong> Directly in your account under purchases and sent to your email receipt.</p>
                      </div>
                    )}
                  </div>

                  {/* ACCORDION 5: MEET YOUR SELLER */}
                  <div className="py-4">
                    <button
                      onClick={() => toggleSection('meetSeller')}
                      className="w-full flex items-center justify-between text-sm font-bold text-[#222222] text-left"
                    >
                      <span>Meet your seller</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.meetSeller ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.meetSeller && (
                      <div className="pt-3 text-xs text-gray-600 space-y-2">
                        <div className="font-bold text-black">Eitan Baron</div>
                        <div>Owner of BaronArtPrintStudio • Tel Aviv, Israel</div>
                        <button className="underline text-gray-500">View shop registration details</button>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>
        ) : viewMode === 'storefront' ? (

          /* ========================================================== */
          /* 3B. ETSY STOREFRONT GRID VIEW                              */
          /* ========================================================== */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#222222]">Shop Items ({listings.length})</h2>
                <p className="text-xs text-[#595959]">All draft items currently staged in your local WireMock store</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((item, idx) => {
                const thumb = item.images?.[0]?.url || item.images?.[1]?.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedListingIndex(idx);
                      setViewMode('product');
                    }}
                    className="bg-white rounded-2xl border border-[#E1E1E1] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="aspect-square bg-[#F5F2EC] relative overflow-hidden flex items-center justify-center">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {item.state}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 shadow-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className="w-4 h-4 text-[#222222]" />
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-[#222222] line-clamp-2 mb-1 group-hover:text-[#F1641E] transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-amber-500 mb-2">
                          {'★★★★★'} <span className="text-gray-500">(18)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="font-bold text-lg text-[#222222]">
                          ₪{(parseFloat(item.price) * 3.7).toFixed(2)}
                        </div>
                        <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                          Free digital delivery
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (

          /* ========================================================== */
          /* 3C. WIREMOCK HTTP REQUESTS LOG                             */
          /* ========================================================== */
          <div className="bg-white rounded-2xl border border-[#E1E1E1] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#222222]">WireMock HTTP Journal</h3>
                <p className="text-xs text-[#595959]">Underlying API requests executed on port 8080</p>
              </div>
              <div className="text-xs font-mono text-[#595959]">
                Total Requests: {totalRequests}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E1E1E1] text-[#595959]">
                    <th className="py-2.5 px-3">METHOD</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">ENDPOINT</th>
                    <th className="py-2.5 px-3 text-right">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rawRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            req.method === 'POST'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {req.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700">
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-800 break-all">{req.url}</td>
                      <td className="py-2.5 px-3 text-gray-500 text-right whitespace-nowrap">{req.dateFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

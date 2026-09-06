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
  Activity,
  DollarSign,
  Package
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
  const [activeTab, setActiveTab] = useState<'listings' | 'requests'>('listings');
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [expandedRaw, setExpandedRaw] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState(false);

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
        toast.error('WireMock אינו זמין בפורט 8080. ודא שהפעלת את start.bat');
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
    toast.success(`${label} הועתק ללוח!`);
  };

  const toggleDesc = (id: string) => {
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRaw = (id: string) => {
    setExpandedRaw((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1E293B] font-sans pb-24" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-[#E2DCC8] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors bg-[#F1EFE9] hover:bg-[#E5E0D5] px-3.5 py-2 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>חזור ל-EtsyAutoLister</span>
            </Link>

            <div className="h-6 w-px bg-[#E2DCC8] hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F1641E] text-white flex items-center justify-center font-serif font-black text-xl shadow-sm shadow-[#F1641E]/20">
                E
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg text-[#0F172A] tracking-tight">Etsy Shop Manager</h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    סימולטור מקומי (Mock)
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">צפייה בליסטינגס וקבצים שהועלו לשרת WireMock</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="font-mono text-[11px] hidden md:inline">
                {connected ? `WireMock Connected (${wiremockUrl})` : 'WireMock Disconnected'}
              </span>
              <span className="md:hidden">{connected ? 'מחובר' : 'מנותק'}</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchStoreData(false)}
              disabled={loading}
              className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1EFE9] transition-all disabled:opacity-50"
              title="רענן נתונים"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#F1641E]' : ''}`} />
            </button>

            {/* Clear store button */}
            <button
              onClick={handleReset}
              disabled={resetting || listings.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title="אפס נתוני חנות ומחק את כל הליסטינגס"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">איפוס חנות</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Warning if disconnected */}
        {!connected && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-amber-900 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-0.5">שרת WireMock אינו זמין כרגע</p>
              <p className="text-amber-800 text-xs leading-relaxed">
                ודא שחלון הטרמינל עם <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">start.bat</code> פועל על פורט 8080.
                ברגע שהשרת יפעל, הנתונים יסתנכרנו כאן אוטומטית.
              </p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-[#E2DCC8] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium mb-1">
              <span>ליסטינגס בטיוטה</span>
              <Package className="w-4 h-4 text-[#F1641E]" />
            </div>
            <div className="text-2xl font-black text-[#0F172A]">{listings.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">מצב Draft מאובטח</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DCC8] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium mb-1">
              <span>תמונות מוקאפ שהועלו</span>
              <ImageIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-[#0F172A]">
              {listings.reduce((acc, l) => acc + l.imagesCount, 0)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">Mockup Previews</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DCC8] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium mb-1">
              <span>קבצי הדפסה דיגיטליים</span>
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-[#0F172A]">
              {listings.reduce((acc, l) => acc + l.filesCount, 0)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">Print Ratios (ZIP/JPG)</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DCC8] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] text-xs font-medium mb-1">
              <span>סך קריאות API נרשמו</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-[#0F172A]">{totalRequests}</div>
            <div className="text-[11px] text-[#64748B] mt-1">WireMock Journal Entries</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 border-b border-[#E2DCC8] mb-6">
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${
              activeTab === 'listings'
                ? 'text-[#F1641E]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              <span>ליסטינגס שהועלו ({listings.length})</span>
            </span>
            {activeTab === 'listings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F1641E] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${
              activeTab === 'requests'
                ? 'text-[#F1641E]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>לוג בקשות HTTP ({rawRequests.length})</span>
            </span>
            {activeTab === 'requests' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F1641E] rounded-full" />
            )}
          </button>
        </div>

        {/* Tab 1: Listings Content */}
        {activeTab === 'listings' && (
          <div>
            {listings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E2DCC8] p-12 text-center shadow-xs">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1">חנות הדמי ריקה כרגע</h3>
                <p className="text-sm text-[#64748B] max-w-md mx-auto mb-6">
                  עדיין לא הועלה אף ליסטינג. כדי לראות כאן מוצר, היכנס ל-EtsyAutoLister, בחר מוצר, ולחץ על כפתור Publish Draft.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-[#F1641E] hover:bg-[#D95314] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                  <span>פתח את EtsyAutoLister</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {listings.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-[#E2DCC8] overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                  >
                    {/* Card Header Bar */}
                    <div className="bg-[#FAF8F5] px-6 py-4 border-b border-[#E2DCC8] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold font-mono">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {item.state} (טיוטה מוגנת)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#EFECE6] text-[#475569] font-mono">
                            Taxonomy: {item.taxonomyId}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-[#64748B] font-mono">
                        זמן העלאה: {item.dateFormatted}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      {/* Title & Price */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-[#0F172A] leading-snug mb-2">
                            {item.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                            <span className="bg-[#F8F6F0] px-2.5 py-1 rounded-lg border border-[#E2DCC8]">
                              יוצר: <strong>{item.whoMade === 'i_did' ? 'אני (I did)' : item.whoMade}</strong>
                            </span>
                            <span className="bg-[#F8F6F0] px-2.5 py-1 rounded-lg border border-[#E2DCC8]">
                              שנת ייצור: <strong>{item.whenMade}</strong>
                            </span>
                            <span className="bg-[#F8F6F0] px-2.5 py-1 rounded-lg border border-[#E2DCC8]">
                              כמות במלאי: <strong>{item.quantity} יחידות</strong>
                            </span>
                          </div>
                        </div>

                        <div className="sm:text-left shrink-0 bg-[#F1641E]/5 border border-[#F1641E]/20 p-3 rounded-2xl">
                          <div className="text-xs text-[#F1641E] font-medium mb-0.5">מחיר לצרכן</div>
                          <div className="text-2xl font-black text-[#F1641E] font-mono">
                            ${parseFloat(item.price).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Attachments overview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-blue-900 text-sm">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>תמונות מוקאפ: {item.imagesCount}</span>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-xs text-blue-700">תמונות תצוגה מקדימה נשלחו ל-Etsy API</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 text-purple-900 text-sm">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 text-purple-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>קבצי הדפסה דיגיטליים: {item.filesCount}</span>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-xs text-purple-700">קבצי הורדה ללקוח (Deliverables) נשלחו לחנות</div>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
                            <Tag className="w-3.5 h-3.5 text-[#F1641E]" />
                            <span>13 תגיות חיפוש (SEO Tags)</span>
                            <span className="text-[11px] font-normal text-[#64748B]">
                              ({item.tags.length} מתוך 13 תגיות מוגדרות)
                            </span>
                          </div>
                          {item.tags.length > 0 && (
                            <button
                              onClick={() => copyToClipboard(item.tags.join(', '), 'רשימת התגיות')}
                              className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>העתק את כל התגיות</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              onClick={() => copyToClipboard(tag, `תגית "${tag}"`)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-[#F5F2EB] hover:bg-[#ECE7DC] text-[#334155] border border-[#E2DCC8] cursor-pointer transition-colors flex items-center gap-1.5 group"
                              title="לחץ להעתקת תגית זו"
                            >
                              <span>{tag}</span>
                              <Copy className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700" />
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="border border-[#E2DCC8] rounded-2xl p-4 bg-[#FAF8F5]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#0F172A]">תיאור הליסטינג (Description)</span>
                          <button
                            onClick={() => toggleDesc(item.id)}
                            className="text-xs text-[#F1641E] hover:underline flex items-center gap-1 font-medium"
                          >
                            <span>{expandedDesc[item.id] ? 'הסתר תיאור' : 'הצג תיאור מלא'}</span>
                            {expandedDesc[item.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div
                          className={`text-xs text-[#475569] whitespace-pre-line leading-relaxed font-sans ${
                            expandedDesc[item.id] ? '' : 'line-clamp-3'
                          }`}
                        >
                          {item.description || 'אין תיאור'}
                        </div>
                      </div>

                      {/* Raw Data Toggle */}
                      <div className="mt-4 pt-3 border-t border-[#EFECE6] flex justify-end">
                        <button
                          onClick={() => toggleRaw(item.id)}
                          className="text-[11px] text-[#64748B] hover:text-[#0F172A] font-mono flex items-center gap-1"
                        >
                          <span>{expandedRaw[item.id] ? 'הסתר Payload גולמי' : 'הצג פרטי קריאה טכניים'}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedRaw[item.id] ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {expandedRaw[item.id] && (
                        <div className="mt-3 p-3 rounded-xl bg-[#0F172A] text-emerald-400 text-xs font-mono overflow-x-auto text-left" dir="ltr">
                          <pre>{JSON.stringify(item, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Requests Log */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl border border-[#E2DCC8] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">היסטוריית תעבורת רשת ב-WireMock</h3>
                <p className="text-xs text-[#64748B]">מציג את 30 הקריאות האחרונות שנרשמו בשרת ההדמיה</p>
              </div>
              <div className="text-xs text-[#64748B] font-mono">
                סך הכל נרשמו: {totalRequests} קריאות
              </div>
            </div>

            {rawRequests.length === 0 ? (
              <div className="text-center py-12 text-[#64748B] text-sm">
                אין בקשות רשת שנרשמו כרגע ב-WireMock.
              </div>
            ) : (
              <div className="overflow-x-auto" dir="ltr">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E2DCC8] text-[#64748B]">
                      <th className="py-2.5 px-3">METHOD</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">ENDPOINT URL</th>
                      <th className="py-2.5 px-3 text-right">TIME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EFE9]">
                    {rawRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-2.5 px-3 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              req.method === 'POST'
                                ? 'bg-blue-100 text-blue-800'
                                : req.method === 'GET'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {req.method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              req.status >= 200 && req.status < 300
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#334155] break-all max-w-md">
                          {req.url}
                        </td>
                        <td className="py-2.5 px-3 text-[#64748B] text-right whitespace-nowrap">
                          {req.dateFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

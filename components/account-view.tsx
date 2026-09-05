'use client';

// Account & settings page. Extracted mechanically from Home — prop names
// mirror the original state/handler names.
import type { AppUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Cpu,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import type { MockupFitMode } from '@/lib/mockupgen';

export function AccountView({
  user,
  darkMode,
  toggleDarkMode,
  accountPlan,
  savedTips,
  handleToggleSavedTip,
  etsyToken,
  handleDisconnectEtsy,
  mockupServerStatus,
  studioAutopilot,
  toggleStudioAutopilot,
  studioFitMode,
  changeStudioFitMode,
  setCurrentView,
  handleLogOut
}: {
  user: AppUser;
  darkMode: boolean;
  toggleDarkMode: () => void;
  accountPlan: string;
  savedTips: string[];
  handleToggleSavedTip: (tip: string) => void;
  etsyToken: string | null;
  handleDisconnectEtsy: () => void;
  mockupServerStatus: 'unknown' | 'checking' | 'online' | 'offline';
  studioAutopilot: boolean;
  toggleStudioAutopilot: () => void;
  studioFitMode: MockupFitMode;
  changeStudioFitMode: (mode: MockupFitMode) => void;
  setCurrentView: (view: 'projects') => void;
  handleLogOut: () => void;
}) {
  return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-[#12110c] text-[#f7f1de]' : 'bg-[#efe7d2] text-[#15140f]'} pb-16 font-sans transition-colors duration-300`}>
        <div className={`sticky top-0 z-30 w-full backdrop-blur-md ${darkMode ? 'bg-[#12110c]/95 border-[rgba(247,241,222,0.12)]' : 'bg-[#efe7d2]/90 border-[rgba(21,20,15,0.16)]'} border-b`}>
          <header className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentView('projects')}
                className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] bg-[#1a1914] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#f7f1de] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5 text-[#8b8676]" /> Back
              </Button>
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#ed6f5c] uppercase block">{"▪ ACCOUNT & SETTINGS"}</span>
                <h1 className={`text-xl font-serif font-medium leading-tight ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>Your studio profile</h1>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogOut}
              className={`font-mono text-[10px] uppercase tracking-wider h-8 rounded-full px-4 border ${darkMode ? 'border-[rgba(247,241,222,0.16)] text-[#ece4cf] hover:bg-[#22211b]' : 'border-[rgba(21,20,15,0.16)] text-[#5a5448] bg-[#efe7d2] hover:bg-[#ece4cf]'} shadow-none cursor-pointer`}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-[#ed6f5c]" /> Sign Out
            </Button>
          </header>
        </div>

        <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ---- Identity, plan & connections ---- */}
          <div className="lg:col-span-5 space-y-6">

            {/* Profile */}
            <Card className={`${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} border rounded-[18px] shadow-none p-5`}>
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.photoURL} alt="avatar" className="w-14 h-14 rounded-full border border-[rgba(21,20,15,0.16)] object-cover" />
                ) : (
                  <span className={`w-14 h-14 rounded-full border flex items-center justify-center font-serif italic text-xl select-none ${darkMode ? 'bg-[#22211b] border-[rgba(247,241,222,0.14)] text-[#f7f1de]' : 'bg-[#efe7d2] border-[rgba(21,20,15,0.14)] text-[#15140f]'}`}>
                    {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className={`text-base font-serif font-medium leading-tight truncate ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>{user.displayName || 'Studio Creator'}</h2>
                  <p className={`text-xs truncate ${darkMode ? 'text-[#a39e8f]' : 'text-[#5a5448]'}`}>{user.email}</p>
                  <p className="text-[9px] font-mono uppercase tracking-wider text-[#8b8676] mt-1">
                    Member since {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>
              <div className={`mt-4 pt-3 border-t text-[9px] font-mono ${darkMode ? 'border-[rgba(247,241,222,0.10)] text-[#a39e8f]' : 'border-[rgba(21,20,15,0.10)] text-[#8b8676]'}`}>
                Workspace ID: <span className="select-all">{user.uid}</span>
              </div>
            </Card>

            {/* Subscription */}
            <Card className={`${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} border rounded-[18px] shadow-none p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#8b8676] font-bold">{"▪ SUBSCRIPTION"}</span>
                <span className={`inline-flex items-center px-2.5 py-1 text-[9px] font-mono font-bold rounded-full uppercase tracking-wider border select-none ${accountPlan === 'free'
                  ? 'bg-[#efe7d2] border-[rgba(21,20,15,0.16)] text-[#5a5448]'
                  : 'bg-[#6e7448]/10 border-[#6e7448]/30 text-[#6e7448]'}`}>
                  {accountPlan === 'free' ? 'Starter · Free' : accountPlan}
                </span>
              </div>
              <h3 className={`text-base font-serif font-medium ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>
                {accountPlan === 'free' ? 'Founder Starter Plan' : 'Studio Pro'}
              </h3>
              <ul className={`space-y-1.5 text-[11px] ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'}`}>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#6e7448] shrink-0" /> Unlimited local mockup renders</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#6e7448] shrink-0" /> Bulk pipeline &amp; project batches</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#6e7448] shrink-0" /> Gemini SEO copywriting</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#6e7448] shrink-0" /> Browser asset vault (offline-safe)</li>
              </ul>
              <div className={`flex items-center justify-between pt-2 border-t ${darkMode ? 'border-[rgba(247,241,222,0.10)]' : 'border-[rgba(21,20,15,0.10)]'}`}>
                <span className="text-[9px] font-mono text-[#8b8676]">Renewal: — (no billing on this plan)</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => toast.info('Billing is on the roadmap — you are on the founder Free plan with full access.')}
                  className="bg-transparent border border-[#ed6f5c]/35 text-[#ed6f5c] hover:bg-[#ed6f5c]/10 font-mono text-[9px] uppercase tracking-wider h-7 px-3 rounded-full shadow-none cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Upgrade
                </Button>
              </div>
            </Card>

            {/* Connections */}
            <Card className={`${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} border rounded-[18px] shadow-none p-5 space-y-3`}>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#8b8676] font-bold block">{"▪ CONNECTIONS"}</span>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className={darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'}>Google account</span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#6e7448]"><span className="w-1.5 h-1.5 rounded-full bg-[#6e7448]" /> {user.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'}>Etsy shop</span>
                  {etsyToken ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#6e7448]"><span className="w-1.5 h-1.5 rounded-full bg-[#6e7448]" /> Connected</span>
                      <button onClick={handleDisconnectEtsy} className="text-[9px] font-mono uppercase tracking-wider text-[#ed6f5c] hover:underline cursor-pointer font-bold">Disconnect</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#8b8676]"><span className="w-1.5 h-1.5 rounded-full bg-[#8b8676]" /> Not connected</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'}>Mockup render engine</span>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono ${mockupServerStatus === 'online' ? 'text-[#6e7448]' : mockupServerStatus === 'offline' ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${mockupServerStatus === 'online' ? 'bg-[#6e7448]' : mockupServerStatus === 'offline' ? 'bg-[#ed6f5c]' : 'bg-[#8b8676] animate-pulse'}`} />
                    {mockupServerStatus === 'online' ? 'Connected' : mockupServerStatus === 'offline' ? 'Offline' : 'Checking...'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ---- Preferences & saved tips ---- */}
          <div className="lg:col-span-7 space-y-6">

            {/* Workspace preferences (live settings, persisted per browser) */}
            <Card className={`${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} border rounded-[18px] shadow-none p-5 space-y-4`}>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#8b8676] font-bold block">{"▪ WORKSPACE PREFERENCES"}</span>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className={`text-xs font-serif font-medium block ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>Pipeline default</span>
                  <span className="text-[10px] text-[#8b8676]">How the Studio runs new products</span>
                </div>
                <div className={`flex p-1 rounded-lg text-[10px] font-mono border uppercase tracking-wider select-none ${darkMode ? 'bg-[#22211b]/80 border-[rgba(247,241,222,0.12)]' : 'bg-[#ece4cf]/80 border-[rgba(21,20,15,0.16)]'}`}>
                  <button onClick={() => { if (!studioAutopilot) toggleStudioAutopilot(); }} className={`px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 ${studioAutopilot ? `${darkMode ? 'bg-[#12110c] text-[#f7f1de] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] text-[#15140f] border-[rgba(21,20,15,0.16)]'} border font-bold` : 'text-[#8b8676] hover:text-[#ed6f5c]'}`}>
                    <Cpu className={`w-3 h-3 ${studioAutopilot ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`} /> Autopilot
                  </button>
                  <button onClick={() => { if (studioAutopilot) toggleStudioAutopilot(); }} className={`px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 ${!studioAutopilot ? `${darkMode ? 'bg-[#12110c] text-[#f7f1de] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] text-[#15140f] border-[rgba(21,20,15,0.16)]'} border font-bold` : 'text-[#8b8676] hover:text-[#ed6f5c]'}`}>
                    <Settings className={`w-3 h-3 ${!studioAutopilot ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`} /> Guided
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className={`text-xs font-serif font-medium block ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>Default fit mode</span>
                  <span className="text-[10px] text-[#8b8676]">How artworks fill mockup frames</span>
                </div>
                <div className={`flex p-1 rounded-lg text-[9px] font-mono border uppercase tracking-wider select-none ${darkMode ? 'bg-[#22211b]/80 border-[rgba(247,241,222,0.12)]' : 'bg-[#ece4cf]/80 border-[rgba(21,20,15,0.16)]'}`}>
                  {(['stretch', 'auto', 'cover', 'contain'] as MockupFitMode[]).map(mode => (
                    <button key={mode} onClick={() => changeStudioFitMode(mode)} className={`px-2.5 py-1 rounded-md cursor-pointer capitalize ${studioFitMode === mode ? `${darkMode ? 'bg-[#12110c] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} text-[#ed6f5c] border font-bold` : 'text-[#8b8676] hover:text-[#ed6f5c]'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className={`text-xs font-serif font-medium block ${darkMode ? 'text-[#f7f1de]' : 'text-[#15140f]'}`}>Theme</span>
                  <span className="text-[10px] text-[#8b8676]">Workspace appearance</span>
                </div>
                <div className={`flex p-1 rounded-lg text-[10px] font-mono border uppercase tracking-wider select-none ${darkMode ? 'bg-[#22211b]/80 border-[rgba(247,241,222,0.12)]' : 'bg-[#ece4cf]/80 border-[rgba(21,20,15,0.16)]'}`}>
                  <button onClick={() => { if (darkMode) toggleDarkMode(); }} className={`px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 ${!darkMode ? 'bg-[#f7f1de] text-[#15140f] border border-[rgba(21,20,15,0.16)] font-bold' : 'text-[#8b8676] hover:text-[#ed6f5c]'}`}>
                    <Sun className={`w-3 h-3 ${!darkMode ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`} /> Light
                  </button>
                  <button onClick={() => { if (!darkMode) toggleDarkMode(); }} className={`px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 ${darkMode ? 'bg-[#12110c] text-[#f7f1de] border border-[rgba(247,241,222,0.12)] font-bold' : 'text-[#8b8676] hover:text-[#ed6f5c]'}`}>
                    <Moon className={`w-3 h-3 ${darkMode ? 'text-[#ed6f5c]' : 'text-[#8b8676]'}`} /> Dark
                  </button>
                </div>
              </div>

              <p className={`text-[9px] font-mono leading-relaxed pt-1 border-t ${darkMode ? 'border-[rgba(247,241,222,0.10)] text-[#a39e8f]' : 'border-[rgba(21,20,15,0.10)] text-[#8b8676]'}`}>
                Preferences apply immediately across the Studio, bulk runs and the workspace.
              </p>
            </Card>

            {/* Saved tips */}
            <Card className={`${darkMode ? 'bg-[#1a1914] border-[rgba(247,241,222,0.12)]' : 'bg-[#f7f1de] border-[rgba(21,20,15,0.16)]'} border rounded-[18px] shadow-none p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#8b8676] font-bold">{"▪ SAVED TIPS"}</span>
                <span className="text-[10px] font-mono text-[#8b8676]">{savedTips.length} saved</span>
              </div>
              {savedTips.length > 0 ? (
                <ul className="space-y-2">
                  {savedTips.map((tip, index) => (
                    <li key={index} className={`flex items-start gap-2.5 p-3 rounded-xl border ${darkMode ? 'border-[rgba(247,241,222,0.10)] bg-[#22211b]/40' : 'border-[rgba(21,20,15,0.10)] bg-[#ece4cf]/30'}`}>
                      <Bookmark className="w-3.5 h-3.5 text-[#ed6f5c] fill-current shrink-0 mt-0.5" />
                      <span className={`text-[11px] leading-relaxed flex-1 min-w-0 ${darkMode ? 'text-[#ece4cf]' : 'text-[#5a5448]'}`}>{tip}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSavedTip(tip)}
                        className="text-[#8b8676] hover:text-[#ed6f5c] cursor-pointer transition-colors shrink-0"
                        title="Remove this tip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Bookmark className="w-7 h-7 text-[#8b8676] mx-auto opacity-50" />
                  <p className={`text-[11px] max-w-xs mx-auto leading-relaxed ${darkMode ? 'text-[#a39e8f]' : 'text-[#8b8676]'}`}>
                    No saved tips yet — tap the bookmark icon on any Studio Tip and it will be kept here for you.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
  );
}
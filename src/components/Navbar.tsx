import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, BarChart3, Settings, Download, CheckCircle, Users, Sun, Moon, Menu, Pencil, Languages } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { getCacheSize, setPrefetchProgressCallback, type PrefetchProgress } from '@/lib/background-prefetch';
import { getOfflinePackManifest, type OfflinePackManifest } from '@/lib/offline-cache';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet';

const publicNavLinks = [
  { path: '/', key: 'home' as const },
  { path: '/learning', key: 'lesson' as const },
  { path: '/materials', key: 'materials' as const },
  { path: '/chat', key: 'channel' as const },
  { path: '/tests', key: 'quizzes' as const },
  { path: '/about', key: 'about' as const },
];

const privateNavLinks = [
  { path: '/bookmarks', key: 'bookmarks' as const },
  { path: '/progress', key: 'myProgress' as const },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout, isAdmin, isSuperAdmin, isBlocked, avatarUrl, displayName, totalUsersCount } = useAuth();

  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t: translate } = useAppLanguage();

  // Taskbar Scroll State - Static for now as requested
  const scrollRef = useRef<HTMLDivElement>(null);

  // Offline and Prefetch State
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [prefetchProgress, setPrefetchProgress] = useState<PrefetchProgress>({
    total: 0,
    completed: 0,
    currentItem: '',
    status: 'idle',
  });
  const [offlinePack, setOfflinePack] = useState<OfflinePackManifest | null>(null);

  useEffect(() => {
    // Initial cache size
    getCacheSize().then(setCacheSize);

    // Listen for prefetch progress
    setPrefetchProgressCallback((progress) => {
      setPrefetchProgress(progress);
    });

    const refreshOfflinePack = async () => {
      if (!user?.id) {
        setOfflinePack(null);
        return;
      }
      setOfflinePack(await getOfflinePackManifest(user.id, language));
    };
    void refreshOfflinePack();

    const handleOfflinePackUpdated = (event: Event) => {
      const manifest = (event as CustomEvent<OfflinePackManifest>).detail;
      if (manifest?.userId === user?.id && manifest.language === language && manifest.status === 'complete') {
        setOfflinePack(manifest);
      }
    };
    window.addEventListener('ethio:offline-pack-updated', handleOfflinePackUpdated);

    return () => {
      window.removeEventListener('ethio:offline-pack-updated', handleOfflinePackUpdated);
      setPrefetchProgressCallback(() => undefined);
    };
  }, [language, user?.id]);

  const handleLogout = async () => {
    await logout();
    setProfilePanelOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Taskbar links - exclude private links and admin link as requested
  const allNavLinks = [...publicNavLinks];

  const progressPercent = prefetchProgress.total > 0 
    ? Math.round((prefetchProgress.completed / prefetchProgress.total) * 100) 
    : 0;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Top Navbar */}
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-white/10 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center bg-slate-900 group-hover:scale-105 transition-transform">
              <img src="/images/hero-bg-new.png" alt="EthioCosmos Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs sm:text-sm tracking-tight whitespace-nowrap">
                Ethio-cosmos-learning-community
              </span>
                              <span className="text-[9px] text-orange-400 font-medium uppercase tracking-wider">
                Community

              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Sheet open={profilePanelOpen} onOpenChange={setProfilePanelOpen}>
                <button
                  onClick={() => setProfilePanelOpen(true)}
                  className="flex items-center gap-2 px-1.5 h-11 rounded-xl border-2 border-white/10 bg-slate-900/50 hover:border-orange-500/50 transition-all focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/5">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                        {displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <Menu size={18} className="text-orange-400/80 mr-0.5" />
                </button>

                <SheetContent side="right" className="w-[85%] sm:max-w-md p-0 bg-slate-950 border-l border-white/10">
                  <SheetHeader className="p-8 bg-slate-900/60 border-b border-white/10">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-3xl border-2 border-orange-500/40 overflow-hidden shadow-xl">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl text-white font-bold">
                              {displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => setEditProfileOpen(true)}
                          className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <div className="w-full min-w-0">
                        <SheetTitle className="text-2xl font-bold text-white truncate">{displayName}</SheetTitle>
                        <p className="text-sm text-gray-400 truncate mt-0.5">{user.email}</p>
                        {profile?.bio && (
                          <p className="text-xs text-gray-300 mt-2 px-4 italic line-clamp-2">"{profile.bio}"</p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${
                            isAdmin ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {isSuperAdmin ? translate('superAdmin') : isAdmin ? translate('adminPanel') : translate('member')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">

                    {/* Navigation Section */}
                    <div className="py-2">
                      {/* Navigation Collapsible */}
                      <div className="px-6 py-3 border-b border-white/5">
                        <button
                          onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                          className="w-full flex items-center justify-between text-sm text-gray-300 hover:text-white transition-colors py-1"
                        >
                          <div className="flex items-center gap-3">
                            <Menu size={18} className="text-orange-400" />
                            <span className="font-bold">Navigation</span>
                          </div>
                          <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1">
                            {navDropdownOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {navDropdownOpen && (
                          <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {publicNavLinks.map((link) => (
                              <Link
                                key={link.path}
                                to={link.path}
                                className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                onClick={() => setProfilePanelOpen(false)}
                              >
                                <span>{translate(link.key)}</span>
                              </Link>
                            ))}
                            {user && privateNavLinks.map((link) => (
                              <Link
                                key={link.path}
                                to={link.path}
                                className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                onClick={() => setProfilePanelOpen(false)}
                              >
                                <span>{translate(link.key)}</span>
                              </Link>
                            ))}
                            {isAdmin && (
                              <Link
                                to="/admin"
                                className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                onClick={() => setProfilePanelOpen(false)}
                              >
                                <span>{isSuperAdmin ? translate('adminPanel') : translate('manageLessons')}</span>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      <Link
                        to="/progress"
                        className="flex items-center gap-3 px-6 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        onClick={() => setProfilePanelOpen(false)}
                      >
                        <BarChart3 size={18} />
                        <span>{translate('myProgress')}</span>
                      </Link>
                      <Link
                        to="/bookmarks"
                        className="flex items-center gap-3 px-6 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        onClick={() => setProfilePanelOpen(false)}
                      >
                        <BookOpen size={18} />
                        <span>{translate('bookmarks')}</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-6 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setProfilePanelOpen(false)}
                        >
                          <Settings size={18} />
                          <span>{isSuperAdmin ? translate('adminPanel') : translate('manageLessons')}</span>
                        </Link>
                      )}
                      
                      {/* Language Preference */}
                      <div className="px-6 py-3 border-t border-white/5">
                        <button
                          onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                          className="w-full flex items-center justify-between text-sm text-gray-300 hover:text-white transition-colors py-1"
                          aria-expanded={languageDropdownOpen}
                        >
                          <div className="flex items-center gap-3">
                            <Languages size={18} className="text-cyan-400" />
                            <span>{translate('language')}</span>
                          </div>
                          <span className="text-xs text-cyan-300 font-medium bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                            {language === 'am' ? 'አማርኛ' : 'English'} {languageDropdownOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {languageDropdownOpen && (
                          <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-slate-900/90 p-2.5 animate-in fade-in duration-200">
                            {[
                              { id: 'en' as const, label: 'English', helper: 'English' },
                              { id: 'am' as const, label: 'አማርኛ', helper: 'Amharic' },
                            ].map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                  setLanguage(option.id);
                                  setLanguageDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                  language === option.id
                                    ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/30'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                                aria-pressed={language === option.id}
                              >
                                <span>{option.label}</span>
                                <span className="text-[10px] text-gray-500">{option.helper}</span>
                              </button>
                            ))}
                            <p className="px-2 pt-1 text-[10px] leading-relaxed text-gray-500">
                              {translate('languageHelper')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Themes Collapsible Section */}
                      <div className="px-6 py-3 border-t border-white/5">
                        <button
                          onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                          className="w-full flex items-center justify-between text-sm text-gray-300 hover:text-white transition-colors py-1"
                        >
                          <div className="flex items-center gap-3">
                            <Sun size={18} className="text-orange-400" />
                            <span>{translate('themes')}</span>
                          </div>
                          <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1 text-right">
                            {themeDropdownOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {themeDropdownOpen && (
                          <div className="mt-2 max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar animate-in fade-in duration-200 bg-slate-900/90 p-2.5 rounded-xl border border-white/10" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {/* Base Themes */}
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">{translate('baseThemes')}</div>
                            {[
                              { id: 'dark', label: translate('darkTheme'), icon: <Sun size={14} className="text-orange-400" /> },
                              { id: 'light', label: translate('lightTheme'), icon: <Moon size={14} /> }
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setTheme(t.id as Parameters<typeof setTheme>[0]);
                                  setThemeDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                  theme === t.id ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                                {theme === t.id && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">{translate('active')}</span>}
                              </button>
                            ))}

                            {/* Linear Gradients */}
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">{translate('linearGradients')}</div>
                            {[
                              { id: 'gradient-cosmos', label: 'Cosmic Nebula', color: 'bg-gradient-to-r from-[#0f0c29] to-[#24243e]' },
                              { id: 'gradient-aurora', label: 'Aurora', color: 'bg-gradient-to-r from-[#052e16] to-[#0f172a]' },
                              { id: 'gradient-sunset', label: 'Sunset Glow', color: 'bg-gradient-to-r from-[#2a0845] to-[#ff4e50]' },
                              { id: 'gradient-emerald', label: 'Emerald Twilight', color: 'bg-gradient-to-r from-[#03001e] to-[#ec38bc]' },
                              { id: 'gradient-rainbow', label: 'Rainbow Glow', color: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500' },
                              { id: 'gradient-ocean', label: 'Deep Ocean', color: 'bg-gradient-to-r from-[#000428] to-[#004e92]' },
                              { id: 'gradient-forest', label: 'Enchanted Forest', color: 'bg-gradient-to-r from-[#0f2027] to-[#2c5364]' },
                              { id: 'gradient-fire', label: 'Phoenix Fire', color: 'bg-gradient-to-r from-[#200122] to-[#6f0000]' },
                              { id: 'gradient-mystic', label: 'Mystic Purple', color: 'bg-gradient-to-r from-[#2c3e50] to-[#000000]' },
                              { id: 'gradient-sakura', label: 'Sakura Dream', color: 'bg-gradient-to-r from-[#4a1942] via-[#c06c84] to-[#f8b195]' },
                              { id: 'gradient-desert', label: 'Desert Mirage', color: 'bg-gradient-to-r from-[#451a03] via-[#c2410c] to-[#fbbf24]' },
                              { id: 'gradient-arctic', label: 'Arctic Glass', color: 'bg-gradient-to-r from-[#082f49] via-[#0e7490] to-[#a5f3fc]' },
                              { id: 'gradient-twilight', label: 'Twilight Bloom', color: 'bg-gradient-to-r from-[#172554] via-[#7e22ce] to-[#f0abfc]' },
                              { id: 'gradient-rose-gold', label: 'Rose Gold', color: 'bg-gradient-to-r from-[#4c0519] via-[#be123c] to-[#fda4af]' },
                              { id: 'gradient-celestial', label: 'Celestial Light', color: 'bg-gradient-to-r from-[#172554] via-[#2563eb] to-[#c4b5fd]' }
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setTheme(t.id as Parameters<typeof setTheme>[0]);
                                  setThemeDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                  theme === t.id ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${t.color} inline-block`}></span> {t.label}</span>
                                {theme === t.id && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">{translate('active')}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer - Shrunken Offline Storage & Bottom Actions */}
                  <SheetFooter className="border-t border-white/5 bg-slate-950 flex-col p-0">
                    {/* Compact Offline Storage Row */}
                    <div className="w-full px-4 py-2.5 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Download size={14} className="text-orange-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-300">{translate('offlineStorage')}</span>
                        <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">{(cacheSize / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                      <div className="text-[10px]">
                        {prefetchProgress.status === 'running' ? (
                          <span className="text-orange-400 animate-pulse font-medium">{progressPercent}%</span>
                        ) : offlinePack || prefetchProgress.status === 'completed' ? (
                          <span className="text-green-400 font-medium flex items-center gap-1"><CheckCircle size={12} /> {translate('ready')}</span>
                        ) : prefetchProgress.status === 'error' ? (
                          <span className="text-red-400 font-medium">{translate('error')}</span>
                        ) : (
                          <span className="text-xs text-gray-400">{translate('notDownloaded')}</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Registered Members & Sign Out */}
                    <div className="w-full flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <Users size={12} />
                        <span>{totalUsersCount} {totalUsersCount === 1 ? translate('member') : translate('members')}</span>
                      </div>
                      {!isBlocked && (
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors rounded-md font-medium"
                        >
                          <LogOut size={15} />
                          <span>{translate('signOut')}</span>
                        </button>
                      )}
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} />
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                {translate('signIn')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Second Fixed Navbar (Below Top Navbar) - Compact Static Navigation */}
      <div 
        ref={scrollRef}
        className="bg-slate-950/90 backdrop-blur-md border-b border-white/5 overflow-x-auto scrollbar-hide"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center h-10 justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {allNavLinks.map((link, idx) => (
              <Link
                key={`nav-${idx}`}
                to={link.path}
                className={`relative px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap rounded-full border ${
                  isActive(link.path)
                    ? 'text-white bg-orange-500/20 border-orange-500/50 font-bold shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                    : 'text-gray-400 bg-white/5 border-white/5 hover:text-white hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {translate(link.key)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

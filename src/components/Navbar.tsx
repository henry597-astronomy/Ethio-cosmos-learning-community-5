import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, BarChart3, Settings, Wifi, WifiOff, Download, CheckCircle, AlertCircle, Users, Sun, Moon, Menu, Pencil } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import { getCacheSize, setPrefetchProgressCallback, type PrefetchProgress } from '@/lib/background-prefetch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet';

const publicNavLinks = [
  { path: '/', label: 'Home' },
  { path: '/learning', label: 'Lesson' },
  { path: '/materials', label: 'Materials' },
  { path: '/chat', label: 'Channel' },
  { path: '/tests', label: 'Quizzes' },
  { path: '/about', label: 'About' },
];

const privateNavLinks = [
  { path: '/bookmarks', label: 'Bookmarks' },
  { path: '/progress', label: 'Progress' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout, isAdmin, isSuperAdmin, isBlocked, avatarUrl, displayName, totalUsersCount } = useAuth();

  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Taskbar Scroll State - Static for now as requested
  const scrollRef = useRef<HTMLDivElement>(null);

  // Offline and Prefetch State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [prefetchProgress, setPrefetchProgress] = useState<PrefetchProgress>({
    total: 0,
    completed: 0,
    currentItem: '',
    status: 'idle',
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache size
    getCacheSize().then(setCacheSize);

    // Listen for prefetch progress
    setPrefetchProgressCallback((progress) => {
      setPrefetchProgress(progress);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] group-hover:scale-105 transition-transform">
              <span className="text-white text-2xl font-bold">E</span>
            </div>
            <div className="block">
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">EthioCosmos</h1>
              <p className="text-[9px] sm:text-[10px] text-orange-500 font-medium uppercase tracking-widest">Community</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Online/Offline Status Indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border transition-all ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Sheet open={profilePanelOpen} onOpenChange={setProfilePanelOpen}>
                <button
                  onClick={() => setProfilePanelOpen(true)}
                  className="w-10 h-10 rounded-xl border-2 border-white/10 overflow-hidden hover:border-orange-500/50 transition-all focus:outline-none"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold">
                      {displayName.charAt(0)}
                    </div>
                  )}
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
                            {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Member'}
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
                                <span>{link.label}</span>
                              </Link>
                            ))}
                            {user && privateNavLinks.map((link) => (
                              <Link
                                key={link.path}
                                to={link.path}
                                className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                onClick={() => setProfilePanelOpen(false)}
                              >
                                <span>{link.label}</span>
                              </Link>
                            ))}
                            {isAdmin && (
                              <Link
                                to="/admin"
                                className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                onClick={() => setProfilePanelOpen(false)}
                              >
                                <span>{isSuperAdmin ? 'Admin Panel' : 'Manage Lessons'}</span>
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
                        <span>My Progress</span>
                      </Link>
                      <Link
                        to="/bookmarks"
                        className="flex items-center gap-3 px-6 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        onClick={() => setProfilePanelOpen(false)}
                      >
                        <BookOpen size={18} />
                        <span>Bookmarks</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-6 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                          onClick={() => setProfilePanelOpen(false)}
                        >
                          <Settings size={18} />
                          <span>{isSuperAdmin ? 'Admin Panel' : 'Manage Lessons'}</span>
                        </Link>
                      )}
                      
                      {/* Themes Collapsible Section */}
                      <div className="px-6 py-3 border-t border-white/5">
                        <button
                          onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                          className="w-full flex items-center justify-between text-sm text-gray-300 hover:text-white transition-colors py-1"
                        >
                          <div className="flex items-center gap-3">
                            <Sun size={18} className="text-orange-400" />
                            <span>Themes</span>
                          </div>
                          <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1 text-right">
                            {themeDropdownOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {themeDropdownOpen && (
                          <div className="mt-2 max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar animate-in fade-in duration-200 bg-slate-900/90 p-2.5 rounded-xl border border-white/10" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {/* Base Themes */}
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">Base Themes</div>
                            {[
                              { id: 'dark', label: 'Dark Theme', icon: <Sun size={14} className="text-orange-400" /> },
                              { id: 'light', label: 'Light Theme', icon: <Moon size={14} /> }
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setTheme(t.id as any);
                                  setThemeDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                  theme === t.id ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                                {theme === t.id && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                              </button>
                            ))}

                            {/* Linear Gradients */}
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">Linear Gradients</div>
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
                                  setTheme(t.id as any);
                                  setThemeDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                  theme === t.id ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${t.color} inline-block`}></span> {t.label}</span>
                                {theme === t.id && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer - Offline Storage, Stats & Logout Button */}
                  <SheetFooter className="border-t border-white/5 bg-slate-950 flex-col p-0">
                    {/* Offline Storage Section */}
                    <div className="w-full px-6 py-3 border-b border-white/5 bg-slate-900/40">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Offline Storage</h3>
                        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">{(cacheSize / (1024 * 1024)).toFixed(1)} MB used</span>
                      </div>
                      
                      {prefetchProgress.status === 'running' ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-orange-400 animate-pulse truncate max-w-[150px]">
                              {prefetchProgress.currentItem || 'Downloading...'}
                            </span>
                            <span className="text-gray-400">{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : prefetchProgress.status === 'completed' ? (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                          <CheckCircle size={14} />
                          <span>All content ready for offline use</span>
                        </div>
                      ) : prefetchProgress.status === 'error' ? (
                        <div className="flex items-center gap-2 text-xs text-red-400">
                          <AlertCircle size={14} />
                          <span>Download failed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Download size={14} />
                          <span>Auto-downloading in background</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-1 p-4">
                      <div className="flex items-center gap-2 px-2 pb-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit bg-blue-500/20 text-blue-400">
                          <Users size={12} />
                          <span>{totalUsersCount} Registered {totalUsersCount === 1 ? 'Member' : 'Members'}</span>
                        </div>
                      </div>
                      {!isBlocked && (
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-md"
                        >
                          <LogOut size={18} />
                          <span>Sign Out</span>
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
                Sign In
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
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
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
  const { user, profile, isAdmin, isSuperAdmin, isBlocked, logout, displayName, avatarUrl, totalUsersCount } = useAuth();
  const { unreadCount } = useNotifications();
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Taskbar Scroll State
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const animationRef = useRef<number | null>(null);
  const virtualScrollRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleInteractionStart = () => {
      isInteractingRef.current = true;
      lastInteractionRef.current = Date.now();
      virtualScrollRef.current = scrollContainer.scrollLeft;
    };

    const handleInteractionEnd = () => {
      isInteractingRef.current = false;
      lastInteractionRef.current = Date.now();
      virtualScrollRef.current = scrollContainer.scrollLeft;
    };

    const handleScroll = () => {
      if (isInteractingRef.current) {
        lastInteractionRef.current = Date.now();
        virtualScrollRef.current = scrollContainer.scrollLeft;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    scrollContainer.addEventListener('touchstart', handleInteractionStart, { passive: true });
    scrollContainer.addEventListener('mousedown', handleInteractionStart, { passive: true });
    window.addEventListener('touchend', handleInteractionEnd);
    window.addEventListener('mouseup', handleInteractionEnd);

    const animate = () => {
      const scrollWidth = scrollContainer.scrollWidth;
      const setWidth = scrollWidth / 3;
      if (setWidth > 0) {
        // Always handle infinite loop jumping for manual scrolling
        if (scrollContainer.scrollLeft >= setWidth * 2) {
          scrollContainer.scrollLeft -= setWidth;
          virtualScrollRef.current -= setWidth;
        } else if (scrollContainer.scrollLeft <= setWidth * 0.5) {
          scrollContainer.scrollLeft += setWidth;
          virtualScrollRef.current += setWidth;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const setInitialScroll = () => {
      if (scrollContainer.scrollWidth > 0) {
        const initialPos = scrollContainer.scrollWidth / 3;
        scrollContainer.scrollLeft = initialPos;
        virtualScrollRef.current = initialPos;
      } else {
        setTimeout(setInitialScroll, 100);
      }
    };
    setInitialScroll();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.removeEventListener('touchstart', handleInteractionStart);
      scrollContainer.removeEventListener('mousedown', handleInteractionStart);
      window.removeEventListener('touchend', handleInteractionEnd);
      window.removeEventListener('mouseup', handleInteractionEnd);
    };
  }, []);

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

    setPrefetchProgressCallback((progress) => {
      setPrefetchProgress(progress);
      if (progress.status === 'completed') {
        updateCacheSize();
      }
    });

    updateCacheSize();
    const sizeInterval = setInterval(updateCacheSize, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(sizeInterval);
    };
  }, []);

  const updateCacheSize = async () => {
    try {
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('[Navbar] Failed to get cache size:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const progressPercent = prefetchProgress.total > 0 
    ? Math.round((prefetchProgress.completed / prefetchProgress.total) * 100)
    : 0;



  const handleLogout = async () => {
    try {
      await logout();
      setProfilePanelOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const avatarLetter = (displayName || 'U').trim().charAt(0).toUpperCase();

  const allNavLinks = [
    ...publicNavLinks,
    // Bookmarks and Progress removed from task bar as per user request
    ...(isAdmin ? [{ path: '/admin', label: isSuperAdmin ? 'Admin' : 'Lessons' }] : [])
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {/* Top Main Navbar */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center bg-slate-900">
                <img src="/images/navbar-logo.png" alt="EthioCosmos Logo" className="w-full h-full object-cover scale-105" />
              </div>
              <span className="font-bold text-white text-sm sm:text-base hidden sm:inline">
                Ethio-cosmos-learning-community
              </span>
              <span className="font-bold text-white text-sm sm:hidden">
                Ethio-cosmos
              </span>
            </Link>

            {/* Desktop Navigation (Main) */}
            <div className="hidden lg:flex items-center gap-1">
              {publicNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-md relative ${
                    isActive(link.path)
                      ? 'text-orange-500 bg-orange-500/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {link.path === '/chat' && unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950 shadow-lg shadow-red-500/50 animate-pulse" />
                  )}
                </Link>
              ))}
              {user && (
                <>
                  {privateNavLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                        isActive(link.path)
                          ? 'text-orange-500 bg-orange-500/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                        isActive('/admin')
                          ? 'text-orange-500 bg-orange-500/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {isSuperAdmin ? 'Admin' : 'Lessons'}
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Right side - User Profile / Login */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <button
                    onClick={() => setProfilePanelOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full border border-orange-500/50"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-semibold text-sm">
                        {avatarLetter}
                      </div>
                    )}
                    <span className="text-gray-300 text-sm hidden md:inline max-w-[120px] truncate">
                      {displayName}
                    </span>
                    {/* Mini status indicator */}
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  </button>

                  {/* Profile Side Panel */}
                  <Sheet open={profilePanelOpen} onOpenChange={setProfilePanelOpen}>
                    <SheetContent side="right" className="w-[85%] sm:max-w-[85%] bg-slate-900 border-l border-white/10 p-0 flex flex-col">
                      <SheetHeader className="border-b border-white/5 bg-slate-950 py-4 px-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt="Profile" 
                              className="w-14 h-14 rounded-full border border-orange-500/50 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-semibold text-lg shrink-0">
                              {avatarLetter}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <SheetTitle className="text-white text-base">{displayName}</SheetTitle>
                            {profile?.bio ? (
                              <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{profile.bio}</p>
                            ) : (
                              <p className="text-xs text-gray-500 italic mt-0.5">No bio yet</p>
                            )}
                          </div>
                          <button
                            onClick={() => setEditProfileOpen(true)}
                            className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-orange-400 transition-colors"
                            title="Edit profile"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                        <div className="flex items-center justify-start mt-3">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit ${
                            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isOnline ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </SheetHeader>

                      {/* Main Content Area */}
                      <div className="flex-1 overflow-y-auto">
                        {/* Prefetch Progress Section */}
                        <div className="px-4 py-2 border-b border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Offline Content</span>
                            <span className="text-xs text-gray-400">{formatBytes(cacheSize)}</span>
                          </div>
                          
                          {prefetchProgress.status === 'running' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-orange-400 animate-pulse truncate max-w-[150px]">
                                  {prefetchProgress.currentItem || 'Downloading...'}
                                </span>
                                <span className="text-gray-400">{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
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

                        {/* Navigation Section */}
                        <div className="py-2">
                          {/* Navigation Collapsible */}
                          <div className="px-4 py-3 border-b border-white/5">
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
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                            onClick={() => setProfilePanelOpen(false)}
                          >
                            <BarChart3 size={18} />
                            <span>My Progress</span>
                          </Link>
                          <Link
                            to="/bookmarks"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                            onClick={() => setProfilePanelOpen(false)}
                          >
                            <BookOpen size={18} />
                            <span>Bookmarks</span>
                          </Link>
                          {isAdmin && (
                            <Link
                              to="/admin"
                              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              onClick={() => setProfilePanelOpen(false)}
                            >
                              <Settings size={18} />
                              <span>{isSuperAdmin ? 'Admin Panel' : 'Manage Lessons'}</span>
                            </Link>
                          )}
                          
                          {/* Themes Collapsible Section */}
                          <div className="px-4 py-3 border-t border-white/5">
                            <button
                              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                              className="w-full flex items-center justify-between text-sm text-gray-300 hover:text-white transition-colors py-1"
                            >
                              <div className="flex items-center gap-3">
                                <Sun size={18} className="text-orange-400" />
                                <span>Themes</span>
                              </div>
                              <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1">
                                {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : theme === 'gradient-cosmos' ? 'Cosmic Nebula' : theme === 'gradient-aurora' ? 'Aurora' : theme === 'gradient-sunset' ? 'Sunset Glow' : theme === 'gradient-emerald' ? 'Emerald Twilight' : theme === 'gradient-rainbow' ? 'Rainbow Glow' : theme === 'gradient-ocean' ? 'Deep Ocean' : theme === 'gradient-forest' ? 'Enchanted Forest' : theme === 'gradient-fire' ? 'Phoenix Fire' : theme === 'gradient-mystic' ? 'Mystic Purple' : theme === 'gradient-sakura' ? 'Sakura Dream' : theme === 'gradient-desert' ? 'Desert Mirage' : theme === 'gradient-arctic' ? 'Arctic Glass' : theme === 'gradient-twilight' ? 'Twilight Bloom' : theme === 'gradient-rose-gold' ? 'Rose Gold' : theme === 'gradient-celestial' ? 'Celestial Light' : 'Theme'} {themeDropdownOpen ? '▲' : '▼'}
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

                      {/* Footer - Stats & Logout Button */}
                      <SheetFooter className="border-t border-white/5 bg-slate-950">
                        <div className="w-full space-y-1">
                          <div className="flex items-center gap-2 px-4 pb-2">
                            <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit bg-blue-500/20 text-blue-400">
                              <Users size={12} />
                              <span>{totalUsersCount} Registered {totalUsersCount === 1 ? 'Member' : 'Members'}</span>
                            </div>
                          </div>
                          {!isBlocked && (
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-md"
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
                </>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Second Fixed Navbar (Below Top Navbar) - Infinite Ping-Pong Scrolling */}
      <div 
        ref={scrollRef}
        className="bg-slate-950/90 backdrop-blur-md border-b border-white/5 taskbar-marquee-wrapper"
      >
        <div className="flex items-center h-10">
          <div className="taskbar-marquee-container px-4">
            {[0, 1, 2].map((setIdx) => (
              <div key={`nav-set-${setIdx}`} className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2">
                {allNavLinks.map((link, idx) => (
                  <Link
                    key={`nav-${setIdx}-${idx}`}
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
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

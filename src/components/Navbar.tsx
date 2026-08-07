import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, BarChart3, Settings, Wifi, WifiOff, Download, CheckCircle, AlertCircle, Users, Sun, Moon, Sparkles } from 'lucide-react';
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
  { path: '/learning', label: 'Learning' },
  { path: '/materials', label: 'Materials' },
  { path: '/chat', label: 'Channel' },
  { path: '/tests', label: 'Tests' },
  { path: '/about', label: 'About' },
];

const privateNavLinks = [
  { path: '/bookmarks', label: 'Bookmarks' },
  { path: '/progress', label: 'Progress' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isSuperAdmin, isBlocked, logout, displayName, totalUsersCount } = useAuth();
  const { unreadCount } = useNotifications();
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [colorThemesSubMenuOpen, setColorThemesSubMenuOpen] = useState(false);
  const { theme } = useTheme();

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

  const metadata = user?.user_metadata as
    | { avatar_url?: string; full_name?: string; name?: string }
    | undefined;

  const avatarUrl = profile?.avatar_url || metadata?.avatar_url || null;
  const avatarLetter = (displayName || 'U').trim().charAt(0).toUpperCase();

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
                    <SheetContent side="right" className="w-1/2 bg-slate-900 border-l border-white/10 p-0 flex flex-col">
                      <SheetHeader className="border-b border-white/5 bg-slate-950">
                        <div className="flex items-center gap-3 mb-2">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt="Profile" 
                              className="w-12 h-12 rounded-full border border-orange-500/50"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-semibold text-lg">
                              {avatarLetter}
                            </div>
                          )}
                          <div className="flex-1">
                            <SheetTitle className="text-white text-base">{displayName}</SheetTitle>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit ${
                            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isOnline ? 'Online' : 'Offline'}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit bg-blue-500/20 text-blue-400">
                            <Users size={12} />
                            <span>{totalUsersCount} Registered {totalUsersCount === 1 ? 'Member' : 'Members'}</span>
                          </div>
                        </div>
                      </SheetHeader>

                      {/* Mobile navigation inside the profile panel */}
                      <div className="lg:hidden border-b border-white/5 bg-slate-950/60 p-4">
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Navigation</p>
                        <div className="grid grid-cols-2 gap-1">
                          {publicNavLinks.map((link) => (
                            <Link
                              key={link.path}
                              to={link.path}
                              onClick={() => setProfilePanelOpen(false)}
                              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                isActive(link.path)
                                  ? 'bg-orange-500/10 text-orange-500'
                                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {link.label}
                            </Link>
                          ))}
                          {privateNavLinks.map((link) => (
                            <Link
                              key={link.path}
                              to={link.path}
                              onClick={() => setProfilePanelOpen(false)}
                              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                isActive(link.path)
                                  ? 'bg-orange-500/10 text-orange-500'
                                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {link.label}
                            </Link>
                          ))}
                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setProfilePanelOpen(false)}
                              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                isActive('/admin')
                                  ? 'bg-orange-500/10 text-orange-500'
                                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {isSuperAdmin ? 'Admin' : 'Lessons'}
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Main Content Area */}
                      <div className="flex-1 overflow-y-auto">
                        {/* Prefetch Progress Section */}
                        <div className="px-4 py-4 border-b border-white/5">
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

                        {/* Navigation Links */}
                        <div className="py-2">
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
                                {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : theme === 'orange' ? 'Orange' : theme === 'green' ? 'Green' : theme === 'purple' ? 'Purple' : theme === 'blue' ? 'Blue' : theme === 'red' ? 'Red' : theme === 'cyan' ? 'Cyan' : theme === 'gold' ? 'Gold' : theme === 'rose' ? 'Rose' : theme === 'indigo' ? 'Indigo' : theme === 'gradient-cosmos' ? 'Cosmic Nebula' : theme === 'gradient-aurora' ? 'Aurora' : theme === 'gradient-sunset' ? 'Sunset Glow' : theme === 'gradient-emerald' ? 'Emerald Twilight' : theme === 'gradient-rainbow' ? 'Rainbow Glow' : 'Theme'} {themeDropdownOpen ? '▲' : '▼'}
                              </span>
                            </button>

                            {themeDropdownOpen && (
                              <div className="mt-2 max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar animate-in fade-in duration-200 bg-slate-900/90 p-2.5 rounded-xl border border-white/10" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {/* 1. Dark Theme */}
                                <button
                                  onClick={() => {
                                    const root = document.documentElement;
                                    root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald');
                                    root.classList.add('dark');
                                    localStorage.setItem('ethio_cosmos_theme', 'dark');
                                    setThemeDropdownOpen(false);
                                    window.location.reload();
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                    theme === 'dark' ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  <span className="flex items-center gap-2"><Sun size={14} className="text-orange-400" /> Dark Theme</span>
                                  {theme === 'dark' && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                                </button>

                                {/* 2. Light Theme */}
                                <button
                                  onClick={() => {
                                    const root = document.documentElement;
                                    root.classList.remove('orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                    root.classList.add('light-theme');
                                    localStorage.setItem('ethio_cosmos_theme', 'light');
                                    setThemeDropdownOpen(false);
                                    window.location.reload();
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                    theme === 'light' ? 'bg-orange-500/25 text-orange-400 font-bold border border-orange-500/40' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  <span className="flex items-center gap-2"><Moon size={14} className="text-orange-500" /> Light Theme</span>
                                  {theme === 'light' && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                                </button>

                                {/* 3. Linear Gradient Themes Collapsible / Sub-section */}
                                <div className="space-y-1 pt-1 border-t border-white/5">
                                  <div className="px-2 py-1 text-[11px] font-semibold text-orange-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>Linear Gradients</span>
                                    <Sparkles size={12} className="animate-pulse" />
                                  </div>
                                  
                                  <button
                                    onClick={() => {
                                      const root = document.documentElement;
                                      root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                      root.classList.add('gradient-cosmos');
                                      localStorage.setItem('ethio_cosmos_theme', 'gradient-cosmos');
                                      setThemeDropdownOpen(false);
                                      window.location.reload();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                      theme === 'gradient-cosmos' ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-400/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 inline-block"></span> Cosmic Nebula</span>
                                    {theme === 'gradient-cosmos' && <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                  </button>

                                  <button
                                    onClick={() => {
                                      const root = document.documentElement;
                                      root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-sunset', 'gradient-emerald', 'dark');
                                      root.classList.add('gradient-aurora');
                                      localStorage.setItem('ethio_cosmos_theme', 'gradient-aurora');
                                      setThemeDropdownOpen(false);
                                      window.location.reload();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                      theme === 'gradient-aurora' ? 'bg-emerald-600/30 text-emerald-200 font-bold border border-emerald-400/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-700 inline-block"></span> Aurora Borealis</span>
                                    {theme === 'gradient-aurora' && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                  </button>

                                  <button
                                    onClick={() => {
                                      const root = document.documentElement;
                                      root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-emerald', 'dark');
                                      root.classList.add('gradient-sunset');
                                      localStorage.setItem('ethio_cosmos_theme', 'gradient-sunset');
                                      setThemeDropdownOpen(false);
                                      window.location.reload();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                      theme === 'gradient-sunset' ? 'bg-rose-600/30 text-rose-200 font-bold border border-rose-400/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 inline-block"></span> Sunset Glow</span>
                                    {theme === 'gradient-sunset' && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                  </button>

                                  <button
                                    onClick={() => {
                                      const root = document.documentElement;
                                      root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-rainbow', 'dark');
                                      root.classList.add('gradient-emerald');
                                      localStorage.setItem('ethio_cosmos_theme', 'gradient-emerald');
                                      setThemeDropdownOpen(false);
                                      window.location.reload();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                      theme === 'gradient-emerald' ? 'bg-pink-600/30 text-pink-200 font-bold border border-pink-400/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-700 to-pink-500 inline-block"></span> Emerald Twilight</span>
                                    {theme === 'gradient-emerald' && <span className="text-[10px] bg-pink-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                  </button>

                                  <button
                                    onClick={() => {
                                      const root = document.documentElement;
                                      root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                      root.classList.add('gradient-rainbow');
                                      localStorage.setItem('ethio_cosmos_theme', 'gradient-rainbow');
                                      setThemeDropdownOpen(false);
                                      window.location.reload();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                      theme === 'gradient-rainbow' ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white font-bold border border-white/40 shadow-lg' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-purple-500 inline-block animate-pulse"></span> Rainbow Glow</span>
                                    {theme === 'gradient-rainbow' && <span className="text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 text-white px-1.5 py-0.5 rounded font-bold">Active</span>}
                                  </button>
                                </div>

                                {/* 4. Color Themes Collapsible / Sub-menu */}
                                <div className="space-y-1 pt-1 border-t border-white/5">
                                  <button
                                    onClick={() => setColorThemesSubMenuOpen(!colorThemesSubMenuOpen)}
                                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-orange-400 uppercase tracking-wider hover:text-orange-300 transition-colors"
                                  >
                                    <span>Color Themes</span>
                                    <span>{colorThemesSubMenuOpen ? '▲' : '▼'}</span>
                                  </button>

                                  {colorThemesSubMenuOpen && (
                                    <div className="space-y-1 pl-2 pt-1 border-l border-orange-500/20 animate-in fade-in duration-200">
                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                          root.classList.add('orange-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'orange');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'orange' ? 'bg-orange-600/30 text-orange-300 font-bold border border-orange-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> Orange</span>
                                        {theme === 'orange' && <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                          root.classList.add('green-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'green');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'green' ? 'bg-green-600/30 text-green-300 font-bold border border-green-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Green</span>
                                        {theme === 'green' && <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                          root.classList.add('purple-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'purple');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'purple' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> Purple</span>
                                        {theme === 'purple' && <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'dark');
                                          root.classList.add('blue-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'blue');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'blue' ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Blue</span>
                                        {theme === 'blue' && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'dark');
                                          root.classList.add('red-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'red');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'red' ? 'bg-red-600/30 text-red-300 font-bold border border-red-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Red</span>
                                        {theme === 'red' && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'dark');
                                          root.classList.add('cyan-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'cyan');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'cyan' ? 'bg-cyan-600/30 text-cyan-300 font-bold border border-cyan-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span> Cyan</span>
                                        {theme === 'cyan' && <span className="text-[10px] bg-cyan-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'dark');
                                          root.classList.add('gold-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'gold');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'gold' ? 'bg-yellow-600/30 text-yellow-300 font-bold border border-yellow-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Gold</span>
                                        {theme === 'gold' && <span className="text-[10px] bg-yellow-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'dark');
                                          root.classList.add('rose-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'rose');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'rose' ? 'bg-rose-600/30 text-rose-300 font-bold border border-rose-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span> Rose</span>
                                        {theme === 'rose' && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>

                                      <button
                                        onClick={() => {
                                          const root = document.documentElement;
                                          root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'dark');
                                          root.classList.add('indigo-theme');
                                          localStorage.setItem('ethio_cosmos_theme', 'indigo');
                                          setThemeDropdownOpen(false);
                                          window.location.reload();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          theme === 'indigo' ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/50' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block"></span> Indigo</span>
                                        {theme === 'indigo' && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">Active</span>}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer - Logout Button */}
                      <SheetFooter className="border-t border-white/5 bg-slate-950">
                        {!isBlocked && (
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-md"
                          >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                          </button>
                        )}
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
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

      {/* Second Fixed Navbar (Below Top Navbar) */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-10">
            <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
              {publicNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? 'text-orange-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-orange-500" />
                  )}
                </Link>
              ))}
              {user && privateNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? 'text-orange-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-orange-500" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

    </nav>
  );
}

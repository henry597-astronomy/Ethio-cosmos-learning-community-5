import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, BookOpen, BarChart3, Settings, Wifi, WifiOff, Download, CheckCircle, AlertCircle } from 'lucide-react';
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
  { path: '/chat', label: 'Chat' },
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
  const { user, profile, isAdmin, isSuperAdmin, isBlocked, logout, displayName } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

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
      setMobileMenuOpen(false);
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
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src="/images/school-logo.jpg" alt="Logo" className="w-16 h-16 rounded-full object-cover border-2 border-orange-500/50 shadow-lg shadow-orange-500/20" />
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
                    <SheetContent side="right" className="w-1/3 bg-slate-900 border-l border-white/10 p-0 flex flex-col">
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
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit ${
                          isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </SheetHeader>

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

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 text-gray-300 hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Second Fixed Navbar (Below Top Navbar) */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-12">
            <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
              {publicNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-1 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? 'text-orange-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </Link>
              ))}
              {user && privateNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-1 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? 'text-orange-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-white/10 py-4 px-4">
          <div className="flex flex-col gap-1">
            {publicNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-md relative ${
                  isActive(link.path)
                    ? 'text-orange-500 bg-orange-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && privateNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-md relative ${
                  isActive(link.path)
                    ? 'text-orange-500 bg-orange-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setMobileMenuOpen(false)}
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
                onClick={() => setMobileMenuOpen(false)}
              >
                {isSuperAdmin ? 'Admin' : 'Lessons'}
              </Link>
            )}
            {user ? (
              !isBlocked && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-md mt-2 border-t border-white/5 pt-4"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              )
            ) : (
              <Link
                to="/login"
                className="block w-full text-center py-3 mt-4 bg-orange-500 text-white rounded-lg font-bold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/**
 * Offline Status Monitor
 * 
 * Displays:
 * - Online/offline status
 * - Background prefetch progress
 * - Cache statistics
 * - Manual prefetch trigger
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { prefetchAllContent, getCacheSize, setupOnlineListener, setPrefetchProgressCallback } from '@/lib/background-prefetch';
import type { PrefetchProgress } from '@/lib/background-prefetch';

export function OfflineStatusMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [prefetchProgress, setPrefetchProgress] = useState<PrefetchProgress>({
    total: 0,
    completed: 0,
    currentItem: '',
    status: 'idle',
  });

  useEffect(() => {
    setPrefetchProgressCallback((progress) => {
      setPrefetchProgress(progress);
    });
  }, []);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);

  useEffect(() => {
    // Setup online listener
    setupOnlineListener();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('[Monitor] Online');
      setIsOnline(true);
      // Automatically start prefetch when coming online
      handlePrefetch();
    };

    const handleOffline = () => {
      console.log('[Monitor] Offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      const { type, message } = event.data;
      console.log('[Monitor] SW Message:', type, message);

      if (type === 'CACHE_UPDATED') {
        console.log('[Monitor] Cache updated:', message);
      } else if (type === 'SYNC_COMPLETE') {
        console.log('[Monitor] Sync complete:', message);
        updateCacheSize();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Initial cache size check
    updateCacheSize();

    // Periodic cache size update
    const sizeInterval = setInterval(updateCacheSize, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      clearInterval(sizeInterval);
    };
  }, []);

  const updateCacheSize = async () => {
    try {
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('[Monitor] Failed to get cache size:', error);
    }
  };

  const handlePrefetch = async () => {
    if (isPrefetching || !isOnline) return;

    setIsPrefetching(true);
    try {
      await prefetchAllContent();
      await updateCacheSize();
    } catch (error) {
      console.error('[Monitor] Prefetch failed:', error);
    } finally {
      setIsPrefetching(false);
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

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Status Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${
          isOnline
            ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
        }`}
      >
        {isOnline ? (
          <Wifi size={16} />
        ) : (
          <WifiOff size={16} />
        )}
        <span className="text-sm">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </button>

      {/* Details Panel */}
      {showDetails && (
        <div className="absolute bottom-16 right-0 w-80 bg-slate-900 border border-white/10 rounded-lg shadow-xl p-4 space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <CheckCircle size={16} className="text-green-400" />
              ) : (
                <AlertCircle size={16} className="text-red-400" />
              )}
              <span className="text-sm font-medium">
                {isOnline ? 'Connected to internet' : 'No internet connection'}
              </span>
            </div>
          </div>

          {/* Cache Size */}
          <div className="space-y-1 border-t border-white/10 pt-3">
            <p className="text-xs text-gray-400">Cache Size</p>
            <p className="text-sm font-medium text-white">
              {formatBytes(cacheSize)}
            </p>
          </div>

          {/* Prefetch Status */}
          {prefetchProgress.status !== 'idle' && (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2">
                {prefetchProgress.status === 'running' && (
                  <Loader size={14} className="text-orange-400 animate-spin" />
                )}
                {prefetchProgress.status === 'completed' && (
                  <CheckCircle size={14} className="text-green-400" />
                )}
                {prefetchProgress.status === 'error' && (
                  <AlertCircle size={14} className="text-red-400" />
                )}
                <span className="text-xs font-medium">
                  {prefetchProgress.status === 'running' && 'Prefetching...'}
                  {prefetchProgress.status === 'completed' && 'Prefetch Complete'}
                  {prefetchProgress.status === 'error' && 'Prefetch Failed'}
                </span>
              </div>

              {prefetchProgress.status === 'running' && (
                <>
                  <p className="text-xs text-gray-400">
                    {prefetchProgress.currentItem}
                  </p>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {prefetchProgress.completed} / {prefetchProgress.total}
                  </p>
                </>
              )}

              {prefetchProgress.status === 'error' && (
                <p className="text-xs text-red-400">
                  {prefetchProgress.error}
                </p>
              )}
            </div>
          )}

          {/* Manual Prefetch Button */}
          {isOnline && prefetchProgress.status !== 'running' && (
            <button
              onClick={handlePrefetch}
              disabled={isPrefetching}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <Download size={14} />
              {isPrefetching ? 'Prefetching...' : 'Download All Content'}
            </button>
          )}

          {/* Info Text */}
          <p className="text-xs text-gray-500 border-t border-white/10 pt-3">
            {isOnline
              ? 'Content is automatically downloaded in the background when you are online.'
              : 'When you go online, all content will be automatically downloaded for offline use.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default OfflineStatusMonitor;

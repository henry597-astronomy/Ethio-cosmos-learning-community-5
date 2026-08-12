import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getPrefetchProgress,
  prefetchAllContent,
  setPrefetchProgressCallback,
  type PrefetchProgress,
} from '@/lib/background-prefetch';

type UpdateEventDetail = {
  registration: ServiceWorkerRegistration;
};

const INITIAL_PROGRESS: PrefetchProgress = {
  total: 0,
  completed: 0,
  currentItem: '',
  status: 'idle',
};

export default function AppUpdatePrompt() {
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [modePromptVisible, setModePromptVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<PrefetchProgress>(INITIAL_PROGRESS);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const beginOfflineDownload = useCallback(async () => {
    setModePromptVisible(true);
    setDownloadError(null);
    setDownloadProgress({ ...getPrefetchProgress(), status: 'running', currentItem: 'Preparing offline content...' });

    setPrefetchProgressCallback((progress) => {
      setDownloadProgress(progress);
    });

    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready.catch(() => undefined);
      }
      await prefetchAllContent();
      localStorage.setItem('ethio-offline-cache-ready', '1');
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Offline download failed.');
      setDownloadProgress((progress) => ({ ...progress, status: 'error' }));
    }
  }, []);

  useEffect(() => {
    const handleServiceWorkerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UpdateEventDetail>).detail;
      if (!detail?.registration) return;
      setUpdateRegistration(detail.registration);
      setModePromptVisible(true);
    };

    window.addEventListener('ethio:sw-update', handleServiceWorkerUpdate);

    const pendingOfflineDownload = sessionStorage.getItem('ethio-offline-download-pending') === '1';
    if (pendingOfflineDownload) {
      sessionStorage.removeItem('ethio-offline-download-pending');
      const timer = window.setTimeout(() => {
        void beginOfflineDownload();
      }, 900);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('ethio:sw-update', handleServiceWorkerUpdate);
        setPrefetchProgressCallback(() => undefined);
      };
    }

    const hasChosenMode = sessionStorage.getItem('ethio-usage-mode-chosen') === '1';
    const hasOfflineCache = localStorage.getItem('ethio-offline-cache-ready') === '1';
    if (!hasChosenMode && !hasOfflineCache && navigator.onLine) {
      const timer = window.setTimeout(() => setModePromptVisible(true), 1400);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('ethio:sw-update', handleServiceWorkerUpdate);
        setPrefetchProgressCallback(() => undefined);
      };
    }

    return () => {
      window.removeEventListener('ethio:sw-update', handleServiceWorkerUpdate);
      setPrefetchProgressCallback(() => undefined);
    };
  }, [beginOfflineDownload]);

  const handleUseOnline = () => {
    sessionStorage.setItem('ethio-usage-mode-chosen', '1');

    if (updateRegistration) {
      sessionStorage.setItem('ethio-sw-reload-requested', '1');
      updateRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      setModePromptVisible(false);
      return;
    }

    setModePromptVisible(false);
  };

  const handleDownloadOffline = () => {
    sessionStorage.setItem('ethio-usage-mode-chosen', '1');

    if (updateRegistration) {
      sessionStorage.setItem('ethio-offline-download-pending', '1');
      sessionStorage.setItem('ethio-sw-reload-requested', '1');
      updateRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      setModePromptVisible(false);
      return;
    }

    void beginOfflineDownload();
  };

  const handleDismiss = () => {
    sessionStorage.setItem('ethio-usage-mode-chosen', '1');
    setModePromptVisible(false);
  };

  if (!modePromptVisible) return null;

  const isUpdate = Boolean(updateRegistration);
  const isDownloading = downloadProgress.status === 'running';
  const isComplete = downloadProgress.status === 'completed';
  const progressPercent = downloadProgress.total > 0
    ? Math.min(100, Math.round((downloadProgress.completed / downloadProgress.total) * 100))
    : 0;

  return (
    <div className="fixed bottom-5 left-3 right-3 z-[120] md:left-auto md:right-5 md:w-[min(100%-2rem,30rem)]">
      <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
        {!isDownloading && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close update and offline options"
            title="Close"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex items-start gap-3 pr-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
            {isUpdate ? <RefreshCw size={18} /> : <Wifi size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">
              {isUpdate ? 'A new EthioCosmos update is ready' : 'Choose how to use EthioCosmos'}
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              {isUpdate
                ? 'Use the current update online, or load it and download the available content for offline use.'
                : 'Use the current version online, or download the available content now for offline access.'}
            </p>
          </div>
        </div>

        {isDownloading || isComplete || downloadError ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="truncate pr-2">{downloadError || downloadProgress.currentItem || 'Preparing...'}</span>
              <span className="shrink-0">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            {isComplete && !downloadError && (
              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> Offline content is ready on this device.
              </p>
            )}
            {downloadError && (
              <Button
                type="button"
                onClick={() => void beginOfflineDownload()}
                className="mt-3 h-8 bg-orange-500 px-3 text-xs text-white hover:bg-orange-600"
              >
                Try again
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleUseOnline}
              variant="outline"
              className="h-9 border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10"
            >
              <Wifi size={14} className="mr-1.5" />
              {isUpdate ? 'Use update online' : 'Use online version'}
            </Button>
            <Button
              type="button"
              onClick={handleDownloadOffline}
              className="h-9 bg-orange-500 px-3 text-xs text-white hover:bg-orange-600"
            >
              <Download size={14} className="mr-1.5" />
              Download for offline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { AppUpdatePrompt };

// Keep the exported type available to the compiler when this component is imported
// in environments that do not expose ServiceWorkerRegistration globally.
export type { UpdateEventDetail };

// Prevent a tree-shaker from treating the type-only import as runtime code.
void INITIAL_PROGRESS;

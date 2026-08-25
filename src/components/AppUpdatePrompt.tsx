import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import {
  getPrefetchProgress,
  downloadOfficialLearningPack,
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
  const { user } = useAuth();
  const { language, t } = useAppLanguage();
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [modePromptVisible, setModePromptVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<PrefetchProgress>(INITIAL_PROGRESS);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const beginOfflineDownload = useCallback(async () => {
    if (!user) return;

    setModePromptVisible(true);
    setDownloadError(null);
    setDownloadProgress({ ...getPrefetchProgress(), status: 'running', currentItem: t('preparingOffline') });

    setPrefetchProgressCallback((progress) => {
      setDownloadProgress(progress);
    });

    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready.catch(() => undefined);
      }
      await downloadOfficialLearningPack(language, user.id);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : t('offlineDownloadFailed'));
      setDownloadProgress((progress) => ({ ...progress, status: 'error' }));
    }
  }, [language, t, user]);

  useEffect(() => {
    const handleServiceWorkerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UpdateEventDetail>).detail;
      if (!detail?.registration) return;
      setUpdateRegistration(detail.registration);
      setModePromptVisible(true);
    };

    window.addEventListener('ethio:sw-update', handleServiceWorkerUpdate);

    const pendingOfflineDownload = sessionStorage.getItem('ethio-offline-download-pending') === '1';
    if (pendingOfflineDownload && user) {
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

    // Only show prompt if there is a new update/change detected by service worker
    // (Removed initial first-load prompt so it only comes when there are new changes)

    return () => {
      window.removeEventListener('ethio:sw-update', handleServiceWorkerUpdate);
      setPrefetchProgressCallback(() => undefined);
    };
  }, [beginOfflineDownload, user]);

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
    if (!user) return;

    sessionStorage.setItem('ethio-usage-mode-chosen', '1');
    localStorage.setItem(`ethio-offline-pack-opt-in:${user.id}`, '1');

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

  // Move the conditional return to the END to avoid breaking hooks order
  if (!user || !modePromptVisible) return null;

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
            aria-label={t('closeUpdateOptions')}
            title={t('closeUpdateOptions')}
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
              {isUpdate ? t('updateReady') : t('chooseUseEthio')}
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              {isUpdate
                ? t('updateOfflineDescription')
                : t('onlineDescription')}
            </p>
          </div>
        </div>

        {isDownloading || isComplete || downloadError ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="truncate pr-2">{downloadError || downloadProgress.currentItem || t('preparing')}</span>
              <span className="shrink-0">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            {isComplete && !downloadError && (
              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> {t('offlineReady')}
              </p>
            )}
            {downloadError && (
              <Button
                type="button"
                onClick={() => void beginOfflineDownload()}
                className="mt-3 h-8 bg-orange-500 px-3 text-xs text-white hover:bg-orange-600"
              >
                {t('tryAgain')}
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
              {isUpdate ? t('useUpdateOnline') : t('useOnlineVersion')}
            </Button>
            <Button
              type="button"
              onClick={handleDownloadOffline}
              className="h-9 bg-orange-500 px-3 text-xs text-white hover:bg-orange-600"
            >
              <Download size={14} className="mr-1.5" />
              {t('downloadForOffline')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

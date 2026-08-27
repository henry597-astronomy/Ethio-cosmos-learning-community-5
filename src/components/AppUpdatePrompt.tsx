import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppLanguage } from '@/context/AppLanguageContext';

type UpdateEventDetail = {
  registration: ServiceWorkerRegistration;
};

export default function AppUpdatePrompt() {
  const { t } = useAppLanguage();
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleServiceWorkerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UpdateEventDetail>).detail;
      if (!detail?.registration) return;
      setUpdateRegistration(detail.registration);
      setVisible(true);
    };

    window.addEventListener('ethio:sw-update', handleServiceWorkerUpdate);
    return () => window.removeEventListener('ethio:sw-update', handleServiceWorkerUpdate);
  }, []);

  const activateUpdate = () => {
    if (!updateRegistration) return;
    sessionStorage.setItem('ethio-sw-reload-requested', '1');
    updateRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    setVisible(false);
  };

  if (!visible || !updateRegistration) return null;

  return (
    <div className="fixed bottom-5 left-3 right-3 z-[120] md:left-auto md:right-5 md:w-[min(100%-2rem,30rem)]">
      <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-2 top-2 rounded p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t('closeUpdateOptions')}
          title={t('closeUpdateOptions')}
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 pr-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
            <RefreshCw size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">{t('updateReady')}</h3>
            <p className="mt-1 text-xs leading-5 text-gray-400">{t('updateOfflineDescription')}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => setVisible(false)}
            variant="outline"
            className="h-9 border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10"
          >
            <Wifi size={14} className="mr-1.5" />
            {t('useOnlineVersion')}
          </Button>
          <Button
            type="button"
            onClick={activateUpdate}
            className="h-9 bg-orange-500 px-3 text-xs text-white hover:bg-orange-600"
          >
            <RefreshCw size={14} className="mr-1.5" />
            {t('useUpdateOnline')}
          </Button>
        </div>
      </div>
    </div>
  );
}

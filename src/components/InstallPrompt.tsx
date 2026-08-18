import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { recordApkDownloadClick } from '@/services/app-analytics';

const APK_DOWNLOAD_URL =
  'https://github.com/henry597-astronomy/Ethio-cosmos-learning-community-5/releases/download/v1.9.3/ethiocosmos-v1.9.3-clean.apk';
const APK_PROMPT_DISMISSED_KEY = 'android-apk-prompt-dismissed';

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

function isRunningAsInstalledApp() {
  const standaloneDisplay = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const capacitor = (window as CapacitorWindow).Capacitor;
  const nativeCapacitorApp = Boolean(capacitor?.isNativePlatform?.());
  return standaloneDisplay || iosStandalone || nativeCapacitorApp;
}

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // The APK prompt is intended for Android visitors using the website. The
    // installed APK, PWA, iOS, and desktop web experiences remain unchanged.
    const isAndroidBrowser = /Android/i.test(navigator.userAgent);
    if (!isAndroidBrowser || isRunningAsInstalledApp()) return;

    const dismissed = sessionStorage.getItem(APK_PROMPT_DISMISSED_KEY);
    if (dismissed) return;

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(APK_PROMPT_DISMISSED_KEY, 'true');
  };

  const triggerDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    recordApkDownloadClick();
    
    // Use direct location assignment which is more reliable for downloads
    // Chrome will stay on the page because the response is a file download.
    window.location.href = '/api/download/apk';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500 md:left-auto md:right-6 md:w-96">
      <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500 bg-slate-950 p-6 shadow-[0_0_50px_rgba(249,115,22,0.25)]">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-white"
          aria-label="Close APK download prompt"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/20 text-orange-500">
            <Smartphone size={24} />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-lg font-bold text-white">Download the EthioCosmos APK</h3>
            <p className="mb-2 text-sm text-gray-200">
              Get the Android app for faster access, live streaming, and offline learning content.
            </p>
            <p className="mb-4 text-xs text-orange-400 font-medium">
              Note: If Chrome shows a security warning ("File might be harmful"), tap <strong>Keep</strong> or <strong>Download anyway</strong> to complete the installation.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={triggerDownload}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <Download size={16} />
                Download APK
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { APK_DOWNLOAD_URL };

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

const APK_DOWNLOAD_URL =
  'https://github.com/henry597-astronomy/Ethio-cosmos-learning-community-5/releases/download/v1.8.0/ethiocosmos-v1.8-hardened.apk';
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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500 md:left-auto md:right-6 md:w-96">
      <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-slate-900 p-5 shadow-2xl">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

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
            <p className="mb-4 text-sm text-gray-400">
              Get the Android app for faster access, live streaming, and offline learning content.
            </p>

            <div className="flex gap-3">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <Download size={16} />
                Download APK
              </a>
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

import { useState, useEffect } from 'react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePwaInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show prompt after a short delay if it's installable and not already installed
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        // Check if user has already dismissed it in this session
        const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleInstall = () => {
    installApp();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-orange-500/30 rounded-xl shadow-2xl p-5 overflow-hidden relative">
        {/* Background Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
            <Smartphone size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">Install EthioCosmos</h3>
            <p className="text-gray-400 text-sm mb-4">
              Install our app for a better experience, offline access, and quick entry from your home screen.
            </p>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleInstall}
                className="bg-orange-500 hover:bg-orange-600 text-white flex-1 gap-2"
              >
                <Download size={16} />
                Install Now
              </Button>
              <Button 
                variant="outline"
                onClick={handleDismiss}
                className="border-white/10 text-gray-300 hover:bg-white/5"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

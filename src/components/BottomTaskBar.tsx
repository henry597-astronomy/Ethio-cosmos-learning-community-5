import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLiveKit } from '@/context/LiveKitContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';
import { PremiumRequiredDialog } from '@/components/PremiumRequiredMessage';
import { Button } from '@/components/ui/button';
import { Orbit, Radio, Zap } from 'lucide-react';
import LiveHostModal from './LiveHostModal';
import TikTokLiveStream from './TikTokLiveStream';
import ShortsFeed from './ShortsFeed';
import ClassroomDirectoryModal from './ClassroomDirectoryModal';

export default function BottomTaskBar() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useAppLanguage();
  const { loading: premiumLoading, canUse } = usePremium();
  const [isShortsOpen, setIsShortsOpen] = useState(false);
  const [premiumPromptOpen, setPremiumPromptOpen] = useState(false);
  const [isClassroomDirectoryOpen, setIsClassroomDirectoryOpen] = useState(false);
  const {
    isLiveModalOpen,
    isHosting,
    liveToken,
    liveRoomName,
    liveHostUserId,
    streamError,
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    clearSession,
    clearStreamError,
  } = useLiveKit();

  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://ethiocosmos-learning-community-1vp1cr43.livekit.cloud';

  const handleOpenHostModal = () => {
    if (premiumLoading) return;
    if (!canUse('live_stream_hosting')) {
      setPremiumPromptOpen(true);
      return;
    }
    openLiveModal();
  };

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 dark:bg-slate-950/95 light-theme:bg-white/95 backdrop-blur-md border-t border-white/10 dark:border-white/10 light-theme:border-slate-300 h-12 flex items-center justify-center px-4"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3rem',
          zIndex: 40,
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
          willChange: 'auto',
        }}
      >
        {/* Center Host Live / Join Live Button */}
        {user && (
          <div className="flex w-full items-center justify-evenly">
            {/* Internal Solar System screen */}
            <Link
              to="/solar-system"
              aria-label={t('solarSystem')}
              className={`flex items-center gap-2 rounded-full px-3 py-2 font-bold transition-all duration-300 active:scale-[0.98] ${location.pathname.startsWith('/solar-system') ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/50' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Orbit size={18} />
              <span className="hidden sm:inline">{t('solarSystem')}</span>
            </Link>

            {/* Shorts Button - Left Side with Enhanced Design */}
            <Button
              onClick={() => setIsShortsOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2 rounded-full font-bold transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transform"
            >
              <Zap size={18} className="animate-pulse" />
              <span className="hidden sm:inline">Shorts</span>
            </Button>

            {/* Hosts keep the existing Live Now/Host Live behavior. Other users
                open the classroom directory and choose a specific live room. */}
            {isHosting ? (
              <Button
                disabled
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-3 py-2 font-semibold transition-all duration-300 opacity-50 cursor-not-allowed shadow-lg shadow-red-500/20 sm:rounded-full sm:px-6"
                aria-label={t('liveNow')}
              >
                <Radio size={18} className="animate-pulse" />
                <span className="hidden sm:inline">{t('liveNow')}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsClassroomDirectoryOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-3 py-2 font-semibold transition-all duration-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 sm:rounded-full sm:px-6"
                  aria-label={t('joinStream')}
                >
                  <Radio size={18} />
                  <span className="hidden sm:inline">{t('joinStream')}</span>
                </Button>
                <Button
                  onClick={handleOpenHostModal}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-3 py-2 font-semibold transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 sm:rounded-full sm:px-6"
                  aria-label={t('hostLive')}
                >
                  <Radio size={18} />
                  <span className="hidden sm:inline">{t('hostLive')}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ClassroomDirectoryModal
        isOpen={isClassroomDirectoryOpen}
        currentUserId={user?.id}
        onClose={() => setIsClassroomDirectoryOpen(false)}
      />

      {/* Live Host Modal */}
      <LiveHostModal
        isOpen={isLiveModalOpen}
        onClose={closeLiveModal}
        onStartStream={startHosting}
        contextError={streamError}
        onClearError={clearStreamError}
      />

      <PremiumRequiredDialog
        open={premiumPromptOpen}
        onOpenChange={setPremiumPromptOpen}
        featureName={t('hostLive')}
      />
      {/* Live Stream Component */}
      {liveToken && (
        <TikTokLiveStream
          token={liveToken}
          serverUrl={liveKitUrl}
          onClose={() => {
            if (isHosting) {
              stopHosting();
            } else {
              clearSession();
            }
          }}
          isHost={isHosting}
          roomName={liveRoomName || undefined}
          hostUserId={liveHostUserId || undefined}
        />
      )}



      {/* Shorts Feed */}
      {isShortsOpen && (
        <ShortsFeed onClose={() => setIsShortsOpen(false)} />
      )}
    </>
  );
}

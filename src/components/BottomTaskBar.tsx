import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLiveKit } from '@/context/LiveKitContext';
import { Button } from '@/components/ui/button';
import { Radio, Zap } from 'lucide-react';
import LiveHostModal from './LiveHostModal';
import TikTokLiveStream from './TikTokLiveStream';
import ShortsFeed from './ShortsFeed';

export default function BottomTaskBar() {
  const { user } = useAuth();
  const [isShortsOpen, setIsShortsOpen] = useState(false);
  const {
    isLiveModalOpen,
    isHosting,
    activeSessions,
    liveToken,
    liveRoomName,
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    joinSession,
    clearSession,
  } = useLiveKit();

  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://ethiocosmos-learning-community-1vp1cr43.livekit.cloud';

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-white/10 h-12 flex items-center justify-center px-4"
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
          <div className="flex items-center justify-center gap-12 w-full">
            {/* Shorts Button - Left Side with Enhanced Design */}
            <Button
              onClick={() => setIsShortsOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2 rounded-full font-bold transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transform"
            >
              <Zap size={18} className="animate-pulse" />
              <span className="hidden sm:inline">Shorts</span>
            </Button>

            {/* 
              If user is currently hosting, show "Live Now" (disabled).
              If user is NOT hosting, but there is an active session NOT hosted by them, show "Join Live".
              Otherwise, show "Host Live".
            */}
            {isHosting ? (
              <Button
                disabled
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 opacity-50 cursor-not-allowed shadow-lg shadow-red-500/20"
              >
                <Radio size={18} className="animate-pulse" />
                <span>Live Now</span>
              </Button>
            ) : activeSessions.length > 0 && activeSessions.some(s => s.host_id !== user.id) ? (
              <Button
                onClick={async () => {
                  const sessionToJoin = activeSessions.find(s => s.host_id !== user.id);
                  if (sessionToJoin) {
                    try {
                      await joinSession(sessionToJoin.room_name);
                    } catch (error) {
                      console.error('Failed to join session:', error);
                    }
                  }
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/40"
              >
                <Radio size={18} className="animate-pulse" />
                <span>Join Live</span>
              </Button>
            ) : (
              <Button
                onClick={openLiveModal}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
              >
                <Radio size={18} />
                <span>Host Live</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Live Host Modal */}
      <LiveHostModal
        isOpen={isLiveModalOpen}
        onClose={closeLiveModal}
        onStartStream={startHosting}
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
        />
      )}

      {/* Shorts Feed */}
      {isShortsOpen && (
        <ShortsFeed onClose={() => setIsShortsOpen(false)} />
      )}
    </>
  );
}

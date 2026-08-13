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
  const [isJoining, setIsJoining] = useState(false);
  const {
    isLiveModalOpen,
    isHosting,
    activeSessions,
    liveToken,
    liveRoomName,
    liveHostUserId,
    streamError,
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
    joinSession,
    clearSession,
    clearStreamError,
  } = useLiveKit();

  const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://ethiocosmos-learning-community-1vp1cr43.livekit.cloud';

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
                disabled={isJoining}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const sessionToJoin = activeSessions.find(s => s.host_id !== user.id);
                  if (sessionToJoin) {
                    try {
                      setIsJoining(true);
                      // Clear any previous errors
                      clearStreamError();
                      await joinSession(sessionToJoin.room_name);
                    } catch (error) {
                      console.error('Failed to join session:', error);
                    } finally {
                      setIsJoining(false);
                    }
                  }
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 min-w-[120px]"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <Radio size={18} className="animate-pulse" />
                    <span>Join Live</span>
                  </>
                )}
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
        contextError={streamError}
        onClearError={clearStreamError}
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

      {/* Immediate Joining Overlay - Shows before token is ready */}
      {isJoining && !liveToken && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio size={30} className="text-orange-500 animate-pulse" />
            </div>
          </div>
          <h2 className="text-white font-black text-2xl mt-6 tracking-tighter uppercase italic">
            EthioCosmos <span className="text-orange-500">Live</span>
          </h2>
          <p className="text-gray-400 text-sm mt-2 font-medium animate-pulse">Preparing your connection...</p>
          
          {streamError && (
            <div className="mt-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-4 max-w-[80%] text-center">
                {streamError}
              </p>
              <Button 
                onClick={() => {
                  setIsJoining(false);
                  clearStreamError();
                }}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-xs uppercase font-bold tracking-tighter"
              >
                Cancel & Close
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Shorts Feed */}
      {isShortsOpen && (
        <ShortsFeed onClose={() => setIsShortsOpen(false)} />
      )}
    </>
  );
}

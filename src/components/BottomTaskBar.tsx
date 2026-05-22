import { useAuth } from '@/context/AuthContext';
import { useLiveKit } from '@/context/LiveKitContext';
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import LiveHostModal from './LiveHostModal';
import LiveKitStream from './LiveKitStream';

export default function BottomTaskBar() {
  const { user } = useAuth();
  const {
    isLiveModalOpen,
    isHosting,
    liveToken,
    openLiveModal,
    closeLiveModal,
    startHosting,
    stopHosting,
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
        {/* Center Host Live Button */}
        {user && (
          <Button
            onClick={openLiveModal}
            disabled={isHosting}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
          >
            <Radio size={18} className={isHosting ? 'animate-pulse' : ''} />
            <span>{isHosting ? 'Live Now' : 'Host Live'}</span>
          </Button>
        )}
      </div>

      {/* Live Host Modal */}
      <LiveHostModal
        isOpen={isLiveModalOpen}
        onClose={closeLiveModal}
        onStartStream={startHosting}
      />

      {/* Live Stream Component */}
      {isHosting && liveToken && (
        <LiveKitStream
          token={liveToken}
          serverUrl={liveKitUrl}
          onClose={stopHosting}
          isHost={true}
        />
      )}
    </>
  );
}

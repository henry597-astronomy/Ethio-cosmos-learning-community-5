import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  ParticipantTile,
  useTracks,
  GridLayout,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { X, Loader } from 'lucide-react';

interface LiveKitStreamProps {
  token: string;
  serverUrl: string;
  onClose: () => void;
  isHost?: boolean;
}

function MyVideoConference({ isHost }: { isHost: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, name: 'camera' },
      { source: Track.Source.Microphone, name: 'microphone' },
      { source: Track.Source.ScreenShare, name: 'screen_share' },
    ],
    { onlySubscribed: !isHost }
  );

  return (
    <div className="relative w-full h-full bg-black">
      {tracks.length > 0 ? (
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">Waiting for host to start video...</p>
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <ControlBar 
          variation="minimal" 
          controls={{ 
            microphone: isHost, 
            camera: isHost, 
            screenShare: isHost, 
            chat: false, 
            leave: false, 
            settings: false 
          }} 
        />
      </div>
    </div>
  );
}

export default function LiveKitStream({
  token,
  serverUrl,
  onClose,
  isHost = false,
}: LiveKitStreamProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnecting(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Live Stream Error</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-300">
            Unable to initialize live stream. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg overflow-hidden max-w-4xl w-full mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950">
          <h2 className="text-xl font-bold text-white">
            {isHost ? 'Host Live Stream' : 'Watch Live Stream'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stream Container */}
        <div className="flex-1 overflow-hidden relative">
          {isConnecting && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-4">
                <Loader size={32} className="text-orange-500 animate-spin" />
                <p className="text-white">Connecting to live stream...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 max-w-md">
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          <LiveKitRoom
            video={isHost}
            audio={isHost}
            token={token}
            serverUrl={serverUrl}
            connect={true}
            onError={(err: Error) => {
              console.error('LiveKit error:', err);
              setError(err.message || 'Connection error');
            }}
            onConnected={() => {
              setIsConnecting(false);
              setError(null);
            }}
          >
            <MyVideoConference isHost={isHost} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}

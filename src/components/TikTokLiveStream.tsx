import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  ParticipantTile,
} from '@livekit/components-react';
import { Participant, Track } from 'livekit-client';
import '@livekit/components-styles';
import { X, Loader, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface TikTokLiveStreamProps {
  token: string;
  serverUrl: string;
  onClose: () => void;
  isHost?: boolean;
  roomName?: string;
}

/**
 * StreamContent renders the actual video stream and participant management
 * This component must be inside LiveKitRoom context
 */
function StreamContent({
  isHost,
  onClose,
  roomName,
}: {
  isHost: boolean;
  onClose: () => void;
  roomName?: string;
}) {
  const { participants } = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [coHostParticipant, setCoHostParticipant] = useState<Participant | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get community members (all participants except host and current co-host)
  const communityMembers = participants.filter(
    (p) => p.identity !== localParticipant?.identity && p.identity !== coHostParticipant?.identity
  );

  // Handle co-host promotion
  const handlePromoteToCoHost = (participant: Participant) => {
    setCoHostParticipant(participant);
  };

  // Handle co-host removal
  const handleRemoveCoHost = () => {
    setCoHostParticipant(null);
  };

  // Handle fullscreen toggle
  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Get participant avatar
  const getParticipantAvatar = (participant: Participant) => {
    const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
    return metadata.avatar_url || null;
  };

  // Get participant initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">
            {isHost ? '🔴 Live Stream' : '👁️ Watching Live'}
          </h2>
          {roomName && (
            <p className="text-xs text-gray-400 mt-1">{roomName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX size={20} className="text-red-400" />
            ) : (
              <Volume2 size={20} className="text-white" />
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 size={20} className="text-white" />
            ) : (
              <Maximize2 size={20} className="text-white" />
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Close Stream"
          >
            <X size={20} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Side: Main Stream (50%) */}
        <div className="w-1/2 bg-black relative overflow-hidden border-r border-white/10">
          {/* Host Video */}
          {localParticipant && (
            <div className="w-full h-full">
              <ParticipantTile
                participant={localParticipant}
                className="w-full h-full"
              />
              {isHost && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  HOST
                </div>
              )}
            </div>
          )}

          {/* Co-Host Video Overlay (if promoted) */}
          {coHostParticipant && (
            <div className="absolute bottom-4 right-4 w-32 h-32 rounded-lg overflow-hidden border-2 border-orange-500 shadow-lg">
              <ParticipantTile
                participant={coHostParticipant}
                className="w-full h-full"
              />
              <div className="absolute top-1 right-1 bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                CO-HOST
              </div>
              {isHost && (
                <button
                  onClick={handleRemoveCoHost}
                  className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-colors"
                  title="Remove from stream"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Community Profiles (50%) */}
        <div className="w-1/2 bg-slate-900/50 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-lg">👥</span>
              Community ({communityMembers.length})
            </h3>

            {communityMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <p className="text-sm">No other participants yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {communityMembers.map((participant) => (
                  <div
                    key={participant.identity}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    {/* Circular Avatar */}
                    <div
                      onClick={() => isHost && handlePromoteToCoHost(participant)}
                      className={`relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all duration-200 ${
                        isHost
                          ? 'border-white/30 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/50 hover:scale-110'
                          : 'border-white/20'
                      }`}
                    >
                      <Avatar className="w-full h-full">
                        <AvatarImage
                          src={getParticipantAvatar(participant)}
                          alt={participant.name}
                          className="w-full h-full object-cover"
                        />
                        <AvatarFallback className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                          {getInitials(participant.name || 'User')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Online Indicator */}
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />

                      {/* Hover Overlay for Host */}
                      {isHost && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">Add</span>
                        </div>
                      )}
                    </div>

                    {/* Participant Name */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-white truncate w-24">
                        {participant.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {participant.audioTrackSubscribed ? '🎤' : '🔇'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Bar */}
      <div className="bg-slate-950/95 border-t border-white/10 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
        <span>🟢 Connected</span>
        <span>{participants.length + 1} participants</span>
      </div>
    </div>
  );
}

/**
 * Main TikTokLiveStream Component
 */
export default function TikTokLiveStream({
  token,
  serverUrl,
  onClose,
  isHost = false,
  roomName,
}: TikTokLiveStreamProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnecting(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Stream Error</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-300 mb-4">
            Unable to initialize live stream. Missing authentication credentials.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
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
      {isConnecting && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader size={40} className="text-orange-500 animate-spin" />
            <p className="text-white text-lg">Connecting to live stream...</p>
            <p className="text-gray-400 text-sm">Please wait while we set up your stream</p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Connection Error</h2>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
            >
              Close Stream
            </button>
          </div>
        </div>
      )}

      {!isConnecting && !error && (
        <StreamContent
          isHost={isHost}
          onClose={onClose}
          roomName={roomName}
        />
      )}
    </LiveKitRoom>
  );
}

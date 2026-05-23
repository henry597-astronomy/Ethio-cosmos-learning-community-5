import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  ParticipantTile,
  useTracks,
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
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [coHostParticipant, setCoHostParticipant] = useState<Participant | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use useTracks to get all camera tracks for better reliability
  const tracks = useTracks([Track.Source.Camera]);

  // Enable camera and microphone for host on mount
  useEffect(() => {
    if (isHost && localParticipant) {
      const enableMedia = async () => {
        try {
          // Enable camera
          await localParticipant.setCameraEnabled(true);
          // Enable microphone
          await localParticipant.setMicrophoneEnabled(true);
          console.log('Host camera and microphone enabled');
        } catch (error) {
          console.error('Error enabling media:', error);
        }
      };
      enableMedia();
    }
  }, [isHost, localParticipant]);

  // Handle mute toggle for host
  useEffect(() => {
    if (isHost && localParticipant) {
      const updateMute = async () => {
        try {
          await localParticipant.setMicrophoneEnabled(!isMuted);
        } catch (error) {
          console.error('Error updating microphone:', error);
        }
      };
      updateMute();
    }
  }, [isMuted, isHost, localParticipant]);

  // Find the host participant (for viewers)
  const hostParticipant = participants.find((p: Participant) => {
    try {
      // Host is identified by having video tracks or screen share
      return p.isScreenShareEnabled || p.videoTrackPublications.size > 0;
    } catch {
      return false;
    }
  });

  // Get community members (all participants except host and current co-host)
  const communityMembers = participants.filter(
    (p: Participant) => p.identity !== localParticipant?.identity && p.identity !== coHostParticipant?.identity
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
    try {
      const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
      return metadata.avatar_url || null;
    } catch {
      return null;
    }
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

  // Determine which participant to show in main area
  const mainParticipant = isHost ? localParticipant : (hostParticipant || localParticipant);

  // Helper to find track for a specific participant
  const getTrackForParticipant = (participant: Participant | null) => {
    if (!participant) return null;
    return tracks.find((t) => t.participant.identity === participant.identity);
  };

  const mainTrack = getTrackForParticipant(mainParticipant);
  const coHostTrack = getTrackForParticipant(coHostParticipant);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {isHost ? 'Live Stream' : 'Watching Live'}
          </h2>
          {roomName && (
            <p className="text-xs text-gray-400 mt-1">{roomName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Button (only for host) */}
          {isHost && (
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
          )}

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

      {/* Main Content Area - Split Vertically */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP HALF: Stream Area */}
        <div className="h-1/2 bg-black relative flex overflow-hidden border-b border-white/10">
          {/* Split screen if co-host exists */}
          <div className="flex w-full h-full">
            {/* Main Stream (Host) */}
            <div className={`${coHostParticipant ? 'w-1/2' : 'w-full'} h-full relative border-r border-white/5`}>
              {mainParticipant && mainTrack ? (
                <ParticipantTile
                  trackRef={mainTrack}
                  className="w-full h-full"
                  
                />
              ) : mainParticipant ? (
                 <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <Loader className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Loading stream...</p>
                    </div>
                 </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <p className="text-gray-500">Waiting for host...</p>
                </div>
              )}
              {mainParticipant && (
                <div className="absolute top-4 left-4 bg-red-600/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  HOST
                </div>
              )}
            </div>

            {/* Co-Host Stream */}
            {coHostParticipant && (
              <div className="w-1/2 h-full relative">
                {coHostTrack ? (
                  <ParticipantTile
                    trackRef={coHostTrack}
                    className="w-full h-full"
                    
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <Loader className="w-6 h-6 text-orange-500 animate-spin mx-auto mb-2" />
                      <p className="text-gray-400 text-xs">Connecting co-host...</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-orange-600/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  CO-HOST
                </div>
                {isHost && (
                  <button
                    onClick={handleRemoveCoHost}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM HALF: Community Profiles */}
        <div className="h-1/2 bg-slate-950 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
              <span className="text-blue-400">👥</span>
              Community ({communityMembers.length})
            </h3>

            {communityMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p className="text-sm italic">No other participants yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {communityMembers.map((participant: Participant) => (
                  <div
                    key={participant.identity}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      onClick={() => isHost && handlePromoteToCoHost(participant)}
                      className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                        isHost
                          ? 'border-white/10 hover:border-orange-500 hover:scale-105'
                          : 'border-white/5'
                      }`}
                    >
                      <Avatar className="w-full h-full">
                        <AvatarImage
                          src={getParticipantAvatar(participant)}
                          alt={participant.name}
                          className="w-full h-full object-cover"
                        />
                        <AvatarFallback className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
                          {getInitials(participant.name || 'User')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Online Indicator */}
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-950" />

                      {/* Hover Overlay for Host */}
                      {isHost && (
                        <div className="absolute inset-0 bg-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold bg-orange-600 px-1.5 py-0.5 rounded">INVITE</span>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] font-medium text-gray-300 truncate w-20">
                        {participant.name || 'User'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Status Bar */}
      <div className="bg-slate-950 border-t border-white/5 px-4 py-2 text-[10px] text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
          <span>Connected</span>
        </div>
        <span>{participants.length + 1} participants in room</span>
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

  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-red-500/20 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Stream Error</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Unable to initialize live stream. Missing authentication credentials. Please try again later.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
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
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-orange-500/10 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-2">Entering Room</p>
              <p className="text-gray-500 text-sm">Preparing your live experience...</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-red-500/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
            <p className="text-red-400/80 mb-8 leading-relaxed">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
            >
              Exit Stream
            </button>
          </div>
        </div>
      )}

      <StreamContent isHost={isHost} onClose={onClose} roomName={roomName} />
    </LiveKitRoom>
  );
}

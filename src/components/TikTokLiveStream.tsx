import { useEffect, useState, useRef, useMemo } from 'react';
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
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Get all participants who are publishing video
  const publishers = useMemo(() => {
    return participants.filter(p => p.videoTrackPublications.size > 0 || p.isScreenShareEnabled);
  }, [participants]);

  // 2. Identify the Host (First priority: me if I'm host, Second priority: the first publisher found)
  const hostParticipant = useMemo(() => {
    if (isHost && localParticipant) return localParticipant;
    // If I'm a viewer, the host is the first person in the room who is publishing video
    return publishers[0] || null;
  }, [isHost, localParticipant, publishers]);

  // 3. Identify the Co-Host (The second person publishing video)
  const coHostParticipant = useMemo(() => {
    if (!hostParticipant) return null;
    return publishers.find(p => p.identity !== hostParticipant.identity) || null;
  }, [publishers, hostParticipant]);

  // 4. Get the actual tracks for rendering
  const cameraTracks = useTracks([Track.Source.Camera]);
  
  const hostTrack = useMemo(() => {
    if (!hostParticipant) return null;
    return cameraTracks.find(t => t.participant.identity === hostParticipant.identity);
  }, [cameraTracks, hostParticipant]);

  const coHostTrack = useMemo(() => {
    if (!coHostParticipant) return null;
    return cameraTracks.find(t => t.participant.identity === coHostParticipant.identity);
  }, [cameraTracks, coHostParticipant]);

  // Enable camera and microphone for host on mount
  useEffect(() => {
    if (isHost && localParticipant) {
      const enableMedia = async () => {
        try {
          await localParticipant.setCameraEnabled(true);
          await localParticipant.setMicrophoneEnabled(true);
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
      localParticipant.setMicrophoneEnabled(!isMuted).catch(console.error);
    }
  }, [isMuted, isHost, localParticipant]);

  // Get community members (everyone except host and co-host)
  const communityMembers = useMemo(() => {
    return participants.filter((p) => {
      const isHostPart = hostParticipant?.identity === p.identity;
      const isCoHostPart = coHostParticipant?.identity === p.identity;
      return !isHostPart && !isCoHostPart;
    });
  }, [participants, hostParticipant, coHostParticipant]);

  // Fullscreen logic
  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const getInitials = (name: string) => {
    return (name || 'User').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getParticipantAvatar = (participant: Participant) => {
    try {
      const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
      return metadata.avatar_url || null;
    } catch {
      return null;
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {isHost ? 'Live Stream' : 'Watching Live'}
          </h2>
          {roomName && <p className="text-xs text-gray-400 mt-1">{roomName}</p>}
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              {isMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} className="text-white" />}
            </button>
          )}
          <button onClick={handleFullscreen} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {isFullscreen ? <Minimize2 size={20} className="text-white" /> : <Maximize2 size={20} className="text-white" />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
            <X size={20} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Main Layout: Top (Stream) / Bottom (Community) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP: Stream Area (50%) */}
        <div className="h-1/2 bg-black relative flex border-b border-white/10">
          {!hostParticipant ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
              <Loader className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <p className="text-gray-400 font-medium">Waiting for host stream...</p>
            </div>
          ) : (
            <div className="flex w-full h-full">
              {/* Host Section */}
              <div className={`${coHostParticipant ? 'w-1/2' : 'w-full'} h-full relative border-r border-white/5`}>
                {hostTrack ? (
                  <ParticipantTile trackRef={hostTrack} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                    <p className="text-gray-500 text-xs italic">Host is starting video...</p>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  HOST
                </div>
              </div>

              {/* Co-Host Section */}
              {coHostParticipant && (
                <div className="w-1/2 h-full relative">
                  {coHostTrack ? (
                    <ParticipantTile trackRef={coHostTrack} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                      <p className="text-gray-500 text-xs italic">Co-host is starting video...</p>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-orange-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    CO-HOST
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM: Community (50%) */}
        <div className="h-1/2 bg-slate-950 overflow-y-auto">
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="text-blue-500 text-lg">👥</span>
                Community ({communityMembers.length})
              </h3>
            </div>

            {communityMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <p className="text-sm italic">Waiting for members to join...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
                {communityMembers.map((participant) => (
                  <div key={participant.identity} className="flex flex-col items-center gap-3 group">
                    <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-orange-500 to-red-500 transition-transform group-hover:scale-110">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950 bg-slate-800">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={getParticipantAvatar(participant)} className="object-cover" />
                          <AvatarFallback className="text-white font-bold text-xs">
                            {getInitials(participant.name || 'User')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950 shadow-lg" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 truncate w-20 text-center uppercase tracking-tighter">
                      {participant.name || 'User'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-950 border-t border-white/5 px-4 py-2.5 text-[10px] text-gray-500 flex items-center justify-between font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>Live Status: Connected</span>
        </div>
        <span>{participants.length} Active</span>
      </div>
    </div>
  );
}

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
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-3xl p-10 max-w-sm w-full border border-white/5 text-center">
          <h2 className="text-2xl font-black text-white mb-4">STREAM ERROR</h2>
          <p className="text-gray-500 mb-8 text-sm">Connection credentials missing.</p>
          <button onClick={onClose} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest">CLOSE</button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={isHost}
      audio={isHost}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onError={(err) => setError(err.message)}
      onConnected={() => setIsConnecting(false)}
    >
      {isConnecting && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center gap-6">
          <Loader className="w-12 h-12 text-white animate-spin" />
          <p className="text-white font-black tracking-widest uppercase text-sm">Entering Live...</p>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-6">
          <div className="bg-slate-900 rounded-3xl p-10 max-w-sm w-full border border-red-500/20 text-center">
            <h2 className="text-xl font-black text-red-500 mb-4">CONNECTION FAILED</h2>
            <p className="text-gray-500 mb-8 text-sm">{error}</p>
            <button onClick={onClose} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest">EXIT</button>
          </div>
        </div>
      )}

      <StreamContent isHost={isHost} onClose={onClose} roomName={roomName} />
    </LiveKitRoom>
  );
}

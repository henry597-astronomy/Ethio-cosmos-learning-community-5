import { useEffect, useState, useRef, useMemo } from 'react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  ParticipantTile,
  useTracks,
  useDataChannel,
} from '@livekit/components-react';
import { Participant, Track } from 'livekit-client';
import '@livekit/components-styles';
import { X, Loader, Volume2, VolumeX, Maximize2, Minimize2, UserPlus, UserMinus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface TikTokLiveStreamProps {
  token: string;
  serverUrl: string;
  onClose: () => void;
  isHost?: boolean;
  roomName?: string;
}

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
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  
  // Local state for co-host identity to ensure immediate UI feedback
  const [localCoHostId, setLocalCoHostId] = useState<string | null>(null);

  // Data channel for signaling
  const { send } = useDataChannel('co-host-signaling', (message) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));
      if (data.type === 'CO_HOST_UPDATE') {
        setLocalCoHostId(data.coHostIdentity);
      }
    } catch (e) {
      console.error('Failed to parse signaling message', e);
    }
  });

  const getMetadata = (p: Participant) => {
    try {
      return p.metadata ? JSON.parse(p.metadata) : {};
    } catch {
      return {};
    }
  };

  // 1. Identify the Host (INSTANT DISCOVERY WITH TRACK VALIDATION)
  const hostParticipant = useMemo(() => {
    // If I'm the host, return me immediately
    if (isHost && localParticipant) return localParticipant;

    // For viewers: Prioritize immediate display over metadata accuracy
    // Priority 1: Check metadata role (most reliable but may be delayed)
    const metaHost = participants.find(p => getMetadata(p).role === 'host');
    if (metaHost) return metaHost;
    
    // Priority 2: Fallback to ANY remote participant to show content immediately
    // This ensures viewers see the stream instantly without waiting for metadata propagation
    // The fallback is typically the host since they join first
    const firstRemote = participants.find(p => p.identity !== localParticipant?.identity);
    if (firstRemote) return firstRemote;
    
    // Priority 3: Return null only if truly no one else is in the room
    return null;
  }, [participants, isHost, localParticipant]);

  // 2. Identify the Co-Host
  const coHostParticipant = useMemo(() => {
    // Combine local and remote participants to ensure we find the co-host even if it's us
    const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;
    
    // Try to find co-host from host metadata first
    if (hostParticipant) {
      const hostMeta = getMetadata(hostParticipant);
      if (hostMeta.currentCoHost) {
        const p = allParticipants.find(p => p.identity === hostMeta.currentCoHost);
        if (p) return p;
      }
    }
    // Fall back to locally stored co-host ID for instant UI feedback
    if (localCoHostId) {
      const p = allParticipants.find(p => p.identity === localCoHostId);
      if (p) return p;
    }
    return null;
  }, [participants, localParticipant, hostParticipant, localCoHostId]);

  // Sync local state when host metadata changes
  useEffect(() => {
    if (hostParticipant) {
      const hostMeta = getMetadata(hostParticipant);
      if (hostMeta.currentCoHost !== localCoHostId) {
        setLocalCoHostId(hostMeta.currentCoHost || null);
      }
    }
  }, [hostParticipant]);

  // 3. Track Discovery (Optimized for immediate viewer access)
  const allCameraTracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.ScreenShare
    ],
    { onlySubscribed: false } // Include local tracks and don't wait for subscription to show UI
  );

  // Connection timeout handler - show error if no host connects within 15 seconds
  useEffect(() => {
    if (isHost || hostParticipant) {
      setConnectionTimeout(false);
      return;
    }

    const timer = setTimeout(() => {
      setConnectionTimeout(true);
    }, 15000); // 15 second timeout

    return () => clearTimeout(timer);
  }, [isHost, hostParticipant]);

  // Ensure host enables camera when they join
  useEffect(() => {
    if (isHost && localParticipant && !localParticipant.isCameraEnabled) {
      localParticipant.setCameraEnabled(true).catch(err => {
        console.warn('Failed to enable host camera:', err);
      });
    }
  }, [isHost, localParticipant]);

  const hostTrack = useMemo(() => {
    if (!hostParticipant) return null;
    
    // Find camera or screen share track from host
    const track = allCameraTracks.find(t => t.participant.identity === hostParticipant.identity);
    
    // If host is connected but no track yet, still show them (loading state in UI)
    // This prevents "Waiting for Host" from showing when host is actually connected
    return track || null;
  }, [allCameraTracks, hostParticipant]);

  const coHostTrack = useMemo(() => {
    if (!coHostParticipant) return null;
    
    // Find camera or screen share track from co-host
    const track = allCameraTracks.find(t => t.participant.identity === coHostParticipant.identity);
    
    // If co-host is connected but no track yet, still show them (loading state in UI)
    return track || null;
  }, [allCameraTracks, coHostParticipant]);

  // Media Management (Optimized for instant viewing - disable viewer media immediately)
  useEffect(() => {
    if (!localParticipant) return;

    const isMeHost = isHost;
    const isMeCoHost = coHostParticipant?.identity === localParticipant.identity;

    // Only enable media if I am on stage
    if (isMeHost || isMeCoHost) {
      localParticipant.setCameraEnabled(true).catch(console.error);
      localParticipant.setMicrophoneEnabled(!isMuted).catch(console.error);
    } else {
      // For viewers, disable camera/mic IMMEDIATELY to reduce connection overhead
      // This allows faster initial connection without waiting for media negotiation
      localParticipant.setCameraEnabled(false).catch(console.error);
      localParticipant.setMicrophoneEnabled(false).catch(console.error);
    }
  }, [isHost, localParticipant, coHostParticipant, isMuted]);

  // Community members
  const communityMembers = useMemo(() => {
    return participants.filter(p => {
      const isHostMember = p.identity === hostParticipant?.identity;
      const isCoHostMember = p.identity === coHostParticipant?.identity;
      return !isHostMember && !isCoHostMember;
    });
  }, [participants, hostParticipant, coHostParticipant]);

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
    const metadata = getMetadata(participant);
    return metadata.avatar_url || null;
  };

  const handleProfileClick = async (participant: Participant) => {
    if (!isHost || !localParticipant) return;
    
    const isCurrentlyCoHost = coHostParticipant?.identity === participant.identity;
    const newCoHostId = isCurrentlyCoHost ? null : participant.identity;
    
    setLocalCoHostId(newCoHostId);

    const currentMetadata = getMetadata(localParticipant);
    await localParticipant.setMetadata(JSON.stringify({
      ...currentMetadata,
      currentCoHost: newCoHostId
    }));

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'CO_HOST_UPDATE',
      coHostIdentity: newCoHostId
    }));
    await send(data, { reliable: true });
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex flex-col font-sans" suppressHydrationWarning>
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

      {/* Main Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP: Stream Area - Immediately visible even while host loads */}
        <div className="h-1/2 bg-black relative flex border-b border-white/10">
          {hostParticipant ? (
            <div className="flex w-full h-full" suppressHydrationWarning>
              {/* Host Section */}
              <div className={`${coHostParticipant ? 'w-1/2' : 'w-full'} h-full relative border-r border-white/5`}>
                {hostTrack ? (
                  <ParticipantTile trackRef={hostTrack} className="w-full h-full" suppressHydrationWarning />
                ) : hostParticipant ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
                    <Loader className="w-6 h-6 text-white/20 animate-spin mb-2" />
                    <p className="text-gray-500 text-[10px] uppercase tracking-tighter">Enabling Host Camera...</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
                    <Loader className="w-6 h-6 text-white/20 animate-spin mb-2" />
                    <p className="text-gray-500 text-[10px] uppercase tracking-tighter">Waiting for Host...</p>
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
                    <ParticipantTile trackRef={coHostTrack} className="w-full h-full" suppressHydrationWarning />
                  ) : coHostParticipant ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
                      <Loader className="w-6 h-6 text-white/20 animate-spin mb-2" />
                      <p className="text-gray-500 text-[10px] uppercase tracking-tighter">Enabling Co-Host Camera...</p>
                    </div>
                  ) : null}
                  <div className="absolute top-4 left-4 bg-orange-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    CO-HOST
                    {isHost && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProfileClick(coHostParticipant);
                        }}
                        className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <UserMinus size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : connectionTimeout ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
              <div className="text-center">
                <p className="text-red-400 font-bold uppercase tracking-widest text-sm mb-2">Connection Failed</p>
                <p className="text-gray-500 text-xs mb-4">The host is not currently streaming.</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors"
                >
                  Exit Stream
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
              <Loader className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <p className="text-gray-400 font-medium uppercase tracking-widest text-xs">Connecting to Host...</p>
            </div>
          )}
        </div>

        {/* BOTTOM: Community */}
        <div className="h-1/2 bg-slate-950 overflow-y-auto">
          <div className="p-5">
            <h3 className="text-white font-bold flex items-center justify-between text-sm uppercase tracking-wider mb-6">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-lg">👥</span>
                Community ({communityMembers.length})
              </div>
              {isHost && (
                <span className="text-[10px] text-blue-400 font-medium lowercase">
                  (Tap a profile to co-host)
                </span>
              )}
            </h3>

            {communityMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-700">
                <p className="text-xs uppercase tracking-widest font-bold">No members yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
                {communityMembers.map((participant) => (
                  <div 
                    key={participant.identity} 
                    className={`flex flex-col items-center gap-3 group ${isHost ? 'cursor-pointer' : ''}`}
                    onClick={() => handleProfileClick(participant)}
                  >
                    <div className="relative w-16 h-16 rounded-full p-0.5 bg-slate-800 transition-transform group-hover:scale-110">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950 bg-slate-900">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={getParticipantAvatar(participant)} className="object-cover" />
                          <AvatarFallback className="text-white font-bold text-xs">
                            {getInitials(participant.name || 'User')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950 shadow-lg" />
                      
                      {/* Hover/Host Action Overlay */}
                      {isHost && (
                        <div className="absolute inset-0 bg-blue-600/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <UserPlus size={20} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 truncate w-20 text-center uppercase tracking-tighter">
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
        <span>{participants.length + (localParticipant ? 1 : 0)} Active</span>
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
  // Removed isConnecting state to allow immediate viewer access and fix TS6133 error
  const [error, setError] = useState<string | null>(null);

  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-3xl p-10 max-w-sm w-full border border-white/5 text-center">
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-widest">Stream Error</h2>
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
      options={{
        publishDefaults: {
          simulcast: true,
        },
        adaptiveStream: true,
        dynacast: true,
      }}
      onError={(err) => setError(err.message)}
      onConnected={() => console.log('Connected to room')}
    >
      {/* Connection overlay removed - viewers now see content immediately */}

      {error && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-6">
          <div className="bg-slate-900 rounded-3xl p-10 max-w-sm w-full border border-red-500/20 text-center">
            <h2 className="text-xl font-black text-red-500 mb-4 uppercase tracking-widest">Connection Failed</h2>
            <p className="text-gray-500 mb-8 text-sm">{error}</p>
            <button onClick={onClose} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest">EXIT</button>
          </div>
        </div>
      )}

      <StreamContent isHost={isHost} onClose={onClose} roomName={roomName} />
    </LiveKitRoom>
  );
}

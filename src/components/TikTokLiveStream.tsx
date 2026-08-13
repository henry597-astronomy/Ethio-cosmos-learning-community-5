import { useEffect, useState, useRef, useMemo } from 'react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useDataChannel,
} from '@livekit/components-react';
import { Participant, Track } from 'livekit-client';
import '@livekit/components-styles';
import { X, Loader, Volume2, VolumeX, Maximize2, Minimize2, UserMinus, Mic, MicOff, MonitorUp, MonitorOff, Send, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface TikTokLiveStreamProps {
  token: string;
  serverUrl: string;
  onClose: () => void;
  isHost?: boolean;
  roomName?: string;
  hostUserId?: string;
}

interface LiveComment {
  id: string;
  senderIdentity: string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  createdAt: number;
}

function StreamContent({
  isHost,
  onClose,
  roomName,
  hostUserId,
}: {
  isHost: boolean;
  onClose: () => void;
  roomName?: string;
  hostUserId?: string;
}) {
  const participants = useParticipants();
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isAdminMuted, setIsAdminMuted] = useState(false);
  const [isSelfMuted, setIsSelfMuted] = useState(false);
  const [isCoHostMuted, setIsCoHostMuted] = useState(false);
  const [isCommunityMuted, setIsCommunityMuted] = useState(false);
  const [isCommunityMicAllowed] = useState(true);
  const [mutedCommunityIds, setMutedCommunityIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isCommunityGridExpanded, setIsCommunityGridExpanded] = useState(true);
  const [totalWordsUsed, setTotalWordsUsed] = useState(0);

  useEffect(() => {
    setIsClient(true);
    // Cleanup function when the stream ends/component unmounts
    return () => {
      setComments([]);
      setTotalWordsUsed(0);
      setCommentDraft('');
    };
  }, []);
  
  // Local state for co-host identity to ensure immediate UI feedback
  const [localCoHostId, setLocalCoHostId] = useState<string | null>(null);
  const autoStageParticipantRef = useRef<string | null>(null);

  // Data channel for signaling
  const { send } = useDataChannel('co-host-signaling', (message) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));
      if (data.type === 'LIVE_COMMENT' && data.text) {
        setComments((previous) => {
          if (previous.some((comment) => comment.id === data.id)) return previous;
          return [...previous, {
            id: data.id || `${Date.now()}-${data.senderIdentity || 'community'}`,
            senderIdentity: data.senderIdentity || 'community',
            senderName: data.senderName || 'Community member',
            senderAvatar: data.senderAvatar || null,
            text: String(data.text).slice(0, 300),
            createdAt: Number(data.createdAt) || Date.now(),
          }].slice(-100);
        });
      }
      if (data.type === 'CO_HOST_UPDATE') {
        setLocalCoHostId(data.coHostIdentity);
      }
      if (
        data.type === 'CO_HOST_AUDIO_MUTE' &&
        data.targetIdentity === localParticipant?.identity
      ) {
        setIsAdminMuted(Boolean(data.muted));
      }
      if (data.type === 'COMMUNITY_MUTE_ALL') {
        setIsCommunityMuted(Boolean(data.muted));
        const isStageParticipant = isHost || localCoHostId === localParticipant?.identity;
        if (!isStageParticipant && data.senderIdentity !== localParticipant?.identity) {
          setIsAdminMuted(Boolean(data.muted));
        }
      }
      if (data.type === 'COMMUNITY_MUTE_ONE') {
        setMutedCommunityIds((previous) => {
          const next = new Set(previous);
          if (data.muted) next.add(data.targetIdentity);
          else next.delete(data.targetIdentity);
          return next;
        });
        if (data.targetIdentity === localParticipant?.identity) {
          setIsAdminMuted(Boolean(data.muted));
        }
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

    // For viewers, use the session's stable admin user ID first so a co-host
    // can never replace the admin as the primary stage participant.
    if (hostUserId) {
      const stableHost = participants.find(
        p => getMetadata(p).participant_id === hostUserId
      );
      if (stableHost) return stableHost;
    }

    // Fallback for sessions created before stable participant IDs were added.
    const metaHost = participants.find(p => getMetadata(p).role === 'host');
    if (metaHost) return metaHost;
    
    // Priority 2: Check for anyone with a published track (likely the host)
    const publishedParticipant = participants.find(p => 
      p.identity !== localParticipant?.identity && 
      (p.isCameraEnabled || p.isMicrophoneEnabled || p.trackPublications.size > 0)
    );
    if (publishedParticipant) return publishedParticipant;

    // Priority 3: If there's only one remote participant, they are likely the host
    const remoteParticipants = participants.filter(p => p.identity !== localParticipant?.identity);
    if (remoteParticipants.length === 1) return remoteParticipants[0];

    // Priority 4: Fallback to ANY remote participant
    if (remoteParticipants.length > 0) return remoteParticipants[0];
    
    return null;
  }, [participants, isHost, localParticipant, hostUserId]);

  // Track if we have EVER seen a host during this session
  const [hasSeenHost, setHasSeenHost] = useState(false);
  useEffect(() => {
    if (hostParticipant) {
      setHasSeenHost(true);
    }
  }, [hostParticipant]);

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

  const isMeCoHost = coHostParticipant?.identity === localParticipant?.identity;
  const isModerator = isHost || isMeCoHost;
  const echoSafeAudioOptions = useMemo(() => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }), []);
  const isLocalMicMuted = isHost || isMeCoHost
    ? isMuted || isAdminMuted
    : isAdminMuted || isCommunityMuted || !isCommunityMicAllowed;

  // A co-host is promoted to the stage as soon as the host assigns them. Camera and
  // microphone can start automatically; screen sharing may show the browser's
  // native permission dialog because browsers require user consent for capture.
  useEffect(() => {
    if (!localParticipant || isHost) return;

    if (!isMeCoHost) {
      if (autoStageParticipantRef.current === localParticipant.identity) {
        void localParticipant.setScreenShareEnabled(false).catch(() => undefined);
        void localParticipant.setCameraEnabled(false).catch(() => undefined);
        void localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
        autoStageParticipantRef.current = null;
      }
      return;
    }

    if (autoStageParticipantRef.current === localParticipant.identity) return;
    autoStageParticipantRef.current = localParticipant.identity;

    const joinStage = async () => {
      try {
        await localParticipant.setCameraEnabled(true);
      } catch (error) {
        console.warn('Co-host camera enable failed:', error);
      }
      try {
        await localParticipant.setMicrophoneEnabled(
          !isAdminMuted && !isSelfMuted,
          echoSafeAudioOptions,
        );
      } catch (error) {
        console.warn('Co-host microphone enable failed:', error);
      }
    };

    void joinStage().catch((error) => {
      console.error('Unable to promote co-host to stage:', error);
    });
  }, [isHost, isMeCoHost, isAdminMuted, isSelfMuted, localParticipant, echoSafeAudioOptions]);

  useEffect(() => {
    if (!isMeCoHost) return;
    setIsMuted(isAdminMuted || isSelfMuted);
  }, [isAdminMuted, isSelfMuted, isMeCoHost]);

  useEffect(() => {
    setIsCoHostMuted(coHostParticipant ? !coHostParticipant.isMicrophoneEnabled : false);
  }, [coHostParticipant?.identity, coHostParticipant?.isMicrophoneEnabled]);

  // 3. Track Discovery (Optimized for immediate viewer access)
  const allCameraTracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.ScreenShare
    ],
    { onlySubscribed: false } // Include local tracks and don't wait for subscription to show UI
  );

  // Connection timeout handler - show error if no host connects within a reasonable timeframe
  useEffect(() => {
    // If I am the host, or if we currently see a host, or if we HAVE seen a host (even if they temporarily dropped)
    // then don't trigger the "Host not streaming" timeout error.
    if (isHost || hostParticipant || hasSeenHost) {
      setConnectionTimeout(false);
      return;
    }

    // Reduced timeout to 20 seconds for faster failure feedback, as 45s feels like "stuck"
    const timer = setTimeout(() => {
      if (!hostParticipant && !hasSeenHost) {
        setConnectionTimeout(true);
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [isHost, hostParticipant, hasSeenHost]);

  // Ensure host enables camera when they join (with retry logic)
  useEffect(() => {
    if (!isHost || !localParticipant) return;

    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500; // ms

    const enableCamera = async () => {
      try {
        if (!localParticipant.isCameraEnabled) {
          await localParticipant.setCameraEnabled(true);
          console.log('Host camera enabled successfully');
        }
      } catch (err) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`Failed to enable host camera (attempt ${retryCount}/${maxRetries}), retrying...`, err);
          setTimeout(enableCamera, retryDelay);
        } else {
          console.error('Failed to enable host camera after max retries:', err);
        }
      }
    };

    enableCamera();
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

  // Stage members publish camera and mic; community members publish a mic only
  // after they explicitly enable it. Moderator mute commands always win locally.
  useEffect(() => {
    if (!localParticipant) return;

    const forcedCommunityMute =
      isAdminMuted ||
      isCommunityMuted ||
      mutedCommunityIds.has(localParticipant.identity);

    if (isHost || isMeCoHost) {
      localParticipant.setCameraEnabled(true).catch(console.error);
      localParticipant.setMicrophoneEnabled(
        !isMuted && !isAdminMuted,
        echoSafeAudioOptions,
      ).catch(console.error);
    } else {
      localParticipant.setCameraEnabled(false).catch(console.error);
      // Viewers do not auto-publish mic unless explicitly unmuted/allowed by admin
      if (isCommunityMicAllowed && !forcedCommunityMute && !isAdminMuted && localParticipant.isMicrophoneEnabled) {
        localParticipant.setMicrophoneEnabled(true, echoSafeAudioOptions).catch(() => undefined);
      }
    }
  }, [
    isHost,
    isMeCoHost,
    localParticipant,
    isMuted,
    isAdminMuted,
    isCommunityMuted,
    isCommunityMicAllowed,
    mutedCommunityIds,
    echoSafeAudioOptions,
  ]);

  // Community members
  const communityMembers = useMemo(() => {
    return participants.filter(p => {
      const isHostMember = p.identity === hostParticipant?.identity;
      const isCoHostMember = p.identity === coHostParticipant?.identity;
      return !isHostMember && !isCoHostMember;
    });
  }, [participants, hostParticipant, coHostParticipant]);

  const handleSelfMuteToggle = () => {
    if (!isMeCoHost || isAdminMuted) return;
    setIsSelfMuted(previous => !previous);
  };

  const handleLocalMicToggle = () => {
    if (isHost) {
      setIsMuted(previous => !previous);
      return;
    }
    if (isMeCoHost) {
      handleSelfMuteToggle();
      return;
    }
    // Community microphone access is controlled by the host/co-host. Members
    // see their mic status but cannot override a moderator command themselves.
    return;
  };

  const handleCommunityMuteAllToggle = async () => {
    if (!isModerator) return;
    const muted = !isCommunityMuted;
    setIsCommunityMuted(muted);
    const encoder = new TextEncoder();
    await send(encoder.encode(JSON.stringify({
      type: 'COMMUNITY_MUTE_ALL',
      muted,
      senderIdentity: localParticipant?.identity,
    })), { reliable: true });
  };

  const handleCommunityMuteToggle = async (
    event: React.MouseEvent<HTMLButtonElement>,
    participant: Participant,
  ) => {
    event.stopPropagation();
    if (!isModerator) return;
    const muted = !mutedCommunityIds.has(participant.identity);
    setMutedCommunityIds((previous) => {
      const next = new Set(previous);
      if (muted) next.add(participant.identity);
      else next.delete(participant.identity);
      return next;
    });
    const encoder = new TextEncoder();
    await send(encoder.encode(JSON.stringify({
      type: 'COMMUNITY_MUTE_ONE',
      targetIdentity: participant.identity,
      muted,
      senderIdentity: localParticipant?.identity,
    })), { reliable: true });
  };

  const handleScreenShareToggle = async () => {
    if (!isModerator || !localParticipant) return;
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: false });
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  const handleCoHostMuteToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isHost || !coHostParticipant) return;

    const muted = !isCoHostMuted;
    setIsCoHostMuted(muted);

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'CO_HOST_AUDIO_MUTE',
      targetIdentity: coHostParticipant.identity,
      muted,
    }));
    await send(data, { reliable: true });
  };

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

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [comments]);

  const handleSendComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rawText = commentDraft.trim();
    if (!rawText || !localParticipant) return;

    const words = rawText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    if (wordCount > 40) {
      alert('Maximum 40 words allowed per message.');
      return;
    }

    if (totalWordsUsed + wordCount > 200) {
      alert(`You have reached the 200-word limit for this live stream session. (Remaining: ${Math.max(0, 200 - totalWordsUsed)} words)`);
      return;
    }

    const text = rawText.slice(0, 300);
    const metadata = getMetadata(localParticipant);
    const comment: LiveComment = {
      id: `${Date.now()}-${localParticipant.identity}`,
      senderIdentity: localParticipant.identity,
      senderName: localParticipant.name || metadata.display_name || 'Community member',
      senderAvatar: metadata.avatar_url || null,
      text,
      createdAt: Date.now(),
    };

    setTotalWordsUsed((prev) => prev + wordCount);
    setComments((previous) => [...previous, comment].slice(-100));
    setCommentDraft('');
    const encoder = new TextEncoder();
    await send(encoder.encode(JSON.stringify({ type: 'LIVE_COMMENT', ...comment })), { reliable: true });
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

  if (!isClient) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex flex-col font-sans" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-slate-950/95 backdrop-blur-md min-h-14">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {isHost ? 'Live Stream' : 'Watching Live'}
          </h2>
          {roomName && <p className="text-xs text-gray-400 mt-1">{roomName}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocalMicToggle}
            aria-label={
              isHost || isMeCoHost
                ? (isLocalMicMuted ? 'Unmute microphone' : 'Mute microphone')
                : 'Microphone controlled by moderator'
            }
            title={
              isHost || isMeCoHost
                ? (isLocalMicMuted ? 'Unmute microphone' : 'Mute microphone')
                : 'Microphone controlled by moderator'
            }
            disabled={!isHost && !isMeCoHost}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocalMicMuted
              ? <MicOff size={20} className="text-red-400" />
              : <Mic size={20} className="text-white" />}
          </button>
          {isModerator && (
            <button
              type="button"
              onClick={handleScreenShareToggle}
              aria-label={isScreenShareEnabled ? 'Stop screen sharing' : 'Share screen'}
              title={isScreenShareEnabled ? 'Stop screen sharing' : 'Share screen'}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isScreenShareEnabled ? <MonitorOff size={20} className="text-orange-400" /> : <MonitorUp size={20} className="text-white" />}
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
        
        {/* TOP: Stream Area - Responsive height for mobile/tablet/desktop */}
        <div className="h-[45%] sm:h-1/2 md:h-[55%] bg-black relative flex border-b border-white/10 shrink-0">
          {hostParticipant ? (
            <div className="flex w-full h-full" suppressHydrationWarning>
              {/* Host Section */}
              <div className={`${coHostParticipant ? 'w-1/2' : 'w-full'} h-full relative border-r border-white/5`}>
                {hostTrack ? (
                  <ParticipantTile trackRef={hostTrack} className="w-full h-full" suppressHydrationWarning />
                ) : hostParticipant ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <Avatar className="w-20 h-20 mb-4 border-2 border-white/20">
                      <AvatarImage src={getParticipantAvatar(hostParticipant)} alt="Host" />
                      <AvatarFallback className="bg-red-600 text-white text-2xl font-bold">
                        {getInitials(hostParticipant.name || 'Host')}
                      </AvatarFallback>
                    </Avatar>
                    <Loader className="w-6 h-6 text-red-500/60 animate-spin mb-2" />
                    <p className="text-gray-400 text-[10px] uppercase tracking-tighter font-semibold">Enabling Host Camera...</p>
                    <p className="text-gray-600 text-[9px] mt-2">Stream starting</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <div className="w-24 h-24 mb-4 bg-slate-800 rounded-full border-2 border-white/10 flex items-center justify-center">
                      <Loader className="w-8 h-8 text-orange-500/40 animate-spin" />
                    </div>
                    <p className="text-gray-400 font-medium uppercase tracking-widest text-xs">Waiting for Host...</p>
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
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 mb-3 border-2 border-orange-500/30">
                        <AvatarImage src={getParticipantAvatar(coHostParticipant)} alt="Co-Host" />
                        <AvatarFallback className="bg-orange-600 text-white text-xl font-bold">
                          {getInitials(coHostParticipant.name || 'Co-Host')}
                        </AvatarFallback>
                      </Avatar>
                      <Loader className="w-5 h-5 text-orange-500/60 animate-spin mb-2" />
                      <p className="text-gray-400 text-[10px] uppercase tracking-tighter font-semibold">Enabling Co-Host Camera...</p>
                    </div>
                  ) : null}
                  <div className="absolute top-4 left-4 bg-orange-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    CO-HOST
                    {isHost && (
                      <>
                        <button
                          type="button"
                          onClick={handleCoHostMuteToggle}
                          aria-label={isCoHostMuted ? 'Unmute co-host' : 'Mute co-host'}
                          title={isCoHostMuted ? 'Unmute co-host' : 'Mute co-host'}
                          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {isCoHostMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(coHostParticipant);
                          }}
                          aria-label="Remove co-host"
                          title="Remove co-host"
                          className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <UserMinus size={12} />
                        </button>
                      </>
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <div className="relative">
                <Loader className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-white font-bold uppercase tracking-widest text-xs animate-pulse">Establishing Connection...</p>
              <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-tighter">Joining the live room</p>
            </div>
          )}
        </div>

        {/* BOTTOM: Community & Chat */}
        <div className="flex-1 min-h-0 bg-slate-950 flex flex-col overflow-hidden">
          <div className="px-3 pt-2 pb-1 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageCircle size={15} className="text-yellow-300 shrink-0" />
              <h3 className="text-white font-bold text-xs uppercase tracking-wide truncate">Live comments</h3>
              <span className="text-[10px] text-white/40">({comments.length})</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {isModerator && (
                <button
                  type="button"
                  onClick={handleCommunityMuteAllToggle}
                  aria-label={isCommunityMuted ? 'Unmute all community microphones' : 'Mute all community microphones'}
                  title={isCommunityMuted ? 'Unmute all community microphones' : 'Mute all community microphones'}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-1 text-[9px] font-bold text-blue-200 hover:bg-white/10"
                >
                  {isCommunityMuted ? <Mic size={12} /> : <MicOff size={12} />}
                  <span className="hidden xs:inline">{isCommunityMuted ? 'Unmute all' : 'Mute all'}</span>
                </button>
              )}
              {isHost && <span className="text-[9px] text-blue-400 truncate">Tap a profile to co-host</span>}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5 space-y-1">
            {comments.length === 0 ? (
              <p className="py-3 text-center text-[11px] text-white/35">Be the first to comment</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-center gap-1.5 min-w-0">
                  <Avatar className="w-5 h-5 shrink-0 border border-white/10">
                    <AvatarImage src={comment.senderAvatar || undefined} alt={comment.senderName} />
                    <AvatarFallback className="bg-blue-600 text-white text-[8px] font-bold">
                      {getInitials(comment.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 text-[11px] leading-4 text-white/90 break-words">
                    <span className="font-bold text-yellow-200 mr-1">{comment.senderName}</span>
                    {comment.text}
                  </p>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <form onSubmit={handleSendComment} className="px-3 py-1.5 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              <input
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value.slice(0, 300))}
                placeholder="Say something..."
                aria-label="Type a live comment"
                className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white outline-none placeholder:text-white/35"
                maxLength={300}
              />
              <button
                type="submit"
                disabled={!commentDraft.trim() || !localParticipant}
                aria-label="Send comment"
                title="Send comment"
                className="rounded-full p-1.5 text-yellow-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send size={15} />
              </button>
            </div>
          </form>

          <div className="shrink-0 border-t border-white/5 px-3 pt-1.5 pb-2">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-bold text-xs uppercase tracking-wide">
                  Community ({communityMembers.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCommunityGridExpanded(!isCommunityGridExpanded)}
                  aria-label={isCommunityGridExpanded ? 'Collapse community grid' : 'Expand community grid'}
                  title={isCommunityGridExpanded ? 'Collapse community grid' : 'Expand community grid'}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                >
                  {isCommunityGridExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
              {isCommunityGridExpanded && (
                <span className="text-[9px] text-white/35">8 per row · scroll</span>
              )}
            </div>
            {communityMembers.length === 0 ? (
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCommunityGridExpanded ? 'max-h-[100px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex items-center justify-center py-3 text-center text-[10px] text-white/35">
                  Viewers will appear here
                </div>
              </div>
            ) : (
              <div className={`grid transition-all duration-300 ease-in-out ${isCommunityGridExpanded ? 'max-h-[110px] sm:max-h-[140px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'} grid-cols-6 sm:grid-cols-8 gap-x-1.5 gap-y-2 overflow-y-auto pr-0.5`}>
                {communityMembers.map((participant) => {
                  const participantMuted = mutedCommunityIds.has(participant.identity) || isCommunityMuted;
                  return (
                    <div
                      key={participant.identity}
                      onClick={() => isHost && handleProfileClick(participant)}
                      className={`relative flex min-w-0 flex-col items-center rounded-md py-1 transition-all ${
                        isHost ? 'cursor-pointer hover:bg-white/10' : ''
                      } ${coHostParticipant?.identity === participant.identity ? 'bg-orange-600/20 ring-1 ring-orange-500/50' : ''}`}
                    >
                      <Avatar className="h-8 w-8 border border-white/20">
                        <AvatarImage src={getParticipantAvatar(participant)} alt={participant.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-[9px] font-bold">
                          {getInitials(participant.name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-0.5 w-full truncate px-0.5 text-center text-[8px] font-semibold text-white/85">
                        {participant.name || 'User'}
                      </p>
                      {isModerator ? (
                        <button
                          type="button"
                          onClick={(event) => handleCommunityMuteToggle(event, participant)}
                          aria-label={participantMuted ? `Unmute ${participant.name}` : `Mute ${participant.name}`}
                          title={participantMuted ? `Unmute ${participant.name}` : `Mute ${participant.name}`}
                          className="absolute right-0 top-0 rounded-full bg-slate-950/80 p-0.5 text-white/80 hover:bg-white/10"
                        >
                          {participantMuted ? <MicOff size={9} /> : <Mic size={9} />}
                        </button>
                      ) : (
                        <Mic size={9} className={participantMuted ? 'text-red-300' : 'text-emerald-300'} aria-label="Microphone status" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
  hostUserId,
}: TikTokLiveStreamProps) {
  return (
    <LiveKitRoom
      video={isHost}
      audio={isHost}
      connect={true}
      token={token}
      serverUrl={serverUrl}
      onDisconnected={onClose}
      onError={(err) => {
        console.error('LiveKit Room Error:', err);
      }}
      suppressHydrationWarning
    >
      <RoomAudioRenderer />
      <StreamContent
        isHost={isHost}
        onClose={onClose}
        roomName={roomName}
        hostUserId={hostUserId}
      />
    </LiveKitRoom>
  );
}

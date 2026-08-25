import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { supabase } from '@/supabase';
import { useAuth } from './AuthContext';
import { slugify } from '@/lib/utils';
import { getApiUrl, PRODUCTION_URL } from '@/lib/api-config';

interface LiveSession {
  id: string;
  room_name: string;
  host_id: string;
  host_name: string;
  host_avatar?: string;
}

interface LiveKitContextType {
  isLiveModalOpen: boolean;
  isHosting: boolean;
  activeSessions: LiveSession[];
  liveRoomName: string | null;
  liveHostUserId: string | null;
  liveToken: string | null;
  streamError: string | null;
  openLiveModal: () => void;
  closeLiveModal: () => void;
  startHosting: (roomName: string, token: string) => void;
  stopHosting: () => void;
  joinSession: (roomName: string) => Promise<void>;
  clearSession: () => void;
  clearStreamError: () => void;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function LiveKitProvider({ children }: { children: ReactNode }) {
  const { user, displayName } = useAuth();
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
  const [liveRoomName, setLiveRoomName] = useState<string | null>(null);
  const [liveHostUserId, setLiveHostUserId] = useState<string | null>(null);
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching live sessions:', error);
      return;
    }
    
    // Optimization: Only update state if the session list has actually changed
    // to avoid triggering unnecessary re-renders across the entire app.
    const newData = data || [];
    setActiveSessions(prev => {
      if (prev.length !== newData.length) return newData;
      
      const hasChanges = newData.some((session, index) => {
        const prevSession = prev[index];
        return !prevSession || 
               prevSession.id !== session.id || 
               prevSession.host_id !== session.host_id ||
               prevSession.room_name !== session.room_name;
      });
      
      return hasChanges ? newData : prev;
    });
  }, []);

  // Clean up stale sessions (heartbeat older than 90 seconds or created older than 30 minutes)
  const cleanupStaleSessions = useCallback(async () => {
    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    // Deactivate sessions with missing heartbeats OR very old sessions
    const { error } = await supabase
      .from('live_sessions')
      .update({ is_active: false })
      .eq('is_active', true)
      .or(`last_heartbeat.lt.${ninetySecondsAgo},created_at.lt.${thirtyMinutesAgo}`);
    
    if (error) {
      console.error('Error cleaning up stale sessions:', error);
    } else {
      // Refresh sessions after cleanup
      fetchSessions();
    }
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessions();
    cleanupStaleSessions();

    // Subscribe to changes
    const channel = supabase
      .channel('live_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    // Set up periodic cleanup every 2 minutes (more aggressive)
    const cleanupInterval = setInterval(() => {
      cleanupStaleSessions();
    }, 2 * 60 * 1000);

    // Set up periodic session refresh every 10 seconds (faster updates)
    const refreshInterval = setInterval(() => {
      fetchSessions();
    }, 10 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
      clearInterval(refreshInterval);
    };
  }, [fetchSessions, cleanupStaleSessions]);

  // Heartbeat system for hosts
  useEffect(() => {
    if (!isHosting || !user || !liveRoomName) return;

    const sendHeartbeat = async () => {
      const { error } = await supabase
        .from('live_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('host_id', user.id)
        .eq('room_name', liveRoomName)
        .eq('is_active', true);

      if (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 30 * 1000); // Every 30 seconds
    return () => clearInterval(heartbeatInterval);
  }, [isHosting, user, liveRoomName]);

  const openLiveModal = useCallback(() => {
    setIsLiveModalOpen(true);
    console.log('Live modal opened');
  }, []);

  const closeLiveModal = useCallback(() => {
    setIsLiveModalOpen(false);
    console.log('Live modal closed');
  }, []);

  const startHosting = useCallback(async (roomName: string, token: string) => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      console.error(errorMsg);
      setStreamError(errorMsg);
      setIsLiveModalOpen(true);
      return;
    }

    try {
      setStreamError(null);
      
      // Register session in Supabase using the existing table schema
      const trimmedName = roomName.trim();
      const slugifiedRoomName = slugify(trimmedName);
      const { error } = await supabase.from('live_sessions').insert({
        room_name: slugifiedRoomName,
        host_id: user.id,
        host_name: displayName || 'Anonymous',
        is_active: true,
        host_avatar: user.user_metadata?.avatar_url || null,
        last_heartbeat: new Date().toISOString(),
      });

      if (error) {
        const errorMsg = `Failed to register session: ${error.message}`;
        console.error('Error registering live session:', error);
        setStreamError(errorMsg);
        // Reset modal state to allow retry
        setIsLiveModalOpen(true);
        return;
      }

      // Only set state if registration succeeded
      setLiveRoomName(slugifiedRoomName);
      setLiveHostUserId(user.id);
      setLiveToken(token);
      setIsHosting(true);
      setIsLiveModalOpen(false);
      console.log('Hosting stream:', roomName);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred while starting the stream';
      console.error('Error in startHosting:', err);
      setStreamError(errorMsg);
      // Reset modal state to allow retry
      setIsLiveModalOpen(true);
    }
  }, [user, displayName]);

  const stopHosting = useCallback(async () => {
    if (user && liveRoomName) {
      // Deactivate session in Supabase
      const { error } = await supabase
        .from('live_sessions')
        .update({ is_active: false })
        .eq('host_id', user.id)
        .eq('room_name', liveRoomName);
      
      if (error) {
        console.error('Error stopping hosting:', error);
      }
    }

    setLiveRoomName(null);
    setLiveHostUserId(null);
    setLiveToken(null);
    setIsHosting(false);
    setStreamError(null);
    console.log('Stream stopped');
  }, [user, liveRoomName]);

  // Add cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (isHosting && user && liveRoomName) {
        // Use sendBeacon for reliable cleanup on page close
        const data = new FormData();
        data.append('host_id', user.id);
        data.append('room_name', liveRoomName);
        navigator.sendBeacon(getApiUrl('/api/livekit/stop-hosting'), data);
        console.log('Stream cleanup on unload');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isHosting, user, liveRoomName]);

  const clearSession = useCallback(() => {
    setLiveRoomName(null);
    setLiveHostUserId(null);
    setLiveToken(null);
    setIsHosting(false);
    setStreamError(null);
    console.log('Session cleared');
  }, []);

  const clearStreamError = useCallback(() => {
    setStreamError(null);
  }, []);

  const joinSession = useCallback(async (roomName: string) => {
    if (!roomName) {
      clearSession();
      return;
    }
    
    try {
      setStreamError(null);
      const slugifiedRoomName = slugify(roomName);
      
      // OPTIMIZATION: Check if we already have this session in our local activeSessions list
      // This saves a Supabase round-trip when joining from the UI list
      let session = activeSessions.find(s => s.room_name === slugifiedRoomName || s.room_name === roomName);
      
      if (!session) {
        // Only if not found locally, check Supabase
        const { data: sessionData, error: sessionError } = await supabase
          .from('live_sessions')
          .select('*')
          .or(`room_name.eq.${slugifiedRoomName},room_name.eq.${roomName}`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (sessionError || !sessionData || sessionData.length === 0) {
          const errorMsg = sessionError ? `Error fetching session: ${sessionError.message}` : 'The stream is no longer active.';
          setStreamError(errorMsg);
          clearSession();
          throw new Error(errorMsg);
        }
        session = sessionData[0];
      }

      // Start fetching token immediately using the current authenticated session.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const apiUrl = `${PRODUCTION_URL}/api/livekit/token`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          roomName: slugifiedRoomName,
          isHost: false,
        }),
      });

      const responseText = await response.text();
      let responseData: { token?: string; identity?: string; metadata?: unknown; error?: string };
      try {
        responseData = JSON.parse(responseText) as typeof responseData;
      } catch {
        throw new Error(`Live stream service returned an unexpected response (HTTP ${response.status}). Please try again.`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const token = responseData.token;
      if (!token) {
        throw new Error('No token received from server');
      }
      const { identity, metadata } = responseData;
      setLiveRoomName(slugifiedRoomName);
      setLiveHostUserId(session?.host_id || null);
      setLiveToken(token);
      setIsHosting(false); // We are viewing, not hosting
      console.log('Joined stream with identity:', identity, 'metadata:', metadata);
    } catch (error) {
      console.error('Error joining session:', error);
      let errorMsg = 'Failed to join session';
      if (error instanceof Error) {
        errorMsg = error.message;
        if (errorMsg === 'Failed to fetch') {
          errorMsg = 'Connection failed. Please check your internet or try again later.';
        }
      }
      setStreamError(errorMsg);
      clearSession();
      // Re-throw so the UI can catch and display the error
      throw error;
    }
  }, [displayName, user, clearSession]);

  return (
    <LiveKitContext.Provider
      value={{
        isLiveModalOpen,
        isHosting,
        activeSessions,
        liveRoomName,
        liveHostUserId,
        liveToken,
        streamError,
        openLiveModal,
        closeLiveModal,
        startHosting,
        stopHosting,
        joinSession,
        clearSession,
        clearStreamError,
      }}
    >
      {children}
    </LiveKitContext.Provider>
  );
}

export function useLiveKit() {
  const ctx = useContext(LiveKitContext);
  if (ctx === undefined)
    throw new Error('useLiveKit must be used within a LiveKitProvider');
  return ctx;
}

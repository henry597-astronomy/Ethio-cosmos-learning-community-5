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
  liveToken: string | null;
  openLiveModal: () => void;
  closeLiveModal: () => void;
  startHosting: (roomName: string, token: string) => void;
  stopHosting: () => void;
  joinSession: (roomName: string) => Promise<void>;
  clearSession: () => void;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function LiveKitProvider({ children }: { children: ReactNode }) {
  const { user, displayName } = useAuth();
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
  const [liveRoomName, setLiveRoomName] = useState<string | null>(null);
  const [liveToken, setLiveToken] = useState<string | null>(null);

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
    setActiveSessions(data || []);
  }, []);

  // Clean up stale sessions (older than 30 minutes)
  const cleanupStaleSessions = useCallback(async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('live_sessions')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('created_at', thirtyMinutesAgo);
    
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

    // Set up periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(() => {
      cleanupStaleSessions();
    }, 5 * 60 * 1000);

    // Set up periodic session refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchSessions();
    }, 30 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
      clearInterval(refreshInterval);
    };
  }, [fetchSessions, cleanupStaleSessions]);

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
      console.error('User not authenticated');
      return;
    }

    try {
      // Register session in Supabase
      const { error } = await supabase.from('live_sessions').insert({
        room_name: roomName,
        host_id: user.id,
        host_name: displayName || 'Anonymous',
        is_active: true,
        host_avatar: user.user_metadata?.avatar_url || null,
      });

      if (error) {
        console.error('Error registering live session:', error);
        throw new Error(`Failed to register session: ${error.message}`);
      }

      // Only set state if registration succeeded
      setLiveRoomName(roomName);
      setLiveToken(token);
      setIsHosting(true);
      setIsLiveModalOpen(false);
      console.log('Hosting stream:', roomName);
    } catch (err) {
      console.error('Error in startHosting:', err);
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
    setLiveToken(null);
    setIsHosting(false);
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
        navigator.sendBeacon('/api/livekit/stop-hosting', data);
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
    setLiveToken(null);
    setIsHosting(false);
    console.log('Session cleared');
  }, []);

  const joinSession = useCallback(async (roomName: string) => {
    if (!roomName) {
      clearSession();
      return;
    }
    
    try {
      // First, verify the session is still active in the database
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('room_name', roomName)
        .eq('is_active', true);

      // Handle multiple results (should not happen with unique constraint, but be defensive)
      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        clearSession();
        return;
      }

      if (!sessionData || sessionData.length === 0) {
        console.error('Session not found or inactive');
        clearSession();
        return;
      }

      // If multiple sessions exist for same room, sort to find the most recent
      sessionData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: displayName || 'Viewer',
          roomName: roomName,
          isHost: false,
          avatarUrl: user?.user_metadata?.avatar_url || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get token');
      }
      
      const { token, identity, metadata } = await response.json();
      setLiveRoomName(roomName);
      setLiveToken(token);
      setIsHosting(false); // We are viewing, not hosting
      console.log('Joined stream with identity:', identity, 'metadata:', metadata);
    } catch (error) {
      console.error('Error joining session:', error);
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
        liveToken,
        openLiveModal,
        closeLiveModal,
        startHosting,
        stopHosting,
        joinSession,
        clearSession,
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

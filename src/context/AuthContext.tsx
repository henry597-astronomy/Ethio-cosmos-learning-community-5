import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { getGravatarUrl } from '@/lib/gravatar';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  profile: UserProfile | null;
  loading: boolean;          // Legacy loading state (for backward compatibility)
  isProcessingAuth: boolean; // true during the jump back from Google/OAuth
  authReady: boolean;        // true once session is confirmed (near-instant)
  profileLoading: boolean;   // true while fetching DB profile
  isAdmin: boolean;
  isSuperAdmin: boolean;     // true if user is henokgirma648@gmail.com (super admin)
  isBlocked: boolean;        // true if user is blocked
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (fields: { username?: string | null; bio?: string | null }) => Promise<void>;
  avatarUrl: string | null;   // Uploaded avatar or Gravatar derived from email (email never exposed)
  displayName: string;
  totalUsersCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const mountedRef = useRef(true);

  // Derive a display name synchronously.
  const displayName =
    profile?.username ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'User';

  const isAdmin = profile?.role === 'admin';
  const isSuperAdmin = user?.email === 'henokgirma648@gmail.com';
  const isBlocked = profile?.is_blocked === true;

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('id, username, bio, email, avatar_url, role, created_at, updated_at, is_blocked')
        .eq('id', userId)
        .maybeSingle();

      // Some older OAuth accounts predate the profile trigger. Repair only the
      // current authenticated account through a SECURITY DEFINER RPC, then
      // reload it. This never accepts a client-supplied profile ID or role.
      if (!error && !data) {
        const { error: repairError } = await supabase.rpc('ensure_current_profile');
        if (repairError) {
          console.warn('Profile repair warning:', repairError.message);
        } else {
          const repaired = await supabase
            .from('profiles')
            .select('id, username, bio, email, avatar_url, role, created_at, updated_at, is_blocked')
            .eq('id', userId)
            .maybeSingle();
          data = repaired.data;
          error = repaired.error;
        }
      }

      if (!mountedRef.current) return;

      if (error) {
        console.warn('Profile fetch warning:', error.message);
        return;
      }
      if (data) {
        setProfile(data as UserProfile);
      }
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  const applySession = useCallback(
    (session: Session | null) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAccessToken(session?.access_token ?? null);

      if (nextUser) {
        // Build optimistic profile from metadata
        const metadata = nextUser.user_metadata;
        const optimisticProfile: UserProfile = {
          id: nextUser.id,
          email: nextUser.email || '',
          bio: null,
          username: metadata?.full_name || metadata?.name || (nextUser.email ? nextUser.email.split('@')[0] : 'User'),
          avatar_url: (metadata?.avatar_url as string | undefined) || null,
          role: 'user', // Default to user until DB confirms
          created_at: nextUser.created_at,
          updated_at: new Date().toISOString(),
          is_blocked: false, // Default to not blocked until DB confirms
        };
        setProfile(optimisticProfile);
        
        // If user signed in with Google, immediately update their avatar/name
        // in the DB so it's always fresh. Use UPDATE only (not upsert) because
        // RLS has no INSERT policy for clients — the trigger handles new inserts.
        const avatarUrl = metadata?.avatar_url as string | undefined;
        const fullName = metadata?.full_name as string | undefined || metadata?.name as string | undefined;
        if (avatarUrl || fullName) {
          supabase
            .from('profiles')
            .update({
              avatar_url: avatarUrl || null,
              username: fullName || (nextUser.email ? nextUser.email.split('@')[0] : 'User'),
            })
            .eq('id', nextUser.id)
            .then(() => {/* silent - fetchProfile will read the updated row */});
        }

        // Fetch real profile in background
        fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    },
    [fetchProfile]
  );

  // Handle deep links for mobile OAuth
  const handleDeepLink = useCallback(async (data: { url: string }) => {
    const urlString = data.url;
    if (!urlString) return;

    setIsProcessingAuth(true);
    try {
      await Browser.close();
      const url = new URL(urlString);
      
      // 1. Check for access_token (Implicit Flow)
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        return;
      }

      // 2. Check for code (PKCE Flow)
      const code = url.searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }
    } catch (err) {
      console.error('Deep link error:', err);
    } finally {
      // Small safety timeout to ensure session is applied before removing overlay
      setTimeout(() => {
        if (mountedRef.current) setIsProcessingAuth(false);
      }, 1500);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Listen for auth state changes globally
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        applySession(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        setProfile(null);
        setAuthReady(true);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (mountedRef.current) applySession(data.session);
    });

    // Check if app was launched by a deep link
    CapApp.getLaunchUrl().then((data) => {
      if (data?.url) handleDeepLink(data);
    });

    // Mobile specific listeners
    const deepLinkListener = CapApp.addListener('appUrlOpen', (data) => {
      handleDeepLink(data);
    });
    
    const stateChangeListener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        supabase.auth.getSession().then(({ data }) => {
          if (mountedRef.current && data.session) applySession(data.session);
        });
      }
    });

    // Fetch Total Registered Users
    const fetchTotalUsers = async () => {
      try {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (mountedRef.current) setTotalUsersCount(count || 0);
      } catch (err) {
        console.error('Error fetching total users:', err);
      }
    };
    fetchTotalUsers();

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
      deepLinkListener.then(l => l.remove());
      stateChangeListener.then(l => l.remove());
    };
  }, [applySession, handleDeepLink]);

  const signInWithGoogle = useCallback(async () => {
    const isMobile = Capacitor.isNativePlatform();
    // Direct deep link redirect for mobile to ensure immediate return to app
    const redirectTo = isMobile 
      ? 'com.ethiocosmos.learning://login' 
      : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo,
        skipBrowserRedirect: isMobile,
      },
    });
    
    if (error) throw error;

    if (isMobile && data?.url) {
      await Browser.open({ url: data.url });
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      applySession(data.session ?? null);
    },
    [applySession]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, username?: string) => {
      const isMobile = Capacitor.isNativePlatform();
      const redirectTo = isMobile 
        ? 'com.ethiocosmos.learning://login' 
        : window.location.origin;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: username ? { username, full_name: username } : undefined,
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;

      if (data.session) {
        applySession(data.session);
        return { needsEmailConfirmation: false };
      }
      return { needsEmailConfirmation: true };
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      // Remove all realtime subscriptions first to prevent signOut from hanging
      await supabase.removeAllChannels();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during signOut:', error);
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const updateProfile = useCallback(
    async (fields: { username?: string | null; bio?: string | null }) => {
      if (!user) throw new Error('Not signed in');

      // Persist to the database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: fields.username,
          bio: fields.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;

      // Refresh the local profile
      await fetchProfile(user.id);
    },
    [user, fetchProfile]
  );

  // Fallback avatar derived from the user's email (Gravatar). Kept private —
  // Gravatar keys avatars by MD5 hash, so the raw email is never exposed.
  const avatarUrl = profile?.avatar_url || (user?.email ? getGravatarUrl(user.email) : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        profile,
        loading: !authReady,
        isProcessingAuth,
        authReady,
        profileLoading,
        isAdmin,
        isSuperAdmin,
        isBlocked,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        updateProfile,
        avatarUrl,
        displayName,
        totalUsersCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

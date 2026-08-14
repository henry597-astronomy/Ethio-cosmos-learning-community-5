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

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;          // Legacy loading state (for backward compatibility)
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, bio, email, avatar_url, role, created_at, updated_at, is_blocked')
        .eq('id', userId)
        .maybeSingle();

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

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mountedRef.current) return;
        applySession(data.session ?? null);
      })
      .catch((e) => {
        console.error('getSession error:', e);
        if (mountedRef.current) setAuthReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        applySession(session);
        // Force home redirect on mobile after successful login
        const isMobile = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
        if (event === 'SIGNED_IN' && isMobile) {
          setTimeout(() => {
            window.location.hash = '/';
          }, 500);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAuthReady(true);
      }
    });

    // Fetch Total Registered Users
    const fetchTotalUsers = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        if (mountedRef.current) setTotalUsersCount(count || 0);
      } catch (err) {
        console.error('Error fetching total users:', err);
      }
    };

    fetchTotalUsers();

    // Handle deep links for mobile OAuth
    const handleDeepLink = async (data: any) => {
      const urlString = data.url;
      if (!urlString) return;

      try {
        // Close native browser if open
        await Browser.close();

        // Manual robust parsing for deep link tokens
        let access_token = null;
        let refresh_token = null;

        // Try parsing tokens from hash or query
        const parts = urlString.split(/[#?]/);
        if (parts.length > 1) {
          const params = new URLSearchParams(parts[1]);
          access_token = params.get('access_token');
          refresh_token = params.get('refresh_token');
        }

        if (access_token && refresh_token) {
          const { data: sessionData, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (!error && sessionData.session) {
            applySession(sessionData.session);
          }
        }
      } catch (err) {
        console.error('Deep link error:', err);
      }
    };

    const deepLinkListener = CapApp.addListener('appUrlOpen', handleDeepLink);

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
      deepLinkListener.then(l => l.remove());
    };
  }, [applySession]);

  const signInWithGoogle = useCallback(async () => {
    // For mobile (Capacitor), we use a custom URL scheme to redirect back to the app.
    // The user must add 'com.ethiocosmos.learning://login' to their Supabase Redirect URLs.
    const isMobile = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
    const redirectTo = isMobile 
      ? 'com.ethiocosmos.learning://login' 
      : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: ({ 
        redirectTo,
        skipBrowserRedirect: isMobile,
        // Implicit flow is more reliable for mobile deep-linking as it doesn't
        // rely on shared localStorage for the PKCE verifier.
        flowType: isMobile ? 'implicit' : 'pkce',
      } as any),
    });
    
    if (error) throw error;

    // If on mobile, manually open the browser to handle the OAuth flow
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
      const isMobile = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
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
        profile,
        loading: !authReady, // Map legacy loading to authReady
        authReady,
        profileLoading,
        isAdmin,
        isSuperAdmin,
        isBlocked,
        displayName,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        updateProfile,
        avatarUrl,
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

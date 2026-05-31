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
  displayName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
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
        .select('id, username, email, avatar_url, role, created_at, updated_at, is_blocked')
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
        console.log('[Auth] Initial session check:', data.session ? 'Session found' : 'No session');
        applySession(data.session ?? null);
      })
      .catch((e) => {
        console.error('getSession error:', e);
        if (mountedRef.current) setAuthReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event, session ? 'Session active' : 'No session');
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        applySession(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAuthReady(true);
      }
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signInWithGoogle = useCallback(async () => {
    // Determine the redirect URL. If we're on Vercel, use the window.location.origin.
    // This ensures that the redirect goes back to the same domain (e.g., the .vercel.app one).
    const redirectUrl = window.location.origin + '/login';
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    if (error) throw error;
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: username ? { username, full_name: username } : undefined,
          emailRedirectTo: window.location.origin,
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

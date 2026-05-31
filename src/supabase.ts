import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Boolean flag the rest of the app uses to detect a missing/incomplete .env.
// Both names are exported so existing imports keep working without rewrites.
export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey);
export const isValidConfig: boolean = isSupabaseConfigured;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Surface the misconfiguration loudly in dev so it's easy to spot.
  // We do NOT throw here, because that would crash the entire bundle and
  // prevent the login screen from ever rendering.
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
      'Auth and data calls will fail until your .env is configured.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type SupabaseClient = typeof supabase;

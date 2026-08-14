import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

// Real production credentials as absolute fallbacks for mobile builds
const PROD_URL = 'https://pnkmnbgjrrfhmuhwdwke.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBua21uYmdqcnJmaG11aHdkd2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTUyMzksImV4cCI6MjA5MzEzMTIzOX0.XvsCANQb3vbsl5_cvIHItYrq87d24tum7JBP4hxnXm0';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// A configuration is valid only if it's not the placeholder
export const isSupabaseConfigured = Boolean(
  envUrl && 
  envKey && 
  !envUrl.includes('placeholder') &&
  envUrl.includes('.')
);

export const isValidConfig = isSupabaseConfigured;

// Use environment variables if valid, otherwise fallback to hardcoded production keys
const finalUrl = isSupabaseConfigured ? envUrl : PROD_URL;
const finalKey = isSupabaseConfigured ? envKey : PROD_KEY;

// Custom storage for Capacitor to ensure session persistence across browser jumps
const capacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: capacitorStorage as any,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type SupabaseClient = typeof supabase;

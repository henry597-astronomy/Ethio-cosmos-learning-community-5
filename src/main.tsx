import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as CapApp } from '@capacitor/app';
import { supabase } from '@/supabase';
import './index.css'
import { disableLongPressContextMenu } from '@/lib/disable-long-press';

// Offline content is downloaded only after the user explicitly chooses
// “Download for offline” in the app update prompt.

// Disable long-press context menu to make PWA feel like native app
disableLongPressContextMenu();

// Handle deep links for Supabase OAuth on mobile
if (typeof window !== 'undefined') {
  CapApp.addListener('appUrlOpen', async (data: any) => {
    try {
      const url = new URL(data.url);
      // Supabase OAuth tokens are in the hash fragment
      const hash = url.hash.substring(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        }
      }
    } catch (err) {
      console.error('Deep link error:', err);
    }
  });
}

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

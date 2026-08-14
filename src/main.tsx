import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
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
      
      // Close the browser when returning to the app
      await Browser.close();

      // Supabase OAuth tokens can be in the hash fragment or query string
      let access_token = null;
      let refresh_token = null;

      // Check hash first (Supabase default)
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        access_token = hashParams.get('access_token');
        refresh_token = hashParams.get('refresh_token');
      }

      // Fallback to query parameters
      if (!access_token) {
        access_token = url.searchParams.get('access_token');
        refresh_token = url.searchParams.get('refresh_token');
      }

      if (access_token && refresh_token) {
        console.log('Deep link: setting session');
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        
        if (error) {
          console.error('Deep link: setSession error', error.message);
        } else {
          // Force a small delay and then redirect to home if not already there
          setTimeout(() => {
            window.location.href = '#/';
          }, 100);
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

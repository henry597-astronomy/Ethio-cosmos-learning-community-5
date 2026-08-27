import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { disableLongPressContextMenu } from '@/lib/disable-long-press';
import { setupOnlineListener } from '@/lib/background-prefetch';

// Offline content is downloaded only after the user explicitly chooses a topic
// or material download action; reconnect never starts a global download.

// Disable long-press context menu to make PWA feel like native app
disableLongPressContextMenu();
setupOnlineListener();

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

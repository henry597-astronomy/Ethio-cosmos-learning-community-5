import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setupOnlineListener } from '@/lib/background-prefetch';
import { disableLongPressContextMenu } from '@/lib/disable-long-press';

// Initialize automatic background prefetching
setupOnlineListener();

// Disable long-press context menu to make PWA feel like native app
disableLongPressContextMenu();
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

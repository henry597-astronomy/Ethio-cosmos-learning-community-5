import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { disableLongPressContextMenu } from '@/lib/disable-long-press';

// Offline content is downloaded only after the user explicitly chooses
// “Download for offline” in the app update prompt.

// Disable long-press context menu to make PWA feel like native app
disableLongPressContextMenu();

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

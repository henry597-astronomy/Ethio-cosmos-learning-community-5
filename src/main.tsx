import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setupOnlineListener } from '@/lib/background-prefetch';

// Initialize automatic background prefetching
setupOnlineListener();
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

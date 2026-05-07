// EthioCosmos Service Worker
// Strategy: Network-first for API/Supabase calls, Cache-first for static assets
const CACHE_NAME = 'ethio-cosmos-v4';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './images/school-logo.jpg',
];

// These origins must NEVER be intercepted — Supabase & Google OAuth need direct network
const BYPASS_ORIGINS = [
  'supabase.co',
  'supabase.in',
  'googleapis.com',
  'google.com',
  'accounts.google.com',
];

function shouldBypass(url) {
  return BYPASS_ORIGINS.some(origin => url.includes(origin));
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// ── Activate (clean old caches) ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // 1. Never intercept non-GET requests (POST/PUT/DELETE to Supabase etc.)
  if (request.method !== 'GET') return;

  // 2. Never intercept Supabase, Google OAuth, or any external API
  if (shouldBypass(url)) return;

  // 3. SPA navigation — always serve index.html from cache or network
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. Static assets — cache-first, fall back to network
  event.respondWith(
    caches.match(request).then(
      (cached) => cached || fetch(request).then((response) => {
        // Only cache successful same-origin responses
        if (
          response.ok &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
    )
  );
});

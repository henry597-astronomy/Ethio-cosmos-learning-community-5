// EthioCosmos Service Worker
// Strategy: Network-first for API/Supabase calls, Cache-first for static assets
// Enhanced: Offline support for learning page, homepage, about page, and lessons

const CACHE_NAME = 'ethio-cosmos-v8';
const API_CACHE_NAME = 'ethio-cosmos-api-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './images/school-logo.jpg',
  './images/chat-bg-new.jpg',
  './images/hero-bg-new.jpg',
  './images/about-hero.jpg',
  './images/learning-hero.jpg',
  './images/mission.jpg',
  './images/who-we-are-1.jpg',
  './images/who-we-are-2.jpg',
  './images/topic-fundamentals.jpg',
  './images/icon-192.png',
  './images/icon-512.png',
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

// Check if URL is a CMS API call (site_content, topics, subtopics, or lessons endpoint)
function isCmsApiCall(url) {
  const cmsTables = ['site_content', 'topics', 'subtopics', 'lessons'];
  return cmsTables.some(table => url.includes(table)) && url.includes('supabase');
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
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
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

  // 2. Never intercept Supabase Auth, Google OAuth, or any external API
  // However, we DO want to intercept Supabase REST calls for CMS data
  if (shouldBypass(url) && !isCmsApiCall(url)) return;

  // 3. SPA navigation — always serve index.html from cache or network
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. CMS API calls — network-first with cache fallback
  if (isCmsApiCall(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cached response if offline
          return caches.match(request);
        })
    );
    return;
  }

  // 5. Static assets & others — cache-first, fall back to network
  event.respondWith(
    caches.match(request).then(
      (cached) => cached || fetch(request).then((response) => {
        // Only cache successful same-origin responses or images
        if (
          response.ok &&
          (response.type === 'basic' || (response.type === 'opaque' && url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
    )
  );
});

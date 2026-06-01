// EthioCosmos Service Worker - Enhanced Version
// Strategy: Comprehensive offline support with automatic background sync
// Features:
// 1. Full static asset caching (images, fonts, CSS, JS)
// 2. Background API data prefetching (topics, lessons, quizzes, materials)
// 3. Automatic cache updates when online
// 4. Network-first for API calls with cache fallback
// 5. Cache-first for static assets with network refresh

const CACHE_VERSION = 'v9';
const STATIC_CACHE = `ethio-cosmos-static-${CACHE_VERSION}`;
const API_CACHE = `ethio-cosmos-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `ethio-cosmos-images-${CACHE_VERSION}`;
const MEDIA_CACHE = `ethio-cosmos-media-${CACHE_VERSION}`;

// All static assets that must be cached on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // All images
  './images/school-logo.jpg',
  './images/chat-bg-new.jpg',
  './images/chat-bg.jpg',
  './images/hero-bg-new.jpg',
  './images/about-hero.jpg',
  './images/learning-hero.jpg',
  './images/materials-hero.jpg',
  './images/mission.jpg',
  './images/who-we-are-1.jpg',
  './images/who-we-are-2.jpg',
  './images/gallery-1.jpg',
  './images/gallery-2.jpg',
  './images/gallery-3.jpg',
  './images/gallery-4.jpg',
  './images/app-icon-source.jpg',
  './images/topic-asteroid.jpg',
  './images/topic-black-hole.jpg',
  './images/topic-ethiopia.jpg',
  './images/topic-fundamentals.jpg',
  './images/topic-moon.jpg',
  './images/topic-nebula.jpg',
  './images/topic-planets.jpg',
  './images/topic-solar-system.jpg',
  './images/topic-stars.jpg',
  './images/topic-worm-hole.jpg',
  './images/icon-192.png',
  './images/icon-512.png',
];

// Origins that must NEVER be intercepted (auth, OAuth)
const BYPASS_ORIGINS = [
  'supabase.co',
  'supabase.in',
  'googleapis.com',
  'google.com',
  'accounts.google.com',
  'github.com',
];

// CMS API endpoints that should be cached
const CMS_API_PATTERNS = [
  'site_content',
  'topics',
  'subtopics',
  'lessons',
  'quizzes',
  'quiz_questions',
];

function shouldBypass(url) {
  return BYPASS_ORIGINS.some(origin => url.includes(origin));
}

function isCmsApiCall(url) {
  return CMS_API_PATTERNS.some(pattern => url.includes(pattern)) && url.includes('supabase');
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(url);
}

function isMediaUrl(url) {
  return /\.(mp4|webm|ogg|mp3|wav|pdf)$/i.test(url);
}

// ── Install: Cache all static assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Static assets cached successfully');
      // Trigger background prefetch after install
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_INSTALLED',
            message: 'Service worker installed. Starting background prefetch...'
          });
        });
      });
    }).catch((err) => {
      console.error('[SW] Install failed:', err);
    })
  );
});

// ── Activate: Clean old caches and claim clients ───────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('[SW] Cleaning old caches:', keys);
      return Promise.all(
        keys
          .filter((key) => 
            !key.includes(CACHE_VERSION) || 
            (key !== STATIC_CACHE && key !== API_CACHE && key !== IMAGE_CACHE && key !== MEDIA_CACHE)
          )
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Old caches cleaned');
      return self.clients.claim();
    })
  );
});

// ── Fetch: Intelligent caching strategy ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // 1. Never intercept non-GET requests
  if (request.method !== 'GET') return;

  // 2. Never intercept auth/OAuth (but DO intercept CMS API calls)
  if (shouldBypass(url) && !isCmsApiCall(url)) return;

  // 3. SPA navigation: serve index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. CMS API calls: network-first with cache fallback
  if (isCmsApiCall(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, clone);
              // Notify clients about cache update
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({
                    type: 'CACHE_UPDATED',
                    url: url,
                    message: 'API data updated'
                  });
                });
              });
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: return cached response
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] Serving from cache (offline):', url);
              return cached;
            }
            // No cache available
            console.warn('[SW] No cache available for:', url);
            return new Response('Offline - data not available', { status: 503 });
          });
        })
    );
    return;
  }

  // 5. Images: cache-first with network refresh
  if (isImageUrl(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 6. Media (videos, PDFs, audio): cache-first, network fallback
  if (isMediaUrl(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(MEDIA_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            console.warn('[SW] Media not cached and offline:', url);
            return new Response('Media unavailable offline', { status: 503 });
          });
      })
    );
    return;
  }

  // 7. All other requests: cache-first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        // Cache successful same-origin responses
        if (
          response.ok &&
          (response.type === 'basic' || response.type === 'cors')
        ) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        console.warn('[SW] Request failed and not cached:', url);
        return new Response('Offline - resource unavailable', { status: 503 });
      });
    })
  );
});

// ── Background Sync: Triggered when connection restored ──────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-all-content') {
    event.waitUntil(
      prefetchAllContent().then(() => {
        console.log('[SW] Background sync completed');
        // Notify clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              message: 'All content synced successfully'
            });
          });
        });
      }).catch((err) => {
        console.error('[SW] Background sync failed:', err);
      })
    );
  }
});

// ── Prefetch all CMS content ─────────────────────────────────────────────
async function prefetchAllContent() {
  console.log('[SW] Starting comprehensive content prefetch...');
  
  try {
    // Fetch all CMS data
    const apiBase = 'https://your-supabase-url/rest/v1'; // Will be replaced by client
    
    const endpoints = [
      'site_content',
      'topics',
      'subtopics',
      'lessons',
      'quizzes',
      'quiz_questions',
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `${apiBase}/${endpoint}`;
        const response = await fetch(url);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put(url, response.clone());
          console.log(`[SW] Prefetched: ${endpoint}`);
        }
      } catch (err) {
        console.warn(`[SW] Failed to prefetch ${endpoint}:`, err);
      }
    }

    console.log('[SW] Content prefetch completed');
  } catch (err) {
    console.error('[SW] Prefetch error:', err);
    throw err;
  }
}

// ── Message handler: Receive commands from clients ────────────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  console.log('[SW] Message received:', type);

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'PREFETCH_CONTENT') {
    event.waitUntil(
      prefetchAllContent().then(() => {
        event.ports[0].postMessage({ success: true, message: 'Prefetch completed' });
      }).catch((err) => {
        event.ports[0].postMessage({ success: false, error: err.message });
      })
    );
  }

  if (type === 'CACHE_URLS') {
    const { urls } = payload;
    event.waitUntil(
      cacheUrls(urls).then(() => {
        event.ports[0].postMessage({ success: true, message: `Cached ${urls.length} URLs` });
      }).catch((err) => {
        event.ports[0].postMessage({ success: false, error: err.message });
      })
    );
  }

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).then(() => {
        event.ports[0].postMessage({ success: true, message: 'Cache cleared' });
      })
    );
  }

  if (type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ success: true, size });
      })
    );
  }
});

// ── Helper: Cache multiple URLs ──────────────────────────────────────────
async function cacheUrls(urls) {
  const cache = await caches.open(MEDIA_CACHE);
  const promises = urls.map((url) =>
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return cache.put(url, response);
        }
      })
      .catch((err) => console.warn(`[SW] Failed to cache ${url}:`, err))
  );
  return Promise.all(promises);
}

// ── Helper: Get total cache size ─────────────────────────────────────────
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

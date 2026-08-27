// EthioCosmos Service Worker
// Strategy: fast app-shell startup plus explicit media caching only.
// Official structured data is controlled by the app’s IndexedDB manifest.

const CACHE_VERSION = 'v18';
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
  './images/school-logo.png',
  './images/chat-bg-new.jpg',
  './images/chat-bg.jpg',
  './images/hero-bg-new.jpg',
  './images/hero-bg-new.png',
  './images/navbar-logo.png',
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

// Discover hashed Vite bundles from the current HTML so new builds boot offline.
async function getBuildAssets() {
  try {
    const response = await fetch('./index.html', { cache: 'no-store' });
    if (!response.ok) return [];
    const html = await response.text();
    const assets = [];
    const pattern = /(?:src|href)=["']([^"']+\/assets\/[^"']+)["']/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      assets.push(match[1]);
    }
    return [...new Set(assets)];
  } catch (error) {
    console.warn('[SW] Could not discover build assets:', error);
    return [];
  }
}

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
const PUBLIC_API_PATTERNS = [
  'site_content',
  'topics',
  'subtopics',
  'lessons',
  'space_news',
  'live_sessions',
  'shorts',
];

// These reads are tied to the signed-in user. They are cached only under a
// user-scoped cache key so one account can never receive another account's data.
const PRIVATE_API_PATTERNS = [
  'profiles',
  'user_progress',
  'bookmarks',
  'chat_messages',
];

function shouldBypass(url) {
  return BYPASS_ORIGINS.some(origin => url.includes(origin));
}

function matchesApiPattern(url, patterns) {
  return url.includes('/rest/v1/') && url.includes('supabase') && patterns.some(pattern => url.includes(`/${pattern}`));
}

function isPublicApiCall(url) {
  return matchesApiPattern(url, PUBLIC_API_PATTERNS);
}

function isPrivateApiCall(url) {
  return matchesApiPattern(url, PRIVATE_API_PATTERNS);
}

function getAuthScope(request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return 'public';

  const token = authorization.replace(/^Bearer\s+/i, '');
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    if (payload.role === 'anon') return 'public';
    return payload.sub ? `user-${payload.sub}` : null;
  } catch {
    return null;
  }
}

function getApiCacheKey(request, requiresUserScope) {
  const scope = getAuthScope(request);
  if (requiresUserScope && (!scope || scope === 'public')) return null;

  if (!scope || scope === 'public') return request;

  const scopedUrl = new URL(request.url);
  scopedUrl.searchParams.set('__offline_user', scope);
  return new Request(scopedUrl.toString(), { method: 'GET' });
}

async function findCachedApiResponse(cacheKey) {
  const cache = await caches.open(API_CACHE);
  const exact = await cache.match(cacheKey);
  if (exact) return exact;

  const target = new URL(cacheKey.url);
  const targetScope = target.searchParams.get('__offline_user');
  const keys = await cache.keys();
  for (const key of keys) {
    const candidate = new URL(key.url);
    if (
      candidate.origin === target.origin &&
      candidate.pathname === target.pathname &&
      candidate.searchParams.get('__offline_user') === targetScope
    ) {
      const fallback = await cache.match(key);
      if (fallback) return fallback;
    }
  }
  return undefined;
}

function getUrlPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0];
  }
}

function isStorageAssetUrl(url) {
  return url.includes('/storage/v1/object/');
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(getUrlPath(url));
}

function isMediaUrl(url) {
  return /\.(mp4|webm|ogg|mp3|wav|pdf|m3u8)$/i.test(getUrlPath(url));
}

// ── Install: Cache all static assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  // Activate updates immediately so the website cannot remain on an old
  // cached bundle or download endpoint after a production deployment.
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets and current build bundles...');
      return getBuildAssets().then((buildAssets) => {
        const assetsToCache = [...new Set([...STATIC_ASSETS, ...buildAssets])];
        return cacheAssetsIfNeeded(cache, assetsToCache).then((results) => {
          const failed = results.filter((result) => result.status === 'rejected').length;
          if (failed > 0) {
            console.warn(`[SW] ${failed} optional assets were not cached during install`);
          }
        });
      });
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

  // APK downloads must always reach the Vercel streaming proxy. Never cache
  // them, otherwise a previously downloaded APK can be served indefinitely.
  if (getUrlPath(url) === '/api/download/apk') return;

  // 2. Never intercept auth/OAuth or unrelated third-party requests.
  // Supabase REST reads are allowed through the public/private cache paths below.
  if (
    shouldBypass(url) &&
    !isPublicApiCall(url) &&
    !isPrivateApiCall(url) &&
    !isStorageAssetUrl(url)
  ) return;

  // 3. SPA navigation: serve the app shell so every client-side route opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const shell = await caches.match(new URL('./index.html', self.location.origin).toString())
            || await caches.match('./index.html');
          return shell || new Response('Offline - app shell unavailable', { status: 503 });
        })
    );
    return;
  }

  // 4. All read-only Supabase REST data: network-first with offline fallback.
  // Public requests use a shared cache key; authenticated requests are scoped
  // to the JWT subject to keep offline data isolated between accounts.
  if (isPublicApiCall(url) || isPrivateApiCall(url)) {
    const requiresUserScope = isPrivateApiCall(url);
    const cacheKey = getApiCacheKey(request, requiresUserScope);

    if (!cacheKey) {
      // Never cache a private response when no signed-in user can be identified.
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(cacheKey, clone);
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
        .catch(() => findCachedApiResponse(cacheKey).then((cached) => {
          if (cached) {
            console.log('[SW] Serving from cache (offline):', url);
            return cached;
          }
          console.warn('[SW] No cache available for:', url);
          return new Response('Offline - data not available', { status: 503 });
        }))
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

  // 6. Media (videos, PDFs, audio): serve only explicit media-cache entries;
  // ordinary online viewing must not silently create offline downloads.
  if (isMediaUrl(url)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) => cache.match(request)).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() => new Response('Media unavailable offline', { status: 503 }));
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

// Legacy background-sync and PREFETCH_CONTENT messages are intentionally no-ops.
// Reconnection never downloads new CMS content; the app refreshes only its
// already selected records through an explicit authenticated path.
// ── Message handler: Receive commands from clients ────────────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  console.log('[SW] Message received:', type);

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'PREFETCH_CONTENT') {
    event.ports[0]?.postMessage({ success: false, error: 'Broad offline prefetch is disabled.' });
  }

  if (type === 'CACHE_URLS') {
    const { urls } = payload;
    event.waitUntil(
      cacheUrls(urls).then((result) => {
        event.ports[0].postMessage({
          success: true,
          message: `Offline cache checked: ${result.downloaded} new, ${result.skipped} already available`,
          ...result,
        });
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

// ── Helpers: Cache only content that is not already available ─────────────
async function cacheAssetsIfNeeded(cache, assets) {
  return Promise.allSettled(assets.map(async (asset) => {
    // Hashed build files and uploaded content use a new URL when they change.
    // Keeping an existing response prevents the same bytes being downloaded
    // again during every Service Worker install.
    const alreadyCached = await cache.match(asset);
    if (alreadyCached && !asset.endsWith('/index.html') && !asset.endsWith('/manifest.json')) {
      return { skipped: true, asset };
    }

    await cache.add(asset);
    return { downloaded: true, asset };
  }));
}

async function cacheUrls(urls) {
  if (!Array.isArray(urls)) return { downloaded: 0, skipped: 0 };

  const safeUrls = urls.filter((value) => {
    if (typeof value !== 'string' || value.length > 2048) return false;
    try {
      const parsed = new URL(value, self.location.origin);
      return parsed.protocol === 'https:' || parsed.origin === self.location.origin;
    } catch {
      return false;
    }
  });

  const cache = await caches.open(MEDIA_CACHE);
  const uniqueUrls = [...new Set(safeUrls)].slice(0, 100);
  let downloaded = 0;
  let skipped = 0;

  await Promise.all(uniqueUrls.map(async (url) => {
    const alreadyCached = await cache.match(url);
    if (alreadyCached) {
      skipped += 1;
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) return;
      await cache.put(url, response.clone());
      downloaded += 1;
    } catch (err) {
      console.warn(`[SW] Failed to cache ${url}:`, err);
    }
  }));

  return { downloaded, skipped };
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

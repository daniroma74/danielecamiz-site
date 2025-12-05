// ICNT Service Worker v2.1 - Enhanced Caching Strategy
const CACHE_VERSION = '2.1.0';
const CACHE_NAME = `icnt-v${CACHE_VERSION}`;
const CACHE_STATIC = `icnt-static-v${CACHE_VERSION}`;
const CACHE_DYNAMIC = `icnt-dynamic-v${CACHE_VERSION}`;
const CACHE_IMAGES = `icnt-images-v${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/public/css/style.css',
  '/public/css/lightbox.css',
  '/public/css/share.css',
  '/public/css/cookie-banner.css',
  '/public/js/app.js',
  '/public/js/share.js',
  '/manifest.json'
];

// Cache limits (prevent cache from growing too large)
const CACHE_LIMITS = {
  [CACHE_DYNAMIC]: 50,
  [CACHE_IMAGES]: 100
};

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Remove oldest items (FIFO)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// Helper: Check if request is for image
function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(new URL(request.url).pathname);
}

// Helper: Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/public/css/') ||
         url.pathname.startsWith('/public/js/') ||
         url.pathname.startsWith('/public/img/icon');
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install failed:', err);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName.startsWith('icnt-') &&
                cacheName !== CACHE_STATIC &&
                cacheName !== CACHE_DYNAMIC &&
                cacheName !== CACHE_IMAGES) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except fonts and images)
  if (url.origin !== location.origin && !isImageRequest(request)) {
    return;
  }

  // Strategy: Cache-first for images
  if (isImageRequest(request)) {
    event.respondWith(
      caches.open(CACHE_IMAGES)
        .then((cache) => {
          return cache.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return fetch(request).then((networkResponse) => {
              // Only cache successful responses
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
                limitCacheSize(CACHE_IMAGES, CACHE_LIMITS[CACHE_IMAGES]);
              }
              return networkResponse;
            });
          });
        })
    );
    return;
  }

  // Strategy: Cache-first for static assets (CSS, JS, icons)
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update in background
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_STATIC).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            }).catch(() => {
              // Network failed, cached version is already returned
            });
            return cachedResponse;
          }
          // No cache, fetch from network
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_STATIC).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
            return networkResponse;
          });
        })
    );
    return;
  }

  // Strategy: Network-first for dynamic content (HTML, API)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful responses for offline fallback
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_DYNAMIC).then((cache) => {
            cache.put(request, networkResponse.clone());
            limitCacheSize(CACHE_DYNAMIC, CACHE_LIMITS[CACHE_DYNAMIC]);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // No cache, return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          // For other requests, return error
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Message event - allow clients to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Clear specific cache on demand
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('icnt-')) {
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Background sync for analytics (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(
      // Sync any pending analytics data
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_ANALYTICS' });
        });
      })
    );
  }
});

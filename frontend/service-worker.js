// Service Worker for danielecamiz.com
// Provides offline support and caching for better performance

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `danielecamiz-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/css/base/base.css',
  '/css/components/layout.css',
  '/css/utils/helpers.css',
  '/css/utils/responsive.css',
  '/js/navbar.js',
  '/js/cookie-consent.js',
  '/img/icons/favicon-192.png',
  '/img/icons/favicon-512.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fallback to network (for static assets)
  cacheFirst: [
    /\.(css|js|woff2?|ttf|eot)$/,
    /\/img\/(icons|logo)\//
  ],
  // Network first, fallback to cache (for HTML pages)
  networkFirst: [
    /\/(bio|concerts|news|gallery|press|repertoire)/
  ],
  // Network only (never cache)
  networkOnly: [
    /\/admin/,
    /\/api/,
    /\/auth/,
    /\.(json)$/
  ]
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((err) => {
        console.error('[SW] Installation failed:', err);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('danielecamiz-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except Cloudinary)
  if (url.origin !== location.origin && !url.origin.includes('cloudinary.com')) {
    return;
  }

  // Determine strategy
  const strategy = getStrategy(url.pathname);

  if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(request));
  } else if (strategy === 'network-first') {
    event.respondWith(networkFirst(request));
  } else if (strategy === 'network-only') {
    event.respondWith(fetch(request));
  }
});

// Helper: Determine cache strategy
function getStrategy(pathname) {
  // Check network-only patterns
  for (const pattern of CACHE_STRATEGIES.networkOnly) {
    if (pattern.test(pathname)) {
      return 'network-only';
    }
  }

  // Check cache-first patterns
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pattern.test(pathname)) {
      return 'cache-first';
    }
  }

  // Check network-first patterns
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pattern.test(pathname)) {
      return 'network-first';
    }
  }

  // Default: network-first for HTML, cache-first for others
  return pathname.endsWith('.html') || pathname === '/' ? 'network-first' : 'cache-first';
}

// Strategy: Cache first, fallback to network
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  console.log('[SW] Cache miss, fetching:', request.url);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.error('[SW] Fetch failed:', err);
    // Return offline page if available
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Strategy: Network first, fallback to cache
async function networkFirst(request) {
  try {
    console.log('[SW] Fetching fresh:', request.url);
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.error('[SW] Network failed, trying cache:', err);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page if available
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Message handler (for skip waiting, cache clearing, etc.)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});

console.log('[SW] Service Worker script loaded');

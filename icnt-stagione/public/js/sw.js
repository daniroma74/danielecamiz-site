/**
 * ICNT Service Worker
 * Caching strategy for offline support
 */

const CACHE_NAME = 'icnt-v1.0.0';
const urlsToCache = [
  '/',
  '/public/css/style.css',
  '/public/css/lightbox.css',
  '/public/js/app.js',
  '/public/img/icnt_logo.png',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event with Network First strategy for API, Cache First for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - Network First
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets - Cache First
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
      .catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});
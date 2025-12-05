/**
 * Service Worker Registration - DISABLED
 * Service Worker is disabled to prevent caching issues with Cloudinary images
 */

(function() {
  'use strict';

  console.log('[SW] Service Worker registration is DISABLED');

  // Unregister any existing service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        registration.unregister().then(function(success) {
          if (success) {
            console.log('[SW] Service Worker unregistered successfully');
          }
        });
      }
    });
  }

  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    });
  }

})();

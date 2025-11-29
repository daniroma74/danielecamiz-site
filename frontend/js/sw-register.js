/**
 * Service Worker Registration
 * Registers the service worker and handles updates
 */

(function() {
  'use strict';

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported in this browser');
    return;
  }

  // Don't register in development (localhost)
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.log('[SW] Skipping registration on localhost');
    return;
  }

  // Register service worker on page load
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      console.log('[SW] Registration successful:', registration.scope);

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] New service worker found, installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, show update prompt
            showUpdateNotification();
          }
        });
      });

    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });

  // Show update notification
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'sw-update-notification';
    notification.innerHTML = `
      <div class="sw-update-content">
        <p><strong>Nuovo aggiornamento disponibile!</strong></p>
        <p>Clicca per aggiornare la pagina e vedere le ultime modifiche.</p>
        <button onclick="window.swUpdateAndReload()">Aggiorna ora</button>
        <button onclick="this.parentElement.parentElement.remove()">Più tardi</button>
      </div>
    `;
    document.body.appendChild(notification);

    // Auto-hide after 30 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 30000);
  }

  // Global function to update and reload
  window.swUpdateAndReload = async function() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      // Tell the waiting service worker to activate immediately
      registration.waiting.postMessage('SKIP_WAITING');

      // Reload once the new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  };

  // Debug: clear cache on demand
  window.swClearCache = async function() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage('CLEAR_CACHE');
      console.log('[SW] Cache clear requested');
    }
  };

})();

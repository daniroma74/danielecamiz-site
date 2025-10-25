/**
 * ICNT Share & Social Features
 * Compatibile con CSP (niente handler inline) e senza errori push se manca la VAPID key.
 */

(function () {
  'use strict';

  // =========================
  // Piccole utility generiche
  // =========================

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function isMobileUA() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Toast minimale (niente inline)
  function showToast(message, type) {
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast-' + type : '');
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 3000);
  }

  // Analytics facoltativi
  function trackShare(platform, title) {
    try {
      if (window.gtag) {
        window.gtag('event', 'share', {
          method: platform,
          content_type: 'event',
          item_id: title
        });
      }
      // Eventuale endpoint lato server (se assente non rompe)
      fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform, title: title, timestamp: Date.now() })
      }).catch(function () {});
    } catch (_) {}
  }

  // Copia su clipboard con fallback
  function copyToClipboard(text) {
    return new Promise(function (resolve, reject) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(resolve).catch(reject);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          ok ? resolve() : reject(new Error('execCommand failed'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  // Ricava slug dal dominio evento (es. beethoven.icnt.it → "beethoven")
  function getSlugFromUrl(url) {
    try {
      var u = new URL(url);
      var parts = u.hostname.split('.');
      return parts[0] || 'event';
    } catch {
      return 'event';
    }
  }

  // =========================
  // SHARE MANAGER
  // =========================
  class ShareManager {
    constructor() {
      this.init();
    }

    init() {
      // 1) se non c’è già, aggiunge il bottone share su ogni card
      this.addShareButtons();

      // 2) click handler per pulsanti (sia .btn-share che .share-btn esistenti)
      this.initWebShare();

      // 3) copia link (anche dentro il modal)
      this.initCopyLinks();

      // 4) tracciamento soft
      this.trackShares();
    }

    // Aggiunge il bottone share solo se la card non ne ha già uno
    addShareButtons() {
      var cards = $all('.event-card');
      cards.forEach(function (card) {
        var hasBtn = card.querySelector('.btn-share, .share-btn');
        if (hasBtn) return;

        // recupero titolo e url dettaglio (se c’è)
        var titleEl = card.querySelector('.event-title');
        var title = (titleEl && titleEl.textContent) ? titleEl.textContent.trim() : document.title;
        var detailLink = card.querySelector('.event-actions a.btn.primary');
        var detailUrl = detailLink ? detailLink.href : window.location.href;

        var wrap = document.createElement('div');
        wrap.className = 'share-container';
        wrap.innerHTML = (
          '<button class="btn-share" ' +
            'aria-label="Condividi ' + escapeAttr(title) + '" ' +
            'data-title="' + escapeAttr(title) + '" ' +
            'data-url="' + escapeAttr(detailUrl) + '" ' +
            'data-text="' + escapeAttr('Ti aspetto al concerto: ' + title) + '">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">' +
              '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>' +
            '</svg>' +
          '</button>'
        );
        var actions = card.querySelector('.event-actions');
        if (actions) actions.appendChild(wrap);
      });

      function escapeAttr(s) {
        return String(s || '').replace(/"/g, '&quot;');
      }
    }

    // Gestisce click su pulsanti share (supporta .btn-share e .share-btn)
    initWebShare() {
      document.addEventListener('click', (e) => {
        var btn = e.target.closest('.btn-share, .share-btn');
        if (!btn) return;

        e.preventDefault();

        var title = btn.getAttribute('data-title') || document.title;
        var url   = btn.getAttribute('data-url') || window.location.href;
        var text  = btn.getAttribute('data-text') || ('Ti aspetto al concerto: ' + title);

        var shareData = { title: title, text: text, url: url };

        if (navigator.share && isMobileUA()) {
          navigator.share(shareData).then(() => {
            showToast('Condiviso!');
            trackShare('native', title);
          }).catch((err) => {
            if (err && err.name === 'AbortError') return;
            this.openShareModal(shareData);
          });
        } else {
          this.openShareModal(shareData);
        }
      });
    }

    // Crea modal “custom share” (senza inline handler)
    openShareModal(data) {
      // rimuovi eventuale esistente
      var existing = $('.share-modal');
      if (existing) existing.remove();

      // wrapper
      var modal = document.createElement('div');
      modal.className = 'share-modal';
      // contenuto base
      var html =
        '<div class="share-modal-backdrop"></div>' +
        '<div class="share-modal-content">' +
          '<button class="share-modal-close" aria-label="Chiudi">&times;</button>' +
          '<h3>Condividi Evento</h3>' +
          '<p class="share-title"></p>' +
          '<div class="share-options">' +
            '<a target="_blank" rel="noopener" class="share-option facebook"  data-platform="facebook"><span class="share-icon">📘</span><span>Facebook</span></a>' +
            '<a target="_blank" rel="noopener" class="share-option twitter"   data-platform="twitter"><span class="share-icon">🐦</span><span>Twitter</span></a>' +
            '<a target="_blank" rel="noopener" class="share-option whatsapp"  data-platform="whatsapp"><span class="share-icon">💬</span><span>WhatsApp</span></a>' +
            '<a target="_blank" rel="noopener" class="share-option telegram"  data-platform="telegram"><span class="share-icon">✈️</span><span>Telegram</span></a>' +
            '<a                 rel="noopener" class="share-option email"     data-platform="email"><span class="share-icon">✉️</span><span>Email</span></a>' +
            '<button class="share-option copy-link" data-platform="copy"><span class="share-icon">🔗</span><span>Copia Link</span></button>' +
          '</div>' +
          '<div class="share-qr">' +
            // niente onerror inline: l’handler lo aggiungo sotto via JS
            '<img class="share-qr-img" alt="QR Code">' +
            '<p class="share-qr-text">Scansiona per condividere</p>' +
          '</div>' +
        '</div>';

      modal.innerHTML = html;
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      var content = $('.share-modal-content', modal);
      var titleEl = $('.share-title', content);
      var qrImg   = $('.share-qr-img', content);
      titleEl.textContent = data.title || '';

      // compone link piattaforme
      var u = encodeURIComponent(data.url || window.location.href);
      var t = encodeURIComponent(data.text || '');
      var mailHref = 'mailto:?subject=' + encodeURIComponent(data.title || '') + '&body=' + encodeURIComponent((data.text || '') + '\n\n' + (data.url || ''));
      $('.share-option.facebook', content).href = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
      $('.share-option.twitter',  content).href = 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u;
      $('.share-option.whatsapp', content).href = 'https://wa.me/?text=' + encodeURIComponent((data.text || '') + ' ' + (data.url || ''));
      $('.share-option.telegram', content).href = 'https://t.me/share/url?url=' + u + '&text=' + t;
      $('.share-option.email',    content).href = mailHref;

      // copia link
      $('.copy-link', content).addEventListener('click', (e) => {
        e.preventDefault();
        copyToClipboard(data.url || window.location.href)
          .then(function () { showToast('Link copiato!'); trackShare('copy', data.title || 'link'); })
          .catch(function () { showToast('Errore nel copiare il link', 'error'); });
      });

      // QR dinamico: prova /qr/<slug>.svg, se fallisce nasconde l’immagine; fallback a /q.svg se vuoi QR generale
      var slug = getSlugFromUrl(data.url || window.location.href);
      var primaryQR = '/qr/' + slug + '.svg';
      var fallbackQR = '/q.svg';

      // Tenta il primary; se errore 404 → nascondi o passa al fallback
      qrImg.addEventListener('error', function () {
        // fallback (se esiste) oppure nascondi
        fetch(fallbackQR, { method: 'HEAD' })
          .then(function (r) {
            if (r.ok) { qrImg.src = fallbackQR; }
            else { hideQR(); }
          })
          .catch(hideQR);
      });
      function hideQR() {
        var wrap = qrImg.closest('.share-qr');
        if (wrap) wrap.style.display = 'none';
      }
      qrImg.src = primaryQR;

      // attiva animazione
      requestAnimationFrame(function () { modal.classList.add('active'); });

      // chiusura
      var close = function () {
        modal.classList.remove('active');
        setTimeout(function () {
          modal.remove();
          document.body.style.overflow = '';
        }, 300);
      };
      $('.share-modal-close', content).addEventListener('click', close);
      $('.share-modal-backdrop', modal).addEventListener('click', close);

      // tracking
      content.querySelectorAll('.share-option').forEach(function (el) {
        el.addEventListener('click', function (e) {
          var platform = el.getAttribute('data-platform') || 'unknown';
          if (platform !== 'copy') {
            trackShare(platform, data.title || '');
          }
        });
      });

      // evento custom (se serve altrove)
      try {
        document.dispatchEvent(new CustomEvent('shareModalOpen', { detail: { title: data.title || '' } }));
      } catch (_) {}
    }

    initCopyLinks() {
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('.copy-link-global');
        if (!btn) return;
        e.preventDefault();
        var url = btn.getAttribute('data-url') || window.location.href;
        copyToClipboard(url)
          .then(function () { showToast('Link copiato!'); trackShare('copy', 'link'); })
          .catch(function () { showToast('Errore nel copiare il link', 'error'); });
      });
    }

    trackShares() {
      document.addEventListener('shareModalOpen', function (e) {
        trackShare('modal_open', (e && e.detail && e.detail.title) || '');
      });
    }
  }

  // =========================
  // NOTIFICATION MANAGER (push disattivate se manca una VAPID key valida)
  // =========================
  class NotificationManager {
    constructor() {
      // recupera la VAPID key da <meta name="vapid-public-key" content="...">
      var meta = $('meta[name="vapid-public-key"]');
      this.vapidPublicKey = meta && meta.content ? meta.content.trim() : '';

      // se non c'è o è placeholder → NON attivare nulla (nessun errore atob)
      if (!this.isValidVapidKey(this.vapidPublicKey)) {
        this.enabled = false;
        return;
      }
      this.enabled = true;
      this.init();
    }

    isValidVapidKey(key) {
      if (!key) return false;
      if (/YOUR_VAPID_PUBLIC_KEY/i.test(key)) return false; // placeholder
      // base64url charset
      if (!/^[A-Za-z0-9\-_]+$/.test(key)) return false;
      // lunghezza minima realistica
      return key.length >= 80;
    }

    async init() {
      if (!this.enabled) return;
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      // bottone campanella
      this.addNotificationButton();

      if (Notification.permission === 'granted') {
        try { await this.subscribeUser(); } catch (_) {}
      }
    }

    addNotificationButton() {
      var header = document.querySelector('.site-header .container') || document.body;
      var button = document.createElement('button');
      button.className = 'notification-toggle';
      button.setAttribute('aria-label', 'Attiva notifiche');
      button.textContent = '🔔';

      button.addEventListener('click', () => this.requestPermission());
      header.appendChild(button);
    }

    async requestPermission() {
      try {
        var result = await Notification.requestPermission();
        if (result === 'granted') {
          showToast('Notifiche attivate!');
          await this.subscribeUser();
        } else if (result === 'denied') {
          showToast('Notifiche bloccate', 'error');
        }
      } catch (_) {}
    }

    async subscribeUser() {
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // invia al server (se endpoint presente)
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      }).catch(function () {});
    }

    urlBase64ToUint8Array(base64String) {
      // conversione base64url → Uint8Array (solo se la key è valida; altrimenti non arrivo qui)
      var padding = '='.repeat((4 - base64String.length % 4) % 4);
      var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      var rawData = window.atob(base64);
      var outputArray = new Uint8Array(rawData.length);
      for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }
  }

  // =========================
  // BOOT
  // =========================
  document.addEventListener('DOMContentLoaded', function () {
    try { window.shareManager = new ShareManager(); } catch (e) { /* no-op */ }
    try { window.notificationManager = new NotificationManager(); } catch (e) { /* no-op */ }

    // Espone API compatibili con il vecchio onclick (se rimanessero in giro)
    window.ICNT = window.ICNT || {};
    window.ICNT.share = window.ICNT.share || {};
    window.ICNT.share.shareEvent = function (title, url) {
      // fallback: usa il flusso del modal
      var sm = window.shareManager;
      if (!sm) return;
      sm.openShareModal({
        title: title || document.title,
        text: 'Ti aspetto al concerto: ' + (title || document.title),
        url: url || window.location.href
      });
    };
  });
})();

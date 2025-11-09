// frontend/js/concerts-lightbox.js
// Lightbox che usa SOLO i dati dal DB (già renderizzati server-side)

(function () {
  var overlay, lightboxBody;

  function $(id) { return document.getElementById(id); }

  function init() {
    overlay = $('concert_lightbox');
    if (!overlay) {
      console.warn('[concerts-lightbox] #concert_lightbox non trovato');
      return;
    }

    lightboxBody = overlay.querySelector('.concert-lightbox-body');

    // Click sul backdrop per chiudere
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeConcertLightbox();
    });

    // Click sul pulsante close
    var closeBtn = overlay.querySelector('.concert-lightbox-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeConcertLightbox);
    }

    // ESC per chiudere
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay && !overlay.hasAttribute('hidden')) {
        closeConcertLightbox();
      }
    });
  }

  // Apre la lightbox copiando i dettagli completi dal DOM
  window.openConcertFromDOM = function(concertId) {
    if (!overlay) init();
    if (!overlay || !lightboxBody) return;

    var detailsSource = $('details_' + concertId);
    if (!detailsSource) {
      console.warn('[concerts-lightbox] details not found:', concertId);
      return;
    }

    // Copia il contenuto completo renderizzato dal server
    var posterContainer = $('concert_poster_container');
    if (posterContainer) {
      posterContainer.innerHTML = detailsSource.innerHTML;
      posterContainer.style.display = '';
    }

    // Nascondi iframe se presente
    var iframeContainer = $('concert_iframe_container');
    if (iframeContainer) iframeContainer.style.display = 'none';

    // Mostra lightbox
    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Focus su close button
    var closeBtn = overlay.querySelector('.concert-lightbox-close');
    if (closeBtn) closeBtn.focus();
  };

  // Chiudi lightbox
  window.closeConcertLightbox = function() {
    if (!overlay) return;

    overlay.setAttribute('hidden', '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('show');
    document.body.style.overflow = '';

    // Reset contenuto
    var posterContainer = $('concert_poster_container');
    if (posterContainer) posterContainer.innerHTML = '';
  };

  // Supporto per concerti futuri con landing page (preview iframe)
  window.openConcertPreview = function(payload, landingUrl) {
    if (!overlay) init();
    if (!overlay || !lightboxBody) return;

    var iframeContainer = $('concert_iframe_container');
    var posterContainer = $('concert_poster_container');
    var iframe = $('concert_iframe');

    if (!iframe || !iframeContainer || !posterContainer) {
      console.warn('[concerts-lightbox] iframe elements not found');
      return;
    }

    // Nascondi poster, mostra iframe
    posterContainer.style.display = 'none';
    iframeContainer.style.display = 'block';
    iframe.src = landingUrl;

    // Mostra lightbox
    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show', 'iframe-mode');
    document.body.style.overflow = 'hidden';

    var closeBtn = overlay.querySelector('.concert-lightbox-close');
    if (closeBtn) closeBtn.focus();
  };

  // Backward compatibility: mantieni la vecchia funzione per concerti futuri
  window.openConcertLightbox = function(payload) {
    console.warn('[concerts-lightbox] openConcertLightbox è deprecata, usa openConcertFromDOM');
    // Fallback: prova a estrarre dati dal payload e cercare nel DOM
    try {
      var data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (data && data.title) {
        // Cerca nel DOM un concerto con questo titolo
        var items = document.querySelectorAll('.concert-item[data-concert-id]');
        for (var i = 0; i < items.length; i++) {
          var titleEl = items[i].querySelector('.concert-title');
          if (titleEl && titleEl.textContent.trim() === data.title.trim()) {
            var concertId = items[i].getAttribute('data-concert-id');
            if (concertId) {
              openConcertFromDOM(concertId);
              return;
            }
          }
        }
      }
    } catch (e) {
      console.error('[concerts-lightbox] fallback failed:', e);
    }
  };

  // Init quando il DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* Updated: 2025-11-09 17:30:00 */

// frontend/js/navbar.js
// Gestione SOLO cambio lingua lato server via /lang/:lng.
// Niente i18n client-side, niente manipolazione testi.

(function () {
  function onClickLang(e) {
    const el = e.currentTarget;
    const lng = (el && (el.dataset.lang || el.getAttribute('data-lang') || el.value || '')).toLowerCase();
    if (!lng || !/^(it|en)$/.test(lng)) return;

    // Torna alla stessa pagina aggiungendo ?lng=
    const ret = window.location.href;
    const url = `/lang/${encodeURIComponent(lng)}?return=${encodeURIComponent(ret)}`;
    window.location.assign(url);
  }

  function wire(selector) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', onClickLang);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Supporta vari markup:
    // <button data-lang="it">IT</button> / <a data-lang="en">EN</a>
    wire('[data-lang="it"]');
    wire('[data-lang="en"]');

    // Supporta anche radio/select opzionali
    const langSelect = document.querySelector('[data-lang-select]');
    if (langSelect) {
      langSelect.addEventListener('change', function (e) {
        const v = e.target.value;
        if (v && /^(it|en)$/.test(v)) {
          const ret = window.location.href;
          const url = `/lang/${encodeURIComponent(v)}?return=${encodeURIComponent(ret)}`;
          window.location.assign(url);
        }
      });
    }
  });
})();

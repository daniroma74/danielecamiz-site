// Bio page interactions (no data fetching)
// - ESC chiude le modali :target
// - migliora focus/UX

(function () {
  function closeIfModalHash() {
    if (location.hash && /_modal$/.test(location.hash.slice(1))) {
      // rimuove hash senza ricaricare
      history.pushState("", document.title, location.pathname + location.search);
    }
  }

  // Chiudi con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeIfModalHash();
  });

  // Evita scroll-jump quando si chiudono modali con link "#"
  document.querySelectorAll('.modal__close, .modal__backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
      // lascia la navigazione verso "#" (chiude :target), poi ripulisci l'hash
      setTimeout(() => {
        if (location.hash === '') return;
        closeIfModalHash();
      }, 0);
    });
  });
})();
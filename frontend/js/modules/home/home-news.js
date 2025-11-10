// Home → News: apri modale SSR con /news/:id?fragment=1
// Requisiti DOM: #news_list, #news_modal, #news_modal_body, [data-close="1"]
// Requisiti server: GET /news/:id?fragment=1 restituisce HTML (partial)

export function initHomeNews() {
  // News modal initialization - self-executing
  console.log('[home-news] News modal initialized');
}

(function () {
  // Verifica ambiente
  const list  = document.getElementById('news_list');
  const modal = document.getElementById('news_modal');
  const body  = document.getElementById('news_modal_body');
  if (!list || !modal || !body) return;

  const closeBtn = document.getElementById('news_modal_close');

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    body.innerHTML = '';
    document.body.style.overflow = '';

    if (history.state && history.state._newsModal) {
      history.replaceState(null, '', history.state._prevUrl || location.pathname + location.search + location.hash);
    }
  }

  // backdrop e bottone chiudi
  modal.addEventListener('click', (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close === '1') {
      closeModal();
    }
  });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Delegation click sugli <a.news_link>
  list.addEventListener('click', async (e) => {
    const link = e.target.closest('a.news_link');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const id   = link.getAttribute('data-news-id') || '';

    // se manca href o non è /news/:id, lascia navigare
    if (!href || !href.startsWith('/news/')) return;
    // se manca id, lascia navigare (fallback SEO)
    if (!id) return;

    e.preventDefault();

    try {
      const res = await fetch(`${href}?fragment=1`, { headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) { window.location.href = href; return; }
      const html = await res.text();
      if (!html || !html.trim()) { window.location.href = href; return; }

      body.innerHTML = html;
      openModal();

      // Aggiorna URL per condivisione (rimane nella home visivamente)
      history.replaceState({ _newsModal: true, _prevUrl: location.pathname + location.search + location.hash }, '', href);
    } catch {
      window.location.href = href; // fallback
    }
  });
})();

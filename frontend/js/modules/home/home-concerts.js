(function () {
  const root = document;
  const modal = root.getElementById('concert_lightbox');
  if (!modal) return;
  const dialog  = modal.querySelector('.lightbox-dialog');
  const content = modal.querySelector('#concert_lightbox_content');

  function openFromTemplate(card) {
    const tpl = card.querySelector('template.concert-details-template');
    if (!tpl) return;
    content.innerHTML = '';
    content.appendChild(tpl.content.cloneNode(true));
    modal.classList.remove('hidden');
    dialog.focus();
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    content.innerHTML = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // Chiudi con ESC / backdrop / pulsante ×
  modal.addEventListener('click', (ev) => {
    const target = ev.target;
    if (target && target.closest('[data-close]')) { ev.preventDefault(); closeModal(); }
    else if (target === modal.querySelector('.lightbox-backdrop')) { closeModal(); }
  });
  root.addEventListener('keydown', (ev) => {
    if (!modal.classList.contains('hidden') && ev.key === 'Escape') closeModal();
  });

  // Delega click/keyboard sulle card
  const grid = root.getElementById('concerts_list');
  if (grid) {
    grid.addEventListener('click', (ev) => {
      const card = ev.target.closest('.concert-card');
      if (!card) return;
      if (ev.target.closest('a')) return; // non intercettare click su link YouTube
      ev.preventDefault();
      openFromTemplate(card);
    });
    grid.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        const card = ev.target.closest('.concert-card[role="button"]');
        if (!card) return;
        ev.preventDefault();
        openFromTemplate(card);
      }
    });
  }

  // API compat: permetti apertura programmatica tipo "openConcertLightbox(data)"
  window.openConcertLightboxFromData = function (data) {
    try {
      // crea un template al volo dai dati (usa gli stessi campi della view)
      const tmpl = document.createElement('template');
      const title = data?.title || '';
      const poster = data?.locandina_cloudinary_url || data?.poster || data?.image || data?.locandina || '';
      const date = data?.date || data?.datetime || '';
      const place = data?.place || data?.venue || data?.location || '';
      const city = data?.city || '';
      const orchestra = data?.orchestra || '';
      const conductor = data?.conductor || '';
      const soloists = data?.soloists || '';
      const program = data?.program || '';
      const notes = data?.notes || '';
      const youtube = data?.youtube || data?.youtube_link || data?.video || data?.video_url || '';

      const posterSrc = (() => {
        if (!poster) return '';
        if (/^https?:\/\//i.test(poster)) return poster;
        const p2 = poster.replace(/^img\/locandine\//, '/img/posters/');
        return p2.startsWith('/img/') ? p2 : ('/img/posters/' + (p2.split('/').pop() || p2));
      })();

      tmpl.innerHTML = `
        <div class="lb-body">
          ${posterSrc ? `<div class="lb-media"><img src="${posterSrc}" alt="${title || 'concert poster'}"></div>` : ''}
          <div class="lb-info">
            ${title ? `<h3 class="lb-title">${title}</h3>` : ''}
            <ul class="lb-meta">
              ${date ? `<li><strong>Data:</strong> ${date}</li>` : ''}
              ${(place || city) ? `<li><strong>Luogo:</strong> ${place}${city ? ' – ' + city : ''}</li>` : ''}
              ${orchestra ? `<li><strong>Orchestra:</strong> ${orchestra}</li>` : ''}
              ${conductor ? `<li><strong>Direttore:</strong> ${conductor}</li>` : ''}
              ${soloists ? `<li><strong>Solisti:</strong> ${soloists}</li>` : ''}
            </ul>
            ${program ? `<div class="lb-program"><h4>Programma</h4><pre>${program}</pre></div>` : ''}
            ${notes ? `<div class="lb-notes"><h4>Note</h4><p>${notes}</p></div>` : ''}
            <div class="lb-actions">
              <a class="btn btn-link" href="/concerts">Tutti i concerti</a>
              ${youtube ? `<a class="btn" href="${youtube}" target="_blank" rel="noopener">Guarda su YouTube</a>` : ''}
            </div>
          </div>
        </div>`.trim();

      content.innerHTML = '';
      content.appendChild(tmpl.content.cloneNode(true));
      modal.classList.remove('hidden');
      dialog.focus();
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } catch (e) {
      console.error('openConcertLightboxFromData error', e);
    }
  };
})();

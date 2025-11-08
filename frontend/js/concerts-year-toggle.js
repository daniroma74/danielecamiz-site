// Archivio anni come MODAL centrata con scroll indipendente
// Usa le classi della modal generale definite in modal.css
// - Nessun cambiamento alla view EJS
// - Nessuna dipendenza
// - Compatibile con i listener delegati già presenti (es. concerts-lightbox)

(function () {
  const pills  = document.querySelectorAll('.year-pill');
  const panels = document.querySelectorAll('.year-content');

  // Manteniamo le sezioni originali nascoste per non "spingere" il layout in basso
  panels.forEach(p => { p.hidden = true; });

  let currentYear = null;
  let overlay = null;
  let box = null;
  let content = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'year_modal'; // id in snake_case (stilizzato in modal.css)
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Archive');

    box = document.createElement('div');
    box.className = 'modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    content = document.createElement('div');
    content.className = 'modal-content';

    box.appendChild(closeBtn);
    box.appendChild(content);
    overlay.appendChild(box);

    // Chiusure
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) closeModal();
    });
    closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', onEsc, { passive: true });

    document.body.appendChild(overlay);
  }

  function onEsc(ev) {
    if (ev.key === 'Escape') closeModal();
  }

  function openModalWithHtml(html) {
    if (!overlay) buildOverlay();
    content.innerHTML = html;

    // Apri tutti i <details> per mostrare i dettagli dei concerti
    const allDetails = content.querySelectorAll('.concert-details');
    allDetails.forEach(d => d.setAttribute('open', ''));

    // Visualizza la modal; il layout è gestito da modal.css
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Focus accessibile
    box.setAttribute('tabindex', '-1');
    box.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!overlay) return;
    overlay.style.display = 'none';
    content.innerHTML = '';
    document.body.style.overflow = '';
    // reset stato pill attive
    pills.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    currentYear = null;
  }

  function openYear(year) {
    const y = String(year);
    const panel = document.getElementById(`year_${y}`);
    if (!panel) return;

    // Evidenzia la pill selezionata
    pills.forEach(b => {
      const on = b.dataset.year === y;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    // Usa il contenuto HTML del pannello originale dentro la modal
    openModalWithHtml(panel.innerHTML);
    currentYear = y;
  }

  function toggleYear(y) {
    if (currentYear === y) {
      closeModal();
    } else {
      openYear(y);
    }
  }

  // Wiring pillole
  pills.forEach((b) => {
    b.id = `pill_${b.dataset.year}`;
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleYear(b.dataset.year);
    });
    b.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        toggleYear(b.dataset.year);
      }
    });
  });
})();
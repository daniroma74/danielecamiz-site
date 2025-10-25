// bio-modal.js — funzioni della modale (ES module)

export function openStoryModal() {
  const overlay = document.getElementById('story_modal');
  const box = document.getElementById('modal_box');
  if (!overlay || !box) return;

  overlay.style.display = 'block';
  box.classList.remove('fullscreen');

  // Aggiorna progress bar e testi bottoni
  import('./bio-utils.js').then(mod => {
    try { mod.updateScrollProgress(); } catch {}
    try { mod.updateReadMoreButtons(); } catch {}
  });
}

export function closeStoryModal() {
  const overlay = document.getElementById('story_modal');
  const box = document.getElementById('modal_box');
  if (!overlay || !box) return;

  overlay.style.display = 'none';
  box.classList.remove('fullscreen');
}

export function toggleFullScreen() {
  const box = document.getElementById('modal_box');
  if (!box) return;

  box.classList.toggle('fullscreen');

  // Aggiorna testo del bottone Expand/Collapse
  import('./bio-utils.js').then(mod => {
    try { mod.updateReadMoreButtons(); } catch {}
  });
}

export function scrollToTop() {
  const story = document.getElementById('story_text');
  if (story) story.scrollTo({ top: 0, behavior: 'smooth' });
}

// bio-utils.js — utilità UI (ES module)

function readLabel(btn, dataKey, labelPath, fallback) {
  if (btn && btn.dataset && btn.dataset[dataKey]) return btn.dataset[dataKey];

  const lang = (window.lang || 'it');
  const all = window.labels?.[lang] || {};
  const bioNs = all.bio || {};

  const fromNs = labelPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), bioNs);
  if (typeof fromNs === 'string' && fromNs) return fromNs;

  const fromRoot = (labelPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), all));
  if (typeof fromRoot === 'string' && fromRoot) return fromRoot;

  return fallback;
}

export function toggleText(id, btn) {
  const el = document.getElementById(id);
  if (!el || !btn) return;

  const isHidden = el.classList.contains('hidden');
  el.classList.toggle('hidden', !isHidden);

  const nextLabel = isHidden
    ? readLabel(btn, 'readLess', 'read_less', 'Read less')
    : readLabel(btn, 'readMore', 'read_more', 'Read more');

  btn.textContent = nextLabel;
}

export function updateReadMoreButtons() {
  // Pulsanti "read more/less" (curriculum)
  document.querySelectorAll('.read-more-btn').forEach((btn) => {
    if (!btn) return;
    const targetId = btn.getAttribute('data-target') || btn.getAttribute('data-target-id'); // opzionale
    const target = targetId ? document.getElementById(targetId) : null;
    const showingLess = target ? target.classList.contains('hidden') : true;

    btn.textContent = showingLess
      ? readLabel(btn, 'readMore', 'read_more', 'Read more')
      : readLabel(btn, 'readLess', 'read_less', 'Read less');
  });

  // Bottone Expand/Collapse nella modale
  const expandBtn = document.getElementById('btn_expand');
  const box = document.getElementById('modal_box');
  if (expandBtn && box) {
    const isFull = box.classList.contains('fullscreen');
    expandBtn.textContent = isFull
      ? readLabel(expandBtn, 'collapse', 'collapse', 'Collapse')
      : readLabel(expandBtn, 'expand', 'expand', 'Expand');
  }

  // Back to top
  const topBtn = document.getElementById('back_to_top_btn');
  if (topBtn) {
    topBtn.textContent = readLabel(topBtn, 'backToTop', 'back_to_top', 'Back to top');
  }
}

export function updateScrollProgress() {
  const el = document.getElementById('story_text');
  const bar = document.getElementById('story_progress');
  const topBtn = document.getElementById('back_to_top_btn');
  if (!el || !bar) return;

  const percent = (el.scrollTop / Math.max(1, (el.scrollHeight - el.clientHeight))) * 100;
  bar.style.width = `${percent}%`;

  if (topBtn) {
    topBtn.classList.toggle('visible', percent > 5);
  }
}

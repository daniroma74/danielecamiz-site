// ========== INIZIALIZZAZIONE ==========
document.addEventListener('DOMContentLoaded', () => {
  fetch("/api/bio")
    .then(res => res.json())
    .then(data => {
      const lang = localStorage.getItem('preferredLang') || 'it';
      populateBioContent(data, lang); // <<< LANG ORA PASSATO CORRETTAMENTE
      switchLang(lang); // gestito da script.js

      // Scroll tracking per la modale
      document.querySelectorAll('.modal-text').forEach(el => {
        el.addEventListener('scroll', () => updateScrollProgress(el));
      });
    });
});

// ========== POPOLA CONTENUTI DA JSON ==========
function populateBioContent(data, lang) {
  const otherLang = lang === 'it' ? 'en' : 'it';

  // === BIOGRAFIA ===
  const bio = data.biografia[lang];
  const bioOther = data.biografia[otherLang];
  const bioHTML = `
    <div class="lang-${lang} visible">
      <h3>${bio.title}</h3>
      <p>${bio.intro}</p>
      <div class="hidden" id="bio-more-${lang}">
        ${bio.more.map(p => `<p>${p}</p>`).join('')}
      </div>
      <button class="read-more-btn" onclick="toggleExclusiveText('bio-more-${lang}', this)">
        ${lang === 'en' ? 'Read more' : 'Leggi di più'}
      </button>
    </div>
    <div class="lang-${otherLang}">
      <h3>${bioOther.title}</h3>
      <p>${bioOther.intro}</p>
      <div class="hidden" id="bio-more-${otherLang}">
        ${bioOther.more.map(p => `<p>${p}</p>`).join('')}
      </div>
      <button class="read-more-btn" onclick="toggleExclusiveText('bio-more-${lang}', this)">
        ${otherLang === 'en' ? 'Read more' : 'Leggi di più'}
      </button>
    </div>
  `;
  document.getElementById('bio-container').innerHTML = bioHTML;

  // === CURRICULUM ===
  const curr = data.curriculum[lang];
  const currOther = data.curriculum[otherLang];
  const currHTML = `
  <div class="lang-${lang} visible">
    <h3>${curr.titolo}</h3>
    <p>${curr.testoBreve}</p>
    <div class="hidden" id="curriculum-more-${lang}">
      <p>${curr.testoEsteso}</p>
    </div>
    <button class="read-more-btn" onclick="toggleExclusiveText('curriculum-more-${lang}', this)">
      ${lang === 'en' ? 'Read more' : 'Leggi di più'}
    </button>
  </div>
  <div class="lang-${otherLang}">
    <h3>${currOther.titolo}</h3>
    <p>${currOther.testoBreve}</p>
    <div class="hidden" id="curriculum-more-${otherLang}">
      <p>${currOther.testoEsteso}</p>
    </div>
    <button class="read-more-btn" onclick="toggleExclusiveText('curriculum-more-${otherLang}', this)">
      ${otherLang === 'en' ? 'Read more' : 'Leggi di più'}
    </button>
  </div>
`;
  document.getElementById('curriculum-container').innerHTML = currHTML;

  // === STORIA ===
  const storia = data.storia[lang];
  const storiaOther = data.storia[otherLang];
  const storiaHTML = `
    <div class="lang-${lang} visible">
      <h3>${storia.titolo}</h3>
      <p>${storia.intro}</p>
      <button class="read-more-btn" onclick="openStoryModal()">
        ${lang === 'en' ? 'Read the full story' : 'Leggi tutta la storia'}
      </button>
    </div>
    <div class="lang-${otherLang}">
      <h3>${storiaOther.titolo}</h3>
      <p>${storiaOther.intro}</p>
      <button class="read-more-btn" onclick="openStoryModal()">
        ${otherLang === 'en' ? 'Read the full story' : 'Leggi tutta la storia'}
      </button>
    </div>
  `;
  document.getElementById('story-container').innerHTML = storiaHTML;

  // Modale contenuti
  document.getElementById('story-text-it').innerHTML = `<p>${data.storia.it.contenuto}</p>`;
  document.getElementById('story-text-en').innerHTML = `<p>${data.storia.en.contenuto}</p>`;
}

// ========== MODALE ==========
function openStoryModal() {
  const lang = localStorage.getItem('preferredLang') || 'it';
  const modal = document.getElementById('story-modal');
  const it = document.getElementById('story-text-it');
  const en = document.getElementById('story-text-en');
  const bar = document.getElementById('story-progress');
  const btn = document.getElementById('backToTopBtn');
  const expandBtn = document.querySelector('.expand-toggle');

  modal.classList.add('show');
  it.classList.remove('show');
  en.classList.remove('show');

  const active = lang === 'it' ? it : en;
  active.classList.add('show');
  active.scrollTop = 0;
  bar.style.width = '0%';
  btn.classList.remove('visible');

  // ✅ aggiorna i testi dei pulsanti
  expandBtn.textContent = lang === 'en' ? 'Expand' : 'Espandi';
  btn.textContent = lang === 'en' ? 'Back to top' : 'Torna su';
}

function closeStoryModal() {
  document.getElementById('story-modal').classList.remove('show');
  document.getElementById('modalBox').classList.remove('fullscreen');
}

function toggleFullScreen() {
  const box = document.getElementById('modalBox');
  const btn = document.querySelector('.expand-toggle');
  const lang = localStorage.getItem('preferredLang') || 'it';

  const isFullscreen = box.classList.toggle('fullscreen');
  btn.textContent = lang === 'en'
    ? (isFullscreen ? 'Collapse' : 'Expand')
    : (isFullscreen ? 'Riduci' : 'Espandi');
}

function scrollToTop() {
  const visible = document.querySelector('.modal-text.show');
  if (visible) {
    visible.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateScrollProgress(container = null) {
  const el = container || document.querySelector('.modal-text.show');
  const bar = document.getElementById('story-progress');
  const btn = document.getElementById('backToTopBtn');

  if (el && bar && btn) {
    const percent = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    bar.style.width = `${percent}%`;
    btn.classList.toggle('visible', percent > 5);
  }
}

// ========== LEGGI DI PIÙ ==========
function toggleText(id, btn) {
  const el = document.getElementById(id);
  const isHidden = el.classList.contains('hidden');
  el.classList.toggle('hidden', !isHidden);

  const isItalian = id.includes('-it');
  btn.textContent = isHidden
    ? (isItalian ? 'Leggi di meno' : 'Read less')
    : (isItalian ? 'Leggi di più' : 'Read more');
}
function toggleExclusiveText(id, btn) {
  // Chiudi tutti gli altri
  document.querySelectorAll('.bio-box .hidden').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.read-more-btn').forEach(b => {
    if (b !== btn) {
      const otherLang = localStorage.getItem('preferredLang') === 'en' ? 'Read more' : 'Leggi di più';
      b.textContent = otherLang;
    }
  });

  // Apri solo il selezionato
  const el = document.getElementById(id);
  const isHidden = el.classList.contains('hidden');
  const lang = localStorage.getItem('preferredLang') || 'it';

  if (isHidden) {
    el.classList.remove('hidden');
    btn.textContent = lang === 'en' ? 'Read less' : 'Leggi di meno';
  } else {
    el.classList.add('hidden');
    btn.textContent = lang === 'en' ? 'Read more' : 'Leggi di più';
  }
}
function updateReadMoreButtons() {
  const lang = localStorage.getItem('preferredLang') || 'it';

  document.querySelectorAll('.read-more-btn').forEach(btn => {
    if (btn.textContent.includes('Read') || btn.textContent.includes('Leggi')) {
      const isExpanded = btn.textContent.includes('less') || btn.textContent.includes('meno');
      btn.textContent = isExpanded
        ? (lang === 'en' ? 'Read less' : 'Leggi di meno')
        : (lang === 'en' ? 'Read more' : 'Leggi di più');
    }
  });

  const expandBtn = document.querySelector('.expand-toggle');
  if (expandBtn) {
    const isFullscreen = document.getElementById('modalBox')?.classList.contains('fullscreen');
    expandBtn.textContent = lang === 'en'
      ? (isFullscreen ? 'Collapse' : 'Expand')
      : (isFullscreen ? 'Riduci' : 'Espandi');
  }

  const topBtn = document.getElementById('backToTopBtn');
  if (topBtn) {
    topBtn.textContent = lang === 'en' ? 'Back to top' : 'Torna su';
  }
}
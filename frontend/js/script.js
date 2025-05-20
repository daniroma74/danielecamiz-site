// ========== TOGGLE MENU ==========
function toggleMenu() {
  const menu = document.getElementById('mainMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

// ========== SWITCH LANGUAGE ==========
function switchLang(lang) {
  // Mostra solo gli elementi con la lingua corretta
  document.querySelectorAll('[class^="lang-"]').forEach(el => {
    el.classList.toggle('visible', el.classList.contains(`lang-${lang}`));
  });

  // Attiva il bottone selezionato
  const btnIt = document.getElementById('btn-it');
  const btnEn = document.getElementById('btn-en');
  if (btnIt && btnEn) {
    btnIt.classList.toggle('active', lang === 'it');
    btnEn.classList.toggle('active', lang === 'en');
  }

  // Salva la preferenza in localStorage
  localStorage.setItem('preferredLang', lang);

  // Aggiorna contenuti dinamici se esistono
  if (typeof updateGalleryLanguage === 'function') updateGalleryLanguage(lang);
  if (typeof updateVideoLanguage === 'function') updateVideoLanguage(lang);
  if (typeof updateConcertButtonsLanguage === 'function') updateConcertButtonsLanguage(lang);
  if (typeof updateModalLanguage === 'function') updateModalLanguage(lang);
  if (typeof updateReadMoreButtons === 'function') updateReadMoreButtons();
}


// ========== INIZIALIZZAZIONE ==========
function initLanguage() {
  const savedLang = localStorage.getItem('preferredLang') || 'it';
  switchLang(savedLang);
}

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();

  // Attiva lightbox video se presente
  document.querySelectorAll('.video-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-video-url');
      if (url) openVideoLightbox(url);
    });
  });

  document.querySelectorAll('.lightbox-close, .lightbox-overlay').forEach(el => {
    el.addEventListener('click', closeVideoLightbox);
  });
});

// ========== VIDEO LIGHTBOX ==========
function openVideoLightbox(videoUrl) {
  const lightbox = document.getElementById('video-lightbox');
  const frame = document.getElementById('video-frame');
  if (lightbox && frame) {
    frame.src = videoUrl;
    lightbox.classList.add('show');
  }
}

function closeVideoLightbox() {
  const lightbox = document.getElementById('video-lightbox');
  const frame = document.getElementById('video-frame');
  if (lightbox && frame) {
    frame.src = '';
    lightbox.classList.remove('show');
  }
}

// ========== AGGIORNA BOTTONI CONCERTI ==========
function updateConcertButtonsLanguage(lang) {
  document.querySelectorAll('.concert-toggle').forEach(btn => {
    const isExpanded = btn.classList.contains('active');
    const textSpan = btn.querySelector('.text');
    const arrow = btn.querySelector('.arrow');

    if (textSpan) {
      textSpan.textContent = isExpanded
        ? (lang === 'en' ? 'Hide details' : 'Nascondi dettagli')
        : (lang === 'en' ? 'Show more' : 'Mostra di più');
    }

    if (!arrow) {
      const newArrow = document.createElement('span');
      newArrow.className = 'arrow';
      newArrow.textContent = '▼';
      btn.appendChild(newArrow);
    }
  });

  const bookingBtn = document.querySelector('.concert-button.eventbrite-glow');
  if (bookingBtn) {
    const label = lang === 'en' ? 'Book on' : 'Prenota su';
    const icon = bookingBtn.querySelector('img');
    bookingBtn.innerHTML = `${label} `;
    if (icon) bookingBtn.appendChild(icon);
  }
}
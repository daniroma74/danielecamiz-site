// === MENU MOBILE ===
function toggleMenu() {
  document.getElementById('mainMenu').classList.toggle('show');
}

// === CAMBIO LINGUA ===
function updateConcertiTexts(lang) {
  document.querySelectorAll('.lang-it, .lang-en').forEach(el => {
    el.classList.remove('visible');
  });
  document.querySelectorAll(`.lang-${lang}`).forEach(el => {
    el.classList.add('visible');
  });

  document.querySelectorAll('.concert-toggle').forEach(btn => {
    const textSpan = btn.querySelector('.text');
    if (btn.classList.contains('active')) {
      textSpan.textContent = lang === 'en' ? 'Hide details' : 'Nascondi dettagli';
    } else {
      textSpan.textContent = lang === 'en' ? 'Show more' : 'Mostra di più';
    }
  });

  const counter = document.getElementById('counter');
  if (counter) {
    const count = counter.dataset.total || '';
    counter.textContent = lang === 'en'
      ? `Total concerts: ${count}`
      : `Concerti realizzati: ${count}`;
  }
}

// === CARICAMENTO ===
document.addEventListener("DOMContentLoaded", () => {
  fetch('/api/concerti')
    .then(res => res.json())
    .then(data => {
      const lang = localStorage.getItem('preferredLang') || 'it';
      if (document.getElementById('concertiArchivio')) renderTimeline(data, lang);
      if (document.getElementById('concertiHome')) renderHomepageConcerts(data, lang);
      updateConcertiTexts(lang);
    });
});

// === HOMEPAGE CONCERTS ===
function renderHomepageConcerts(data, lang) {
  const container = document.getElementById('concertiHome');
  if (!container) return;
  container.innerHTML = '';

  const today = new Date();
  const currentYear = today.getFullYear();
  const yearData = data.find(y => y.anno == currentYear);
  if (!yearData) return;

  yearData.concerti
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .forEach(concerto => {
      const isFuture = new Date(concerto.data) >= today;
      const div = document.createElement('div');
      div.className = 'concert-block';

      const yt = !isFuture && concerto.youtube ? `
        <a href="${concerto.youtube}" class="btn-link" target="_blank">
          <img src="img/icons/youtube.png" alt="YouTube" class="icon"> YouTube
        </a>` : '';

      const ebText = lang === 'en' ? 'Book on Eventbrite' : 'Prenota su Eventbrite';
      const eb = isFuture && concerto.eventbrite ? `
        <a href="${concerto.eventbrite}" class="concert-button eventbrite-glow" target="_blank">
          ${ebText}
          <img src="img/icons/eventbrite.png" class="eventbrite-logo" alt="Eventbrite logo">
        </a>` : '';

      const details = renderConcertDetails(concerto, isFuture);

      div.innerHTML = `
        <div class="concert-content">
          <img src="${concerto.locandina}" alt="${concerto.titolo}" class="concert-poster"
               onclick='openConcertLightbox(${JSON.stringify(concerto)})'>
          <div class="concert-info">
            <h3>${concerto.titolo}</h3>
            <p>${formatDate(concerto.data)} – ${concerto.luogo}</p>
            <div class="concert-buttons">${yt}${eb}</div>
            ${isFuture ? `
              <div class="full-details" style="display: block;">${details}</div>
            ` : `
              <button class="concert-toggle" onclick="toggleDetails(event)">
                <span class="text">${lang === 'en' ? 'Show more' : 'Mostra di più'}</span>
                <span class="arrow">▼</span>
              </button>
              <div class="full-details" style="display: none;">${details}</div>
            `}
          </div>
        </div>
      `;

      container.appendChild(div);
    });
}

// === TIMELINE ARCHIVIO ===
function renderTimeline(data, lang) {
  const container = document.getElementById('concertiArchivio');
  if (!container) return;

  container.innerHTML = '';
  let totalConcerts = 0;

  data.sort((a, b) => b.anno - a.anno);

  data.forEach(year => {
    const block = document.createElement('div');
    block.className = 'year-block';

    const header = document.createElement('h2');
    header.className = 'year-header';
    header.innerHTML = `
      <img src="img/icons/calendar.svg" alt="calendar" class="calendar-icon">
      <span class="year-text">${year.anno}</span>
      <span class="year-arrow">▼</span>
    `;

    const content = document.createElement('div');
    content.className = 'year-content';
    content.style.maxHeight = '0';

    header.addEventListener('click', () => {
      document.querySelectorAll('.year-block').forEach(blockEl => {
        const contentEl = blockEl.querySelector('.year-content');
        const headerEl = blockEl.querySelector('.year-header');
        if (blockEl === block) {
          blockEl.classList.toggle('expanded');
          if (blockEl.classList.contains('expanded')) {
            contentEl.style.maxHeight = contentEl.scrollHeight + 'px';
            headerEl.classList.add('active');
          } else {
            contentEl.style.maxHeight = '0';
            headerEl.classList.remove('active');
          }
        } else {
          blockEl.classList.remove('expanded');
          contentEl.style.maxHeight = '0';
          headerEl.classList.remove('active');
        }
      });
    });

    year.concerti.forEach(concerto => {
      totalConcerts++;
      const div = document.createElement('div');
      div.className = 'concert-block';

      const details = renderConcertDetails(concerto);

      div.innerHTML = `
        <div class="concert-content">
          <img src="${concerto.locandina}" alt="${concerto.titolo}" class="concert-poster"
               onclick='openConcertLightbox(${JSON.stringify(concerto)})'>
          <div class="concert-info">
            <h3>${concerto.titolo}</h3>
            <p>${formatDate(concerto.data)} – ${concerto.luogo}</p>
            <button class="concert-toggle" onclick="toggleDetails(event)">
              <span class="text">${lang === 'en' ? 'Show more' : 'Mostra di più'}</span>
              <span class="arrow">▼</span>
            </button>
            <div class="full-details" style="display: none;">
              ${details}
            </div>
          </div>
        </div>
      `;
      content.appendChild(div);
    });

    block.appendChild(header);
    block.appendChild(content);
    container.appendChild(block);
  });

  const counter = document.getElementById('counter');
  if (counter) {
    counter.dataset.total = totalConcerts;
    counter.textContent = lang === 'en'
      ? `Total concerts: ${totalConcerts}`
      : `Concerti realizzati: ${totalConcerts}`;
  }
}

// === DETTAGLI CONCERTO ===
function renderConcertDetails(concerto) {
  let html = '';
  if (concerto.solisti) html += `<p>${concerto.solisti}</p>`;
  if (concerto.orchestra) {
    const name = concerto.orchestra.toLowerCase().includes('orchestra')
      ? concerto.orchestra
      : 'Orchestra ' + concerto.orchestra;
    html += `<p>${name}</p>`;
  }
  if (concerto.direttore) html += `<p>${concerto.direttore}</p>`;
  if (concerto.programma) {
    const lista = Array.isArray(concerto.programma)
      ? concerto.programma
      : concerto.programma.split('\n').filter(r => r.trim() !== '');
    html += `<strong>Programma:</strong><ul>${lista.map(p => `<li>${p}</li>`).join('')}</ul>`;
  }
  if (concerto.note) html += `<p>${concerto.note}</p>`;
  return html;
}

// === FORMATTAZIONE DATA ===
function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// === TOGGLE DETTAGLI ===
function toggleDetails(event) {
  const button = event.currentTarget;
  const details = button.nextElementSibling;
  const textSpan = button.querySelector('.text');
  const arrow = button.querySelector('.arrow');
  const lang = localStorage.getItem('preferredLang') || 'it';

  const isExpanded = details.style.display === "block";
  if (isExpanded) {
    details.style.display = "none";
    button.classList.remove('active');
    textSpan.textContent = lang === 'en' ? 'Show more' : 'Mostra di più';
    arrow.style.transform = 'rotate(0deg)';
  } else {
    details.style.display = "block";
    button.classList.add('active');
    textSpan.textContent = lang === 'en' ? 'Hide details' : 'Nascondi dettagli';
    arrow.style.transform = 'rotate(180deg)';
    setTimeout(() => {
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

// === LIGHTBOX ===
function openConcertLightbox(concerto) {
  const lightbox = document.getElementById('concert-lightbox');
  document.getElementById('concert-poster').src = concerto.locandina;

  let details = `<h3 style="color: var(--light-accent); font-size: 1.4rem;">${concerto.titolo}</h3>`;
  if (concerto.data && concerto.luogo) {
    details += `<p class="date-place">${formatDate(concerto.data)} – ${concerto.luogo}</p>`;
  }
  if (concerto.solisti) details += `<p>${concerto.solisti}</p>`;
  if (concerto.orchestra) {
    let name = concerto.orchestra.toLowerCase().includes('orchestra')
      ? concerto.orchestra
      : 'Orchestra ' + concerto.orchestra;
    details += `<p>${name}</p>`;
  }
  if (concerto.direttore) details += `<p>${concerto.direttore}</p>`;
  if (concerto.programma?.length) {
    details += `<strong>Programma:</strong><ul>${concerto.programma.map(p => `<li>${p}</li>`).join('')}</ul>`;
  }
  if (concerto.note) details += `<p>${concerto.note}</p>`;

  const lang = localStorage.getItem('preferredLang') || 'it';
  const ebText = lang === 'en' ? 'Book on Eventbrite' : 'Prenota su Eventbrite';

  details += `<div class="concert-links">`;

  if (new Date(concerto.data) < new Date() && concerto.youtube) {
    details += `<a href="${concerto.youtube}" class="concert-button" target="_blank">
      <img src="img/icons/youtube.png" class="icon" alt="YouTube"> YouTube
    </a>`;
  }

  if (new Date(concerto.data) >= new Date() && concerto.eventbrite) {
    details += `<a href="${concerto.eventbrite}" class="concert-button eventbrite-glow" target="_blank">
      ${ebText}
      <img src="img/icons/eventbrite.png" class="eventbrite-logo" alt="Eventbrite logo">
    </a>`;
  }

  details += `</div>`;

  document.getElementById('concert-details').innerHTML = details;
  lightbox.style.display = 'flex';
  setTimeout(() => lightbox.classList.add('show'), 10);
}

function closeConcertLightbox() {
  const lightbox = document.getElementById('concert-lightbox');
  lightbox.classList.remove('show');
  setTimeout(() => {
    lightbox.style.display = 'none';
  }, 300);
}

document.addEventListener('keydown', function (e) {
  if (e.key === "Escape") {
    closeConcertLightbox();
  }
});
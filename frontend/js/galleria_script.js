let currentImages = [];
let currentIndex = 0;
let galleryData = [];
let currentCategory = '';

document.addEventListener("DOMContentLoaded", () => {
  fetch('/api/galleria')
    .then(res => res.json())
    .then(data => {
      galleryData = data;
      renderCoverBlocks();
      const lang = localStorage.getItem('preferredLang') || 'it';
      updateGalleryLanguage(lang);
    });

  const savedLang = localStorage.getItem('preferredLang') || 'it';
  switchLang(savedLang);
});

// === RENDER COPERTINE ===
function renderCoverBlocks() {
  const container = document.querySelector('.gallery-covers');
  container.innerHTML = '';

  document.querySelector('.return-to-gallery-tabs').style.display = 'none';
  document.querySelector('.gallery-tabs').style.display = 'none';
  document.querySelector('.gallery-covers').style.display = 'flex';

  galleryData.forEach(cat => {
    const block = document.createElement('div');
    block.className = 'cover-block';
    block.onclick = () => openGallery(cat.categoria);

    const img = document.createElement('img');
    img.src = cat.cover
      ? 'img/galleria/' + cat.cover
      : ('img/galleria/' + cat.categoria + '/' + cat.immagini[0]?.file || 'img/placeholder.jpg');
    img.alt = cat[`titolo_it`];

    const titleIT = document.createElement('div');
    titleIT.className = 'cover-title lang-it';
    titleIT.textContent = cat.titolo_it;

    const titleEN = document.createElement('div');
    titleEN.className = 'cover-title lang-en';
    titleEN.textContent = cat.titolo_en;

    block.appendChild(img);
    block.appendChild(titleIT);
    block.appendChild(titleEN);
    container.appendChild(block);
  });

  updateGalleryLanguage(localStorage.getItem('preferredLang') || 'it');
}

// === APRI GALLERIA ===
function openGallery(sectionId) {
  currentCategory = sectionId;
  document.querySelector('.gallery-covers').style.display = 'none';
  document.querySelector('.gallery-tabs').style.display = 'flex';
  document.querySelector('.return-to-gallery-tabs').style.display = 'block';
  showGallery(sectionId);
}

// === MOSTRA GALLERIA
function showGallery(sectionId) {
  currentCategory = sectionId;
  document.querySelectorAll('.gallery-section').forEach(s => s.remove());

  const cat = galleryData.find(c => c.categoria === sectionId);
  if (!cat) return;

  // Mostra pulsanti dinamici
  const tabs = document.querySelector('.gallery-tabs');
  tabs.innerHTML = '';
  tabs.style.display = 'flex';

  galleryData.forEach(g => {
    const btnIT = document.createElement('button');
    btnIT.className = 'lang-it' + (g.categoria === sectionId ? ' active' : '');
    btnIT.textContent = g.titolo_it;
    btnIT.onclick = () => showGallery(g.categoria);
    tabs.appendChild(btnIT);

    const btnEN = document.createElement('button');
    btnEN.className = 'lang-en' + (g.categoria === sectionId ? ' active' : '');
    btnEN.textContent = g.titolo_en;
    btnEN.onclick = () => showGallery(g.categoria);
    tabs.appendChild(btnEN);
  });

  // Griglia immagini
  const div = document.createElement('div');
  div.id = sectionId;
  div.className = 'gallery-grid gallery-section';

  cat.immagini.forEach(imgObj => {
    if (!imgObj.file) return;
    const img = document.createElement('img');
    img.src = 'img/galleria/' + sectionId + '/' + imgObj.file;
    img.alt = imgObj[`alt_it`] || '';
    img.onclick = () => openLightbox(imgObj, sectionId);
    div.appendChild(img);
  });

  document.getElementById('galleria').appendChild(div);
  updateGalleryLanguage(localStorage.getItem('preferredLang') || 'it');
}

// === TORNA ALLE COPERTINE
function tornaAllaGalleria() {
  document.querySelectorAll('.gallery-section').forEach(s => s.remove());
  document.querySelector('.gallery-tabs').innerHTML = '';
  document.querySelector('.gallery-tabs').style.display = 'none';
  document.querySelector('.return-to-gallery-tabs').style.display = 'none';
  document.querySelector('.gallery-covers').style.display = 'flex';
}

// === LIGHTBOX ===
function openLightbox(imgObj, sectionId) {
  const lang = localStorage.getItem('preferredLang') || 'it';
  const src = 'img/galleria/' + sectionId + '/' + imgObj.file;

  currentCategory = sectionId;
  currentImages = galleryData.find(c => c.categoria === sectionId)?.immagini.filter(i => i.file) || [];
  currentIndex = currentImages.findIndex(i => i.file === imgObj.file);

  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-img').alt = imgObj[`alt_${lang}`] || '';
  document.getElementById('counter').textContent = `${currentIndex + 1} / ${currentImages.length}`;
  document.getElementById('lightbox').style.display = 'block';
  document.getElementById('lightbox').classList.add('show');
}

// === NAVIGAZIONE LIGHTBOX ===
function nextImage(e) {
  e.stopPropagation();
  if (!currentImages.length) return;
  currentIndex = (currentIndex + 1) % currentImages.length;
  updateLightboxImage();
}

function prevImage(e) {
  e.stopPropagation();
  if (!currentImages.length) return;
  currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  const imgObj = currentImages[currentIndex];
  const lang = localStorage.getItem('preferredLang') || 'it';
  const src = 'img/galleria/' + currentCategory + '/' + imgObj.file;

  const img = document.getElementById('lightbox-img');
  img.style.opacity = 0;
  setTimeout(() => {
    img.src = src;
    img.alt = imgObj[`alt_${lang}`] || '';
    img.style.opacity = 1;
    document.getElementById('counter').textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }, 300);
}

// === CHIUDI LIGHTBOX ===
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('show');
  setTimeout(() => {
    lb.style.display = 'none';
  }, 300);
}

// === KEYBOARD SUPPORT ===
document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (lb.classList.contains('show')) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') nextImage(e);
    else if (e.key === 'ArrowLeft') prevImage(e);
  }
});

// === LINGUA ===
function updateGalleryLanguage(lang) {
  document.querySelectorAll('.lang-it, .lang-en').forEach(el => {
    el.classList.remove('visible');
    if (el.classList.contains(`lang-${lang}`)) el.classList.add('visible');
  });

  // Evidenzia pulsante attivo nella navbar
  document.getElementById('btn-it')?.classList.toggle('active', lang === 'it');
  document.getElementById('btn-en')?.classList.toggle('active', lang === 'en');
}
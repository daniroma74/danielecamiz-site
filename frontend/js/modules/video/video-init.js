// video-init.js – Server-side i18n adaptation

import { renderVideoTitles } from './video-render.js';
import { setupVideoClickHandlers } from './video-utils.js';

// Ottieni la lingua corrente dalla query string
function getCurrentLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get('lng') || 'it';
}

// Handler per cambio lingua: ricarica la pagina con ?lng=
function onLangChange(newLang) {
  const url = new URL(window.location.href);
  url.searchParams.set('lng', newLang);
  window.location.href = url.toString();
}

// Esponi la funzione globale per i bottoni inline
window.onLangChange = onLangChange;

// Inizializza la sezione Video all'accesso del DOM
document.addEventListener('DOMContentLoaded', () => {
  const lang = getCurrentLang();
  renderVideoTitles(lang);
  setupVideoClickHandlers();
});
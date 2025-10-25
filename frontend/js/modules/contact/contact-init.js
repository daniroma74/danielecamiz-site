// contact-init.js - Server-side i18n adaptation

import { renderContact } from './contact-render.js';
import { loadContactData } from './contact-utils.js';

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

// Avvia il modulo Contact
document.addEventListener('DOMContentLoaded', async () => {
  const lang = getCurrentLang();
  await loadContactData(lang);
  renderContact(lang);
});

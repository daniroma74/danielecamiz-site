// frontend/js/modules/home/home-entry.js
// Entry della Home: inizializza i moduli client. Convenzioni rispettate.

import { initHomeHero } from './home-hero.js';
import { initHomeProjects } from './home-projects.js';
import { initHomeNews } from './home-news.js';
import { initHomeVideos } from './home-video.js';
import { initHomeConcerts } from './home-concerts.js';
import { initHomeContact } from './home-contact.js';

function safeCall(fn, ...args) {
  try {
    if (typeof fn === 'function') fn(...args);
  } catch (e) {
    console.error('[home-entry] module error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Hero (testi già SSR, eventuali interazioni)
  safeCall(initHomeHero);

  // Progetti (SSR + piccoli effetti)
  safeCall(initHomeProjects);

  // News (se hai un arricchimento client)
  safeCall(initHomeNews);

  // Ultimi video: carica 3 dal proxy server-side
  safeCall(initHomeVideos, 3);

  // Concerti: anteprima/timeline o CTA
  safeCall(initHomeConcerts);

  // Mini contatti: eventuali interazioni
  safeCall(initHomeContact);
});

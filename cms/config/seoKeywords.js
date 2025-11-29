// SEO Keywords per pagina - 2025 Best Practices
// Ogni pagina ha keywords specifiche in IT e EN

export const pageKeywords = {
  home: {
    it: 'Daniele Camiz, direttore d\'orchestra, direttore musicale, concerti Roma, musica classica, ICNT, I Concerti nel Tempio, opera, sinfonia, orchestra, direttore italiano',
    en: 'Daniele Camiz, conductor, music director, Rome concerts, classical music, ICNT, I Concerti nel Tempio, opera, symphony, orchestra, Italian conductor'
  },

  bio: {
    it: 'Daniele Camiz biografia, curriculum musicale, formazione musicale, carriera direttore orchestra, studi musicali, direttore italiano, esperienza sinfonica',
    en: 'Daniele Camiz biography, musical curriculum, musical training, orchestra conductor career, music studies, Italian conductor, symphonic experience'
  },

  concerts: {
    it: 'concerti Daniele Camiz, stagione concertistica, programmi sinfonici, concerti Roma, eventi musicali, calendario concerti, ICNT concerti, musica dal vivo',
    en: 'Daniele Camiz concerts, concert season, symphonic programs, Rome concerts, musical events, concert calendar, ICNT concerts, live music'
  },

  news: {
    it: 'news Daniele Camiz, ultime notizie, eventi recenti, rassegna stampa, aggiornamenti musicali, novità concerti, attualità musica classica',
    en: 'Daniele Camiz news, latest news, recent events, press review, music updates, concert news, classical music updates'
  },

  gallery: {
    it: 'foto Daniele Camiz, galleria fotografica, concerti foto, video performance, repertorio musicale, immagini orchestra, backstage concerti',
    en: 'Daniele Camiz photos, photo gallery, concert photos, performance videos, music repertoire, orchestra images, concert backstage'
  },

  press: {
    it: 'rassegna stampa Daniele Camiz, recensioni concerti, articoli stampa, media coverage, critica musicale, interviste, press kit',
    en: 'Daniele Camiz press, concert reviews, press articles, media coverage, music criticism, interviews, press kit'
  },

  repertoire: {
    it: 'repertorio Daniele Camiz, opere dirette, programmi sinfonici, compositori interpretati, Mozart, Beethoven, Verdi, musica contemporanea, repertorio lirico',
    en: 'Daniele Camiz repertoire, conducted works, symphonic programs, interpreted composers, Mozart, Beethoven, Verdi, contemporary music, operatic repertoire'
  },

  video: {
    it: 'video Daniele Camiz, performance video, concerti registrati, estratti musicali, YouTube, video orchestra, esibizioni live',
    en: 'Daniele Camiz videos, performance videos, recorded concerts, musical excerpts, YouTube, orchestra videos, live performances'
  },

  privacy: {
    it: 'privacy policy, informativa privacy, protezione dati, GDPR, cookie policy, trattamento dati personali',
    en: 'privacy policy, privacy notice, data protection, GDPR, cookie policy, personal data processing'
  },

  newsletter: {
    it: 'newsletter Daniele Camiz, iscriviti newsletter, aggiornamenti concerti, news musica classica, mailing list, novità ICNT',
    en: 'Daniele Camiz newsletter, subscribe newsletter, concert updates, classical music news, mailing list, ICNT updates'
  }
};

/**
 * Get keywords for a specific page
 * @param {string} page - Page identifier (home, bio, concerts, etc.)
 * @param {string} lang - Language (it or en)
 * @param {string} [customKeywords] - Optional custom keywords to append
 * @returns {string} Comma-separated keywords
 */
export function getPageKeywords(page, lang = 'it', customKeywords = '') {
  const baseKeywords = pageKeywords[page]?.[lang] || pageKeywords.home[lang];

  if (customKeywords) {
    return `${baseKeywords}, ${customKeywords}`;
  }

  return baseKeywords;
}

/**
 * Get keywords for a news article
 * @param {object} article - Article object with tags and category
 * @param {string} lang - Language
 * @returns {string} Keywords based on article content
 */
export function getArticleKeywords(article, lang = 'it') {
  const baseNews = pageKeywords.news[lang];
  const tags = Array.isArray(article.tags) ? article.tags.join(', ') : '';
  const category = article.category || '';

  const parts = [baseNews];
  if (category) parts.push(category);
  if (tags) parts.push(tags);

  return parts.filter(Boolean).join(', ');
}

export default { pageKeywords, getPageKeywords, getArticleKeywords };

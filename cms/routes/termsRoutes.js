import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function cssExists(relCssPath) {
  try {
    const abs = path.join(__dirname, '..', '..', 'frontend', 'css', relCssPath);
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

// Normalizza i termini a uno schema unico per la view
function normalizeTerms(json, lng, t) {
  if (!json) json = {};
  const updatedAt =
    json.updatedAt || json.last_update || json.lastUpdate || null;

  // sections: accetta varianti {title|heading}, {bodyHtml|body|content|paragraphs|items}
  const sections = Array.isArray(json.sections)
    ? json.sections.map(s => ({
        title:
          s.title || s.heading || null,
        bodyHtml:
          s.bodyHtml || null,
        body:
          s.body || s.content || null,
        paragraphs:
          Array.isArray(s.paragraphs) ? s.paragraphs : null,
        items:
          Array.isArray(s.items) ? s.items : null
      }))
    : null;

  const title =
    json.title ||
    (typeof t === 'function' && t('terms.title') !== 'terms.title'
      ? t('terms.title')
      : (lng === 'en' ? 'Terms and Conditions' : 'Termini e condizioni'));

  const description =
    json.description ||
    (lng === 'en'
      ? 'Read our Terms and Conditions.'
      : 'Leggi i Termini e condizioni.');

  return { title, description, updatedAt, sections, bodyHtml: json.bodyHtml || null, body: json.body || null, paragraphs: Array.isArray(json.paragraphs) ? json.paragraphs : null };
}

router.get('/', async (req, res) => {
  const lang = (res.locals.lang || req.language || 'it').toLowerCase();

  // terms-<lang>.json → fallback terms.json (sotto cms/data/i18n)
  const filePerLang = path.join(__dirname, '..', 'data', 'i18n', `terms-${lang}.json`);
  let data = await loadJsonSafe(filePerLang);
  if (!data) {
    const generic = path.join(__dirname, '..', 'data', 'i18n', 'terms.json');
    data = await loadJsonSafe(generic);
  }

  const t = typeof res.locals.t === 'function' ? res.locals.t : undefined;
  const content = normalizeTerms(data, lang, t);

  // CSS pagina opzionale (se esiste evitiamo 404)
  const cssFiles = [];
  if (await cssExists('pages/terms/terms.css')) {
    cssFiles.push('/css/pages/terms/terms.css');
  }

  return res.renderPage('pages/frontend/terms', {
    layout: 'layouts/base-frontend',
    lang,
    labels: res.locals.labels || {},
    title: content.title,
    description: content.description,
    bodyClass: 'page-terms',
    cssFiles,
    pageScripts: [],
    content
  });
});

export default router;

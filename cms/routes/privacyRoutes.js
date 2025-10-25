import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readJsonSafe(absPath, fallback = null) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

router.get('/', async (req, res) => {
  const lang = (res.locals.lang || req.language || 'it').toLowerCase();
  const dataFile = path.join(__dirname, '..', 'data', 'i18n', `privacy-${lang}.json`);
  const content = await readJsonSafe(dataFile, {});

  const t = typeof res.locals.t === 'function' ? res.locals.t : () => undefined;
  const title = content?.title || t('privacy.title') || (lang === 'en' ? 'Privacy Policy' : 'Informativa Privacy');
  const description = content?.description || t('privacy.description') || (lang === 'en'
    ? 'Read our Privacy Policy.'
    : 'Leggi la nostra Informativa sulla Privacy.');

  return res.renderPage('pages/frontend/privacy', {
    layout: 'layouts/base-frontend',
    lang,
    labels: res.locals.labels || {},
    title,
    description,
    cssFiles: [],        // nessun CSS specifico dichiarato per questa pagina
    pageScripts: [],
    content
  });
});

export default router;

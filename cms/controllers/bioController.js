// cms/controllers/bioController.js
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import { resolveMediaById } from '../utils/mediaResolver.js';
import { resolveFrontendImg } from '../utils/mediaResolver.js';
import { initDatabase } from '../utils/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DATA_DIR   = path.join(__dirname, '..', 'data', 'i18n');

async function readJsonSafe(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isHttp(u) { return typeof u === 'string' && /^https?:\/\//i.test(u); }
function pickFirst(...vals) { return vals.find(v => typeof v === 'string' && v.trim().length > 0) || null; }

async function getBioContentFromDB(lang = 'it') {
  try {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bio_content WHERE section = ? AND lang = ?',
        ['biography', lang],
        (err, row) => {
          if (err) {
            console.warn('[bioController] DB query error:', err);
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    });
  } catch (error) {
    console.warn('[bioController] DB connection error:', error);
    return null;
  }
}

async function resolveBioMedia(bioData, lang = 'it', dbContent = null) {
  const media = (bioData && typeof bioData === 'object') ? (bioData.media || {}) : {};

  // PHOTO --------------------------------------------------------------
  // Prima prova dal DB, poi dal JSON
  let photoId = dbContent?.profile_photo_cloudinary_id ||
                media.photo_media_id ||
                bioData.photo_media_id ||
                bioData.profile_media_id || null;

  let photo = null;
  if (photoId != null) {
    photo = await resolveMediaById(photoId, { width: 1400, crop: 'fill', quality: 'auto', format: 'auto' });
  }
  if (!photo) {
    const photoRaw = pickFirst(media.photo_url, bioData.photo_url, bioData.photo, bioData.image, bioData.profile_photo);
    if (photoRaw) photo = isHttp(photoRaw) ? photoRaw : (resolveFrontendImg(photoRaw) || photoRaw);
  }

  // CV / CURRICULUM (PDF o link) --------------------------------------
  // Prima prova dal DB, poi dal JSON
  const cvId = dbContent?.cv_pdf_cloudinary_id ||
               media.cv_pdf_media_id ||
               media.cv_media_id ||
               bioData.cv_pdf_media_id ||
               bioData.curriculum_media_id || null;

  let cv_pdf = null;
  if (cvId != null) {
    cv_pdf = await resolveMediaById(cvId);
  }
  if (!cv_pdf) {
    const cvRaw = pickFirst(media.cv_pdf_url, media.cv_url, bioData.cv_pdf_url, bioData.cv_url, bioData.curriculum_url);
    if (cvRaw) cv_pdf = isHttp(cvRaw) ? cvRaw : (resolveFrontendImg(cvRaw) || cvRaw);
  }

  return { photo, cv_pdf };
}

export async function getBio(req, res) {
  const lang = (res.locals.lang || 'it').toLowerCase();

  // Leggi dal database (priorità) e fallback su JSON
  const dbContent = await getBioContentFromDB(lang);
  const bioPath = path.join(DATA_DIR, `bio-${lang}.json`);
  const bioData = (await readJsonSafe(bioPath)) || {};

  const t = typeof res.locals.t === 'function' ? res.locals.t : (k => null);

  // Usa DB se disponibile, altrimenti JSON
  const title = dbContent?.title || bioData?.page?.title || t('bio.title') || (lang === 'en' ? 'Biography' : 'Bio');
  const claim = dbContent?.intro || bioData?.page?.claim || t('bio.claim') || '';
  const content = dbContent?.content || bioData?.content || '';

  // CSS & JS centralizzati
  const cssFiles = listPageCss('bio');
  const jsEntry  = havePageJs('bio');
  const pageScripts = jsEntry ? [jsEntry] : ['modules/bio/bio-entry.js'];

  // Media risolti (foto profilo, CV/PDF) – prima dal DB, poi dal JSON
  const bioMedia = await resolveBioMedia(bioData, lang, dbContent);

  return res.renderPage('pages/frontend/bio', {
    layout: 'layouts/base-frontend',
    title,
    description: claim || '',
    pageMeta: { title, description: claim || '' },
    cssFiles,
    pageStyles: cssFiles,
    pageScripts,
    claim,
    content,
    bio: bioData,
    bioMedia,   // { photo, cv_pdf }
    dbContent,  // Passa il contenuto DB alla view
    isBio: true
  });
}
// cms/controllers/bioController.js
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import { resolveMediaById } from '../utils/mediaResolver.js';
import { resolveFrontendImg } from '../utils/mediaResolver.js';

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

async function resolveBioMedia(bioData, lang = 'it') {
  const media = (bioData && typeof bioData === 'object') ? (bioData.media || {}) : {};

  // PHOTO --------------------------------------------------------------
  const photoId = media.photo_media_id || bioData.photo_media_id || bioData.profile_media_id || null;
  let photo = null;
  if (photoId != null) {
    photo = await resolveMediaById(photoId, { width: 1400, crop: 'fill', quality: 'auto', format: 'auto' });
  }
  if (!photo) {
    const photoRaw = pickFirst(media.photo_url, bioData.photo_url, bioData.photo, bioData.image, bioData.profile_photo);
    if (photoRaw) photo = isHttp(photoRaw) ? photoRaw : (resolveFrontendImg(photoRaw) || photoRaw);
  }

  // CV / CURRICULUM (PDF o link) --------------------------------------
  const cvId = media.cv_pdf_media_id || media.cv_media_id || bioData.cv_pdf_media_id || bioData.curriculum_media_id || null;
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
  const bioPath = path.join(DATA_DIR, `bio-${lang}.json`);
  const bioData = (await readJsonSafe(bioPath)) || {};

  const t = typeof res.locals.t === 'function' ? res.locals.t : (k => null);
  const title = (bioData?.page?.title) || t('bio.title') || (lang === 'en' ? 'Biography' : 'Bio');
  const claim = (bioData?.page?.claim) || t('bio.claim') || '';

  // CSS & JS centralizzati
  const cssFiles = listPageCss('bio');
  const jsEntry  = havePageJs('bio');
  const pageScripts = jsEntry ? [jsEntry] : ['modules/bio/bio-entry.js'];

  // Media risolti (foto profilo, CV/PDF) – non rompe i JSON legacy
  const bioMedia = await resolveBioMedia(bioData, lang);

  return res.renderPage('pages/frontend/bio', {
    layout: 'layouts/base-frontend',
    title,
    description: claim || '',
    pageMeta: { title, description: claim || '' },
    cssFiles,
    pageStyles: cssFiles,
    pageScripts,
    claim,
    bio: bioData,
    bioMedia,   // { photo, cv_pdf }
    isBio: true
  });
}
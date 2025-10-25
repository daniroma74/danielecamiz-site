// cms/controllers/galleryController.js
import path from 'path';
import fs from 'fs/promises';

import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import { resolveMediaById, resolveAsset } from '../utils/mediaResolver.js';

const CMS_ROOT = process.cwd();
const I18N_DIR = path.join(CMS_ROOT, 'data', 'i18n');
const UPLOADS_COVERS_DIR = path.join(CMS_ROOT, 'uploads', 'gallery_covers');
const UPLOADS_GALLERY_DIR = path.join(CMS_ROOT, 'uploads', 'gallery');
const FRONTEND_ROOT = path.resolve(CMS_ROOT, '..', 'frontend');
const FRONTEND_IMG_GALLERY = path.join(FRONTEND_ROOT, 'img', 'gallery');
const FRONTEND_COVERS_DIR = path.join(FRONTEND_IMG_GALLERY, 'covers');

/* ===================== helpers ===================== */
async function readJSONSafe(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function loadGallery(lang = 'it') {
  const tryPaths = [
    path.join(I18N_DIR, `gallery-${lang}.json`),
    path.join(I18N_DIR, 'gallery-it.json'),
    path.join(I18N_DIR, 'gallery-en.json')
  ];
  for (const p of tryPaths) {
    const data = await readJSONSafe(p);
    if (data && (Array.isArray(data) || typeof data === 'object')) return data;
  }
  return [];
}

async function loadGalleryLabels(lang = 'it') {
  const tryPaths = [
    path.join(I18N_DIR, `labels-gallery-${lang}.json`),
    path.join(I18N_DIR, 'labels-gallery-it.json'),
    path.join(I18N_DIR, 'labels-gallery-en.json')
  ];
  for (const p of tryPaths) {
    const data = await readJSONSafe(p);
    if (data && typeof data === 'object') return data;
  }
  return null;
}

function flattenGalleryLabels(obj) {
  if (obj && typeof obj === 'object' && obj.gallery && typeof obj.gallery === 'object') {
    return { ...obj.gallery };
  }
  return obj || {};
}

function isHttpUrl(u = '') {
  return /^https?:\/\//i.test(String(u || '').trim());
}

// --- sanitize helpers for file paths (NEW) ---
function cleanCoverName(input = '') {
  const s = String(input || '').trim().replace(/\\/g, '/');
  // se arriva "covers/foo.jpg" o "/img/gallery/covers/foo.jpg" prendo solo il basename
  const base = s.split('/').pop();
  return base || '';
}

function cleanRelGalleryPath(input = '') {
  let s = String(input || '').trim().replace(/\\/g, '/');
  // rimuovi prefissi ridondanti
  s = s.replace(/^\/?img\/gallery\//i, '');
  s = s.replace(/^\/?gallery\//i, '');
  s = s.replace(/^.\//, '');
  return s;
}

async function normalizeCoverAsync(cover = '') {
  const s = String(cover || '').trim();
  if (!s) return '';
  if (isHttpUrl(s) || s.startsWith('/uploads/') || s.startsWith('/img/')) return s; // già assoluto

  const file = cleanCoverName(s);
  if (!file) return '';

  // 1) prova uploads/covers/<basename>
  const upAbs = path.join(UPLOADS_COVERS_DIR, file);
  if (await fileExists(upAbs)) return `/uploads/gallery_covers/${file}`;
  // 2) fallback a frontend/img/gallery/covers/<basename>
  const feAbs = path.join(FRONTEND_COVERS_DIR, file);
  if (await fileExists(feAbs)) return `/img/gallery/covers/${file}`;
  // default: punta a uploads (target migrazione)
  return `/uploads/gallery_covers/${file}`;
}

async function normalizePhotoSrcAsync(srcIn = '') {
  const raw = String(srcIn || '').trim();
  if (!raw) return '';
  if (isHttpUrl(raw) || raw.startsWith('/uploads/') || raw.startsWith('/img/')) return raw; // assoluto

  const rel = cleanRelGalleryPath(raw);

  // prova frontend/img/gallery/<rel>
  const feAbs = path.join(FRONTEND_IMG_GALLERY, rel);
  if (await fileExists(feAbs)) return `/img/gallery/${rel}`;

  // prova uploads/gallery/<rel> (se in futuro migrerai qui le foto)
  const upAbs = path.join(UPLOADS_GALLERY_DIR, rel);
  if (await fileExists(upAbs)) return `/uploads/gallery/${rel}`;

  // fallback: comunque sotto /img/gallery
  return `/img/gallery/${rel}`;
}

async function normalizePhotosAsync(photos) {
  if (!Array.isArray(photos)) return [];
  const mapped = await Promise.all(photos.map(async ph => {
    // Legacy: if the item is a string, resolve as a plain path/URL
    if (typeof ph === 'string') {
      return await normalizePhotoSrcAsync(ph);
    }

    const obj = { ...(ph || {}) };

    // Preferred: resolve via media_assets.id
    if (obj.media_id != null) {
      const full = await resolveMediaById(obj.media_id, { width: 1600, crop: 'fill', quality: 'auto', format: 'auto' });
      const thumb = await resolveMediaById(obj.media_id, { width: 600, crop: 'fill', quality: 'auto', format: 'auto' });
      obj.src = full || (await normalizePhotoSrcAsync(obj.src || obj.url || ''));
      if (thumb) obj.thumb = thumb;
      return obj;
    }

    // Also support direct Cloudinary public_id (cloudinary_id)
    if (obj.cloudinary_id) {
      const full = resolveAsset({ storage: 'cloudinary', cloudinary_id: obj.cloudinary_id }, { width: 1600, crop: 'fill', quality: 'auto', format: 'auto' });
      const thumb = resolveAsset({ storage: 'cloudinary', cloudinary_id: obj.cloudinary_id }, { width: 600, crop: 'fill', quality: 'auto', format: 'auto' });
      obj.src = full || (await normalizePhotoSrcAsync(obj.src || obj.url || ''));
      if (thumb) obj.thumb = thumb;
      return obj;
    }

    // Fallback: local/legacy path normalization
    obj.src = await normalizePhotoSrcAsync(obj.src || obj.url || '');
    return obj;
  }));
  return mapped;
}

async function normalizeCategoriesAsync(input) {
  const arr = Array.isArray(input) ? input : (Array.isArray(input?.categories) ? input.categories : []);
  const out = await Promise.all((arr || []).map(async cat => {
    const c = { ...(cat || {}) };
    c.cover = await normalizeCoverAsync(c.cover || c.image || '');
    if (Array.isArray(c.photos)) c.photos = await normalizePhotosAsync(c.photos);
    if (Array.isArray(c.items))  c.items  = await normalizeCategoriesAsync(c.items);
    return c;
  }));
  return out;
}

async function collectGalleryScripts() {
  const candidates = [
    { abs: path.join(FRONTEND_ROOT, 'js', 'gallery-lightbox.js'),                      web: '/js/gallery-lightbox.js' },
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'gallery', 'gallery-entry.js'), web: '/js/modules/gallery/gallery-entry.js' }
  ];
  const out = [];
  for (const c of candidates) {
    try { await fs.access(c.abs); out.push(c.web); } catch {}
  }
  const entry = havePageJs('gallery');
  if (entry && !out.includes(entry)) out.push(entry);
  return out;
}

/* ===================== controller ===================== */
export async function getGalleryPage(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const labelsAll = res.locals.labels || {};

    // labels specifiche (appiattite se annidate sotto "gallery")
    const labelsGalleryRaw = await loadGalleryLabels(lang);
    const labelsGalleryFlat = flattenGalleryLabels(labelsGalleryRaw || {});

    const mergedLabels = { ...labelsAll };
    mergedLabels.gallery = { ...(labelsAll.gallery || {}), ...labelsGalleryFlat };
    mergedLabels.pages = { ...(labelsAll.pages || {}), gallery: { ...(labelsAll.pages?.gallery || {}), ...labelsGalleryFlat } };

    res.locals.labels = mergedLabels; // così eventuali t('gallery.*') vedono queste labels

    const raw = await loadGallery(lang);
    const categories = await normalizeCategoriesAsync(raw);

    const L = mergedLabels.gallery || {};
    const claimFromLabels = L.claimHTML || L.claim_html || L.claim || '';
    const claimFromData = (raw && typeof raw === 'object' && !Array.isArray(raw))
      ? (raw.claimHTML || raw.claim_html || raw.claim || '')
      : '';
    const claimHTML = claimFromLabels || claimFromData;

    const title = L.title || (lang === 'en' ? 'Gallery' : 'Galleria');
    const description = L.claim || claimFromData || '';

    const cssFiles = listPageCss('gallery');
    const pageScripts = await collectGalleryScripts();

    return res.renderPage('pages/frontend/gallery', {
      layout: 'layouts/base-frontend',
      lang,
      labels: mergedLabels,
      title,
      description,
      pageMeta: { title, description },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      claimHTML,
      categories
    });
  } catch (err) {
    console.error('[galleryController] getGalleryPage error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading Gallery' : 'Errore caricando la Galleria',
      description: ''
    });
  }
}
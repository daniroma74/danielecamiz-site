// cms/controllers/homeController.js
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import * as newsStore from '../utils/newsStore.js';
import * as assetHelpers from '../utils/assetHelpers.js';
import * as mediaResolver from '../utils/mediaResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const CMS_ROOT   = path.join(__dirname, '..');
const FRONTEND_ROOT = path.join(CMS_ROOT, '..', 'frontend');

/* ------------------------------- FS helpers ------------------------------- */
async function fileExists(absPath) { try { await fs.access(absPath); return true; } catch { return false; } }
async function readJsonSafe(absPath, fallback = null) {
  try { const raw = await fs.readFile(absPath, 'utf8'); return JSON.parse(raw); } catch { return fallback; }
}
function absI18n(file) { return path.join(CMS_ROOT, 'data', 'i18n', file); }
function absHome(file) { return path.join(CMS_ROOT, 'data', 'home', file); }

/* ---------------------------- Formatting helpers -------------------------- */
function formatDateISO(dateStr, lang = 'it') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  try { return new Intl.DateTimeFormat(lang, { day: '2-digit', month: 'short', year: 'numeric' }).format(d); }
  catch { return dateStr; }
}

async function buildPosterUrl(row) {
  const isFuture = true;
  const url = await mediaResolver.resolvePosterUrlAsync({
    poster_media_id: row.poster_media_id,
    poster_canonical_url: row.poster_canonical_url,
    poster_cloudinary_id: row.poster_cloudinary_id,
    poster_local_filename: row.poster_local_filename,
    is_future: isFuture
  }, { quality: 'auto', format: 'auto' });
  return url || '';
}

/* ------------------------------- DB helpers ------------------------------- */
// Usa SOLO la connessione condivisa in req.app.locals.db (no import di moduli DB)
function dbAll(db, sql, params = []) {
  return new Promise((resolve) => {
    if (!db || typeof db.all !== 'function') return resolve([]);
    try {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('[homeController] dbAll error:', err.message, 'SQL:', sql);
          return resolve([]);
        }
        resolve(rows || []);
      });
    } catch (e) {
      console.error('[homeController] dbAll catch:', e);
      resolve([]);
    }
  });
}

/* ------------------------------- Data loaders ----------------------------- */
async function getUpcomingConcerts(db, lang = 'it', limit = 3) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const rows = await dbAll(
    db,
    `SELECT id, title, date, location, poster_cloudinary_id, poster_local_filename,
            poster_media_id, poster_canonical_url
       FROM concerts
      WHERE date >= ?
   ORDER BY date ASC
      LIMIT ?`,
    [todayISO, limit]
  );

  const mapped = await Promise.all((rows || []).map(async r => ({
    id: r.id,
    title: r.title,
    date: formatDateISO(r.date, lang),
    place: r.location || '',
    city: '',
    poster: await buildPosterUrl(r),
    orchestra: '',
    conductor: '',
    soloists: '',
    program: '',
    notes: ''
  })));

  return mapped;
}

async function getLatestVideos(limit = 3) {
  try {
    const yt = await import('../utils/youtubeService.js');
    if (typeof yt.getLatestVideos === 'function') return await yt.getLatestVideos(limit);
    if (typeof yt.fetchLatestVideos === 'function') return await yt.fetchLatestVideos(limit);
  } catch {}
  return [];
}

/* ------------------------- News teaser (fonte unica) ---------------------- */
async function fetchNewsTeaserPrimary(lang) {
  try {
    if (typeof newsStore.list === 'function') {
      const all = await newsStore.list({ status: 'published', lang, limit: 3 });
      const items = Array.isArray(all?.items) ? all.items : (Array.isArray(all) ? all : []);
      return items;
    }
  } catch (err) {
    console.error('[homeController] newsStore.list error:', err);
  }
  return [];
}

async function fetchNewsTeaserFallback(lang) {
  const p = path.join(CMS_ROOT, 'data', 'news', 'posts.json');
  const list = await readJsonSafe(p, []);
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  const norm = list
    .filter(it => (it?.status === 'published') && ((it.lang || it.language || 'it').toLowerCase() === lang))
    .sort((a, b) => new Date(b.published_at || b.date || 0) - new Date(a.published_at || a.date || 0))
    .slice(0, 3)
    .map(it => {
      const rawCover = it.cover_url || it.cover || '';
      const cover_url = (typeof mediaResolver.resolveFrontendImg === 'function')
        ? (mediaResolver.resolveFrontendImg(rawCover) || rawCover)
        : rawCover;
      return {
        id: it.id || it.slug,
        title: it.title,
        slug: it.slug,
        excerpt: it.excerpt || '',
        cover_url,
        date: formatDateISO(it.published_at || it.date, lang),
        published_at: it.published_at || it.date || new Date(now).toISOString()
      };
    });
  return norm;
}

/* -------------------------------- Controller ------------------------------ */
export async function getHomePage(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const db = req.app.locals?.db || null;

    const cookieConsent = (req.cookies && (req.cookies.cookie_consent || req.cookies.consent)) || 'pending';

    let homeData = await readJsonSafe(absHome(`home-${lang}.json`), null);
    if (!homeData) {
      homeData = (await readJsonSafe(absI18n(`home-${lang}.json`), {})) || {};
    }

    if (!Array.isArray(homeData.projects)) {
      const pjHome = absHome(`projects-${lang}.json`);
      const pjI18n = absI18n(`projects-${lang}.json`);
      if (await fileExists(pjHome)) {
        homeData.projects = await readJsonSafe(pjHome, []);
      } else if (await fileExists(pjI18n)) {
        homeData.projects = await readJsonSafe(pjI18n, []);
      } else {
        homeData.projects = [];
      }
    }

    let newsTeaser = await fetchNewsTeaserPrimary(lang);
    if (!Array.isArray(newsTeaser) || newsTeaser.length === 0) {
      newsTeaser = await fetchNewsTeaserFallback(lang);
    }

    const bcHomeJson = await readJsonSafe(absHome(`bandcamp-${lang}.json`), null);
    const bcI18nJson = bcHomeJson ? null : await readJsonSafe(absI18n(`bandcamp-${lang}.json`), null);
    const bandcampJson = bcHomeJson ?? bcI18nJson;
    const bandcampItems = Array.isArray(bandcampJson?.items)
      ? bandcampJson.items
      : Array.isArray(bandcampJson)
        ? bandcampJson
        : Array.isArray(homeData.bandcamp)
          ? homeData.bandcamp
          : (homeData.bandcamp ? [homeData.bandcamp] : []);

    const videoItems   = await getLatestVideos(3);
    const homeConcerts = await getUpcomingConcerts(db, lang, 3);

    const contactMini = homeData.contactMini || { email: 'info@danielecamiz.com', moreUrl: '/contact' };

    const _videoItems    = Array.isArray(videoItems) ? videoItems : [];
    const _homeConcerts  = Array.isArray(homeConcerts) ? homeConcerts : [];
    const _contactMini   = (contactMini && typeof contactMini === 'object') ? contactMini : {};

    const homeNs = (res.locals?.labels && res.locals.labels.home) || {};
    const pageMeta = {
      title: homeData?.meta?.title || homeNs.title || (lang === 'en' ? 'Home — Daniele Camiz' : 'Home — Daniele Camiz'),
      description: homeData?.meta?.description || homeNs.description || '',
    };

    console.log('[home] lang=%s newsTeaser=%d projects=%d bandcamp=%d',
      lang,
      Array.isArray(newsTeaser) ? newsTeaser.length : 0,
      Array.isArray(homeData.projects) ? homeData.projects.length : 0,
      Array.isArray(bandcampItems) ? bandcampItems.length : 0
    );

    return res.renderPage('pages/frontend/index', {
      layout: 'layouts/base-frontend',
      labels: res.locals.labels || {},
      lang,
      pageMeta,
      homeData,
      newsTeaser,
      bandcampItems,
      newsItems: newsTeaser,
      bandcamp: bandcampItems,
      videoItems: _videoItems,
      homeConcerts: _homeConcerts,
      contactMini: _contactMini,
      cookieConsent
    });
  } catch (err) {
    console.error('[homeController] error:', err);
    return res.status(500).render('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      pageMeta: { title: 'Maintenance' },
      lang: res.locals.lang || 'it'
    });
  }
}

export default { getHomePage };

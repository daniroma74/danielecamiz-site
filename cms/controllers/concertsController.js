// cms/controllers/concertsController.js
import dbMain from '../utils/sqliteMain.js';
import { resolvePosterUrlAsync, safeBoolean } from '../utils/mediaResolver.js';
import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import path from 'path';
import fs from 'fs/promises';

const FRONTEND_ROOT = path.resolve(process.cwd(), '..', 'frontend');
const CMS_ROOT = process.cwd(); // corretto: il cwd è già /cms
const I18N_DIR = path.join(CMS_ROOT, 'data', 'i18n');
const UPLOADS_WEB_BASE = '/uploads';

/* ===================== utils ===================== */

function slugify(input) {
  if (!input) return '';
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
const firstText = (...vals) => {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
};
const joinNonEmpty = (arr, sep = ', ') =>
  (arr || []).map(v => String(v || '').trim()).filter(Boolean).join(sep);

function rewriteToUploads(url) {
  if (!url) return '';
  let u = String(url).trim();
  // preserve absolute http(s) URLs (e.g., Cloudinary canonical)
  if (/^https?:\/\//i.test(u)) return u;
  u = u.replace(/^\/?media\//, `${UPLOADS_WEB_BASE}/`);
  return u.startsWith('/') ? u : `/${u}`;
}

/** Converte percorsi legacy (img/locandine, img/posters, ecc.) in /uploads/posters_* */
function normalizeLegacyPoster(ref, isFuture) {
  if (!ref) return '';
  let r = String(ref).trim().replace(/^\/+/, '');

  if (r.startsWith('uploads/')) return `/${r}`;

  const legacyDirs = [
    'img/locandine/',
    'frontend/img/locandine/',
    'frontend/img/posters/',
    'img/posters/'
  ];
  if (legacyDirs.some(d => r.startsWith(d))) {
    const base = path.basename(r);
    const sub = isFuture ? 'posters_future' : 'posters_past';
    return `${UPLOADS_WEB_BASE}/${sub}/${base}`;
  }

  if (!r.includes('/')) {
    const sub = isFuture ? 'posters_future' : 'posters_past';
    return `${UPLOADS_WEB_BASE}/${sub}/${r}`;
  }
  return rewriteToUploads(`/${r}`);
}

function interpolate(tpl, data = {}) {
  if (!tpl) return '';
  return String(tpl).replace(/{{\s*(\w+)\s*}}/g, (_, k) => (data[k] ?? ''));
}

async function readJsonSafe(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadConcertLabels(lang) {
  const file = path.join(I18N_DIR, `labels-concerts-${lang}.json`);
  const data = await readJsonSafe(file);
  if (!data) return null;
  // Supporta sia { concerts: {...} } che flat {...}
  return (data.concerts && typeof data.concerts === 'object') ? data.concerts : data;
}

async function normalizeConcertRowAsync(row) {
  const isFuture = safeBoolean(row.is_future);

  // Poster (centralized resolver → rewrite → legacy fallback)
  let poster_url = await resolvePosterUrlAsync({
    poster_media_id: row.poster_media_id,
    poster_canonical_url: row.poster_canonical_url,
    poster_cloudinary_id: row.poster_cloudinary_id,
    poster_local_filename: row.poster_local_filename,
    is_future: isFuture
  }, { quality: 'auto', format: 'auto' });

  poster_url = rewriteToUploads(poster_url);
  if (!poster_url && row.poster_local_filename) {
    poster_url = normalizeLegacyPoster(row.poster_local_filename, isFuture);
  }

  // Campi dettagli (inizialmente vuoti, li popoleremo da JOIN su viste nuove)
  const program_raw = firstText(
    row.program,
    row.program_notes,
    row.programma,
    row.program_it,
    row.program_en
  );

  return {
    id: row.id,
    title: row.title || null,
    date: row.date,
    year: String(row.date || '').slice(0, 4),
    location: row.location || null,
    is_future: isFuture,
    // dettagli normalizzati (placeholder, verranno arricchiti più sotto)
    program: program_raw || null,
    program_notes: row.program_notes || null,
    orchestra: row.orchestra || null,
    conductor: row.conductor || null,
    soloists: row.soloists || null,
    notes: row.notes || null,
    youtube: row.youtube || null,
    // poster
    poster_local_filename: row.poster_local_filename || null,
    poster_url
  };
}

function buildPastByYear(rows) {
  const byYear = {};
  for (const r of rows) {
    const y = r.year || String(r.date || '').slice(0, 4);
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  }
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
  return { byYear, years };
}

async function fillMissingPostersByDate(rows) {
  const futureDir = path.join(CMS_ROOT, 'uploads', 'posters_future');
  const pastDir   = path.join(CMS_ROOT, 'uploads', 'posters_past');

  let futureList = [];
  let pastList = [];
  try { futureList = await fs.readdir(futureDir); } catch {}
  try { pastList = await fs.readdir(pastDir); } catch {}

  for (const r of rows) {
    if (r.poster_url) continue;

    const isFuture = !!r.is_future;
    const subdir = isFuture ? 'posters_future' : 'posters_past';
    const pool = isFuture ? futureList : pastList;

    if (r.poster_local_filename) {
      const abs = path.join(CMS_ROOT, 'uploads', subdir, path.basename(r.poster_local_filename));
      try {
        await fs.access(abs);
        r.poster_url = `${UPLOADS_WEB_BASE}/${subdir}/${path.basename(r.poster_local_filename)}`;
        continue;
      } catch {}
    }

    const datePrefix = (r.date || '').slice(0, 10);
    if (datePrefix && pool.length) {
      const foundByDate = pool.find(fn => fn.startsWith(datePrefix));
      if (foundByDate) {
        r.poster_url = `${UPLOADS_WEB_BASE}/${subdir}/${foundByDate}`;
        continue;
      }
    }

    const ts = slugify(r.title);
    if (ts && pool.length) {
      const foundByTitle = pool.find(fn => slugify(fn).includes(ts));
      if (foundByTitle) {
        r.poster_url = `${UPLOADS_WEB_BASE}/${subdir}/${foundByTitle}`;
        continue;
      }
    }
  }
}

/* ===================== data enrichment (DB) ===================== */

function placeholders(n) {
  return Array(n).fill('?').join(',');
}

async function fetchPersonnelAndExtras(ids) {
  const db = dbMain.raw;
  const result = { personnel: new Map(), extras: new Map() };
  if (!ids.length) return result;

  // Personnel (aggregated view)
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT concert_id, orchestra, conductor, soloists
         FROM view_concert_personnel_agg
         WHERE concert_id IN (${placeholders(ids.length)})`,
        ids,
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });
    for (const r of rows) {
      result.personnel.set(r.concert_id, {
        orchestra: r.orchestra || '',
        conductor: r.conductor || '',
        soloists: r.soloists || ''
      });
    }
  } catch (e) {
    // Se la vista non esiste ancora, ignora
    console.warn('[concertsController] personnel agg view not available:', e?.message || e);
  }

  // Extras (notes, youtube_url)
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT concert_id, notes, youtube_url FROM concert_extra
         WHERE concert_id IN (${placeholders(ids.length)})`,
        ids,
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });
    for (const r of rows) {
      result.extras.set(r.concert_id, {
        notes: r.notes || '',
        youtube: r.youtube_url || ''
      });
    }
  } catch (e) {
    console.warn('[concertsController] concert_extra table not available:', e?.message || e);
  }

  return result;
}

async function fetchPrograms(ids) {
  const db = dbMain.raw;
  const byId = new Map();
  if (!ids.length) return byId;

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM view_concert_program_detailed WHERE concert_id IN (${placeholders(ids.length)})`,
        ids,
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });
    // Tolleranza su nomi colonne: composer_name|composer, work_title|title, position
    for (const r of rows) {
      const cid = r.concert_id;
      const comp = firstText(r.composer_name, r.composer);
      const work = firstText(r.work_title, r.title, r.work);
      const cat  = firstText(r.work_catalog, r.catalog, r.catno);
      const pos  = Number(r.position || r.pos || r.order || 0) || 0;

      const line = joinNonEmpty([comp, work + (cat ? ` (${cat})` : '')], ' — ');
      if (!byId.has(cid)) byId.set(cid, []);
      byId.get(cid).push({ pos, line });
    }
    // Ordina per posizione se disponibile e unisci in testo multilinea
    for (const [cid, arr] of byId.entries()) {
      arr.sort((a, b) => a.pos - b.pos);
      const text = arr.map(x => x.line).join('\n');
      byId.set(cid, text);
    }
  } catch (e) {
    console.warn('[concertsController] program view not available:', e?.message || e);
  }
  return byId;
}

/* ===================== data access ===================== */

export async function getConcertsPageData() {
  const db = dbMain.raw;

  const upcomingRaw = await new Promise((resolve, reject) => {
    db.all(`SELECT * FROM view_upcoming_concerts`, [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  const pastRaw = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM concerts
       WHERE (is_future = 0 AND date(date) < date('now'))
       ORDER BY date DESC`,
      [],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });

  const upcoming = await Promise.all((upcomingRaw || []).map(normalizeConcertRowAsync));
  const pastNorm = await Promise.all((pastRaw || []).map(normalizeConcertRowAsync));

  // Enrichment: personnel + extras + program per tutti gli ID
  const allIds = [
    ...upcoming.map(r => r.id).filter(Boolean),
    ...pastNorm.map(r => r.id).filter(Boolean)
  ];
  const { personnel, extras } = await fetchPersonnelAndExtras(allIds);
  const programs = await fetchPrograms(allIds);

  for (const r of [...upcoming, ...pastNorm]) {
    const p = personnel.get(r.id);
    if (p) {
      r.orchestra = p.orchestra || r.orchestra || '';
      r.conductor = p.conductor || r.conductor || '';
      r.soloists  = p.soloists  || r.soloists  || '';
    }
    const x = extras.get(r.id);
    if (x) {
      r.notes   = x.notes   || r.notes   || '';
      r.youtube = x.youtube || r.youtube || '';
    }
    const pr = programs.get(r.id);
    if (pr && !firstText(r.program)) {
      r.program = pr; // testo multilinea
    }
  }

  await fillMissingPostersByDate(upcoming);
  await fillMissingPostersByDate(pastNorm);

  const { byYear: pastByYear, years } = buildPastByYear(pastNorm);

  const pageAssets = {
    css: listPageCss('concerts'),
    jsEntry: havePageJs('concerts')
  };

  return { upcoming, pastByYear, years, pageAssets };
}

/* ===================== controller ===================== */

export async function getConcertsPage(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();

    const { upcoming = [], pastByYear = {}, years = [], pageAssets = { css: [], jsEntry: null } } = await getConcertsPageData();

    // Adatta i nomi/forme a quelli attesi dalla view
    const mapForView = (r) => {
      const cand = r.poster_url || r.poster || r.locandina || '';
      const norm = /^https?:\/\//i.test(cand) ? cand : rewriteToUploads(cand);
      const programText = firstText(r.program, r.program_notes);
      const orchestra = r.orchestra || '';
      const conductor = r.conductor || '';
      const soloists  = r.soloists  || '';
      const notes     = r.notes     || '';
      const youtube   = r.youtube   || '';
      return {
        ...r,
        poster: norm,
        locandina: norm,
        // EN/IT aliases per compatibilità con EJS legacy
        program: programText,
        programma: programText,
        orchestra,
        conductor,
        direttore: conductor,
        soloists,
        solisti: soloists,
        notes,
        note: notes,
        youtube,
        youtube_url: youtube
      };
    };

    const upcomingConcerts = (upcoming || []).map(mapForView);
    const concertsByYear = (Array.isArray(years) ? years : Object.keys(pastByYear || {}))
      .sort((a,b)=>b.localeCompare(a))
      .map(y => ({ year: y, concerts: (pastByYear[y] || []).map(mapForView) }));
    const yearsList = Array.isArray(years) ? years : Object.keys(pastByYear || {}).sort((a,b)=>b.localeCompare(a));

    // ==== Labels per Concerti (i18n) → titoli/claim/descrizione ====
    // File dedicato cms/data/i18n/labels-concerts-<lang>.json
    const fileLabels = await loadConcertLabels(lang);

    // Labels già caricati lato middleware
    const allLabels = res.locals.labels || {};
    const labelsConcertsLocal = (allLabels.concerts)
      ? allLabels.concerts
      : (allLabels.pages && allLabels.pages.concerts) ? allLabels.pages.concerts
      : {};

    // merge: priorità al file dedicato
    const mergedLabels = { ...allLabels };
    mergedLabels.concerts = fileLabels
      ? { ...(labelsConcertsLocal || {}), ...fileLabels }
      : (labelsConcertsLocal || {});

    const title = firstText(
      fileLabels?.title,
      labelsConcertsLocal.title,
      (lang === 'en' ? 'Concerts' : 'Concerti')
    );
    const description = firstText(
      fileLabels?.description,
      labelsConcertsLocal.description,
      (lang === 'en' ? 'Upcoming concerts and archive by year.' : 'Prossimi concerti e archivio per anno.')
    );

    // Calcolo contatori per i placeholder nella claim
    const pastCount = (concertsByYear || []).reduce((acc, y) => acc + ((y.concerts && y.concerts.length) || 0), 0);
    const endYear   = (yearsList && yearsList.length) ? String(yearsList[0]) : '';
    const startYear = (yearsList && yearsList.length) ? String(yearsList[yearsList.length - 1]) : '';

    const claimTemplate = firstText(
      fileLabels?.claim2,
      fileLabels?.claim,
      labelsConcertsLocal.claim2,
      labelsConcertsLocal.claim,
      (lang === 'en' ? 'Upcoming concerts and archive' : 'Prossimi concerti e archivio')
    );

    const claimHTML = interpolate(claimTemplate, {
      past_count: pastCount,
      start: startYear,
      end: endYear
    });

    // Interpola anche dentro labels.concerts per la view
    if (mergedLabels.concerts && typeof mergedLabels.concerts === 'object') {
      if (mergedLabels.concerts.claim2) {
        mergedLabels.concerts.claim2 = interpolate(mergedLabels.concerts.claim2, {
          past_count: pastCount,
          start: startYear,
          end: endYear
        });
      } else if (mergedLabels.concerts.claim) {
        mergedLabels.concerts.claim = interpolate(mergedLabels.concerts.claim, {
          past_count: pastCount,
          start: startYear,
          end: endYear
        });
      }
    }

    const pageHero = { key: 'concerts', slug: 'concerts', hero_image: '/img/daniele-camiz-indica.png', hero_min_height: 520, hero_focus_y: 50, hero_zoom: 1 };

    const cssFiles = Array.isArray(pageAssets.css) ? pageAssets.css : [];
    let pageScripts = pageAssets && pageAssets.jsEntry ? [pageAssets.jsEntry] : [];

    const jsCandidates = [
      { abs: path.join(FRONTEND_ROOT, 'js', 'concerts-year-toggle.js'), web: '/js/concerts-year-toggle.js' },
      { abs: path.join(FRONTEND_ROOT, 'js', 'concerts-lightbox.js'),   web: '/js/concerts-lightbox.js' },
      { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'concerts', 'concerts.js'), web: '/js/modules/concerts/concerts.js' },
    ];
    for (const c of jsCandidates) {
      try { await fs.access(c.abs); if (!pageScripts.includes(c.web)) pageScripts.push(c.web); } catch {}
    }
    const desiredOrder = [
      '/js/concerts-lightbox.js',
      '/js/modules/concerts/concerts.js',
      '/js/concerts-year-toggle.js'
    ];
    const orderedScripts = [];
    desiredOrder.forEach(s => { if (pageScripts.includes(s)) orderedScripts.push(s); });
    pageScripts.forEach(s => { if (!orderedScripts.includes(s)) orderedScripts.push(s); });
    pageScripts = orderedScripts;

    return res.renderPage('pages/frontend/concerts', {
      layout: 'layouts/base-frontend',
      lang,
      labels: mergedLabels,
      title,
      description,
      pageKey: 'concerts',
      page: pageHero,
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      claimHTML,
      upcomingConcerts,
      concertsByYear,
      yearsList,
    });
  } catch (err) {
    console.error('[concertsController] getConcertsPage error:', err);
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang: res.locals.lang || 'it',
      title: 'Error',
      description: ''
    });
  }
}
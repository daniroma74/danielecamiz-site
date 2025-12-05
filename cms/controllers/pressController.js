// cms/controllers/pressController.js
import path from 'path';
import fs from 'fs/promises';

import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import { getDb as getMainDb } from '../utils/sqliteMain.js';
import { resolveMediaById } from '../utils/mediaResolver.js';
import { mdToHtml } from '../utils/utils.js';

const CMS_ROOT = process.cwd();
const I18N_DIR = path.join(CMS_ROOT, 'data', 'i18n');

/* ===================== small utils ===================== */
function isHttp(url) { return typeof url === 'string' && /^https?:\/\//i.test(url); }
function shortDate(iso, lang = 'it') {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { year: 'numeric', month: 'short', day: '2-digit' });
}

/* ===================== IO helpers ===================== */
async function readJSONSafe(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadPressJsonFallback(lang = 'it') {
  const paths = [
    path.join(I18N_DIR, `press-${lang}.json`),
    path.join(I18N_DIR, 'press-it.json'),
    path.join(I18N_DIR, 'press-en.json')
  ];
  for (const p of paths) {
    const data = await readJSONSafe(p);
    if (data && (Array.isArray(data) || typeof data === 'object')) return data;
  }
  return [];
}

/* ===================== data utils ===================== */
// Classificazione conservativa per JSON legacy
function isArticleLegacy(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.interview === true) return true;
  const t = String(item.type || '').toLowerCase();
  if (t === 'article' || t === 'interview') return true;
  if (t === 'quote' || t === 'review' || t === 'press') return false;
  if (item.title && !item.quote) return true;
  return false;
}

function splitPressDataLegacy(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const quotesFromQuotes = Array.isArray(raw.quotes) ? raw.quotes : [];
    const quotesFromPress  = Array.isArray(raw.press) ? raw.press : [];
    const articlesFromObj  = Array.isArray(raw.articles) ? raw.articles : [];

    const quotes = [...quotesFromQuotes, ...quotesFromPress];
    const articles = [...articlesFromObj];

    if (quotes.length || articles.length) return { quotes, articles };

    if (Array.isArray(raw.items)) {
      const q = [], a = [];
      for (const it of raw.items) (isArticleLegacy(it) ? a : q).push(it);
      return { quotes: q, articles: a };
    }
  }

  const list = Array.isArray(raw) ? raw : [];
  const quotes = [];
  const articles = [];
  for (const it of list) (isArticleLegacy(it) ? articles : quotes).push(it);
  return { quotes, articles };
}

async function collectPageScripts() {
  // Al momento non abbiamo moduli JS specifici per press
  const entry = havePageJs('press');
  const out = [];
  if (entry) out.push(entry);
  return out;
}

/* ===================== DB loader (new repo) ===================== */
async function loadPressFromDb(lang = 'it') {
  try {
    const db = await getMainDb();

    // Carica articoli da press_items
    const articles = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.slug, p.kind, p.publisher, p.date, p.url, p.pdf_id, p.created_at,
                i.title, i.excerpt, i.body_md
         FROM press_items p
         LEFT JOIN press_i18n i ON (i.press_id = p.id AND i.lang = ?)
         WHERE p.kind = 'article'
         ORDER BY CASE WHEN p.date IS NULL THEN 1 ELSE 0 END, p.date DESC, p.created_at DESC`,
        [lang],
        (err, r) => (err ? reject(err) : resolve(r || []))
      );
    });

    // Carica citazioni da press_quotes
    const quotesRows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id,
                CASE WHEN ? = 'en' THEN title_en ELSE title_it END as title,
                CASE WHEN ? = 'en' THEN description_en ELSE description_it END as description,
                CASE WHEN ? = 'en' THEN quote_en ELSE quote_it END as quote,
                source,
                CASE WHEN ? = 'en' THEN author_en ELSE author_it END as author,
                CASE WHEN ? = 'en' THEN source_role_en ELSE source_role_it END as author_role,
                source_logo_cloudinary_id,
                published_date as date,
                url,
                is_featured as interview,
                created_at
         FROM press_quotes
         WHERE is_published = 1
         ORDER BY published_date DESC`,
        [lang, lang, lang, lang, lang],
        (err, r) => (err ? reject(err) : resolve(r || []))
      );
    });

    const mappedArticles = await Promise.all(articles.map(async r => ({
      id: r.id,
      slug: r.slug,
      kind: 'article',
      title: r.title || '',
      excerpt: r.excerpt || '',
      body_html: r.body_md ? `<div class=\"content-md\">${mdToHtml(r.body_md)}</div>` : '',
      publisher: r.publisher || '',
      date: r.date || r.created_at,
      date_short: shortDate(r.date || r.created_at, lang),
      url: r.url || '',
      pdf_url: r.pdf_id ? (await resolveMediaById(r.pdf_id)) : ''
    })));

    const mappedQuotes = quotesRows.map(r => ({
      id: r.id,
      title: r.title || '',
      description: r.description || '',
      quote: r.quote || '',
      source: r.source || '',
      author: r.author || '',
      author_role: r.author_role || '',
      link: r.url || '',
      source_logo_cloudinary_id: r.source_logo_cloudinary_id || '',
      interview: r.interview ? true : false,
      icon: r.interview ? '✦' : '',
      date: r.date || r.created_at,
      date_short: shortDate(r.date || r.created_at, lang)
    }));

    return { quotes: mappedQuotes, articles: mappedArticles };
  } catch (err) {
    console.warn('[press] DB load failed, will fallback to JSON:', err?.message || err);
    return null;
  }
}

/* ===================== controller ===================== */
export async function getPressPage(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const labelsAll = res.locals.labels || {};
    // attachLabels ritorna { press: { press: {...} }, global: {...} }
    const L = labelsAll.press?.press || labelsAll.press || {};

    // TEMPORARY DEBUG
    console.log('[PRESS DEBUG]', {
      lang,
      'labelsAll': Object.keys(labelsAll),
      'labelsAll.press': labelsAll.press,
      'L': L
    });

    // 1) Prova sorgente DB nuova
    const fromDb = await loadPressFromDb(lang);

    // 2) Fallback JSON legacy
    let quotes = [], articles = [];
    if (fromDb && (fromDb.quotes?.length || fromDb.articles?.length)) {
      ({ quotes = [], articles = [] } = fromDb);
    } else {
      const raw = await loadPressJsonFallback(lang);
      ({ quotes = [], articles = [] } = splitPressDataLegacy(raw));
    }

    const title = L.title || (lang === 'en' ? 'Press' : 'Rassegna stampa');
    const description = L.claim || (lang === 'en'
      ? 'Press reviews, articles, interviews and media coverage about conductor Daniele Camiz'
      : 'Rassegna stampa, articoli, interviste e copertura mediatica sul direttore d\'orchestra Daniele Camiz');

    const cssFiles = listPageCss('press');
    const pageScripts = await collectPageScripts();

    return res.renderPage('pages/frontend/press', {
      layout: 'layouts/base-frontend',
      lang,
      labels: { press: L }, // Template si aspetta labels.press.read_article
      title,
      description,
      pageMeta: { title, description },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      // Struttura attesa dalla view
      pressData: { press: quotes, articles },
      // Compat opzionale (non usata dalla view attuale)
      quotes,
      articles
    });
  } catch (err) {
    console.error('[pressController] getPressPage error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading Press' : 'Errore caricando la rassegna',
      description: (lang === 'en') ? 'Error loading press page' : 'Errore nel caricamento della rassegna stampa'
    });
  }
}

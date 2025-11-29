import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbMain from './sqliteMain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Single source of truth for DB path ----
// NOTE: templateServer runs from the `cms/` cwd, so default must be `db/main.sqlite` (no extra `cms/`).
const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'db', 'main.sqlite');
const LEGACY_DB_PATH = path.resolve(process.cwd(), 'data', 'database.sqlite');

let envPath = process.env.MAIN_SQLITE_PATH || '';
let resolvedPath = envPath && envPath.trim() ? path.resolve(envPath) : DEFAULT_DB_PATH;

// Guard against legacy path usage: if env points to cms/data/database.sqlite, force main.sqlite
if (resolvedPath === LEGACY_DB_PATH || /\bdata\/(database\.sqlite)\b/.test(resolvedPath)) {
  console.warn('[utils] MAIN_SQLITE_PATH pointed to legacy data/database.sqlite. Overriding to', DEFAULT_DB_PATH);
  resolvedPath = DEFAULT_DB_PATH;
}

export const MAIN_DB_PATH = resolvedPath;

/**
 * Return the SQLite connection already opened by sqliteMain.js
 * (does NOT create new files under cms/data/*)
 */
export async function initDatabase() {
  // Try multiple shapes for the exported connection for maximum compatibility
  // Priority: sqlite3 callback style (.all/.run) → better-sqlite3 (.prepare)
  // Fallback: known props (raw/db/connection)
  try {
    let candidate = dbMain;

    // Some builds export an object with getDb() (sync or async)
    if (candidate && typeof candidate.getDb === 'function') {
      const maybe = candidate.getDb();
      candidate = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
    }

    // Detect sqlite3 (callback-style API)
    if (candidate && typeof candidate.all === 'function' && typeof candidate.run === 'function') {
      // Soft warning if a legacy empty file reappears on disk
      try {
        if (fs.existsSync(LEGACY_DB_PATH)) {
          const stats = fs.statSync(LEGACY_DB_PATH);
          console.warn('[utils] Detected legacy DB file at', LEGACY_DB_PATH, `(size: ${stats.size} bytes).`);
          console.warn('[utils] Some module may still be opening cms/data/database.sqlite. Please update it to use MAIN_DB_PATH:', MAIN_DB_PATH);
        }
      } catch {}
      console.log('[utils] Database connected:', MAIN_DB_PATH, '(driver: sqlite3-callback)');
      return candidate;
    }

    // Detect better-sqlite3 (sync .prepare)
    if (candidate && typeof candidate.prepare === 'function') {
      console.log('[utils] Database connected:', MAIN_DB_PATH, '(driver: better-sqlite3)');
      return candidate;
    }

    // Fallback to known properties on the default export
    const raw = dbMain && (dbMain.raw || dbMain.db || dbMain.connection);
    if (raw) {
      console.log('[utils] Database connected:', MAIN_DB_PATH, '(driver: compat-raw)');
      return raw;
    }

    throw new Error('sqliteMain.js did not provide a usable connection');
  } catch (err) {
    console.error('Error getting the connection from sqliteMain:', err);
    throw err;
  }
}

/**
 * Base render payload builder. Accepts overrides for pageCss and pageScripts.
 */
export function getBaseRenderData(lang, labels, overrides = {}) {
  const title       = overrides.title       || 'Daniele Camiz';
  const description = overrides.description || overrides.claim || '';
  // SEO 2025: Rich, specific keywords for better discoverability
  const defaultKeywords = lang === 'en'
    ? 'Daniele Camiz, conductor, orchestra conductor, classical music, opera, symphonic concerts, Italian conductor, Mozart, Beethoven, Verdi, contemporary music, ICNT, I Concerti nel Tempio, Rome concerts, music director'
    : 'Daniele Camiz, direttore d\'orchestra, direttore, musica classica, opera, concerti sinfonici, direttore italiano, Mozart, Beethoven, Verdi, musica contemporanea, ICNT, I Concerti nel Tempio, concerti Roma, direttore musicale';
  const keywords    = overrides.keywords    || defaultKeywords;
  const canonical   = overrides.canonical   || 'https://danielecamiz.com/';
  const ogImage     = overrides.ogImage     || 'https://danielecamiz.com/img/default-og-image.jpg';

  const defaultCss = [
    'base/base.css',
    'components/layout.css',
    'utils/helpers.css',
    'utils/responsive.css'
  ];
  const pageCss  = Array.isArray(overrides.pageCss) ? overrides.pageCss : [];
  const cssFiles = [...defaultCss, ...pageCss];

  const pageScripts = Array.isArray(overrides.pageScripts) ? overrides.pageScripts : [];

  const {
    pageCss: _omitCss,
    pageScripts: _omitScripts,
    title: _omitTitle,
    claim: _omitClaim,
    description: _omitDesc,
    keywords: _omitKeys,
    canonical: _omitCanon,
    ogImage: _omitOg,
    ...restOverrides
  } = overrides;

  return {
    lang,
    labels,
    title,
    description,
    keywords,
    canonical,
    ogImage,
    cssFiles,
    pageScripts,
    ...restOverrides
  };
}

// ===================== Safe HTML helpers =====================
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function autoLinkUrls(text) {
  // Turn plain URLs into links (very conservative)
  return text.replace(/\b(https?:\/\/[^\s<]+)\b/g, (m, url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`);
}

// ===================== Minimal Markdown → HTML (no external deps) =====================
export function mdToHtml(md = '') {
  if (!md) return '';
  const EOL = '\n';
  const parts = String(md).replace(/\r\n?/g, '\n').split('```');
  const out = [];

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];
    if (i % 2 === 1) {
      // Code fence block
      out.push(`<pre><code>${escapeHtml(chunk)}</code></pre>`);
      continue;
    }

    // Process non-code chunk line-by-line
    const lines = chunk.split('\n');
    let inUL = false;
    let inOL = false;
    let para = [];

    const flushPara = () => {
      if (para.length) {
        const text = para.join(' ').trim();
        if (text) out.push(`<p>${inlineMd(text)}</p>`);
        para = [];
      }
    };

    const closeLists = () => {
      if (inUL) { out.push('</ul>'); inUL = false; }
      if (inOL) { out.push('</ol>'); inOL = false; }
    };

    const inlineMd = (s) => {
      // escape first, then apply inline markdown
      let t = escapeHtml(s);
      // strong ( **text** )
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // em ( *text* or _text_ ) — avoid hitting inside strong
      t = t.replace(/(^|\W)\*(?!\s)([^*]+?)\*(?=\W|$)/g, '$1<em>$2</em>');
      t = t.replace(/(^|\W)_([^_]+?)_(?=\W|$)/g, '$1<em>$2</em>');
      // inline code `code`
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      // links [text](url)
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
      // autolink plain URLs
      t = autoLinkUrls(t);
      return t;
    };

    for (let line of lines) {
      const raw = line;
      const l = raw.trimEnd();
      if (!l.trim()) {
        flushPara();
        closeLists();
        continue;
      }

      // Headings ###### .. #
      const h = l.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara();
        closeLists();
        const level = h[1].length;
        out.push(`<h${level}>${inlineMd(h[2].trim())}</h${level}>`);
        continue;
      }

      // Ordered list: 1. item
      const ol = l.match(/^\s*\d+\.\s+(.*)$/);
      if (ol) {
        flushPara();
        if (!inOL) { closeLists(); out.push('<ol>'); inOL = true; }
        out.push(`<li>${inlineMd(ol[1].trim())}</li>`);
        continue;
      }

      // Unordered list: - item / * item
      const ul = l.match(/^\s*[-*]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (!inUL) { closeLists(); out.push('<ul>'); inUL = true; }
        out.push(`<li>${inlineMd(ul[1].trim())}</li>`);
        continue;
      }

      // Default: part of a paragraph
      para.push(l.trim());
    }

    flushPara();
    closeLists();
  }

  return out.join(EOL);
}
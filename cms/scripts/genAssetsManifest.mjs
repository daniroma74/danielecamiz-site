// Generate pages.json manifest from actual frontend folders (no guessing)
// Usage:
//   node cms/scripts/genAssetsManifest.mjs           -> prints JSON to stdout
//   node cms/scripts/genAssetsManifest.mjs --write   -> writes to cms/data/assets/pages.json
//   node cms/scripts/genAssetsManifest.mjs --debug   -> verbose logs

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const CMS_ROOT   = path.resolve(__dirname, '..');             // cms/
const FRONTEND   = path.resolve(CMS_ROOT, '..', 'frontend');  // frontend/
const OUT_DIR    = path.join(CMS_ROOT, 'data', 'assets');
const OUT_FILE   = path.join(OUT_DIR, 'pages.json');

const argv = new Set(process.argv.slice(2));
const WRITE = argv.has('--write');
const DEBUG = argv.has('--debug');

function dbg(...args){ if (DEBUG) console.log('[gen]', ...args); }

function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }
function isDir(p){ try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isFile(p){ try { return fs.statSync(p).isFile(); } catch { return false; } }

function toWeb(abs){
  // map absolute path inside FRONTEND to web path beginning with '/'
  const rel = abs.replace(FRONTEND, '').replace(/\\/g, '/');
  return rel.startsWith('/') ? rel : `/${rel}`;
}

// --- CSS collection --------------------------------------------------------
async function collectCss() {
  const root = path.join(FRONTEND, 'css', 'pages');
  const out = new Map(); // pageKey -> Set(css)
  if (!isDir(root)) return out;

  const entries = await fsp.readdir(root, { withFileTypes: true });

  for (const e of entries) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) {
      const pageKey = e.name.toLowerCase();
      const files = await fsp.readdir(p, { withFileTypes: true });
      for (const f of files) {
        if (f.isFile() && f.name.endsWith('.css')) {
          const abs = path.join(p, f.name);
          if (!out.has(pageKey)) out.set(pageKey, new Set());
          out.get(pageKey).add(toWeb(abs));
        }
      }
    } else if (e.isFile() && e.name.endsWith('.css')) {
      // File direttamente sotto css/pages
      const base = e.name.replace(/\.css$/i, '');
      let pageKey;
      // Regola: se inizia con 'home-' -> appartiene a 'home'
      if (base.startsWith('home-')) pageKey = 'home';
      else pageKey = base.toLowerCase(); // es. 'news-index' -> pageKey 'news-index'

      const abs = path.join(root, e.name);
      if (!out.has(pageKey)) out.set(pageKey, new Set());
      out.get(pageKey).add(toWeb(abs));
    }
  }

  return out; // Map
}

// --- JS collection ---------------------------------------------------------
async function collectJs(cssKeys) {
  const out = new Map(); // pageKey -> Set(js)
  const pagesRoot   = path.join(FRONTEND, 'js', 'pages');
  const modulesRoot = path.join(FRONTEND, 'js', 'modules');

  const keys = new Set(cssKeys); // start from css-derived keys

  // Helper to add if exists
  function addIf(pageKey, abs) {
    if (!abs) return;
    if (!isFile(abs)) return;
    if (!out.has(pageKey)) out.set(pageKey, new Set());
    out.get(pageKey).add(toWeb(abs));
  }

  // 1) js/pages (files o directory per page)
  if (isDir(pagesRoot)) {
    const entries = await fsp.readdir(pagesRoot, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(pagesRoot, e.name);
      if (e.isDirectory()) {
        const key = e.name.toLowerCase();
        keys.add(key);
        // index.js o <key>.js
        addIf(key, path.join(p, 'index.js'));
        addIf(key, path.join(p, `${key}.js`));
      } else if (e.isFile() && e.name.endsWith('.js')) {
        const base = e.name.replace(/\.js$/i, '').toLowerCase();
        keys.add(base);
        addIf(base, path.join(pagesRoot, e.name));
      }
    }
  }

  // 2) js/modules/<key> (pattern comune: <key>-entry.js o index.js o <key>.js)
  if (isDir(modulesRoot)) {
    for (const key of keys) {
      const dir = path.join(modulesRoot, key);
      if (!isDir(dir)) continue;
      addIf(key, path.join(dir, `${key}-entry.js`));
      addIf(key, path.join(dir, 'index.js'));
      addIf(key, path.join(dir, `${key}.js`));
    }
  }

  return { jsByKey: out, allKeys: Array.from(keys) };
}

// --- Build manifest --------------------------------------------------------
async function buildManifest() {
  const cssMap = await collectCss(); // Map
  const cssKeys = Array.from(cssMap.keys());
  const { jsByKey, allKeys } = await collectJs(cssKeys);

  const keys = Array.from(new Set([...cssKeys, ...allKeys])).sort();
  const manifest = {};

  for (const key of keys) {
    const styles = Array.from(cssMap.get(key) || []).sort();
    const scripts = Array.from(jsByKey.get(key) || []).sort();

    // Solo pagine con almeno un asset? No: le dichiariamo tutte, anche vuote.
    manifest[key] = { styles, scripts };
  }

  return manifest;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

(async function main(){
  try {
    dbg('CMS_ROOT =', CMS_ROOT);
    dbg('FRONTEND =', FRONTEND);

    const manifest = await buildManifest();
    const json = JSON.stringify(manifest, null, 2);

    if (!WRITE) {
      console.log(json);
      return;
    }

    await ensureDir(OUT_DIR);
    await fsp.writeFile(OUT_FILE, json, 'utf8');
    console.log(`[gen] Wrote manifest to ${OUT_FILE}`);
  } catch (err) {
    console.error('[gen] ERROR:', err);
    process.exit(1);
  }
})();
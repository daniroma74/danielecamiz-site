// cms/utils/assetHelpers.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);


// ===== FRONTEND helpers (legacy-compatible) =====
// Resolve based on this file's location to avoid dependency on process.cwd()
// cms/utils -> go up two levels to project root, then into frontend/
const FRONTEND_BASE = path.resolve(__dirname, '..', '..', 'frontend');

const CMS_ROOT      = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(CMS_ROOT, 'data', 'assets', 'pages.json');


function fileExists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

// ---- internal helpers for manifest + fallback ----
const _assetCache = new Map();

function webToAbs(webPath) {
  if (!webPath || typeof webPath !== 'string') return null;
  const rel = webPath.replace(/^\//, ''); // remove leading '/'
  return path.join(FRONTEND_BASE, rel);
}

function validateList(webPaths = []) {
  return (Array.isArray(webPaths) ? webPaths : [])
    .filter(Boolean)
    .filter(p => fileExists(webToAbs(p)));
}

function uniqList(arr = []) {
  const out = [];
  const seen = new Set();
  for (const it of (arr || [])) {
    if (!it || seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

function listDir(absDir) {
  try { return fs.readdirSync(absDir, { withFileTypes: true }); } catch { return []; }
}

function enumerateAssets(pageKey) {
  // CSS ordering reused from listPageCss
  const styles = listPageCss(pageKey);

  // JS candidates: prefer modules/<page>/<page>-entry.js, then js/pages variants
  const candidates = [];
  const entry = havePageJs(pageKey);
  if (entry) candidates.push(entry);
  candidates.push(
    `/js/pages/${pageKey}.js`,
    `/js/pages/${pageKey}/index.js`,
    `/js/pages/${pageKey}/${pageKey}.js`
  );
  const scripts = validateList(candidates);

  return { styles, scripts };
}

// CSS pagina: frontend/css/pages/<page>/<file>.css
export function listPageCss(page) {
  const baseDir = path.join(FRONTEND_BASE, 'css', 'pages', page);
  if (!fileExists(baseDir)) return [];
  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.css'));
  const reset = files.filter(f => /reset\.css$/.test(f));
  const responsive = files.filter(f => /responsive\.css$/.test(f));
  const middle = files.filter(f => !reset.includes(f) && !responsive.includes(f)).sort();
  const ordered = [...reset, ...middle, ...responsive];
  return ordered.map(f => `/css/pages/${page}/${f}`);
}

// JS pagina entry: frontend/js/modules/<page>/<page>-entry.js
export function havePageJs(page) {
  const p = path.join(FRONTEND_BASE, 'js', 'modules', page, `${page}-entry.js`);
  return fileExists(p) ? `/js/modules/${page}/${page}-entry.js` : null;
}

// ===== FRONTEND core components (always-on styles for public site) =====
// These are validated for existence at runtime and de-duplicated with page styles.
export function getFrontendCoreStyles() {
  return [
    '/frontend/css/components/layout.css',
    '/frontend/css/components/navbar.css',
    '/frontend/css/components/hamburger.css',
    '/frontend/css/components/footer.css'
  ];
}

// ===== ADMIN bundles (mounted at /admin/assets) =====
// Espliciti per ordine e stabilità; niente I/O runtime
export function getAdminCoreStyles() {
  return [
    '/admin/assets/css/layout.css',
    '/admin/assets/css/forms.css',
    '/admin/assets/css/table.css',
    '/admin/assets/css/modal.css',
    '/admin/assets/css/toast.css'
  ];
}

export function getAdminCoreScripts() {
  return [
    '/admin/assets/js/core/dom.js',
    '/admin/assets/js/core/http.js',
    '/admin/assets/js/core/toast.js',
    '/admin/assets/js/core/modal.js',
    '/admin/assets/js/core/confirm.js',
    '/admin/assets/js/core/forms.js'
  ];
}

// ===== Page asset manifest + fallback =====
export function getPageAssets(rawKey = '') {
  const pageKey = String(rawKey || '').toLowerCase();
  if (!pageKey) return { styles: [], scripts: [] };

  if (_assetCache.has(pageKey)) return _assetCache.get(pageKey);

  // Try manifest first
  let styles = [];
  let scripts = [];
  try {
    if (fileExists(MANIFEST_PATH)) {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      const entry = manifest && manifest[pageKey];
      if (entry) {
        styles = validateList(entry.styles || []);
        scripts = validateList(entry.scripts || []);
      }
    }
  } catch { /* ignore malformed manifest; fallback below */ }

  // Fallback to filesystem enumeration if manifest missing/empty
  if (styles.length === 0 && scripts.length === 0) {
    const enumerated = enumerateAssets(pageKey);
    styles = enumerated.styles || [];
    scripts = enumerated.scripts || [];
  }

  // Ensure core frontend component styles are present (navbar/hamburger/footer/layout)
  const core = validateList(getFrontendCoreStyles());
  styles = uniqList([ ...core, ...styles ]);

  const out = { styles, scripts };
  _assetCache.set(pageKey, out);
  return out;
}
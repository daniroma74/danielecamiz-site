// cms/middleware/contentLoader.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Safe JSON reader
async function readJsonSafe(absPath) {
  try {
    const buf = await fs.readFile(absPath, 'utf8');
    const json = JSON.parse(buf);
    return (json && typeof json === 'object') ? json : {};
  } catch { return {}; }
}

/**
 * Carica JSON labels per una lista di namespaces:
 *  - cartella: cms/data/i18n
 *  - file: labels-<ns>-<lang>.json
 * Ritorna oggetto { ns1: {...}, ns2: {...} } oppure (fallback legacy) l’unico labels-<lang>.json.
 */
export async function loadLabels(namespaces, lang = 'it', labelsRoot) {
  const nsList = Array.isArray(namespaces) ? namespaces : [namespaces];
  const dir = labelsRoot || path.join(__dirname, '..', 'data', 'i18n');
  const out = {};
  for (const nsRaw of nsList) {
    const ns = String(nsRaw || '').trim() || 'global';
    out[ns] = await readJsonSafe(path.join(dir, `labels-${ns}-${lang}.json`));
  }
  const allEmpty = Object.values(out).every(v => !v || Object.keys(v).length === 0);
  if (allEmpty) return await readJsonSafe(path.join(dir, `labels-${lang}.json`));
  return out;
}

/** Middleware per iniettare labels in res.locals.labels */
export function attachLabels(namespaces, { labelsDir } = {}) {
  return async (req, res, next) => {
    try {
      const lang = res.locals.lang || req.language || 'it';
      const labels = await loadLabels(namespaces, lang, labelsDir);
      res.locals.labels = { ...(res.locals.labels || {}), ...labels };
    } catch (e) {
      console.warn('[contentLoader] attachLabels:', e?.message || e);
    }
    next();
  };
}

/** Default: no-op (compat sicura se importato altrove) */
export default function contentLoader() {
  return (_req, _res, next) => next();
}
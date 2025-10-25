

// cms/utils/newsCategories.js
// Utility functions to manage News categories stored in JSON (no extra deps)

import path from 'path';
import fs from 'fs/promises';

const CMS_ROOT = process.cwd();
const DATA_DIR = path.join(CMS_ROOT, 'data');
const NEWS_DIR = path.join(DATA_DIR, 'news');
const CATEGORIES_PATH = path.join(NEWS_DIR, 'categories.json');

/* ===================== fs helpers ===================== */
async function ensureDir(absPath) {
  try { await fs.mkdir(absPath, { recursive: true }); } catch {}
}
async function readJSONSafe(absPath) {
  try { return JSON.parse(await fs.readFile(absPath, 'utf8')); } catch { return null; }
}
async function writeJSONPretty(absPath, data) {
  await ensureDir(path.dirname(absPath));
  const json = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(absPath, json, 'utf8');
}

/* ===================== category helpers ===================== */
function slugifyId(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}
function capitalizeWords(s) {
  return String(s || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}
function normalizeCategory(c) {
  if (!c || typeof c !== 'object') return null;
  const id = slugifyId(c.id || c.label_it || c.label_en);
  if (!id) return null;
  const label_it = (typeof c.label_it === 'string' && c.label_it.trim()) ? c.label_it.trim() : capitalizeWords(id);
  const label_en = (typeof c.label_en === 'string' && c.label_en.trim()) ? c.label_en.trim() : label_it;
  return { id, label_it, label_en };
}
function labelFor(cat, lang = 'it') {
  if (!cat) return '';
  const l = (lang && lang.toLowerCase() === 'en') ? cat.label_en : cat.label_it;
  return l || cat.label_it || cat.label_en || '';
}

/* ===================== core R/W ===================== */
export async function getCategoriesRaw() {
  const arr = await readJSONSafe(CATEGORIES_PATH);
  if (Array.isArray(arr)) return arr.filter(Boolean);
  return [];
}
export async function getCategories(lang = 'it') {
  const raw = await getCategoriesRaw();
  const out = [];
  for (const c of raw) {
    const n = normalizeCategory(c);
    if (n) out.push(n);
  }
  // Keep file order (no sort), but expose label for current lang
  return out.map(c => ({ ...c, label: labelFor(c, lang) }));
}
export async function getOptions(lang = 'it') {
  const cats = await getCategories(lang);
  return cats.map(c => ({ value: c.id, label: c.label }));
}

export async function upsertCategory(payload = {}) {
  const now = Date.now(); // reserved for future auditing
  const incoming = normalizeCategory(payload);
  if (!incoming) throw new Error('invalid_category');

  const list = await getCategoriesRaw();
  const existingIdx = list.findIndex(x => slugifyId(x?.id) === incoming.id);
  if (existingIdx >= 0) {
    // update labels only, keep stable id
    const prev = normalizeCategory(list[existingIdx]);
    list[existingIdx] = { id: prev.id, label_it: incoming.label_it, label_en: incoming.label_en };
  } else {
    // append new
    list.push({ id: incoming.id, label_it: incoming.label_it, label_en: incoming.label_en });
  }
  await writeJSONPretty(CATEGORIES_PATH, list);
  return incoming;
}

export async function deleteCategory(id) {
  const catId = slugifyId(id);
  if (!catId) throw new Error('invalid_id');
  const list = await getCategoriesRaw();
  const next = list.filter(x => slugifyId(x?.id) !== catId);
  const changed = next.length !== list.length;
  if (changed) await writeJSONPretty(CATEGORIES_PATH, next);
  return changed;
}

export async function getCategoryLabelMap(lang = 'it') {
  const cats = await getCategories(lang);
  const map = {};
  cats.forEach(c => { map[c.id] = c.label; });
  return map;
}

export { CATEGORIES_PATH };

export default {
  getCategoriesRaw,
  getCategories,
  getOptions,
  upsertCategory,
  deleteCategory,
  getCategoryLabelMap,
  CATEGORIES_PATH
};
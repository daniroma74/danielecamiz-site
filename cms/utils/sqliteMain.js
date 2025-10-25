// cms/utils/sqliteMain.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CMS_BASE = path.join(__dirname, '..');

// Resolve MAIN db path
function resolveDbPath(p) {
  if (!p) return path.join(CMS_BASE, 'db', 'main.sqlite');
  if (path.isAbsolute(p)) return p;
  if (p.startsWith('cms/')) return path.join(CMS_BASE, p.slice(4));
  if (p.startsWith('db/'))  return path.join(CMS_BASE, p);
  return path.join(CMS_BASE, 'db', p);
}

// Accept multiple env names for compatibility
const ENV_PATH = process.env.MAIN_SQLITE_PATH || process.env.SQLITE_MAIN || process.env.SQLITE_MAIN_PATH || '';
const DB_PATH = resolveDbPath(ENV_PATH);

// Ensure folder exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

sqlite3.verbose();
const db = new sqlite3.Database(DB_PATH);

// One-time startup log (non-noisy)
console.log(`[SQLite MAIN] Opening DB at: ${DB_PATH}${ENV_PATH ? ' (from env)' : ''}`);

// Promise helpers
function run(sql, params = []) {
  return new Promise((res, rej) => db.run(sql, params, function (err) {
    if (err) rej(err); else res(this);
  }));
}
function get(sql, params = []) {
  return new Promise((res, rej) => db.get(sql, params, function (err, row) {
    if (err) rej(err); else res(row);
  }));
}
function all(sql, params = []) {
  return new Promise((res, rej) => db.all(sql, params, function (err, rows) {
    if (err) rej(err); else res(rows);
  }));
}

// Initialize schema if DB is new/empty
(function ensureSchema() {
  const schemaPath = path.join(CMS_BASE, 'db', 'schema', 'main.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn('[SQLite MAIN] schema non trovato:', schemaPath, '(skip init)');
    return;
  }
  const isNew = !fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size === 0;
  if (isNew) {
    try {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema, (err) => {
        if (err) console.error('[SQLite MAIN] errore init schema:', err);
        else console.log('[SQLite MAIN] schema inizializzato su', DB_PATH);
      });
    } catch (e) {
      console.error('[SQLite MAIN] errore lettura schema:', e);
    }
  }
})();

export function getDb() { return db; }
export { run, get, all };

// ---- Backward-compat helpers attached on the instance ----
// Some modules expect default export to have .prepare/.all/.get/.run (Database has them),
// others call .getDb(), access .raw, or use .prom.{run,get,all}. We provide all.
if (!('getDb' in db)) db.getDb = () => db;
if (!('raw' in db))   db.raw   = db;
if (!('prom' in db))  db.prom  = { run, get, all };

export default db;
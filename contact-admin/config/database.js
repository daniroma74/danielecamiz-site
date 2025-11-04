import Database from 'better-sqlite3';
import { config } from './config.js';
import fs from 'fs';

// Verifica che il database esista
if (!fs.existsSync(config.db.path)) {
  console.error(`Database non trovato: ${config.db.path}`);
  process.exit(1);
}

// Inizializza connessione
const db = new Database(config.db.path);

// Ottimizzazioni
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// Utility functions
export const all = (sql, params = []) => {
  return db.prepare(sql).all(params);
};

export const get = (sql, params = []) => {
  return db.prepare(sql).get(params);
};

export const run = (sql, params = []) => {
  return db.prepare(sql).run(params);
};

export { db };

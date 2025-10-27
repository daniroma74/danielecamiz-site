import sqlite3 from 'sqlite3';
import { config } from '../config/config.js';

const DB_PATH = config.db.path;

export function getDb() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      throw err;
    }
    console.log('✅ Connected to main.sqlite at:', DB_PATH);
  });
}

export function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(query, params, function(err) {
      if (err) {
        db.close();
        reject(err);
      } else {
        db.close();
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(query, params, (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function ensureSchema() {
  const db = getDb();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS press_quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quote_it TEXT NOT NULL,
          quote_en TEXT,
          source TEXT NOT NULL,
          source_role_it TEXT,
          source_role_en TEXT,
          source_logo_cloudinary_id TEXT,
          published_date TEXT,
          url TEXT,
          is_published BOOLEAN DEFAULT 1,
          is_featured BOOLEAN DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating press_quotes table:', err);
          db.close();
          reject(err);
        } else {
          console.log('✅ press_quotes table ready');

          db.run(`CREATE INDEX IF NOT EXISTS idx_press_quotes_published ON press_quotes(is_published)`, () => {
            db.run(`CREATE INDEX IF NOT EXISTS idx_press_quotes_featured ON press_quotes(is_featured)`, () => {
              console.log('✅ Database schema verified');
              db.close();
              resolve();
            });
          });
        }
      });
    });
  });
}

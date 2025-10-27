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
      // Tabella contenuti bio
      db.run(`
        CREATE TABLE IF NOT EXISTS bio_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          section TEXT NOT NULL CHECK(section IN ('biography', 'curriculum', 'story')),
          lang TEXT NOT NULL CHECK(lang IN ('it', 'en')),
          title TEXT,
          intro TEXT,
          content TEXT,
          short_text TEXT,
          long_text TEXT,
          profile_photo_cloudinary_id TEXT,
          cv_pdf_cloudinary_id TEXT,
          is_published BOOLEAN DEFAULT 1,
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(section, lang)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating bio_content table:', err);
          db.close();
          reject(err);
          return;
        }
        console.log('✅ bio_content table ready');

        // Tabella press kit assets
        db.run(`
          CREATE TABLE IF NOT EXISTS presskit_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('photo', 'document', 'logo', 'video')),
            cloudinary_id TEXT NOT NULL,
            cloudinary_folder TEXT,
            title_it TEXT,
            title_en TEXT,
            description_it TEXT,
            description_en TEXT,
            file_size INTEGER,
            file_format TEXT,
            is_included_in_kit BOOLEAN DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating presskit_assets table:', err);
            db.close();
            reject(err);
            return;
          }
          console.log('✅ presskit_assets table ready');

          // Indici
          db.run(`CREATE INDEX IF NOT EXISTS idx_bio_content_section ON bio_content(section, lang)`, () => {
            db.run(`CREATE INDEX IF NOT EXISTS idx_presskit_included ON presskit_assets(is_included_in_kit)`, () => {
              console.log('✅ Database schema verified');
              db.close();
              resolve();
            });
          });
        });
      });
    });
  });
}

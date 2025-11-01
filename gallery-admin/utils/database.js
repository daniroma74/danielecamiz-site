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
  // Lo schema completo è già stato creato tramite migrations
  // Qui verifichiamo solo che le tabelle esistano
  return new Promise(async (resolve, reject) => {
    try {
      const collections = await getQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery_collections'");
      const items = await getQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery_items'");

      if (collections && items) {
        console.log('✅ Gallery database schema verified');
        resolve();
      } else {
        console.log('⚠️  Gallery tables not found, they should be created via migrations');
        resolve(); // Non fallire, le tabelle verranno create al primo accesso
      }
    } catch (error) {
      console.error('❌ Error verifying schema:', error);
      reject(error);
    }
  });
}

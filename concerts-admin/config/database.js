// concerts-admin/config/database.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Percorso database condiviso
const DB_PATH = path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite');

// Connessione database
export function connectDB() {
  const sqlite = sqlite3.verbose();
  
  const db = new sqlite.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('[Database] Connection error:', err);
      console.error('[Database] Attempted path:', DB_PATH);
    } else {
      console.log('[Database] Connected successfully');
      console.log('[Database] Path:', DB_PATH);
    }
  });
  
  // Abilita foreign keys
  db.run("PRAGMA foreign_keys = ON", (err) => {
    if (err) console.error('[Database] PRAGMA error:', err);
  });
  
  return db;
}

// Promise wrapper per query
export const dbPromise = {
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = connectDB();
      db.all(sql, params, (err, rows) => {
        db.close();
        if (err) {
          console.error('[Query Error]:', err.message);
          console.error('[SQL]:', sql);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },
  
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = connectDB();
      db.get(sql, params, (err, row) => {
        db.close();
        if (err) {
          console.error('[Query Error]:', err.message);
          console.error('[SQL]:', sql);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  },
  
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = connectDB();
      db.run(sql, params, function(err) {
        db.close();
        if (err) {
          console.error('[Query Error]:', err.message);
          console.error('[SQL]:', sql);
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }
};

// Helper functions per usare con db esistente (per compatibilità)
export function queryDB(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('[Query Error]:', err.message);
        console.error('[SQL]:', sql);
        console.error('[Params]:', params);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

export function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('[GetOne Error]:', err.message);
        console.error('[SQL]:', sql);
        console.error('[Params]:', params);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

export function runDB(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('[Run Error]:', err.message);
        console.error('[SQL]:', sql);
        console.error('[Params]:', params);
        reject(err);
      } else {
        resolve({ 
          lastID: this.lastID, 
          changes: this.changes 
        });
      }
    });
  });
}
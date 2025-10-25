// news-admin/utils/database.js
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export function connectDB() {
  if (db) return db;
  
  const dbPath = config.dbPath;
  
  if (!fs.existsSync(dbPath)) {
    console.error('[NEWS-ADMIN] Database non trovato:', dbPath);
    throw new Error('Database principale non trovato');
  }
  
  const sqlite = sqlite3.verbose();
  
  db = new sqlite.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('[NEWS-ADMIN] Errore connessione database:', err);
      throw err;
    }
    console.log('[NEWS-ADMIN] ✅ Connesso al database:', dbPath);
  });
  
  db.run("PRAGMA foreign_keys = ON");
  
  return db;
}

export function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = connectDB();
    database.all(sql, params, (err, rows) => {
      if (err) {
        console.error('[NEWS-ADMIN Query Error]:', err.message);
        console.error('[SQL]:', sql);
        console.error('[Params]:', params);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

export function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = connectDB();
    database.get(sql, params, (err, row) => {
      if (err) {
        console.error('[NEWS-ADMIN GetOne Error]:', err.message);
        console.error('[SQL]:', sql);
        console.error('[Params]:', params);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

export function runDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = connectDB();
    database.run(sql, params, function(err) {
      if (err) {
        console.error('[NEWS-ADMIN Run Error]:', err.message);
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

export function getDB() {
  return connectDB();
}

// Inizializza schema se necessario
export async function ensureSchema() {
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'cms', 'db', 'schema', 'news.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('[NEWS-ADMIN] Schema news.sql non trovato, verrà creato');
      return;
    }
    
    const check = await getOne(`SELECT name FROM sqlite_master WHERE type='table' AND name='news_posts'`);
    
    if (!check) {
      console.log('[NEWS-ADMIN] Creazione tabella news_posts...');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      const database = connectDB();
      
      database.exec(schema, (err) => {
        if (err) {
          console.error('[NEWS-ADMIN] Errore creazione schema:', err);
        } else {
          console.log('[NEWS-ADMIN] ✅ Schema news creato con successo');
        }
      });
    }
  } catch (error) {
    console.error('[NEWS-ADMIN] Errore verifica schema:', error);
  }
}
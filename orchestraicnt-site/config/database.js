// orchestraicnt-site/config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Percorsi database
const LOCAL_DB_PATH = path.join(__dirname, '..', 'admin', 'db', 'icnt.sqlite');
const SHARED_DB_PATH = path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'admin', 'db', 'schema.sql');

/**
 * Inizializza il database locale (impostazioni sito)
 */
function initLocalDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(LOCAL_DB_PATH, (err) => {
      if (err) {
        console.error('[Local DB] Connection error:', err);
        return reject(err);
      }

      console.log('[Local DB] Connected:', LOCAL_DB_PATH);

      // Leggi e esegui schema
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

      db.exec(schema, (err) => {
        if (err) {
          console.error('[Local DB] Schema error:', err);
          return reject(err);
        }

        console.log('[Local DB] Schema initialized');
        db.close();
        resolve();
      });
    });
  });
}

/**
 * Connessione al database locale (impostazioni)
 */
function connectLocalDB() {
  const db = new sqlite3.Database(LOCAL_DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('[Local DB] Connection error:', err);
      console.error('[Local DB] Path:', LOCAL_DB_PATH);
    }
  });

  db.run("PRAGMA foreign_keys = ON");
  return db;
}

/**
 * Connessione al database condiviso (concerti dal CMS)
 */
function connectSharedDB() {
  const db = new sqlite3.Database(SHARED_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('[Shared DB] Connection error:', err);
      console.error('[Shared DB] Path:', SHARED_DB_PATH);
    }
  });

  return db;
}

/**
 * Promise wrappers per query database locale
 */
const localDB = {
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = connectLocalDB();
      db.all(sql, params, (err, rows) => {
        db.close();
        if (err) {
          console.error('[Local DB Query Error]:', err.message);
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
      const db = connectLocalDB();
      db.get(sql, params, (err, row) => {
        db.close();
        if (err) {
          console.error('[Local DB Query Error]:', err.message);
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
      const db = connectLocalDB();
      db.run(sql, params, function(err) {
        db.close();
        if (err) {
          console.error('[Local DB Query Error]:', err.message);
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

/**
 * Promise wrappers per query database condiviso (concerti)
 */
const sharedDB = {
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = connectSharedDB();
      db.all(sql, params, (err, rows) => {
        db.close();
        if (err) {
          console.error('[Shared DB Query Error]:', err.message);
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
      const db = connectSharedDB();
      db.get(sql, params, (err, row) => {
        db.close();
        if (err) {
          console.error('[Shared DB Query Error]:', err.message);
          console.error('[SQL]:', sql);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }
};

module.exports = {
  initLocalDB,
  connectLocalDB,
  connectSharedDB,
  localDB,
  sharedDB
};

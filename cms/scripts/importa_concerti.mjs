import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

// Setup per __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/concerti.db');
const jsonPath = path.join(__dirname, '../data/concerti.json');

// Connessione al database
const db = new sqlite3.Database(dbPath);

// Lettura JSON
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Creazione tabella
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS concerti`);
  db.run(`
    CREATE TABLE IF NOT EXISTS concerti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anno INTEGER,
      data TEXT,
      titolo TEXT,
      luogo TEXT,
      solisti TEXT,
      orchestra TEXT,
      direttore TEXT,
      programma TEXT,
      note TEXT,
      locandina TEXT
    )
  `, err => {
    if (err) {
      console.error('❌ Errore creazione tabella:', err.message);
      process.exit(1);
    }

    console.log('🧹 Tabella concerti pulita e ricreata');

    const insertStmt = db.prepare(`
      INSERT INTO concerti (anno, data, titolo, luogo, solisti, orchestra, direttore, programma, note, locandina)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;

    jsonData.forEach(entry => {
      const anno = entry.anno;
      entry.concerti.forEach(c => {
        insertStmt.run(
          anno,
          c.data || '',
          c.titolo || '',
          c.luogo || '',
          c.solisti || '',
          c.orchestra || '',
          c.direttore || '',
          c.programma || '',
          c.note || '',
          c.locandina || '',
          err => {
            if (err) {
              console.error('❌ Errore inserimento:', err.message);
            } else {
              count++;
            }
          }
        );
      });
    });

    insertStmt.finalize(() => {
      console.log(`✅ Importazione completata con successo. Totale concerti: ${count}`);
      db.close();
    });
  });
});
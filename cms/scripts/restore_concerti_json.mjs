// cms/scripts/restore_concerti_json.mjs

import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

// Per ottenere __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const jsonPath = path.join(__dirname, '..', 'data', 'concerts.json'); // JSON originale

if (!fs.existsSync(jsonPath)) {
  console.error("❌ File concerts.json non trovato.");
  process.exit(1);
}

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const concerti = jsonData.flatMap(entry =>
  entry.concerti.map(c => ({
    anno: entry.anno,
    data: c.data || '',
    luogo: c.luogo || '',
    titolo: c.titolo || '',
    solisti: c.solisti || '',
    orchestra: c.orchestra || '',
    direttore: c.direttore || '',
    programma: c.programma || '',
    note: c.note || '',
    locandina: c.locandina || '',
    locandina_cloudinary_url: '',
    youtube: '',
    eventbrite: ''
  }))
);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("DELETE FROM concerti");

  const stmt = db.prepare(`
    INSERT INTO concerti
    (anno, data, titolo, luogo, solisti, orchestra, direttore, programma, note,
     locandina, locandina_cloudinary_url, youtube, eventbrite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  concerti.forEach(c => {
    stmt.run([
      c.anno,
      c.data,
      c.titolo,
      c.luogo,
      c.solisti,
      c.orchestra,
      c.direttore,
      c.programma,
      c.note,
      c.locandina,
      c.locandina_cloudinary_url,
      c.youtube,
      c.eventbrite
    ]);
  });

  stmt.finalize(() => {
    console.log(`✅ ${concerti.length} concerti importati da concerti.json`);
    db.close();
  });
});
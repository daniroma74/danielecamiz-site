// cms/scripts/restore_backup.mjs

import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

// Per ottenere __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const backupPath = process.argv[2];

if (!backupPath || !fs.existsSync(backupPath)) {
  console.error("❌ Specifica un percorso valido al file backup JSON");
  process.exit(1);
}

const jsonData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("DELETE FROM concerti");

  const stmt = db.prepare(`
    INSERT INTO concerti
    (id, data, luogo, titolo, solisti, orchestra, direttore, programma, note,
     locandina, locandina_cloudinary_url, youtube, eventbrite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  jsonData.forEach(c => {
    stmt.run([
      c.id,
      c.data,
      c.luogo,
      c.titolo,
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
    console.log("✅ Backup ripristinato con successo.");
    db.close();
  });
});
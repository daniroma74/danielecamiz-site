// cms/models/landingRepo.js
// Booking e mailing list sul DB unico (main.sqlite).
// API compatibile con il controller: getBookingCount, createBooking, ensureLandingForConcert (no-op).

import crypto from 'crypto';

// Helpers minimi (riusiamo la stessa connection che apre il repo eventi)
import sqlite3pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const sqlite3 = sqlite3pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DB_PATH    = process.env.MAIN_DB_PATH || path.join(__dirname, '../db/main.sqlite');

function withDb(flags, run) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, flags, (err) => {
      if (err) return reject(err);
      Promise.resolve(run(db))
        .then((res) => db.close(() => resolve(res)))
        .catch((e)  => db.close(() => reject(e)));
    });
  });
}
function getP(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}
function runP(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function done(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Tabella contatti/prenotazioni (nel main DB già ci sono; qui solo difesa)
async function ensureCoreTables() {
  const sqlContacts = `
    CREATE TABLE IF NOT EXISTS contacts(
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      source TEXT,
      status TEXT,
      subscribed_at TEXT
    );
  `;
  const sqlBookings = `
    CREATE TABLE IF NOT EXISTS bookings(
      id INTEGER PRIMARY KEY,
      concert_id INTEGER NOT NULL,
      contact_id INTEGER,
      holder_name TEXT,
      holder_email TEXT,
      qty INTEGER DEFAULT 1,
      status TEXT,
      token TEXT,
      created_at TEXT
    );
  `;
  await withDb(sqlite3.OPEN_READWRITE, async (db) => {
    await runP(db, sqlContacts);
    await runP(db, sqlBookings);
  });
}

// Compat per il controller: restituisce l’ID del “landing” = l’ID del concerto
export async function ensureLandingForConcert(concertIdOrObj) {
  const id = typeof concertIdOrObj === 'object' && concertIdOrObj
    ? Number(concertIdOrObj.id)
    : Number(concertIdOrObj);
  if (!id) throw new Error('concertId required');
  await ensureCoreTables();
  return { id }; // compat
}

// Conteggio prenotazioni “attive”
export async function getBookingCount(concertId) {
  const id = Number(concertId);
  if (!id) throw new Error('concertId required');
  await ensureCoreTables();
  const row = await withDb(sqlite3.OPEN_READONLY, (db) =>
    getP(db,
      `SELECT COALESCE(SUM(qty), 0) AS qty
       FROM bookings
       WHERE concert_id = ?
         AND status IN ('reserved','confirmed')`,
      [id]
    )
  );
  return row ? row.qty : 0;
}

// Creazione prenotazione + upsert contatto
export async function createBooking({ concertId, name, email, qty = 1 }) {
  const id = Number(concertId);
  if (!id) throw new Error('concertId required');
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('invalid email');

  await ensureCoreTables();

  const token = crypto.randomUUID();
  const q = Math.max(1, parseInt(qty, 10) || 1);

  return withDb(sqlite3.OPEN_READWRITE, async (db) => {
    await runP(
      db,
      `INSERT INTO contacts(email, name, source, status, subscribed_at)
       VALUES(?, ?, 'booking', 'subscribed', CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, contacts.name)`,
      [cleanEmail, name || null]
    );

    const res = await runP(
      db,
      `INSERT INTO bookings (concert_id, contact_id, holder_name, holder_email, qty, status, token, created_at)
       VALUES(
         ?, (SELECT id FROM contacts WHERE email = ?),
         ?, ?, ?, 'reserved', ?, CURRENT_TIMESTAMP
       )`,
      [id, cleanEmail, name || null, cleanEmail, q, token]
    );

    const row = await getP(db, `SELECT id, token, qty, status FROM bookings WHERE id = ?`, [res.lastID]);
    return row;
  });
}

export default { ensureLandingForConcert, getBookingCount, createBooking };
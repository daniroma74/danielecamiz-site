// cms/scripts/migrate_legacy_personnel.js
// Usage:
//   node cms/scripts/migrate_legacy_personnel.js /path/to/legacy_concerts.json [--dry-run]
//
// Migrates ONLY extra metadata (orchestra, conductor, soloists{name,instrument}, notes, youtube_url)
// into normalized tables using the EXISTING concerts in DB. No base concert rows are created.
//
// Matching strategy (in order):
//   1) Explicit numeric id: o.id | o.concert_id | o.db_id
//   2) date+title      → exact by day (YYYY-MM-DD) & LOWER(title)
//   3) date+location   → exact by day (YYYY-MM-DD) & LOWER(location)
//   4) date only (unique by day)
//   5) poster filename match (basename vs concerts.poster_local_filename)
//
// Idempotent and safe: supports --dry-run to preview actions.

import fs from 'fs/promises';
import path from 'path';
import dbMain from '../utils/sqliteMain.js';

const db = dbMain.raw; // sqlite3 Database instance
const ARG_DRY_RUN = process.argv.includes('--dry-run');

/* ------------------------------ utils ------------------------------ */
const trim = (v) => (v == null ? '' : String(v).trim());
const nonEmpty = (v) => trim(v).length > 0;

function normDateDay(s) {
  if (!s) return '';
  const t = String(s).trim();
  // handle ISO or with time → first 10 chars if they look like YYYY-MM-DD
  const d = t.slice(0, 10);
  return /\d{4}-\d{2}-\d{2}/.test(d) ? d : t; // fallback
}

function parseSoloists(input) {
  const out = [];
  if (!input) return out;
  const pushItem = (name, instrument) => {
    const n = trim(name);
    const i = trim(instrument);
    if (!n) return;
    out.push({ name: n, instrument: i || null });
  };
  if (Array.isArray(input)) {
    for (const it of input) {
      if (typeof it === 'string') {
        const [name, ...rest] = it.split(',');
        pushItem(name, rest.join(',').trim());
      } else if (it && typeof it === 'object') {
        pushItem(it.name, it.instrument);
      }
    }
    return out;
  }
  const s = String(input);
  const parts = s.split(/[;|·]/); // split on ; or | or ·
  for (const part of parts) {
    const token = part.trim();
    if (!token) continue;
    const [name, ...rest] = token.split(',');
    pushItem(name, rest.join(',').trim());
  }
  return out;
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (ARG_DRY_RUN && /^\s*insert|update|delete|replace|alter|create|drop/i.test(sql)) {
      // In dry-run, pretend success for mutating statements
      return resolve({ changes: 0 });
    }
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // has .changes
    });
  });
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function ensureSchemaBits() {
  await dbRun(`CREATE TABLE IF NOT EXISTS concert_performers (
    id          INTEGER PRIMARY KEY,
    concert_id  INTEGER NOT NULL REFERENCES concerts(id) ON UPDATE CASCADE ON DELETE CASCADE,
    role        TEXT    NOT NULL CHECK(role IN ('orchestra','conductor','soloist')),
    name        TEXT    NOT NULL,
    instrument  TEXT
  )`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_concert_performers_concert ON concert_performers (concert_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_concert_performers_role    ON concert_performers (role)`);
  await dbRun(`CREATE UNIQUE INDEX IF NOT EXISTS ux_concert_performers_unique
               ON concert_performers(concert_id, role, name, COALESCE(instrument,''))`);

  await dbRun(`CREATE TABLE IF NOT EXISTS concert_extra (
    concert_id  INTEGER PRIMARY KEY REFERENCES concerts(id) ON UPDATE CASCADE ON DELETE CASCADE,
    notes       TEXT,
    youtube_url TEXT
  )`);
}

async function upsertPerformer(concertId, role, name, instrument) {
  const nameT = trim(name);
  const instT = trim(instrument);
  if (!nameT) return { inserted: 0, skipped: 1 };
  const row = await dbGet(
    `SELECT 1 FROM concert_performers
     WHERE concert_id=? AND role=? AND name=? AND COALESCE(instrument,'')=COALESCE(?, '')`,
    [concertId, role, nameT, instT || null]
  );
  if (row) return { inserted: 0, skipped: 1 };
  const res = await dbRun(
    `INSERT INTO concert_performers (concert_id, role, name, instrument)
     VALUES (?, ?, ?, ?)`,
    [concertId, role, nameT, instT || null]
  );
  return { inserted: res.changes || 0, skipped: 0 };
}

async function upsertExtra(concertId, notes, youtube) {
  const notesT = trim(notes);
  const ytT = trim(youtube);
  if (!nonEmpty(notesT) && !nonEmpty(ytT)) return { upserted: 0 };
  const res = await dbRun(
    `INSERT INTO concert_extra (concert_id, notes, youtube_url)
     VALUES (?, ?, ?)
     ON CONFLICT(concert_id) DO UPDATE SET
       notes = CASE WHEN length(trim(excluded.notes))>0 THEN excluded.notes ELSE concert_extra.notes END,
       youtube_url = CASE WHEN length(trim(excluded.youtube_url))>0 THEN excluded.youtube_url ELSE concert_extra.youtube_url END`,
    [concertId, notesT || null, ytT || null]
  );
  return { upserted: res.changes || 0 };
}

/* ------------------------------ matching ------------------------------ */
async function findConcertIdByIdLike(o) {
  const id = Number(o.id || o.concert_id || o.db_id);
  if (Number.isInteger(id)) {
    const r = await dbGet(`SELECT id FROM concerts WHERE id=?`, [id]);
    if (r && r.id) return r.id;
  }
  return null;
}

async function findConcertIdByDateTitle(o) {
  const day = normDateDay(o.date);
  const title = trim(o.title);
  if (!day || !title) return null;
  const r = await dbGet(
    `SELECT id FROM concerts WHERE substr(date,1,10)=? AND LOWER(title)=LOWER(?) LIMIT 1`,
    [day, title]
  );
  return r ? r.id : null;
}

async function findConcertIdByDateLocation(o) {
  const day = normDateDay(o.date);
  const loc = trim(o.location || o.luogo);
  if (!day || !loc) return null;
  const r = await dbGet(
    `SELECT id FROM concerts WHERE substr(date,1,10)=? AND LOWER(COALESCE(location,''))=LOWER(?) LIMIT 1`,
    [day, loc]
  );
  return r ? r.id : null;
}

async function findConcertIdByDateUnique(o) {
  const day = normDateDay(o.date);
  if (!day) return null;
  const rows = await dbAll(`SELECT id FROM concerts WHERE substr(date,1,10)=?`, [day]);
  return rows.length === 1 ? rows[0].id : null;
}

async function findConcertIdByPoster(o) {
  const p = trim(o.poster || o.locandina || o.poster_local_filename);
  if (!p) return null;
  const base = path.basename(p);
  const r = await dbGet(`SELECT id FROM concerts WHERE LOWER(COALESCE(poster_local_filename,''))=LOWER(?) LIMIT 1`, [base]);
  return r ? r.id : null;
}

async function findConcertId(o) {
  return (
    await findConcertIdByIdLike(o) ||
    await findConcertIdByDateTitle(o) ||
    await findConcertIdByDateLocation(o) ||
    await findConcertIdByDateUnique(o) ||
    await findConcertIdByPoster(o)
  );
}

/* ------------------------------ legacy parsing ------------------------------ */
function flattenLegacyData(data) {
  // Accepts formats:
  //  A) [{ year, concerts: [...] }, ...]
  //  B) { "2024": [...], "2023": [...] }
  //  C) [ { date, title, ... }, ... ]
  const flat = [];
  if (Array.isArray(data)) {
    for (const it of data) {
      if (it && Array.isArray(it.concerts)) {
        for (const c of it.concerts) flat.push({ ...c, year: it.year });
      } else if (it && (it.date || it.title)) {
        flat.push(it);
      }
    }
    return flat;
  }
  if (data && typeof data === 'object') {
    for (const [yr, arr] of Object.entries(data)) {
      if (Array.isArray(arr)) {
        for (const c of arr) flat.push({ ...c, year: yr });
      }
    }
  }
  return flat;
}

/* ------------------------------ main ------------------------------ */
async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node cms/scripts/migrate_legacy_personnel.js /path/to/legacy_concerts.json [--dry-run]');
    process.exit(1);
  }

  const abs = path.resolve(jsonPath);
  let raw;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch (err) {
    console.error('Cannot read JSON file:', abs, err.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON:', err.message);
    process.exit(1);
  }

  const items = flattenLegacyData(data);
  if (!items.length) {
    console.error('No concerts found in JSON.');
    process.exit(1);
  }

  await ensureSchemaBits();

  let total = 0, matched = 0, insPerf = 0, skipPerf = 0, upExtra = 0, skippedNoMatch = 0;

  if (!ARG_DRY_RUN) await dbRun('BEGIN');
  try {
    for (const o of items) {
      total++;
      const cid = await findConcertId(o);
      if (!cid) { skippedNoMatch++; continue; }
      matched++;

      // orchestra
      if (nonEmpty(o.orchestra)) {
        const r = await upsertPerformer(cid, 'orchestra', o.orchestra, null);
        insPerf += r.inserted; skipPerf += r.skipped;
      }
      // conductor / direttore
      const conductor = trim(o.conductor || o.direttore);
      if (nonEmpty(conductor)) {
        const r = await upsertPerformer(cid, 'conductor', conductor, null);
        insPerf += r.inserted; skipPerf += r.skipped;
      }
      // soloists
      const soloists = parseSoloists(o.soloists || o.solisti || o.soloist);
      for (const s of soloists) {
        const r = await upsertPerformer(cid, 'soloist', s.name, s.instrument);
        insPerf += r.inserted; skipPerf += r.skipped;
      }
      // extras: notes / youtube
      const notes = trim(o.notes || o.note);
      const yt = trim(o.youtube || o.youtube_url);
      const rExtra = await upsertExtra(cid, notes, yt);
      upExtra += rExtra.upserted;
    }
    if (!ARG_DRY_RUN) await dbRun('COMMIT');
  } catch (err) {
    if (!ARG_DRY_RUN) await dbRun('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  }

  console.log('✓ Migration', ARG_DRY_RUN ? '(dry-run)' : 'completed');
  console.log('  items total     :', total);
  console.log('  matched in DB   :', matched);
  console.log('  performers      : inserted', insPerf, 'skipped', skipPerf);
  console.log('  extra upsert    :', upExtra);
  console.log('  skipped no match:', skippedNoMatch);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



// cms/models/attendanceRepo.js
// Attendance repo: list ICNT orchestra members with event attendance, bulk upsert
import { getDb as getMainDb } from '../utils/sqliteMain.js';

const LOG_PREFIX = '[attendance]';

function runP(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes || 0, lastID: this.lastID });
    });
  });
}
function getP(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}
function allP(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}
function toBool01(v) {
  if (v === true || v === 1 || v === '1') return 1;
  if (v === false || v === 0 || v === '0') return 0;
  return null;
}

async function getIcntEnsembleId(db) {
  await runP(db, `INSERT OR IGNORE INTO ensembles (name, slug) VALUES ('Orchestra ICNT', 'orchestra-icnt')`);
  const row = await getP(db, `SELECT id FROM ensembles WHERE slug = 'orchestra-icnt' LIMIT 1`);
  return row?.id || null;
}

export async function listByEvent(eventId, { include_inactive = false } = {}) {
  const db = await getMainDb();
  const eid = toInt(eventId, null);
  if (!eid) return [];

  const icntId = await getIcntEnsembleId(db);
  if (!icntId) return [];

  const rows = await allP(
    db,
    `SELECT em.artist_id              AS participant_id,
            a.name                   AS participant_name,
            em.role                  AS member_role,
            em.is_active             AS is_active,
            COALESCE(ea.attended, 0) AS attended,
            COALESCE(ea.hours, 0.0)  AS hours,
            COALESCE(ea.notes, '')   AS notes
       FROM ensemble_members em
       JOIN artists a ON a.id = em.artist_id
  LEFT JOIN event_attendance ea ON ea.event_id = ? AND ea.participant_id = em.artist_id
      WHERE em.ensemble_id = ? AND (em.is_active = 1 OR ? = 1)
      ORDER BY a.name ASC, em.artist_id ASC`,
    [eid, icntId, include_inactive ? 1 : 0]
  );

  return rows.map(r => ({
    participant_id: toInt(r.participant_id),
    name: r.participant_name || '',
    role: r.member_role || '',
    is_active: r.is_active === 1 ? 1 : 0,
    attended: r.attended === 1 ? 1 : 0,
    hours: Number(r.hours) || 0,
    notes: r.notes || ''
  }));
}

async function filterEntriesToMembers(db, entries) {
  if (!Array.isArray(entries) || !entries.length) return [];
  const ids = entries.map(e => toInt(e.participant_id)).filter(Boolean);
  if (!ids.length) return [];
  const icntId = await getIcntEnsembleId(db);
  if (!icntId) return [];
  const members = await allP(db, `SELECT artist_id FROM ensemble_members WHERE ensemble_id = ?`, [icntId]);
  const set = new Set(members.map(m => m.artist_id));
  return entries.filter(e => set.has(toInt(e.participant_id)));
}

export async function bulkUpsert(eventId, entries = []) {
  const db = await getMainDb();
  const eid = toInt(eventId, null);
  if (!eid) return [];

  const filtered = await filterEntriesToMembers(db, entries);
  if (!filtered.length) return await listByEvent(eid);

  await runP(db, 'BEGIN IMMEDIATE');
  try {
    const sql = `INSERT INTO event_attendance (event_id, participant_id, attended, hours, notes)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(event_id, participant_id) DO UPDATE SET
                   attended = excluded.attended,
                   hours    = excluded.hours,
                   notes    = excluded.notes`;

    for (const raw of filtered) {
      const pid = toInt(raw.participant_id, null);
      if (!pid) continue;
      const att = toBool01(raw.attended);
      const hrs = Number(raw.hours);
      const hours = Number.isFinite(hrs) && hrs >= 0 ? hrs : 0;
      const notes = (raw.notes ?? '').toString();
      const attended = att == null ? 1 : att; // default 1
      await runP(db, sql, [eid, pid, attended, hours, notes]);
    }

    await runP(db, 'COMMIT');
  } catch (err) {
    console.warn(LOG_PREFIX, 'bulkUpsert rollback due to error:', err?.message || err);
    try { await runP(db, 'ROLLBACK'); } catch {}
    throw err;
  }

  return listByEvent(eid);
}

export default {
  listByEvent,
  bulkUpsert
};
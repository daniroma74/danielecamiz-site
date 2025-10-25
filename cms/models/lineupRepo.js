// cms/models/lineupRepo.js
// Repository for event_lineup with ordering support and safe bulk upsert
import { getDb as getMainDb } from '../utils/sqliteMain.js';

const LOG_PREFIX = '[lineup]';

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

async function nextSortForType(eventId, performerType) {
  const db = await getMainDb();
  const row = await getP(
    db,
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
       FROM event_lineup
      WHERE event_id = ? AND performer_type = ?`,
    [eventId, performerType]
  );
  return toInt(row?.next, 0);
}

export async function listByEvent(eventId) {
  const db = await getMainDb();
  const rows = await allP(
    db,
    `SELECT el.id, el.event_id, el.performer_type, el.ensemble_id, el.artist_id,
            el.role, el.sort_order,
            e.name  AS ensemble_name, e.slug AS ensemble_slug,
            a.name  AS artist_name,   a.role_default AS artist_role_default
       FROM event_lineup el
       LEFT JOIN ensembles e ON e.id = el.ensemble_id
       LEFT JOIN artists   a ON a.id = el.artist_id
      WHERE el.event_id = ?
      ORDER BY CASE el.performer_type WHEN 'ensemble' THEN 0 ELSE 1 END, el.sort_order ASC, el.id ASC`,
    [eventId]
  );
  return rows;
}

export async function getById(entryId) {
  const db = await getMainDb();
  return getP(
    db,
    `SELECT el.id, el.event_id, el.performer_type, el.ensemble_id, el.artist_id,
            el.role, el.sort_order,
            e.name  AS ensemble_name, e.slug AS ensemble_slug,
            a.name  AS artist_name,   a.role_default AS artist_role_default
       FROM event_lineup el
       LEFT JOIN ensembles e ON e.id = el.ensemble_id
       LEFT JOIN artists   a ON a.id = el.artist_id
      WHERE el.id = ?`,
    [entryId]
  );
}

function validateEntry(e) {
  const performer_type = (e.performer_type || '').toString();
  if (performer_type !== 'ensemble' && performer_type !== 'artist') {
    throw new Error('performer_type must be "ensemble" or "artist"');
  }
  const ensemble_id = toInt(e.ensemble_id, null);
  const artist_id = toInt(e.artist_id, null);
  if (performer_type === 'ensemble' && !ensemble_id) {
    throw new Error('ensemble_id is required when performer_type="ensemble"');
  }
  if (performer_type === 'artist' && !artist_id) {
    throw new Error('artist_id is required when performer_type="artist"');
  }
  const role = (e.role ?? null);
  const sort_order = toInt(e.sort_order, null);
  const id = toInt(e.id, null);
  return { id, performer_type, ensemble_id, artist_id, role, sort_order };
}

export async function bulkUpsert(eventId, entries = []) {
  const db = await getMainDb();
  if (!Array.isArray(entries) || entries.length === 0) return [];

  await runP(db, 'BEGIN IMMEDIATE');
  try {
    // First pass: compute missing sort orders per type
    const counters = { ensemble: null, artist: null };

    for (const raw of entries) {
      const e = validateEntry(raw);
      if (e.sort_order == null) {
        if (counters[e.performer_type] == null) {
          counters[e.performer_type] = await nextSortForType(eventId, e.performer_type);
        }
        e.sort_order = counters[e.performer_type]++;
      }

      if (e.id) {
        await runP(
          db,
          `UPDATE event_lineup
              SET performer_type = ?,
                  ensemble_id    = ?,
                  artist_id      = ?,
                  role           = ?,
                  sort_order     = ?
            WHERE id = ? AND event_id = ?`,
          [e.performer_type, e.ensemble_id, e.artist_id, e.role, e.sort_order, e.id, eventId]
        );
      } else {
        const res = await runP(
          db,
          `INSERT INTO event_lineup (event_id, performer_type, ensemble_id, artist_id, role, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [eventId, e.performer_type, e.ensemble_id, e.artist_id, e.role, e.sort_order]
        );
        raw.id = res.lastID; // reflect generated id back to input object (useful to caller)
      }
    }

    await runP(db, 'COMMIT');
  } catch (err) {
    console.warn(LOG_PREFIX, 'bulkUpsert error, rolling back:', err?.message || err);
    try { await runP(db, 'ROLLBACK'); } catch {}
    throw err;
  }

  return listByEvent(eventId);
}

export async function deleteEntry(eventId, entryId) {
  const db = await getMainDb();
  // Need performer_type to compact sort orders within its partition
  const row = await getP(db, 'SELECT performer_type, sort_order FROM event_lineup WHERE id = ? AND event_id = ?', [entryId, eventId]);
  if (!row) return { deleted: 0 };

  await runP(db, 'BEGIN IMMEDIATE');
  try {
    const delRes = await runP(db, 'DELETE FROM event_lineup WHERE id = ? AND event_id = ?', [entryId, eventId]);

    // Compact sort orders for the same type
    const items = await allP(
      db,
      `SELECT id FROM event_lineup WHERE event_id = ? AND performer_type = ? ORDER BY sort_order ASC, id ASC`,
      [eventId, row.performer_type]
    );
    let i = 0;
    for (const it of items) {
      await runP(db, 'UPDATE event_lineup SET sort_order = ? WHERE id = ?', [i++, it.id]);
    }

    await runP(db, 'COMMIT');
    return { deleted: delRes.changes || 0 };
  } catch (err) {
    try { await runP(db, 'ROLLBACK'); } catch {}
    throw err;
  }
}

export async function reorder(eventId, orderedIds = []) {
  const db = await getMainDb();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return await listByEvent(eventId);

  // We must preserve the per-type uniqueness. We'll reorder inside their partitions.
  // Strategy: fetch current rows, split by type, then apply new order to the ids provided while keeping others after.
  const current = await allP(db, 'SELECT id, performer_type FROM event_lineup WHERE event_id = ?', [eventId]);
  const byType = { ensemble: [], artist: [] };
  for (const r of current) {
    (byType[r.performer_type] || (byType[r.performer_type] = [])).push(r.id);
  }

  const setOrderForType = async (type) => {
    const cur = byType[type] || [];
    const wanted = orderedIds.filter(id => cur.includes(id));
    const rest = cur.filter(id => !wanted.includes(id));
    const final = [...wanted, ...rest];
    let i = 0;
    for (const id of final) {
      await runP(db, 'UPDATE event_lineup SET sort_order = ? WHERE id = ? AND event_id = ? AND performer_type = ?', [i++, id, eventId, type]);
    }
  };

  await runP(db, 'BEGIN IMMEDIATE');
  try {
    await setOrderForType('ensemble');
    await setOrderForType('artist');
    await runP(db, 'COMMIT');
  } catch (err) {
    try { await runP(db, 'ROLLBACK'); } catch {}
    throw err;
  }

  return listByEvent(eventId);
}

// Optional utilities for admin UI (no new deps)
export async function ensureDefaultEnsemble() {
  const db = await getMainDb();
  await runP(db, `INSERT OR IGNORE INTO ensembles (name, slug) VALUES ('Orchestra ICNT', 'orchestra-icnt')`);
  const row = await getP(db, `SELECT id, name, slug FROM ensembles WHERE slug = 'orchestra-icnt'`);
  return row;
}

export async function listEnsembles() {
  const db = await getMainDb();
  return allP(db, `SELECT id, name, slug FROM ensembles ORDER BY name ASC`);
}

export async function searchArtists(q = '', limit = 12) {
  const db = await getMainDb();
  const query = `%${String(q || '').trim()}%`;
  return allP(db, `SELECT id, name, role_default FROM artists WHERE name LIKE ? ORDER BY name ASC LIMIT ?`, [query, limit]);
}

export default {
  listByEvent,
  getById,
  bulkUpsert,
  deleteEntry,
  reorder,
  nextSortForType,
  ensureDefaultEnsemble,
  listEnsembles,
  searchArtists
};

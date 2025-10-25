// cms/routes/health.js
import { Router } from 'express';
import { getDb as getMainDb } from '../utils/sqliteMain.js';

const router = Router();

function getScalar(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      const key = Object.keys(row)[0];
      resolve(row[key]);
    });
  });
}

function tableExists(db, tableName) {
  return getScalar(db, `SELECT COUNT(1) AS c FROM sqlite_master WHERE type='table' AND name=?`, [tableName])
    .then(c => Number(c) > 0)
    .catch(() => false);
}

async function columnExists(db, tableName, columnName) {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
      if (err || !Array.isArray(rows)) return resolve(false);
      const found = rows.some(r => String(r.name).toLowerCase() === String(columnName).toLowerCase());
      resolve(found);
    });
  });
}

async function countRows(db, tableName) {
  try {
    const exists = await tableExists(db, tableName);
    if (!exists) return 0;
    const c = await getScalar(db, `SELECT COUNT(1) AS c FROM ${tableName}`);
    return Number(c) || 0;
  } catch (_) {
    return 0;
  }
}

async function getLastMigrationFromTracking(db) {
  const has = await tableExists(db, 'schema_migrations');
  if (!has) return null;
  return new Promise((resolve) => {
    db.get(
      `SELECT filename, applied_at
       FROM schema_migrations
       ORDER BY datetime(applied_at) DESC, filename DESC
       LIMIT 1`,
      [],
      (err, row) => {
        if (err || !row) return resolve(null);
        resolve({ filename: row.filename, applied_at: row.applied_at });
      }
    );
  });
}

async function detectLastMigrationHeuristic(db) {
  const has025 = await tableExists(db, 'media_asset_tags');
  if (has025) return '025_media_tags.sql';
  const has024 = await tableExists(db, 'entity_media_links');
  if (has024) return '024_entity_media_links.sql';
  const has023 = await columnExists(db, 'rehearsals', 'planned_hours');
  if (has023) return '023_rehearsals_extras.sql';
  const has022 = await tableExists(db, 'event_assignments');
  if (has022) return '022_event_assignements.sql';
  const has021 = await tableExists(db, 'instruments');
  if (has021) return '021_instruments.sql';
  const has020 = await tableExists(db, 'schema_migrations');
  if (has020) return '020_schema_migrations.sql';
  const has015 = await tableExists(db, 'contacts');
  if (has015) return '015_mailing.sql';
  const has014 = await tableExists(db, 'videos');
  if (has014) return '014_videos.sql';
  const has013 = await tableExists(db, 'press_items');
  if (has013) return '013_press.sql';
  const has012 = await tableExists(db, 'event_attendance');
  if (has012) return '012_attendance.sql';
  const has011 = await tableExists(db, 'event_lineup');
  if (has011) return '011_lineup.sql';
  const has010 = await columnExists(db, 'media_assets', 'category');
  if (has010) return '010_media_v2.sql';
  const has009 = await tableExists(db, 'media_assets');
  if (has009) return '009_media_base.sql';
  return '000_base_schema (pre-v2)';
}

router.get('/db', async (req, res) => {
  try {
    const db = await getMainDb();
    const verbose = String(req.query.verbose || '').toLowerCase();
    const isVerbose = verbose === '1' || verbose === 'true' || verbose === 'yes';

    const [cntConcerts, cntPress, cntVideos, cntContacts, tracking] = await Promise.all([
      countRows(db, 'concerts'),
      countRows(db, 'press_items'),
      countRows(db, 'videos'),
      countRows(db, 'contacts'),
      getLastMigrationFromTracking(db)
    ]);

    let lastMigration = null;
    let lastMigrationAppliedAt = null;
    let lastMigrationSource = 'tracking';

    if (tracking) {
      lastMigration = tracking.filename;
      lastMigrationAppliedAt = tracking.applied_at;
    } else {
      lastMigration = await detectLastMigrationHeuristic(db);
      lastMigrationSource = 'heuristic';
    }

    const payload = {
      ok: true,
      ts: new Date().toISOString(),
      lastMigration,
      lastMigrationAppliedAt,
      lastMigrationSource,
      counts: {
        concerts: cntConcerts,
        press_items: cntPress,
        videos: cntVideos,
        contacts: cntContacts
      },
      verbose: isVerbose
    };

    if (isVerbose) {
      payload.schema = {
        media_assets: await tableExists(db, 'media_assets'),
        ensembles: await tableExists(db, 'ensembles'),
        artists: await tableExists(db, 'artists'),
        event_lineup: await tableExists(db, 'event_lineup'),
        ensemble_members: await tableExists(db, 'ensemble_members'),
        event_attendance: await tableExists(db, 'event_attendance'),
        press_items: await tableExists(db, 'press_items'),
        press_i18n: await tableExists(db, 'press_i18n'),
        videos: await tableExists(db, 'videos'),
        videos_i18n: await tableExists(db, 'videos_i18n'),
        video_chapters: await tableExists(db, 'video_chapters'),
        contacts: await tableExists(db, 'contacts'),
        lists: await tableExists(db, 'lists'),
        list_subscriptions: await tableExists(db, 'list_subscriptions'),
        consents: await tableExists(db, 'consents'),
        concerts: await tableExists(db, 'concerts'),
        instruments: await tableExists(db, 'instruments'),
        event_assignments: await tableExists(db, 'event_assignments'),
        entity_media_links: await tableExists(db, 'entity_media_links'),
        media_tags: await tableExists(db, 'media_tags')
      };
    }

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
});

export default router;
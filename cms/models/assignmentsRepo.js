// cms/models/assignmentsRepo.js
// Async CRUD for event_assignments + helpers (artist/instrument search). Adaptive to schema.

import sqliteMain from '../utils/sqliteMain.js';

// ---- db wrapper (lazy) ----
let _dbWrapPromise = null;
async function getDbWrap(){
  if (_dbWrapPromise) return _dbWrapPromise;
  _dbWrapPromise = (async () => {
    let raw = sqliteMain;
    if (raw && typeof raw.getDb === 'function') {
      raw = await raw.getDb();
    }
    if (raw && typeof raw.prepare === 'function') {
      return {
        kind: 'better-sqlite3', raw,
        all: async (sql, params = {}) => raw.prepare(sql).all(params),
        get: async (sql, params = {}) => raw.prepare(sql).get(params),
        run: async (sql, params = {}) => {
          const info = raw.prepare(sql).run(params);
          return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
        },
      };
    }
    if (raw && typeof raw.all === 'function' && typeof raw.run === 'function') {
      const allP = (sql, params = {}) => new Promise((resolve, reject) => {
        raw.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
      });
      const getP = (sql, params = {}) => new Promise((resolve, reject) => {
        raw.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
      });
      const runP = (sql, params = {}) => new Promise((resolve, reject) => {
        raw.run(sql, params, function(err){
          if (err) return reject(err);
          resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        });
      });
      return { kind: 'sqlite3', raw, all: allP, get: getP, run: runP };
    }
    throw new Error('[assignmentsRepo] sqliteMain did not provide a usable DB connection');
  })();
  return _dbWrapPromise;
}

// ---- helpers ----
function nowIso(){ return new Date().toISOString(); }
function bool01(v){ return v ? 1 : 0; }
function buildInParams(prefix, ids){
  const params = {};
  const keys = ids.map((_, i) => `${prefix}${i}`);
  keys.forEach((k, i) => { params[k] = ids[i]; });
  const clause = keys.map(k => `@${k}`).join(',');
  return { clause, params };
}

// ---- schema (lazy) ----
let _aSchemaPromise = null;
async function getAssignmentSchema(){
  if (_aSchemaPromise) return _aSchemaPromise;
  _aSchemaPromise = (async () => {
    const db = await getDbWrap();
    const rows = await db.all("PRAGMA table_info('event_assignments')");
    if (!rows.length) throw new Error('[assignmentsRepo] Table event_assignments not found');
    const cols = rows.map(r => r.name);
    const has = (c) => cols.includes(c);
    const fk = has('event_id') ? 'event_id' : (has('concert_id') ? 'concert_id' : null);
    if (!fk) throw new Error('[assignmentsRepo] Missing foreign key event_id/concert_id in event_assignments');
    return {
      cols,
      fk,
      hasInstrumentId: has('instrument_id'),
      hasInstrumentLabel: has('instrument_label'),
      hasChair: has('chair'),
      hasDesk: has('desk'),
      hasIsPrincipal: has('is_principal'),
      hasArtistId: has('artist_id'),
      hasNotes: has('notes'),
      hasCreatedAt: has('created_at'),
      hasUpdatedAt: has('updated_at'),
    };
  })();
  return _aSchemaPromise;
}

let _artistsSchemaPromise = null;
async function getArtistsSchema(){
  if (_artistsSchemaPromise) return _artistsSchemaPromise;
  _artistsSchemaPromise = (async () => {
    const db = await getDbWrap();
    const tbl = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='artists' LIMIT 1");
    if (!tbl) return null;
    const rows = await db.all("PRAGMA table_info('artists')");
    const cols = rows.map(r => r.name);
    const has = (c) => cols.includes(c);
    return {
      hasId: has('id'),
      hasDisplayName: has('display_name'),
      hasFullName: has('full_name'),
      hasName: has('name'),
      hasFirst: has('first_name'),
      hasLast: has('last_name'),
    };
  })();
  return _artistsSchemaPromise;
}

let _instrumentsSchemaPromise = null;
async function getInstrumentsSchema(){
  if (_instrumentsSchemaPromise) return _instrumentsSchemaPromise;
  _instrumentsSchemaPromise = (async () => {
    const db = await getDbWrap();
    const tbl = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='instruments' LIMIT 1");
    if (!tbl) return null;
    const rows = await db.all("PRAGMA table_info('instruments')");
    const cols = rows.map(r => r.name);
    const has = (c) => cols.includes(c);
    return {
      hasId: has('id'),
      hasName: has('name') || has('label'),
      nameCol: cols.includes('name') ? 'name' : (cols.includes('label') ? 'label' : null),
    };
  })();
  return _instrumentsSchemaPromise;
}

function buildArtistDisplay(row, artistsSchema){
  if (!row) return null;
  if (artistsSchema?.hasDisplayName && 'display_name' in row) return row.display_name;
  if (artistsSchema?.hasFullName && 'full_name' in row) return row.full_name;
  if (artistsSchema?.hasName && 'name' in row) return row.name;
  if (artistsSchema?.hasFirst && artistsSchema?.hasLast && 'first_name' in row && 'last_name' in row) {
    return `${row.first_name} ${row.last_name}`.trim();
  }
  return null;
}

function normalizeRow(row, enrich = {}){
  if (!row) return null;
  return {
    id: row.id,
    event_id: row.event_id ?? row.concert_id ?? null,
    instrument_id: 'instrument_id' in row ? row.instrument_id : null,
    instrument_label: 'instrument_label' in row ? row.instrument_label : null,
    chair: 'chair' in row ? row.chair : null,
    desk: 'desk' in row ? row.desk : null,
    is_principal: 'is_principal' in row ? row.is_principal : null,
    artist_id: 'artist_id' in row ? row.artist_id : null,
    notes: 'notes' in row ? row.notes : null,
    created_at: 'created_at' in row ? row.created_at : null,
    updated_at: 'updated_at' in row ? row.updated_at : null,
    artist_name: enrich.artistNames?.get(row.artist_id) ?? undefined,
    instrument_name: enrich.instrumentNames?.get(row.instrument_id) ?? undefined,
  };
}

async function pickAllowed(data){
  const aSchema = await getAssignmentSchema();
  const allowed = new Set([
    aSchema.fk,
    'instrument_id','instrument_label','chair','desk','is_principal','artist_id','notes','created_at','updated_at'
  ]);
  const out = {};
  for (const k of Object.keys(data || {})){
    if (allowed.has(k) && aSchema.cols.includes(k)) out[k] = data[k];
  }
  return out;
}

// ---- enrichment helpers ----
async function fetchArtistNames(ids){
  const db = await getDbWrap();
  const schema = await getArtistsSchema();
  const map = new Map();
  if (!schema || !ids?.length) return map;
  const uniq = Array.from(new Set(ids.filter(x => Number.isInteger(x))));
  if (!uniq.length) return map;
  const cols = [];
  if (schema.hasDisplayName) cols.push('display_name');
  if (schema.hasFullName) cols.push('full_name');
  if (schema.hasName) cols.push('name');
  if (schema.hasFirst && schema.hasLast) cols.push('first_name','last_name');
  const selectCols = ['id'].concat(cols).join(', ');
  const { clause, params } = buildInParams('p', uniq);
  const rows = await db.all(`SELECT ${selectCols} FROM artists WHERE id IN (${clause})`, params);
  for (const r of rows) map.set(r.id, buildArtistDisplay(r, schema));
  return map;
}

async function fetchInstrumentNames(ids){
  const db = await getDbWrap();
  const schema = await getInstrumentsSchema();
  const map = new Map();
  if (!schema || !ids?.length || !schema.nameCol) return map;
  const uniq = Array.from(new Set(ids.filter(x => Number.isInteger(x))));
  if (!uniq.length) return map;
  const { clause, params } = buildInParams('p', uniq);
  const rows = await db.all(`SELECT id, ${schema.nameCol} AS name FROM instruments WHERE id IN (${clause})`, params);
  for (const r of rows) map.set(r.id, r.name);
  return map;
}

// ---- public API ----
export async function list(eventId, { orderBy = 'chair', enrich = true } = {}){
  if (!Number.isInteger(eventId)) throw new Error('[assignmentsRepo] list: eventId must be integer');
  const db = await getDbWrap();
  const aSchema = await getAssignmentSchema();
  const orderCol = aSchema.cols.includes(orderBy) ? orderBy : (aSchema.hasChair ? 'chair' : 'id');
  const rows = await db.all(`SELECT * FROM event_assignments WHERE ${aSchema.fk} = @eventId ORDER BY ${orderCol} ASC, id ASC`, { eventId });
  if (!enrich) return rows.map(r => normalizeRow(r));
  const artistIds = aSchema.hasArtistId ? rows.map(r => r.artist_id).filter(v => Number.isInteger(v)) : [];
  const instrumentIds = aSchema.hasInstrumentId ? rows.map(r => r.instrument_id).filter(v => Number.isInteger(v)) : [];
  const enrichers = {
    artistNames: await fetchArtistNames(artistIds),
    instrumentNames: await fetchInstrumentNames(instrumentIds),
  };
  return rows.map(r => normalizeRow(r, enrichers));
}

export async function getById(id){
  const db = await getDbWrap();
  const row = await db.get('SELECT * FROM event_assignments WHERE id = @id', { id });
  return normalizeRow(row);
}

export async function create(eventId, data = {}){
  if (!Number.isInteger(eventId)) throw new Error('[assignmentsRepo] create: eventId must be integer');
  const db = await getDbWrap();
  const aSchema = await getAssignmentSchema();
  const payload = await pickAllowed(data);
  payload[aSchema.fk] = eventId;
  if (aSchema.hasIsPrincipal && typeof payload.is_principal !== 'undefined') payload.is_principal = bool01(payload.is_principal);
  if (aSchema.hasCreatedAt && !('created_at' in payload)) payload.created_at = nowIso();
  if (aSchema.hasUpdatedAt && !('updated_at' in payload)) payload.updated_at = payload.created_at || nowIso();
  const keys = Object.keys(payload);
  const placeholders = keys.map(k => `@${k}`).join(', ');
  const sql = `INSERT INTO event_assignments (${keys.join(', ')}) VALUES (${placeholders})`;
  const info = await db.run(sql, payload);
  return getById(info.lastInsertRowid);
}

export async function update(id, data = {}){
  const db = await getDbWrap();
  const aSchema = await getAssignmentSchema();
  const payload = await pickAllowed(data);
  if (aSchema.hasIsPrincipal && typeof payload.is_principal !== 'undefined') payload.is_principal = bool01(payload.is_principal);
  if (aSchema.hasUpdatedAt) payload.updated_at = nowIso();
  const keys = Object.keys(payload);
  if (!keys.length) return getById(id);
  const setSql = keys.map(k => `${k} = @${k}`).join(', ');
  const sql = `UPDATE event_assignments SET ${setSql} WHERE id = @id`;
  await db.run(sql, { id, ...payload });
  return getById(id);
}

export async function remove(id){
  const db = await getDbWrap();
  await db.run('DELETE FROM event_assignments WHERE id = @id', { id });
  return true;
}

export async function setPrincipal(id, isPrincipal){
  const aSchema = await getAssignmentSchema();
  if (!aSchema.hasIsPrincipal) return getById(id);
  return update(id, { is_principal: isPrincipal ? 1 : 0 });
}

// ---- search helpers ----
export async function searchArtists(query, limit = 10){
  const schema = await getArtistsSchema();
  if (!schema) return [];
  if (!query) return [];
  const db = await getDbWrap();
  const terms = `%${query}%`;
  const selects = [];
  if (schema.hasDisplayName) selects.push('display_name LIKE @q');
  if (schema.hasFullName) selects.push('full_name LIKE @q');
  if (schema.hasName) selects.push('name LIKE @q');
  if (schema.hasFirst) selects.push('first_name LIKE @q');
  if (schema.hasLast) selects.push('last_name LIKE @q');
  const where = selects.length ? ('WHERE ' + selects.join(' OR ')) : '';
  const showCols = ['id'];
  if (schema.hasDisplayName) showCols.push('display_name');
  if (schema.hasFullName) showCols.push('full_name');
  if (schema.hasName) showCols.push('name');
  if (schema.hasFirst) showCols.push('first_name');
  if (schema.hasLast) showCols.push('last_name');
  const rows = await db.all(`SELECT ${showCols.join(', ')} FROM artists ${where} ORDER BY id DESC LIMIT @limit`, { q: terms, limit: Math.max(1, Math.min(50, limit)) });
  return rows.map(r => ({ id: r.id, name: buildArtistDisplay(r, schema) || String(r.id) }));
}

export async function searchInstruments(query, limit = 10){
  const schema = await getInstrumentsSchema();
  if (!schema || !schema.nameCol) return [];
  if (!query) return [];
  const db = await getDbWrap();
  const rows = await db.all(`SELECT id, ${schema.nameCol} AS name FROM instruments WHERE ${schema.nameCol} LIKE @q ORDER BY id ASC LIMIT @limit`, { q: `%${query}%`, limit: Math.max(1, Math.min(50, limit)) });
  return rows.map(r => ({ id: r.id, name: r.name }));
}

export default {
  list,
  getById,
  create,
  update,
  remove,
  setPrincipal,
  searchArtists,
  searchInstruments,
};

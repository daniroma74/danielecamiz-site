

// cms/routes/api/lineupRoutes.js
import { Router } from 'express';
import {
  listByEvent,
  bulkUpsert,
  deleteEntry,
  reorder,
  ensureDefaultEnsemble,
  listEnsembles,
  searchArtists
} from '../../models/lineupRepo.js';

const router = Router();
const LOG_PREFIX = '[lineup]';

function toId(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/* ========================= Core endpoints ========================= */
// GET /api/events/:eventId/lineup
router.get('/events/:eventId/lineup', async (req, res) => {
  try {
    const eventId = toId(req.params.eventId);
    if (!eventId) return res.status(400).json({ ok: false, error: 'Invalid eventId' });
    const items = await listByEvent(eventId);
    return res.json({ ok: true, items });
  } catch (err) {
    console.error(LOG_PREFIX, 'GET lineup error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// POST /api/events/:eventId/lineup (bulk upsert)
// Body: Array<Entry> | { entries: Array<Entry> }
router.post('/events/:eventId/lineup', async (req, res) => {
  try {
    const eventId = toId(req.params.eventId);
    if (!eventId) return res.status(400).json({ ok: false, error: 'Invalid eventId' });

    const body = req.body;
    const entries = Array.isArray(body) ? body : (Array.isArray(body?.entries) ? body.entries : null);
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ ok: false, error: 'Body must be an array of entries' });
    }

    const items = await bulkUpsert(eventId, entries);
    return res.json({ ok: true, items });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error(LOG_PREFIX, 'POST bulk upsert error:', msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// DELETE /api/events/:eventId/lineup/:entryId
router.delete('/events/:eventId/lineup/:entryId', async (req, res) => {
  try {
    const eventId = toId(req.params.eventId);
    const entryId = toId(req.params.entryId);
    if (!eventId || !entryId) return res.status(400).json({ ok: false, error: 'Invalid id(s)' });
    const r = await deleteEntry(eventId, entryId);
    return res.json({ ok: true, ...r });
  } catch (err) {
    console.error(LOG_PREFIX, 'DELETE entry error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// POST /api/events/:eventId/lineup/reorder
// Body: { orderedIds: number[] }
router.post('/events/:eventId/lineup/reorder', async (req, res) => {
  try {
    const eventId = toId(req.params.eventId);
    if (!eventId) return res.status(400).json({ ok: false, error: 'Invalid eventId' });
    const ids = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map(toId).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ ok: false, error: 'orderedIds must be a non-empty array' });
    const items = await reorder(eventId, ids);
    return res.json({ ok: true, items });
  } catch (err) {
    console.error(LOG_PREFIX, 'POST reorder error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

/* ========================= Helpers for admin UI ========================= */
// GET /api/lineup/ensembles → list ensembles (for dropdown)
router.get('/lineup/ensembles', async (_req, res) => {
  try {
    const items = await listEnsembles();
    return res.json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// POST /api/lineup/ensembles/default → ensure Orchestra ICNT exists
router.post('/lineup/ensembles/default', async (_req, res) => {
  try {
    const ens = await ensureDefaultEnsemble();
    return res.json({ ok: true, ensemble: ens });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// GET /api/lineup/artists/search?q=...&limit=12
router.get('/lineup/artists/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').slice(0, 120);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 12));
    const items = await searchArtists(q, limit);
    return res.json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router;
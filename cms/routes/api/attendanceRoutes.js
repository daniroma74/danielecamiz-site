

// cms/routes/api/attendanceRoutes.js
import { Router } from 'express';
import { listByEvent as listAttendanceByEvent, bulkUpsert as bulkUpsertAttendance } from '../../models/attendanceRepo.js';

const router = Router();
const LOG_PREFIX = '[attendance]';

function toId(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

// GET /api/events/:eventId/attendance?include_inactive=1
router.get('/events/:eventId/attendance', async (req, res) => {
  try {
    const eventId = toId(req.params.eventId);
    if (!eventId) return res.status(400).json({ ok: false, error: 'Invalid eventId' });
    const include_inactive = toBool(req.query.include_inactive);
    const items = await listAttendanceByEvent(eventId, { include_inactive });
    return res.json({ ok: true, items });
  } catch (err) {
    console.error(LOG_PREFIX, 'GET attendance error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// POST /api/events/:eventId/attendance (bulk upsert)
// Body: Array<Entry> | { entries: Array<Entry> }
router.post('/events/:eventId/attendance', async (req, res) => {
  try {
    const eventId = toId(req.params.eventId);
    if (!eventId) return res.status(400).json({ ok: false, error: 'Invalid eventId' });

    const body = req.body;
    const entries = Array.isArray(body) ? body : (Array.isArray(body?.entries) ? body.entries : null);
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ ok: false, error: 'Body must be an array of entries' });
    }

    const items = await bulkUpsertAttendance(eventId, entries);
    return res.json({ ok: true, items });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error(LOG_PREFIX, 'POST bulk upsert error:', msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

export default router;
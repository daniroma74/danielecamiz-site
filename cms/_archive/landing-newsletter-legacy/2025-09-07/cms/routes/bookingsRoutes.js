// cms/routes/bookingsRoutes.js
import { Router } from 'express';
import crypto from 'crypto';
import { getDb as getMainDb } from '../utils/sqliteMain.js';
import { getEventById } from '../utils/events.js';
import { sendBookingEmail } from '../utils/mailer.js';

const router = Router();

function uid(n = 8) { return crypto.randomBytes(n).toString('hex'); }
function nowISO() { return new Date().toISOString(); }

// Small promise wrappers around sqlite3 callbacks
function run(db, sql, params = []) {
  return new Promise((res, rej) => db.run(sql, params, function (err) {
    if (err) rej(err); else res(this);
  }));
}
function get(db, sql, params = []) {
  return new Promise((res, rej) => db.get(sql, params, (err, row) => {
    if (err) rej(err); else res(row);
  }));
}
function all(db, sql, params = []) {
  return new Promise((res, rej) => db.all(sql, params, (err, rows) => {
    if (err) rej(err); else res(rows);
  }));
}

function capacityStatus(ev, qtyTotal) {
  const total = ev.capacity ?? null;
  const hold = ev.holdback ?? 0;
  const waitlist = ev.waitlist === true;
  if (total == null) return { status: 'confirmed' };
  const reserved = ev.stats?.reserved ?? 0;
  const publicCap = Math.max(0, total - hold);
  const free = Math.max(0, publicCap - reserved);
  if (qtyTotal <= free) return { status: 'confirmed' };
  if (waitlist) return { status: 'waitlisted' };
  return { status: 'soldout' };
}

router.post('/api/bookings', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b?.event_id || !Array.isArray(b?.tickets) || !b?.first_name || !b?.last_name || !b?.email) {
      return res.status(400).json({ error: 'Invalid body' });
    }
    const qtyTotal = b.tickets.reduce((s, t) => s + (parseInt(t.qty || 0, 10)), 0);
    if (qtyTotal <= 0) return res.status(400).json({ error: 'No tickets' });

    const ev = await getEventById(b.event_id);
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const cap = capacityStatus(ev, qtyTotal);
    if (cap.status === 'soldout') return res.status(409).json({ error: 'Sold out' });

    const id = uid(8);
    const code = id.slice(0, 8).toUpperCase();
    const status = cap.status;
    const createdAt = nowISO();

    const db = await getMainDb();

    await run(
      db,
      `INSERT INTO bookings (id, event_id, code, email, first_name, last_name, phone, language, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ev.id, code, b.email.trim(), b.first_name.trim(), b.last_name.trim(), (b.phone || '').trim(), (b.language || 'it'), status, createdAt]
    );

    for (const t of b.tickets) {
      const qty = parseInt(t.qty || 0, 10);
      if (qty > 0) {
        await run(db, `INSERT INTO booking_items (booking_id, ticket_type, qty) VALUES (?, ?, ?)`, [id, t.type, qty]);
      }
    }

    await sendBookingEmail({ event: ev, booking: { id, code, email: b.email, first_name: b.first_name, last_name: b.last_name, language: b.language || 'it', status } });

    res.json({ id, code, status });
  } catch (err) {
    console.error('bookings POST', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

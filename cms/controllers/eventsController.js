// cms/controllers/eventsController.js
// Controller LP eventi: pagina, ICS, prenotazione, contatore

import concertsRepo from '../models/concertsRepo.js';
import landingRepo from '../models/landingRepo.js';

// Helpers
const pad = (n) => String(n).padStart(2, '0');
function toIcsBasic(dateLike) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}${m}${dd}T${hh}${mm}${ss}`;
}

async function loadEvent(db, slug) {
  const event = await concertsRepo.getBySlug(db, slug);
  if (!event) return null;
  const [program, lineup] = await Promise.all([
    concertsRepo.getProgram(db, event.id),
    concertsRepo.getLineup(db, event.id)
  ]);
  return { ...event, program, lineup };
}

// GET /event/:slug
export async function getEventPage(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = String(req.params.slug || '').trim();
    const ev = await loadEvent(db, slug);

    if (!ev) {
      return res.status(404).renderPage('pages/frontend/index', {
        title: (res.locals.lang === 'en') ? 'Event not found' : 'Evento non trovato',
        homeData: { hero: {} },
        projects: [],
        newsTeaser: [],
        bandcampItems: []
      });
    }

    const title = ev.venue
      ? `${ev.venue} — ${ev.city || ''}`.trim()
      : (res.locals.lang === 'en' ? 'Event' : 'Evento');

    return res.renderPage('pages/frontend/event', {
      title,
      event: ev
    });
  } catch (err) {
    console.error('getEventPage', err);
    return res.status(500).renderPage('pages/frontend/index', {
      title: (res.locals.lang === 'en') ? 'Internal error' : 'Errore interno',
      homeData: { hero: {} },
      projects: [],
      newsTeaser: [],
      bandcampItems: []
    });
  }
}

// GET /event/:slug.ics
export async function getEventIcs(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = String(req.params.slug || '').trim();
    const ev = await concertsRepo.getBySlug(db, slug);
    if (!ev) return res.status(404).type('text/plain').send('Not found');

    const uid = `${slug}@danielecamiz.com`;
    const dtStart = toIcsBasic(ev.starts_at);
    const dtEnd = ev.ends_at ? toIcsBasic(ev.ends_at) : '';
    const where = [ev.venue, ev.city, ev.country].filter(Boolean).join(', ');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//danielecamiz.com//Events//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toIcsBasic(new Date())}`,
      'TZID:Europe/Rome',
      `DTSTART;TZID=Europe/Rome:${dtStart}`,
      ...(dtEnd ? [`DTEND;TZID=Europe/Rome:${dtEnd}`] : []),
      `SUMMARY:${slug.replace(/[-_]/g, ' ')}`,
      where ? `LOCATION:${where}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.ics"`);
    return res.status(200).send(ics);
  } catch (err) {
    console.error('getEventIcs', err);
    return res.status(500).type('text/plain').send('SERVER_ERROR');
  }
}

// POST /api/events/:slug/book
export async function postEventBooking(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = String(req.params.slug || '').trim();
    const ev = await concertsRepo.getBySlug(db, slug);
    if (!ev) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

    const { name = '', email = '', qty = 1 } = req.body || {};
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ ok: false, error: 'INVALID_EMAIL' });
    }
    const booking = await landingRepo.createBooking(db, {
      concertId: ev.id,
      name: String(name).trim() || null,
      email: String(email).trim(),
      qty
    });
    return res.json({ ok: true, booking });
  } catch (err) {
    console.error('postEventBooking', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}

// GET /api/events/:slug/bookings/count
export async function getEventBookingCount(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = String(req.params.slug || '').trim();
    const ev = await concertsRepo.getBySlug(db, slug);
    if (!ev) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

    const qty = await landingRepo.getBookingCount(db, ev.id);
    return res.json({ ok: true, qty });
  } catch (err) {
    console.error('getEventBookingCount', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}

export default {
  getEventPage,
  getEventIcs,
  postEventBooking,
  getEventBookingCount
};
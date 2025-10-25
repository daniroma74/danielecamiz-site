// cms/routes/eventsRoutes.js
import express, { Router } from 'express';
import {
  getEventIcs,
  getEventPage,
  postEventBooking,
  getEventBookingCount,
} from '../controllers/eventsController.js';

const router = Router();

// Body parsing for LP booking POSTs
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// ===== ICS (explicit paths; no arrays) =====
router.get('/api/events/:slug.ics', getEventIcs);
router.get('/eventi/:slug.ics', getEventIcs);
router.get('/events/:slug.ics', getEventIcs);
router.get('/event/:slug.ics', getEventIcs);
router.get('/en/eventi/:slug.ics', getEventIcs);
router.get('/en/events/:slug.ics', getEventIcs);
router.get('/en/event/:slug.ics', getEventIcs);

// ===== API: only booking count (no public JSON event) =====
router.get('/api/events/:slug/bookings/count', getEventBookingCount);

// ===== SSR page (IT/EN) — explicit aliases =====
router.get('/eventi/:slug', getEventPage);
router.get('/events/:slug', getEventPage);
router.get('/event/:slug', getEventPage);
router.get('/en/eventi/:slug', getEventPage);
router.get('/en/events/:slug', getEventPage);
router.get('/en/event/:slug', getEventPage);

// ===== Bookings (mirror SSR paths) =====
router.post('/eventi/:slug/book', postEventBooking);
router.post('/events/:slug/book', postEventBooking);
router.post('/event/:slug/book', postEventBooking);
router.post('/en/eventi/:slug/book', postEventBooking);
router.post('/en/events/:slug/book', postEventBooking);
router.post('/en/event/:slug/book', postEventBooking);

router.get('/eventi/:slug/bookings/count', getEventBookingCount);
router.get('/events/:slug/bookings/count', getEventBookingCount);
router.get('/event/:slug/bookings/count', getEventBookingCount);
router.get('/en/eventi/:slug/bookings/count', getEventBookingCount);
router.get('/en/events/:slug/bookings/count', getEventBookingCount);
router.get('/en/event/:slug/bookings/count', getEventBookingCount);

export default router;
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Concert } from '../models/Concert.js';

const router = express.Router();

// ============================================
// ADMIN LANDING EDITOR
// ============================================

// GET /admin/landing - Lista concerti con possibilità di creare LP
router.get('/admin/landing', requireAuth, (req, res) => {
  const db = req.app.locals.db;

  const concerts = Concert.findAllPublished(db);

  res.render('pages/admin/landing-list', {
    title: 'Gestione Landing Page Concerti',
    concerts
  });
});

// GET /admin/landing/:id/editor - Editor landing page
router.get('/admin/landing/:id/editor', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  const concert = Concert.findById(db, id);

  if (!concert) {
    return res.status(404).send('Concerto non trovato');
  }

  // Parse gallery images if exists
  if (concert.gallery_images) {
    try {
      concert.gallery_images = JSON.parse(concert.gallery_images);
    } catch (e) {
      concert.gallery_images = [];
    }
  } else {
    concert.gallery_images = [];
  }

  // Set defaults if landing page doesn't exist
  if (!concert.landing_id) {
    concert.hero_title = concert.title;
    concert.hero_subtitle = concert.program || '';
    concert.description_html = concert.description || '';
    concert.show_program = 1;
    concert.show_location = 1;
    concert.show_booking_form = 1;
    concert.show_gallery = 0;
    concert.booking_enabled = 1;
    concert.max_seats_per_booking = 4;
    concert.newsletter_enabled = 1;
    concert.newsletter_text = 'Vuoi ricevere aggiornamenti sui prossimi concerti?';
    concert.primary_color = '#8B4513';
    concert.secondary_color = '#4a7c59';
  }

  res.render('pages/admin/landing-editor', {
    title: `Landing Page: ${concert.title}`,
    concert
  });
});

// POST /admin/landing/:id/save - Salva landing page
router.post('/admin/landing/:id/save', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  const data = {
    hero_title: req.body.hero_title,
    hero_subtitle: req.body.hero_subtitle,
    hero_image_url: req.body.hero_image_url || null,
    description_html: req.body.description_html,
    show_program: req.body.show_program ? 1 : 0,
    show_location: req.body.show_location ? 1 : 0,
    show_booking_form: req.body.show_booking_form ? 1 : 0,
    show_gallery: req.body.show_gallery ? 1 : 0,
    gallery_images: req.body.gallery_images || '[]',
    booking_enabled: req.body.booking_enabled ? 1 : 0,
    max_seats_per_booking: parseInt(req.body.max_seats_per_booking) || 4,
    booking_deadline: req.body.booking_deadline || null,
    newsletter_enabled: req.body.newsletter_enabled ? 1 : 0,
    newsletter_text: req.body.newsletter_text,
    primary_color: req.body.primary_color || '#8B4513',
    secondary_color: req.body.secondary_color || '#4a7c59'
  };

  try {
    Concert.createOrUpdateLanding(db, id, data);

    res.json({
      success: true,
      message: 'Landing page salvata con successo!'
    });
  } catch (error) {
    console.error('Error saving landing:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio'
    });
  }
});

// GET /admin/landing/:id/preview - Preview landing page
router.get('/admin/landing/:id/preview', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  const concert = Concert.findById(db, id);

  if (!concert) {
    return res.status(404).send('Concerto non trovato');
  }

  // Parse gallery
  if (concert.gallery_images) {
    try {
      concert.gallery_images = JSON.parse(concert.gallery_images);
    } catch (e) {
      concert.gallery_images = [];
    }
  } else {
    concert.gallery_images = [];
  }

  res.render('pages/landing', {
    title: concert.hero_title || concert.title,
    concert,
    preview: true
  });
});

export default router;

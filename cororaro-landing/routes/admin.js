import express from 'express';
import { Concert } from '../models/Concert.js';
import { createRecordBestEffort } from '../../shared/services/cloudflare-dns.js';

const router = express.Router();

// ============================================
// ADMIN LANDING EDITOR
// ============================================

// GET / - Root redirect
router.get('/', (req, res) => {
  res.redirect('/admin/landing');
});

// GET /admin - Redirect to landing list
router.get('/admin', (req, res) => {
  res.redirect('/admin/landing');
});

// GET /admin/landing - Lista concerti con possibilità di creare LP
router.get('/admin/landing', (req, res) => {
  const db = req.app.locals.db;

  const concerts = Concert.findAllPublished(db);

  res.render('pages/admin/landing-list', {
    title: 'Gestione Landing Page Concerti',
    concerts
  });
});

// GET /admin/landing/:id/editor - Editor landing page
router.get('/admin/landing/:id/editor', (req, res) => {
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
router.post('/admin/landing/:id/save', async (req, res) => {
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

    // ============================================
    // CLOUDFLARE DNS AUTO-CREATE (best-effort)
    // ============================================
    // Se configurato, crea record DNS su Cloudflare
    // Se fallisce, wildcard DNS funziona comunque
    const concert = Concert.findById(db, id);

    if (concert && concert.slug && process.env.CLOUDFLARE_API_TOKEN) {
      const cfConfig = {
        slug: concert.slug,
        domain: process.env.BASE_DOMAIN || 'cororaro.it',
        serverIp: process.env.SERVER_IP || '127.0.0.1',
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        proxied: process.env.CLOUDFLARE_PROXY === 'true'
      };

      // Non-blocking: se fallisce, wildcard funziona
      createRecordBestEffort(
        cfConfig.slug,
        cfConfig.domain,
        cfConfig.serverIp,
        cfConfig.apiToken,
        cfConfig.zoneId,
        cfConfig.proxied
      ).catch(err => {
        console.log(`⚠️  Cloudflare DNS creation skipped: ${err.message}`);
      });
    }

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
router.get('/admin/landing/:id/preview', (req, res) => {
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

// ============================================
// NEWSLETTER
// ============================================

// GET /admin/newsletter - Lista iscritti newsletter
router.get('/admin/newsletter', (req, res) => {
  const db = req.app.locals.db;

  // Get all newsletter subscribers
  const subscribers = db.prepare(`
    SELECT
      cn.id,
      cn.email,
      cn.name,
      cn.subscribed_at,
      c.title as concert_title,
      c.slug as concert_slug
    FROM concert_newsletter cn
    LEFT JOIN concerts c ON c.id = cn.concert_id
    WHERE cn.is_active = 1
    ORDER BY cn.subscribed_at DESC
  `).all();

  // Stats
  const stats = {
    total: subscribers.length,
    today: subscribers.filter(s => {
      const today = new Date().toISOString().split('T')[0];
      const subDate = s.subscribed_at.split(' ')[0];
      return subDate === today;
    }).length,
    thisWeek: subscribers.filter(s => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(s.subscribed_at) > weekAgo;
    }).length
  };

  res.render('pages/admin/newsletter', {
    title: 'Gestione Newsletter',
    subscribers,
    stats
  });
});

// GET /admin/newsletter/export - Esporta CSV
router.get('/admin/newsletter/export', (req, res) => {
  const db = req.app.locals.db;

  const subscribers = db.prepare(`
    SELECT
      cn.email,
      cn.name,
      cn.subscribed_at,
      c.title as concert_title
    FROM concert_newsletter cn
    LEFT JOIN concerts c ON c.id = cn.concert_id
    WHERE cn.is_active = 1
    ORDER BY cn.subscribed_at DESC
  `).all();

  // Create CSV
  let csv = 'Email,Nome,Data Iscrizione,Concerto\n';
  subscribers.forEach(sub => {
    csv += `"${sub.email}","${sub.name || ''}","${sub.subscribed_at}","${sub.concert_title || ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="newsletter-cororaro-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

// POST /admin/newsletter/send - Invia newsletter
router.post('/admin/newsletter/send', async (req, res) => {
  const db = req.app.locals.db;
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Oggetto e messaggio sono obbligatori'
    });
  }

  try {
    // Get all active subscribers
    const subscribers = db.prepare(`
      SELECT email, name
      FROM concert_newsletter
      WHERE is_active = 1
    `).all();

    if (subscribers.length === 0) {
      return res.json({
        success: false,
        message: 'Nessun iscritto alla newsletter'
      });
    }

    // Import email service
    const { sendNewsletter } = await import('../services/email.js');

    // Send newsletter to all subscribers
    let sent = 0;
    let errors = 0;

    for (const subscriber of subscribers) {
      try {
        await sendNewsletter(subscriber.email, subscriber.name, subject, message);
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error.message);
        errors++;
      }
    }

    res.json({
      success: true,
      message: `Newsletter inviata! ✅ ${sent} inviate, ❌ ${errors} errori`,
      sent,
      errors,
      total: subscribers.length
    });

  } catch (error) {
    console.error('Newsletter send error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'invio: ' + error.message
    });
  }
});

// POST /admin/newsletter/:id/unsubscribe - Cancella iscritto
router.post('/admin/newsletter/:id/unsubscribe', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  db.prepare('UPDATE concert_newsletter SET is_active = 0 WHERE id = ?').run(id);

  res.json({
    success: true,
    message: 'Iscritto rimosso dalla newsletter'
  });
});

export default router;

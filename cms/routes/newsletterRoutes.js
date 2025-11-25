// cms/routes/newsletterRoutes.js
// Newsletter unsubscribe page routes

import express from 'express';
import { getDb } from '../utils/sqliteMain.js';
import { verifyUnsubscribeToken } from '../utils/emailService.js';

const router = express.Router();

/**
 * GET /newsletter/unsubscribe
 * Display unsubscribe confirmation page
 */
router.get('/unsubscribe', async (req, res) => {
  const { email, token, lang = 'it' } = req.query;
  const normalizedLang = ['it', 'en'].includes(lang) ? lang : 'it';

  // If no params, show form
  if (!email || !token) {
    return res.renderPage('pages/frontend/newsletter-unsubscribe', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Unsubscribe from Newsletter' : 'Cancellazione Newsletter',
      description: '',
      step: 'form',
      email: '',
      error: null
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Verify token
  if (!verifyUnsubscribeToken(normalizedEmail, token)) {
    return res.renderPage('pages/frontend/newsletter-unsubscribe', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Invalid Link' : 'Link non valido',
      description: '',
      step: 'error',
      email: normalizedEmail,
      error: 'invalid_token'
    });
  }

  // Show confirmation page
  return res.renderPage('pages/frontend/newsletter-unsubscribe', {
    layout: 'layouts/base-frontend',
    lang: normalizedLang,
    title: normalizedLang === 'en' ? 'Confirm Unsubscribe' : 'Conferma Cancellazione',
    description: '',
    step: 'confirm',
    email: normalizedEmail,
    token,
    error: null
  });
});

/**
 * POST /newsletter/unsubscribe
 * Process unsubscribe
 */
router.post('/unsubscribe', async (req, res) => {
  const { email, token, lang = 'it' } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  const normalizedLang = ['it', 'en'].includes(lang) ? lang : 'it';

  // Verify token
  if (!normalizedEmail || !token || !verifyUnsubscribeToken(normalizedEmail, token)) {
    return res.renderPage('pages/frontend/newsletter-unsubscribe', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Error' : 'Errore',
      description: '',
      step: 'error',
      email: normalizedEmail || '',
      error: 'invalid_request'
    });
  }

  try {
    const db = await getDb();

    const result = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE newsletter_subscribers
         SET status = 'unsubscribed',
             unsubscribed_at = datetime('now'),
             updated_at = datetime('now')
         WHERE email = ? AND status = 'active'`,
        [normalizedEmail],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    console.log(`[newsletter] Unsubscribed via web: ${normalizedEmail}`);

    return res.renderPage('pages/frontend/newsletter-unsubscribe', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Unsubscribed' : 'Cancellazione completata',
      description: '',
      step: 'success',
      email: normalizedEmail,
      error: null
    });

  } catch (err) {
    console.error('[newsletter] Unsubscribe error:', err);
    return res.renderPage('pages/frontend/newsletter-unsubscribe', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Error' : 'Errore',
      description: '',
      step: 'error',
      email: normalizedEmail,
      error: 'server_error'
    });
  }
});

/**
 * GET /newsletter/manage
 * Manage subscription preferences
 */
router.get('/manage', async (req, res) => {
  const { email, token, lang = 'it' } = req.query;
  const normalizedLang = ['it', 'en'].includes(lang) ? lang : 'it';

  // If no email/token, show form to enter email
  if (!email || !token) {
    return res.renderPage('pages/frontend/newsletter-manage', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Manage Newsletter Preferences' : 'Gestisci Preferenze Newsletter',
      description: '',
      email: '',
      token: '',
      wants_site_news: true,
      wants_concerts: true,
      message: null
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Verify token
  if (!verifyUnsubscribeToken(normalizedEmail, token)) {
    return res.renderPage('pages/frontend/newsletter-manage', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Invalid Link' : 'Link non valido',
      description: '',
      email: normalizedEmail,
      token: '',
      wants_site_news: true,
      wants_concerts: true,
      message: {
        type: 'error',
        text: normalizedLang === 'en' ? 'Invalid or expired link.' : 'Link non valido o scaduto.'
      }
    });
  }

  // Load current preferences from database
  try {
    const db = await getDb();

    const subscriber = await new Promise((resolve, reject) => {
      db.get(
        'SELECT wants_site_news, wants_concerts, status FROM newsletter_subscribers WHERE email = ?',
        [normalizedEmail],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!subscriber || subscriber.status !== 'active') {
      return res.renderPage('pages/frontend/newsletter-manage', {
        layout: 'layouts/base-frontend',
        lang: normalizedLang,
        title: normalizedLang === 'en' ? 'Not Found' : 'Non trovato',
        description: '',
        email: normalizedEmail,
        token: '',
        wants_site_news: true,
        wants_concerts: true,
        message: {
          type: 'error',
          text: normalizedLang === 'en'
            ? 'Email address not found in our mailing list.'
            : 'Indirizzo email non trovato nella nostra lista.'
        }
      });
    }

    return res.renderPage('pages/frontend/newsletter-manage', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Manage Preferences' : 'Gestisci Preferenze',
      description: '',
      email: normalizedEmail,
      token,
      wants_site_news: subscriber.wants_site_news === 1,
      wants_concerts: subscriber.wants_concerts === 1,
      message: null
    });

  } catch (err) {
    console.error('[newsletter] Manage GET error:', err);
    return res.status(500).send('Server error');
  }
});

/**
 * POST /newsletter/manage
 * Update subscription preferences
 */
router.post('/manage', async (req, res) => {
  const { email, token, lang = 'it', wants_site_news, wants_concerts } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  const normalizedLang = ['it', 'en'].includes(lang) ? lang : 'it';

  const wantsSiteNews = wants_site_news === '1' || wants_site_news === 'on';
  const wantsConcerts = wants_concerts === '1' || wants_concerts === 'on';

  // Validate at least one preference
  if (!wantsSiteNews && !wantsConcerts) {
    return res.renderPage('pages/frontend/newsletter-manage', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Manage Preferences' : 'Gestisci Preferenze',
      description: '',
      email: normalizedEmail,
      token,
      wants_site_news: false,
      wants_concerts: false,
      message: {
        type: 'error',
        text: normalizedLang === 'en'
          ? 'Please select at least one option.'
          : 'Seleziona almeno un\'opzione.'
      }
    });
  }

  // Verify token
  if (!normalizedEmail || !token || !verifyUnsubscribeToken(normalizedEmail, token)) {
    return res.renderPage('pages/frontend/newsletter-manage', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Error' : 'Errore',
      description: '',
      email: normalizedEmail || '',
      token: '',
      wants_site_news: wantsSiteNews,
      wants_concerts: wantsConcerts,
      message: {
        type: 'error',
        text: normalizedLang === 'en' ? 'Invalid request.' : 'Richiesta non valida.'
      }
    });
  }

  try {
    const db = await getDb();

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE newsletter_subscribers
         SET wants_site_news = ?, wants_concerts = ?, updated_at = datetime('now')
         WHERE email = ? AND status = 'active'`,
        [wantsSiteNews ? 1 : 0, wantsConcerts ? 1 : 0, normalizedEmail],
        (err) => err ? reject(err) : resolve()
      );
    });

    console.log(`[newsletter] Preferences updated: ${normalizedEmail} (site:${wantsSiteNews}, concerts:${wantsConcerts})`);

    return res.renderPage('pages/frontend/newsletter-manage', {
      layout: 'layouts/base-frontend',
      lang: normalizedLang,
      title: normalizedLang === 'en' ? 'Preferences Updated' : 'Preferenze Aggiornate',
      description: '',
      email: normalizedEmail,
      token,
      wants_site_news: wantsSiteNews,
      wants_concerts: wantsConcerts,
      message: {
        type: 'success',
        text: normalizedLang === 'en'
          ? '✅ Your preferences have been updated successfully!'
          : '✅ Le tue preferenze sono state aggiornate con successo!'
      }
    });

  } catch (err) {
    console.error('[newsletter] Manage POST error:', err);
    return res.status(500).send('Server error');
  }
});

export default router;

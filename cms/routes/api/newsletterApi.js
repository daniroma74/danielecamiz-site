// cms/routes/api/newsletterApi.js
// Newsletter subscription API endpoint

import express from 'express';
import { getDb } from '../../utils/sqliteMain.js';
import { sendSubscriptionConfirmation } from '../../utils/emailService.js';

const router = express.Router();

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter with preferences
 *
 * Body:
 *   - email: string (required)
 *   - lang: string (it|en, default: 'it')
 *   - wants_site_news: boolean (default: true)
 *   - wants_concerts: boolean (default: true)
 *   - source: string (website|landing, default: 'website')
 *   - consent: boolean (required: true)
 */
router.post('/subscribe', async (req, res) => {
  const {
    email,
    lang = 'it',
    wants_site_news = true,
    wants_concerts = true,
    source = 'website',
    consent
  } = req.body;

  // Validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  if (!consent) {
    return res.status(400).json({ ok: false, error: 'consent_required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedLang = ['it', 'en'].includes(lang) ? lang : 'it';
  const wantsSiteNews = wants_site_news ? 1 : 0;
  const wantsConcerts = wants_concerts ? 1 : 0;

  // At least one preference must be selected
  if (!wantsSiteNews && !wantsConcerts) {
    return res.status(400).json({ ok: false, error: 'no_preferences_selected' });
  }

  try {
    const db = await getDb();

    // Check if email already exists
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, status, wants_site_news, wants_concerts FROM newsletter_subscribers WHERE email = ?',
        [normalizedEmail],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (existing) {
      // Already subscribed and active
      if (existing.status === 'active') {
        // Check if preferences changed
        if (existing.wants_site_news !== wantsSiteNews || existing.wants_concerts !== wantsConcerts) {
          // Update preferences
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE newsletter_subscribers
               SET wants_site_news = ?, wants_concerts = ?, updated_at = datetime('now')
               WHERE email = ?`,
              [wantsSiteNews, wantsConcerts, normalizedEmail],
              (err) => err ? reject(err) : resolve()
            );
          });
          return res.json({ ok: true, message: 'preferences_updated' });
        }
        return res.json({ ok: true, message: 'already_subscribed' });
      }

      // Re-subscribe (was unsubscribed)
      if (existing.status === 'unsubscribed') {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE newsletter_subscribers
             SET status = 'active',
                 wants_site_news = ?,
                 wants_concerts = ?,
                 lang = ?,
                 updated_at = datetime('now'),
                 unsubscribed_at = NULL
             WHERE email = ?`,
            [wantsSiteNews, wantsConcerts, normalizedLang, normalizedEmail],
            (err) => err ? reject(err) : resolve()
          );
        });

        // Send confirmation email for re-subscription
        sendSubscriptionConfirmation(normalizedEmail, {
          wants_site_news: wantsSiteNews === 1,
          wants_concerts: wantsConcerts === 1
        }, normalizedLang).catch(err => {
          console.error('[newsletter] Failed to send re-subscription confirmation:', err);
        });

        return res.json({ ok: true, message: 'resubscribed' });
      }
    }

    // New subscriber
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO newsletter_subscribers
         (email, lang, wants_site_news, wants_concerts, source, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
        [normalizedEmail, normalizedLang, wantsSiteNews, wantsConcerts, source],
        (err) => err ? reject(err) : resolve()
      );
    });

    console.log(`[newsletter] New subscription: ${normalizedEmail} (site:${wantsSiteNews}, concerts:${wantsConcerts}, source:${source})`);

    // Send confirmation email (async, don't block response)
    sendSubscriptionConfirmation(normalizedEmail, {
      wants_site_news: wantsSiteNews === 1,
      wants_concerts: wantsConcerts === 1
    }, normalizedLang).catch(err => {
      console.error('[newsletter] Failed to send confirmation email:', err);
    });

    return res.json({ ok: true, message: 'subscribed' });

  } catch (err) {
    console.error('[newsletter] Subscribe error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe from newsletter
 *
 * Body:
 *   - email: string (required)
 */
router.post('/unsubscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  const normalizedEmail = email.toLowerCase().trim();

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

    if (result.changes === 0) {
      return res.json({ ok: true, message: 'not_found' });
    }

    console.log(`[newsletter] Unsubscribed: ${normalizedEmail}`);
    return res.json({ ok: true, message: 'unsubscribed' });

  } catch (err) {
    console.error('[newsletter] Unsubscribe error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/**
 * GET /api/newsletter/status/:email
 * Check subscription status
 */
router.get('/status/:email', async (req, res) => {
  const { email } = req.params;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = await getDb();

    const subscriber = await new Promise((resolve, reject) => {
      db.get(
        'SELECT status, wants_site_news, wants_concerts, lang, source FROM newsletter_subscribers WHERE email = ?',
        [normalizedEmail],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!subscriber) {
      return res.json({ ok: true, subscribed: false });
    }

    return res.json({
      ok: true,
      subscribed: subscriber.status === 'active',
      status: subscriber.status,
      preferences: {
        wants_site_news: subscriber.wants_site_news === 1,
        wants_concerts: subscriber.wants_concerts === 1
      },
      lang: subscriber.lang,
      source: subscriber.source
    });

  } catch (err) {
    console.error('[newsletter] Status check error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

export default router;

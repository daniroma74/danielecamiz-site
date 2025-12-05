/**
 * Admin Site Settings Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/settings - Show settings form organized by sections
  router.get('/settings', requireAuth, (req, res) => {
    try {
      const settings = db.prepare('SELECT * FROM site_settings ORDER BY setting_key').all();

      // Organize settings by section
      const organized = {
        hero: [],
        about: [],
        projects: [],
        footer: [],
        contact: [],
        social: []
      };

      settings.forEach(setting => {
        const key = setting.setting_key;
        if (key.startsWith('hero_')) {
          organized.hero.push(setting);
        } else if (key.startsWith('about_')) {
          organized.about.push(setting);
        } else if (key.startsWith('projects_')) {
          organized.projects.push(setting);
        } else if (key.startsWith('footer_')) {
          organized.footer.push(setting);
        } else if (key.startsWith('contact_')) {
          organized.contact.push(setting);
        } else if (key.startsWith('social_')) {
          organized.social.push(setting);
        }
      });

      res.render('settings/form', {
        title: 'Impostazioni Sito',
        user: req.session,
        settings: organized
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // POST /admin/settings - Update settings
  router.post('/settings', requireAuth, (req, res) => {
    const updates = req.body; // Object with setting_key => setting_value
    const keys = Object.keys(updates);

    // If no updates, just redirect
    if (keys.length === 0) {
      return res.redirect('/admin/settings');
    }

    try {
      const stmt = db.prepare('UPDATE site_settings SET setting_value = ? WHERE setting_key = ?');

      keys.forEach((key) => {
        stmt.run(updates[key], key);
      });

      res.redirect('/admin/settings?success=1');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // GET /admin/settings/values - Get values section
  router.get('/settings/values', requireAuth, (req, res) => {
    try {
      const values = db.prepare('SELECT * FROM core_values ORDER BY sort_order').all();

      res.render('settings/values', {
        title: 'Valori del Coro',
        user: req.session,
        values: values || []
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // POST /admin/settings/values/:id - Update value
  router.post('/settings/values/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { icon, title, description, sort_order, is_active } = req.body;

    const query = `
      UPDATE core_values SET
        icon = ?,
        title = ?,
        description = ?,
        sort_order = ?,
        is_active = ?
      WHERE id = ?
    `;

    try {
      db.prepare(query).run(icon, title, description, sort_order || 0, is_active ? 1 : 0, id);

      res.redirect('/admin/settings/values');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // POST /admin/settings/values - Create new value
  router.post('/settings/values', requireAuth, (req, res) => {
    const { icon, title, description, sort_order } = req.body;

    const query = `
      INSERT INTO core_values (icon, title, description, sort_order, is_active)
      VALUES (?, ?, ?, ?, 1)
    `;

    try {
      db.prepare(query).run(icon, title, description, sort_order || 0);

      res.redirect('/admin/settings/values');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante la creazione');
    }
  });

  // POST /admin/settings/values/:id/delete - Delete value
  router.post('/settings/values/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('DELETE FROM core_values WHERE id = ?').run(id);

      res.redirect('/admin/settings/values');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'eliminazione');
    }
  });

  // GET /admin/settings/join - Get "Unisciti a Noi" section
  router.get('/settings/join', requireAuth, (req, res) => {
    try {
      const joinInfo = db.prepare('SELECT * FROM join_info WHERE id = 1').get();

      res.render('settings/join', {
        title: 'Unisciti a Noi',
        user: req.session,
        joinInfo: joinInfo || {}
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // POST /admin/settings/join - Update "Unisciti a Noi" section
  router.post('/settings/join', requireAuth, (req, res) => {
    const {
      title,
      subtitle,
      intro_text,
      benefits_html,
      rehearsal_day,
      rehearsal_time,
      rehearsal_location,
      contact_email,
      contact_phone,
      cta_text
    } = req.body;

    const query = `
      INSERT OR REPLACE INTO join_info (
        id, title, subtitle, intro_text, benefits_html,
        rehearsal_day, rehearsal_time, rehearsal_location,
        contact_email, contact_phone, cta_text
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      db.prepare(query).run(
        title,
        subtitle || null,
        intro_text || null,
        benefits_html || null,
        rehearsal_day || null,
        rehearsal_time || null,
        rehearsal_location || null,
        contact_email || null,
        contact_phone || null,
        cta_text || null
      );

      res.redirect('/admin/settings/join?success=1');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  return router;
};

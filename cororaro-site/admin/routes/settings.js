/**
 * Admin Site Settings Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/settings - Show settings form organized by sections
  router.get('/settings', requireAuth, (req, res) => {
    db.all('SELECT * FROM site_settings ORDER BY setting_key', (err, settings) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

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
    });
  });

  // POST /admin/settings - Update settings
  router.post('/settings', requireAuth, (req, res) => {
    const updates = req.body; // Object with setting_key => setting_value

    const stmt = db.prepare('UPDATE site_settings SET setting_value = ? WHERE setting_key = ?');

    let updateCount = 0;
    const keys = Object.keys(updates);

    keys.forEach((key, index) => {
      stmt.run([updates[key], key], (err) => {
        if (err) {
          console.error('Error updating setting:', key, err);
        }
        updateCount++;

        // When all updates are done, redirect
        if (updateCount === keys.length) {
          stmt.finalize(() => {
            res.redirect('/admin/settings?success=1');
          });
        }
      });
    });

    // If no updates, just redirect
    if (keys.length === 0) {
      res.redirect('/admin/settings');
    }
  });

  // GET /admin/settings/values - Get values section
  router.get('/settings/values', requireAuth, (req, res) => {
    db.all('SELECT * FROM core_values ORDER BY sort_order', (err, values) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      res.render('settings/values', {
        title: 'Valori del Coro',
        user: req.session,
        values: values || []
      });
    });
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

    db.run(
      query,
      [icon, title, description, sort_order || 0, is_active ? 1 : 0, id],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante l\'aggiornamento');
        }

        res.redirect('/admin/settings/values');
      }
    );
  });

  // POST /admin/settings/values - Create new value
  router.post('/settings/values', requireAuth, (req, res) => {
    const { icon, title, description, sort_order } = req.body;

    const query = `
      INSERT INTO core_values (icon, title, description, sort_order, is_active)
      VALUES (?, ?, ?, ?, 1)
    `;

    db.run(query, [icon, title, description, sort_order || 0], function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore durante la creazione');
      }

      res.redirect('/admin/settings/values');
    });
  });

  // POST /admin/settings/values/:id/delete - Delete value
  router.post('/settings/values/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM core_values WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore durante l\'eliminazione');
      }

      res.redirect('/admin/settings/values');
    });
  });

  // GET /admin/settings/join - Get "Unisciti a Noi" section
  router.get('/settings/join', requireAuth, (req, res) => {
    db.get('SELECT * FROM join_info WHERE id = 1', (err, joinInfo) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      res.render('settings/join', {
        title: 'Unisciti a Noi',
        user: req.session,
        joinInfo: joinInfo || {}
      });
    });
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

    db.run(
      query,
      [
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
      ],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante l\'aggiornamento');
        }

        res.redirect('/admin/settings/join?success=1');
      }
    );
  });

  return router;
};

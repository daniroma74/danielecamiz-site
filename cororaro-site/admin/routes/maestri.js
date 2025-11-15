/**
 * Admin Maestri (Directors) CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/maestri - List all maestri
  router.get('/maestri', requireAuth, (req, res) => {
    const search = req.query.search || '';

    let query = 'SELECT * FROM team_members WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR bio LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    query += ' ORDER BY sort_order ASC, full_name ASC';

    db.all(query, params, (err, maestri) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      res.render('maestri/list', {
        title: 'Gestione Maestri',
        user: req.session,
        maestri: maestri || [],
        filters: {
          search
        }
      });
    });
  });

  // GET /admin/maestri/new - Show create form
  router.get('/maestri/new', requireAuth, (req, res) => {
    res.render('maestri/form', {
      title: 'Nuovo Maestro',
      user: req.session,
      maestro: {
        is_active: 1,
        sort_order: 0
      },
      action: 'create'
    });
  });

  // POST /admin/maestri - Create new maestro
  router.post('/maestri', requireAuth, (req, res) => {
    const {
      full_name,
      bio,
      photo_url,
      email,
      phone,
      sort_order,
      is_active
    } = req.body;

    const query = `
      INSERT INTO team_members (
        full_name, bio, photo_url, email, phone, sort_order, is_active, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'maestro')
    `;

    db.run(
      query,
      [
        full_name,
        bio || null,
        photo_url || null,
        email || null,
        phone || null,
        sort_order || 0,
        is_active ? 1 : 0
      ],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante la creazione');
        }

        res.redirect('/admin/maestri');
      }
    );
  });

  // GET /admin/maestri/:id/edit - Show edit form
  router.get('/maestri/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM team_members WHERE id = ?', [id], (err, maestro) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      if (!maestro) {
        return res.status(404).send('Maestro non trovato');
      }

      res.render('maestri/form', {
        title: 'Modifica Maestro',
        user: req.session,
        maestro,
        action: 'edit'
      });
    });
  });

  // POST /admin/maestri/:id - Update maestro
  router.post('/maestri/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
      full_name,
      bio,
      photo_url,
      email,
      phone,
      sort_order,
      is_active
    } = req.body;

    const query = `
      UPDATE team_members SET
        full_name = ?,
        bio = ?,
        photo_url = ?,
        email = ?,
        phone = ?,
        sort_order = ?,
        is_active = ?
      WHERE id = ?
    `;

    db.run(
      query,
      [
        full_name,
        bio || null,
        photo_url || null,
        email || null,
        phone || null,
        sort_order || 0,
        is_active ? 1 : 0,
        id
      ],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante l\'aggiornamento');
        }

        res.redirect('/admin/maestri');
      }
    );
  });

  // POST /admin/maestri/:id/delete - Delete maestro
  router.post('/maestri/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM team_members WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore durante l\'eliminazione');
      }

      res.redirect('/admin/maestri');
    });
  });

  return router;
};

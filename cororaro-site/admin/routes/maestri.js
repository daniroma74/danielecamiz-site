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

    try {
      const maestri = db.prepare(query).all(...params);

      res.render('maestri/list', {
        title: 'Gestione Maestri',
        user: req.session,
        maestri: maestri || [],
        filters: {
          search
        }
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
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

    try {
      db.prepare(query).run(
        full_name,
        bio || null,
        photo_url || null,
        email || null,
        phone || null,
        sort_order || 0,
        is_active ? 1 : 0
      );

      res.redirect('/admin/maestri');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante la creazione');
    }
  });

  // GET /admin/maestri/:id/edit - Show edit form
  router.get('/maestri/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      const maestro = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);

      if (!maestro) {
        return res.status(404).send('Maestro non trovato');
      }

      res.render('maestri/form', {
        title: 'Modifica Maestro',
        user: req.session,
        maestro,
        action: 'edit'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
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

    try {
      db.prepare(query).run(
        full_name,
        bio || null,
        photo_url || null,
        email || null,
        phone || null,
        sort_order || 0,
        is_active ? 1 : 0,
        id
      );

      res.redirect('/admin/maestri');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // POST /admin/maestri/:id/delete - Delete maestro
  router.post('/maestri/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('DELETE FROM team_members WHERE id = ?').run(id);

      res.redirect('/admin/maestri');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'eliminazione');
    }
  });

  return router;
};

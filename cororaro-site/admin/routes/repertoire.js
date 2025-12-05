/**
 * Admin Repertoire CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/repertoire - List all songs
  router.get('/repertoire', requireAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const countryFilter = req.query.country || '';

    let query = `
      SELECT r.*, c.name as country_name, c.flag, c.code
      FROM repertoire r
      JOIN countries c ON r.country_id = c.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM repertoire r JOIN countries c ON r.country_id = c.id WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.language LIKE ?)';
      countQuery += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.language LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    if (countryFilter) {
      query += ' AND c.code = ?';
      countQuery += ' AND c.code = ?';
      params.push(countryFilter);
      countParams.push(countryFilter);
    }

    query += ' ORDER BY c.name, r.title LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      // Get total count
      const countRow = db.prepare(countQuery).get(...countParams);
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / limit);

      // Get songs
      const songs = db.prepare(query).all(...params);

      // Get all countries for filter
      const countries = db.prepare('SELECT * FROM countries ORDER BY name').all();

      res.render('repertoire/list', {
        title: 'Gestione Repertorio',
        user: req.session,
        songs: songs || [],
        countries: countries || [],
        pagination: {
          page,
          totalPages,
          total
        },
        filters: {
          search,
          country: countryFilter
        }
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // GET /admin/repertoire/new - Show create form
  router.get('/repertoire/new', requireAuth, (req, res) => {
    try {
      const countries = db.prepare('SELECT * FROM countries ORDER BY name').all();

      res.render('repertoire/form', {
        title: 'Nuovo Brano',
        user: req.session,
        song: {},
        countries: countries || [],
        action: 'create'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // POST /admin/repertoire - Create new song
  router.post('/repertoire', requireAuth, (req, res) => {
    const {
      country_id,
      title,
      description,
      audio_url,
      lyrics_original,
      lyrics_italian,
      language
    } = req.body;

    const query = `
      INSERT INTO repertoire (
        country_id, title, description, audio_url,
        lyrics_original, lyrics_italian, language, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    try {
      db.prepare(query).run(
        country_id,
        title,
        description || null,
        audio_url || null,
        lyrics_original || null,
        lyrics_italian || null,
        language || null
      );

      res.redirect('/admin/repertoire?success=created');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante la creazione');
    }
  });

  // GET /admin/repertoire/:id/edit - Show edit form
  router.get('/repertoire/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      const song = db.prepare('SELECT * FROM repertoire WHERE id = ?').get(id);

      if (!song) {
        return res.status(404).send('Brano non trovato');
      }

      const countries = db.prepare('SELECT * FROM countries ORDER BY name').all();

      res.render('repertoire/form', {
        title: 'Modifica Brano',
        user: req.session,
        song,
        countries: countries || [],
        action: 'edit'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(404).send('Brano non trovato');
    }
  });

  // POST /admin/repertoire/:id - Update song
  router.post('/repertoire/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
      country_id,
      title,
      description,
      audio_url,
      lyrics_original,
      lyrics_italian,
      language
    } = req.body;

    const query = `
      UPDATE repertoire SET
        country_id = ?,
        title = ?,
        description = ?,
        audio_url = ?,
        lyrics_original = ?,
        lyrics_italian = ?,
        language = ?,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      db.prepare(query).run(
        country_id,
        title,
        description || null,
        audio_url || null,
        lyrics_original || null,
        lyrics_italian || null,
        language || null,
        id
      );

      res.redirect('/admin/repertoire?success=updated');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // POST /admin/repertoire/:id/delete - Delete song
  router.post('/repertoire/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('DELETE FROM repertoire WHERE id = ?').run(id);

      res.json({
        success: true,
        message: 'Brano eliminato con successo'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'eliminazione'
      });
    }
  });

  // POST /admin/repertoire/:id/toggle - Toggle active status
  router.post('/repertoire/:id/toggle', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('UPDATE repertoire SET is_active = NOT is_active WHERE id = ?').run(id);

      res.json({
        success: true,
        message: 'Stato aggiornato con successo'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'aggiornamento'
      });
    }
  });

  return router;
};

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

    // Get total count
    db.get(countQuery, countParams, (err, countRow) => {
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / limit);

      // Get songs
      db.all(query, params, (err, songs) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore database');
        }

        // Get all countries for filter
        db.all('SELECT * FROM countries ORDER BY name', (err, countries) => {
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
        });
      });
    });
  });

  // GET /admin/repertoire/new - Show create form
  router.get('/repertoire/new', requireAuth, (req, res) => {
    db.all('SELECT * FROM countries ORDER BY name', (err, countries) => {
      res.render('repertoire/form', {
        title: 'Nuovo Brano',
        user: req.session,
        song: {},
        countries: countries || [],
        action: 'create'
      });
    });
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

    db.run(
      query,
      [
        country_id,
        title,
        description || null,
        audio_url || null,
        lyrics_original || null,
        lyrics_italian || null,
        language || null
      ],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante la creazione');
        }

        res.redirect('/admin/repertoire?success=created');
      }
    );
  });

  // GET /admin/repertoire/:id/edit - Show edit form
  router.get('/repertoire/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM repertoire WHERE id = ?', [id], (err, song) => {
      if (err || !song) {
        return res.status(404).send('Brano non trovato');
      }

      db.all('SELECT * FROM countries ORDER BY name', (err, countries) => {
        res.render('repertoire/form', {
          title: 'Modifica Brano',
          user: req.session,
          song,
          countries: countries || [],
          action: 'edit'
        });
      });
    });
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

    db.run(
      query,
      [
        country_id,
        title,
        description || null,
        audio_url || null,
        lyrics_original || null,
        lyrics_italian || null,
        language || null,
        id
      ],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante l\'aggiornamento');
        }

        res.redirect('/admin/repertoire?success=updated');
      }
    );
  });

  // POST /admin/repertoire/:id/delete - Delete song
  router.post('/repertoire/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM repertoire WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Errore durante l\'eliminazione'
        });
      }

      res.json({
        success: true,
        message: 'Brano eliminato con successo'
      });
    });
  });

  // POST /admin/repertoire/:id/toggle - Toggle active status
  router.post('/repertoire/:id/toggle', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run(
      'UPDATE repertoire SET is_active = NOT is_active WHERE id = ?',
      [id],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Errore durante l\'aggiornamento'
          });
        }

        res.json({
          success: true,
          message: 'Stato aggiornato con successo'
        });
      }
    );
  });

  return router;
};

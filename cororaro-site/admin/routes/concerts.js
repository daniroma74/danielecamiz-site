/**
 * Admin Concerts CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/concerts - List all concerts
  router.get('/concerts', requireAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = 'SELECT * FROM concerts WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM concerts WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' AND (title LIKE ? OR location LIKE ? OR cause LIKE ?)';
      countQuery += ' AND (title LIKE ? OR location LIKE ? OR cause LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get total count
    db.get(countQuery, countParams, (err, countRow) => {
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / limit);

      // Get concerts
      db.all(query, params, (err, concerts) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore database');
        }

        res.render('concerts/list', {
          title: 'Gestione Concerti',
          user: req.session,
          concerts: concerts || [],
          pagination: {
            page,
            totalPages,
            total
          },
          filters: {
            search
          }
        });
      });
    });
  });

  // GET /admin/concerts/new - Show create form
  router.get('/concerts/new', requireAuth, (req, res) => {
    res.render('concerts/form', {
      title: 'Nuovo Concerto',
      user: req.session,
      concert: {},
      action: 'create'
    });
  });

  // POST /admin/concerts - Create new concert
  router.post('/concerts', requireAuth, (req, res) => {
    const {
      title,
      slug,
      date,
      time,
      location,
      address,
      cause,
      program,
      description,
      poster_url,
      ticket_url
    } = req.body;

    const query = `
      INSERT INTO concerts (
        title, slug, date, time, location, address, cause, program,
        description, poster_url, ticket_url, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    db.run(
      query,
      [
        title,
        slug,
        date,
        time || null,
        location,
        address || null,
        cause || null,
        program || null,
        description || null,
        poster_url || null,
        ticket_url || null
      ],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante la creazione');
        }

        res.redirect('/admin/concerts');
      }
    );
  });

  // GET /admin/concerts/:id/edit - Show edit form
  router.get('/concerts/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM concerts WHERE id = ?', [id], (err, concert) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      if (!concert) {
        return res.status(404).send('Concerto non trovato');
      }

      res.render('concerts/form', {
        title: 'Modifica Concerto',
        user: req.session,
        concert,
        action: 'edit'
      });
    });
  });

  // POST /admin/concerts/:id - Update concert
  router.post('/concerts/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
      title,
      slug,
      date,
      time,
      location,
      address,
      cause,
      program,
      description,
      poster_url,
      ticket_url
    } = req.body;

    const query = `
      UPDATE concerts SET
        title = ?,
        slug = ?,
        date = ?,
        time = ?,
        location = ?,
        address = ?,
        cause = ?,
        program = ?,
        description = ?,
        poster_url = ?,
        ticket_url = ?,
        is_published = 1
      WHERE id = ?
    `;

    db.run(
      query,
      [
        title,
        slug,
        date,
        time || null,
        location,
        address || null,
        cause || null,
        program || null,
        description || null,
        poster_url || null,
        ticket_url || null,
        id
      ],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante l\'aggiornamento');
        }

        res.redirect('/admin/concerts');
      }
    );
  });

  // POST /admin/concerts/:id/delete - Delete concert
  router.post('/concerts/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM concerts WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore durante l\'eliminazione');
      }

      res.redirect('/admin/concerts');
    });
  });

  return router;
};

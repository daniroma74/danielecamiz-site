/**
 * Admin Countries Routes
 * CRUD per gestire i paesi nel mappamondo
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/countries - Lista paesi
  router.get('/countries', requireAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT c.*, COUNT(r.id) as songs_count
      FROM countries c
      LEFT JOIN repertoire r ON r.country_id = c.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM countries';
    const params = [];

    if (search) {
      query += ' WHERE c.name LIKE ? OR c.code LIKE ?';
      countQuery += ' WHERE name LIKE ? OR code LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY c.id ORDER BY c.name ASC LIMIT ? OFFSET ?';

    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).send('Errore nel database');
      }

      db.all(query, [...params, limit, offset], (err, countries) => {
        if (err) {
          return res.status(500).send('Errore nel database');
        }

        const totalPages = Math.ceil(countResult.total / limit);

        res.render('countries/list', {
          title: 'Gestione Paesi',
          user: req.session,
          countries,
          currentPage: page,
          totalPages,
          search,
          message: req.query.message
        });
      });
    });
  });

  // GET /admin/countries/new - Form nuovo paese
  router.get('/countries/new', requireAuth, (req, res) => {
    res.render('countries/form', {
      title: 'Aggiungi Paese',
      user: req.session,
      country: null,
      action: 'new',
      error: req.query.error
    });
  });

  // POST /admin/countries - Crea nuovo paese
  router.post('/countries', requireAuth, (req, res) => {
    const { code, name, flag, lat, lng, color } = req.body;

    // Validazione
    if (!code || !name || !lat || !lng) {
      return res.redirect('/admin/countries/new?error=' + encodeURIComponent('Campi obbligatori mancanti'));
    }

    const sql = `INSERT INTO countries (code, name, flag, lat, lng, color)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
      code.toUpperCase(),
      name,
      flag || '🌍',
      parseFloat(lat),
      parseFloat(lng),
      color || '#228B22'
    ], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.redirect('/admin/countries/new?error=' + encodeURIComponent('Codice paese già esistente'));
        }
        return res.redirect('/admin/countries/new?error=' + encodeURIComponent('Errore nel database'));
      }

      res.redirect('/admin/countries?message=' + encodeURIComponent('Paese creato con successo!'));
    });
  });

  // GET /admin/countries/:id/edit - Form modifica paese
  router.get('/countries/:id/edit', requireAuth, (req, res) => {
    db.get('SELECT * FROM countries WHERE id = ?', [req.params.id], (err, country) => {
      if (err || !country) {
        return res.status(404).send('Paese non trovato');
      }

      res.render('countries/form', {
        title: 'Modifica Paese',
        user: req.session,
        country,
        action: 'edit',
        error: req.query.error
      });
    });
  });

  // POST /admin/countries/:id - Aggiorna paese
  router.post('/countries/:id', requireAuth, (req, res) => {
    const { code, name, flag, lat, lng, color } = req.body;

    if (!code || !name || !lat || !lng) {
      return res.redirect(`/admin/countries/${req.params.id}/edit?error=` + encodeURIComponent('Campi obbligatori mancanti'));
    }

    const sql = `UPDATE countries
                 SET code = ?, name = ?, flag = ?, lat = ?, lng = ?, color = ?
                 WHERE id = ?`;

    db.run(sql, [
      code.toUpperCase(),
      name,
      flag || '🌍',
      parseFloat(lat),
      parseFloat(lng),
      color || '#228B22',
      req.params.id
    ], function(err) {
      if (err) {
        return res.redirect(`/admin/countries/${req.params.id}/edit?error=` + encodeURIComponent('Errore nel database'));
      }

      res.redirect('/admin/countries?message=' + encodeURIComponent('Paese aggiornato!'));
    });
  });

  // POST /admin/countries/:id/delete - Elimina paese
  router.post('/countries/:id/delete', requireAuth, (req, res) => {
    // Verifica se ci sono brani associati
    db.get('SELECT COUNT(*) as count FROM repertoire WHERE country_id = ?', [req.params.id], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Errore nel database' });
      }

      if (result.count > 0) {
        return res.json({
          success: false,
          message: `Non puoi eliminare questo paese: ha ${result.count} brani associati. Eliminali prima.`
        });
      }

      db.run('DELETE FROM countries WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          return res.json({ success: false, message: 'Errore nell\'eliminazione' });
        }

        res.json({ success: true, message: 'Paese eliminato!' });
      });
    });
  });

  return router;
};

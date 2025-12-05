/**
 * Admin Concerts CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

/**
 * Sincronizza automaticamente i dati del concerto con la landing page
 */
function syncConcertToLanding(db, concertId, concertData) {
  const {
    title,
    description,
    poster_url,
    program,
    cause
  } = concertData;

  // Verifica se esiste già una landing
  const existing = db.prepare('SELECT id FROM concert_landing_settings WHERE concert_id = ?').get(concertId);

  // Prepara descrizione HTML
  let descriptionHtml = '';
  if (cause) descriptionHtml += `<h3>🌍 A sostegno di</h3><p>${cause}</p>`;
  if (program) descriptionHtml += `<h3>🎵 Programma</h3><p>${program}</p>`;
  if (description) descriptionHtml += `<h3>📋 Dettagli</h3><p>${description}</p>`;

  if (existing) {
    // Aggiorna
    db.prepare(`
      UPDATE concert_landing_settings SET
        hero_title = ?,
        hero_image_url = ?,
        description_html = ?,
        show_program = 1,
        show_location = 1,
        show_booking_form = 1,
        booking_enabled = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE concert_id = ?
    `).run(title, poster_url, descriptionHtml, concertId);
  } else {
    // Crea nuova landing
    db.prepare(`
      INSERT INTO concert_landing_settings (
        concert_id, hero_title, hero_image_url, description_html,
        show_program, show_location, show_booking_form,
        booking_enabled, max_seats_per_booking
      ) VALUES (?, ?, ?, ?, 1, 1, 1, 1, 4)
    `).run(concertId, title, poster_url, descriptionHtml);
  }

  console.log(`✅ Landing page sincronizzata per concerto ID ${concertId}`);
}

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

    try {
      // Get total count
      const countRow = db.prepare(countQuery).get(...countParams);
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / limit);

      // Get concerts
      const concerts = db.prepare(query).all(...params);

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
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
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
      poster_url
    } = req.body;

    const query = `
      INSERT INTO concerts (
        title, slug, date, time, location, address, cause, program,
        description, poster_url, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    try {
      const result = db.prepare(query).run(
        title,
        slug,
        date,
        time || null,
        location,
        address || null,
        cause || null,
        program || null,
        description || null,
        poster_url || null
      );

      const concertId = result.lastInsertRowid;

      // Sincronizza automaticamente con landing page
      syncConcertToLanding(db, concertId, req.body);

      res.redirect('/admin/concerts');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante la creazione');
    }
  });

  // GET /admin/concerts/:id/edit - Show edit form
  router.get('/concerts/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      const concert = db.prepare('SELECT * FROM concerts WHERE id = ?').get(id);

      if (!concert) {
        return res.status(404).send('Concerto non trovato');
      }

      res.render('concerts/form', {
        title: 'Modifica Concerto',
        user: req.session,
        concert,
        action: 'edit'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
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
      poster_url
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
        is_published = 1
      WHERE id = ?
    `;

    try {
      db.prepare(query).run(
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
        id
      );

      // Sincronizza automaticamente con landing page
      syncConcertToLanding(db, id, req.body);

      res.redirect('/admin/concerts');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // POST /admin/concerts/:id/delete - Delete concert
  router.post('/concerts/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('DELETE FROM concerts WHERE id = ?').run(id);
      res.redirect('/admin/concerts');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'eliminazione');
    }
  });

  return router;
};

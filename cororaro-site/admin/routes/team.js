/**
 * Admin Team Members CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/team - List all team members
  router.get('/team', requireAuth, (req, res) => {
    const search = req.query.search || '';
    const role = req.query.role || ''; // all, director, co-director, chorister, staff

    let query = 'SELECT * FROM team_members WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR bio LIKE ? OR email LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (role && role !== 'all') {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY sort_order ASC, full_name ASC';

    try {
      const members = db.prepare(query).all(...params);

      res.render('team/list', {
        title: 'Gestione Team',
        user: req.session,
        members: members || [],
        filters: {
          search,
          role
        }
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // GET /admin/team/new - Show create form
  router.get('/team/new', requireAuth, (req, res) => {
    res.render('team/form', {
      title: 'Nuovo Membro',
      user: req.session,
      member: {
        is_active: 1,
        sort_order: 0,
        role: 'chorister'
      },
      action: 'create'
    });
  });

  // POST /admin/team - Create new member
  router.post('/team', requireAuth, (req, res) => {
    const {
      full_name,
      role,
      bio,
      photo_url,
      email,
      phone,
      sort_order,
      is_active
    } = req.body;

    const query = `
      INSERT INTO team_members (
        full_name, role, bio, photo_url, email, phone, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      db.prepare(query).run(
        full_name,
        role,
        bio || null,
        photo_url || null,
        email || null,
        phone || null,
        sort_order || 0,
        is_active ? 1 : 0
      );

      res.redirect('/admin/team');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante la creazione');
    }
  });

  // GET /admin/team/:id/edit - Show edit form
  router.get('/team/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);

      if (!member) {
        return res.status(404).send('Membro non trovato');
      }

      res.render('team/form', {
        title: 'Modifica Membro',
        user: req.session,
        member,
        action: 'edit'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // POST /admin/team/:id - Update member
  router.post('/team/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
      full_name,
      role,
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
        role = ?,
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
        role,
        bio || null,
        photo_url || null,
        email || null,
        phone || null,
        sort_order || 0,
        is_active ? 1 : 0,
        id
      );

      res.redirect('/admin/team');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // POST /admin/team/:id/delete - Delete member
  router.post('/team/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('DELETE FROM team_members WHERE id = ?').run(id);

      res.redirect('/admin/team');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'eliminazione');
    }
  });

  // POST /admin/team/reorder - Update sort order
  router.post('/team/reorder', requireAuth, (req, res) => {
    const { order } = req.body; // Array of {id, sort_order}

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Invalid order data' });
    }

    try {
      const stmt = db.prepare('UPDATE team_members SET sort_order = ? WHERE id = ?');

      order.forEach(item => {
        stmt.run(item.sort_order, item.id);
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error updating sort order:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};

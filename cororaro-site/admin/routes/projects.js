/**
 * Admin Solidarity Projects CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/projects - List all projects
  router.get('/projects', requireAuth, (req, res) => {
    const search = req.query.search || '';
    const status = req.query.status || ''; // all, active, inactive, featured

    let query = 'SELECT * FROM solidarity_projects WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR country LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (status === 'active') {
      query += ' AND is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND is_active = 0';
    } else if (status === 'featured') {
      query += ' AND is_featured = 1';
    }

    query += ' ORDER BY sort_order ASC, title ASC';

    db.all(query, params, (err, projects) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      res.render('projects/list', {
        title: 'Gestione Progetti Solidarietà',
        user: req.session,
        projects: projects || [],
        filters: {
          search,
          status
        }
      });
    });
  });

  // GET /admin/projects/new - Show create form
  router.get('/projects/new', requireAuth, (req, res) => {
    res.render('projects/form', {
      title: 'Nuovo Progetto',
      user: req.session,
      project: {
        is_active: 1,
        is_featured: 0,
        sort_order: 0
      },
      action: 'create'
    });
  });

  // POST /admin/projects - Create new project
  router.post('/projects', requireAuth, (req, res) => {
    const {
      icon,
      title,
      description,
      long_description,
      country,
      amount_raised,
      year,
      image_url,
      is_featured,
      is_active,
      sort_order
    } = req.body;

    const query = `
      INSERT INTO solidarity_projects (
        icon, title, description, long_description, country,
        amount_raised, year, image_url, is_featured, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        icon || null,
        title,
        description,
        long_description || null,
        country || null,
        amount_raised || null,
        year || null,
        image_url || null,
        is_featured ? 1 : 0,
        is_active ? 1 : 0,
        sort_order || 0
      ],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante la creazione');
        }

        res.redirect('/admin/projects');
      }
    );
  });

  // GET /admin/projects/:id/edit - Show edit form
  router.get('/projects/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM solidarity_projects WHERE id = ?', [id], (err, project) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore database');
      }

      if (!project) {
        return res.status(404).send('Progetto non trovato');
      }

      res.render('projects/form', {
        title: 'Modifica Progetto',
        user: req.session,
        project,
        action: 'edit'
      });
    });
  });

  // POST /admin/projects/:id - Update project
  router.post('/projects/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
      icon,
      title,
      description,
      long_description,
      country,
      amount_raised,
      year,
      image_url,
      is_featured,
      is_active,
      sort_order
    } = req.body;

    const query = `
      UPDATE solidarity_projects SET
        icon = ?,
        title = ?,
        description = ?,
        long_description = ?,
        country = ?,
        amount_raised = ?,
        year = ?,
        image_url = ?,
        is_featured = ?,
        is_active = ?,
        sort_order = ?
      WHERE id = ?
    `;

    db.run(
      query,
      [
        icon || null,
        title,
        description,
        long_description || null,
        country || null,
        amount_raised || null,
        year || null,
        image_url || null,
        is_featured ? 1 : 0,
        is_active ? 1 : 0,
        sort_order || 0,
        id
      ],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Errore durante l\'aggiornamento');
        }

        res.redirect('/admin/projects');
      }
    );
  });

  // POST /admin/projects/:id/delete - Delete project
  router.post('/projects/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM solidarity_projects WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Errore durante l\'eliminazione');
      }

      res.redirect('/admin/projects');
    });
  });

  // POST /admin/projects/reorder - Update sort order
  router.post('/projects/reorder', requireAuth, (req, res) => {
    const { order } = req.body; // Array of {id, sort_order}

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Invalid order data' });
    }

    const stmt = db.prepare('UPDATE solidarity_projects SET sort_order = ? WHERE id = ?');

    order.forEach(item => {
      stmt.run([item.sort_order, item.id]);
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('Error updating sort order:', err);
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({ success: true });
    });
  });

  return router;
};

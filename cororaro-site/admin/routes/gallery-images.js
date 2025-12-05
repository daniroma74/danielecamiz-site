/**
 * Admin Gallery Images CRUD Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/gallery-images - List all gallery images
  router.get('/gallery-images', requireAuth, (req, res) => {
    const category = req.query.category || ''; // all, concerts, rehearsals, group, events
    const status = req.query.status || ''; // all, published, unpublished, featured

    let query = 'SELECT * FROM gallery_images WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status === 'published') {
      query += ' AND is_published = 1';
    } else if (status === 'unpublished') {
      query += ' AND is_published = 0';
    } else if (status === 'featured') {
      query += ' AND is_featured = 1';
    }

    query += ' ORDER BY sort_order ASC, created_at DESC';

    try {
      const images = db.prepare(query).all(...params);

      res.render('gallery-images/list', {
        title: 'Gestione Galleria',
        user: req.session,
        images: images || [],
        filters: {
          category,
          status
        }
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // GET /admin/gallery-images/new - Show create form
  router.get('/gallery-images/new', requireAuth, (req, res) => {
    res.render('gallery-images/form', {
      title: 'Nuova Immagine',
      user: req.session,
      image: {
        is_published: 1,
        is_featured: 0,
        sort_order: 0,
        category: 'group'
      },
      action: 'create'
    });
  });

  // POST /admin/gallery-images - Create new image
  router.post('/admin/gallery-images', requireAuth, (req, res) => {
    const {
      title,
      caption,
      cloudinary_id,
      image_url,
      thumbnail_url,
      category
    } = req.body;

    const query = `
      INSERT INTO gallery_images (
        title, caption, cloudinary_id, image_url, thumbnail_url,
        category, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
    `;

    try {
      db.prepare(query).run(
        title || null,
        caption || null,
        cloudinary_id || null,
        image_url,
        thumbnail_url || null,
        category || 'group'
      );

      res.redirect('/admin/gallery-images');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante la creazione');
    }
  });

  // GET /admin/gallery-images/:id/edit - Show edit form
  router.get('/gallery-images/:id/edit', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      const image = db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(id);

      if (!image) {
        return res.status(404).send('Immagine non trovata');
      }

      res.render('gallery-images/form', {
        title: 'Modifica Immagine',
        user: req.session,
        image,
        action: 'edit'
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore database');
    }
  });

  // POST /admin/gallery-images/:id - Update image
  router.post('/gallery-images/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
      title,
      caption,
      cloudinary_id,
      image_url,
      thumbnail_url,
      category
    } = req.body;

    const query = `
      UPDATE gallery_images SET
        title = ?,
        caption = ?,
        cloudinary_id = ?,
        image_url = ?,
        thumbnail_url = ?,
        category = ?,
        is_published = 1
      WHERE id = ?
    `;

    try {
      db.prepare(query).run(
        title || null,
        caption || null,
        cloudinary_id || null,
        image_url,
        thumbnail_url || null,
        category || 'group',
        id
      );

      res.redirect('/admin/gallery-images');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'aggiornamento');
    }
  });

  // POST /admin/gallery-images/:id/delete - Delete image
  router.post('/gallery-images/:id/delete', requireAuth, (req, res) => {
    const { id } = req.params;

    try {
      db.prepare('DELETE FROM gallery_images WHERE id = ?').run(id);

      res.redirect('/admin/gallery-images');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('Errore durante l\'eliminazione');
    }
  });

  // POST /admin/gallery-images/reorder - Update sort order
  router.post('/gallery-images/reorder', requireAuth, (req, res) => {
    const { order } = req.body; // Array of {id, sort_order}

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Invalid order data' });
    }

    try {
      const stmt = db.prepare('UPDATE gallery_images SET sort_order = ? WHERE id = ?');

      order.forEach(item => {
        stmt.run(item.sort_order, item.id);
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error updating sort order:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /admin/gallery-images/bulk-upload - Bulk upload from Cloudinary
  router.post('/gallery-images/bulk-upload', requireAuth, (req, res) => {
    const { images } = req.body; // Array of {cloudinary_id, url, thumbnail, category}

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ success: false, error: 'Invalid images data' });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO gallery_images (cloudinary_id, image_url, thumbnail_url, category, is_published)
        VALUES (?, ?, ?, ?, 1)
      `);

      images.forEach(img => {
        stmt.run(
          img.cloudinary_id,
          img.url,
          img.thumbnail || img.url,
          img.category || 'group'
        );
      });

      res.json({ success: true, count: images.length });
    } catch (err) {
      console.error('Error bulk uploading:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};

// routes/editorRoutes.js
// Routes per Visual Editor (drag & drop interface)

import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { db } from '../config/database.js';

const router = express.Router();

// Tutte le routes richiedono autenticazione
router.use(ensureAuthenticated);

// GET /editor/visual - Pagina visual editor
router.get('/visual', async (req, res) => {
  try {
    // Carica tutti i dati necessari
    const settings = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get() || {
      id: 1,
      name: '',
      role_it: '',
      role_en: '',
      bio_it: '',
      bio_en: '',
      avatar_url: '',
      background_color: '#ffffff',
      text_color: '#000000'
    };

    const links = db.prepare(`
      SELECT * FROM contact_links
      ORDER BY order_index ASC, created_at DESC
    `).all() || [];

    const sections = db.prepare(`
      SELECT * FROM contact_sections
      ORDER BY order_index ASC
    `).all() || [];

    res.render('editor/visual', {
      title: 'Visual Editor - Contact Admin',
      settings,
      links,
      sections
    });
  } catch (error) {
    console.error('Error loading visual editor:', error);
    res.status(500).send('Error loading editor: ' + error.message);
  }
});

// POST /editor/reorder - Bulk reorder links
router.post('/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Array di { id, order }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format'
      });
    }

    // Update in transazione
    const updateStmt = db.prepare(
      'UPDATE contact_links SET order_index = ? WHERE id = ?'
    );

    const transaction = db.transaction((items) => {
      for (const item of items) {
        updateStmt.run(item.order, item.id);
      }
    });

    transaction(items);

    res.json({ success: true, message: 'Links reordered' });
  } catch (error) {
    console.error('Error reordering links:', error);
    res.status(500).json({ success: false, message: 'Reorder failed' });
  }
});

// PUT /editor/link/:id - Quick update link (per inline editing)
router.put('/link/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title_it,
      title_en,
      url,
      icon,
      visible
    } = req.body;

    const stmt = db.prepare(`
      UPDATE contact_links
      SET title_it = ?, title_en = ?, url = ?, icon = ?, visible = ?
      WHERE id = ?
    `);

    stmt.run(title_it, title_en, url, icon, visible ? 1 : 0, id);

    res.json({ success: true, message: 'Link updated' });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// POST /editor/link - Quick add link
router.post('/link', async (req, res) => {
  try {
    const {
      title_it,
      title_en,
      url,
      category,
      icon
    } = req.body;

    // Get max order per category
    const maxOrder = db.prepare(
      'SELECT MAX(order_index) as max FROM contact_links WHERE category = ?'
    ).get(category);

    const order = (maxOrder?.max || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO contact_links
      (title_it, title_en, url, category, icon, order_index, visible)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(title_it, title_en, url, category, icon, order);

    res.json({
      success: true,
      message: 'Link created',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ success: false, message: 'Creation failed' });
  }
});

// DELETE /editor/link/:id - Quick delete
router.delete('/link/:id', async (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM contact_links WHERE id = ?').run(id);

    res.json({ success: true, message: 'Link deleted' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// PUT /editor/settings - Quick update settings
router.put('/settings', async (req, res) => {
  try {
    const {
      name,
      role_it,
      role_en,
      bio_it,
      bio_en,
      avatar_url,
      background_color,
      text_color
    } = req.body;

    const stmt = db.prepare(`
      UPDATE contact_settings
      SET name = ?, role_it = ?, role_en = ?, bio_it = ?, bio_en = ?,
          avatar_url = ?, background_color = ?, text_color = ?
      WHERE id = 1
    `);

    stmt.run(
      name, role_it, role_en, bio_it, bio_en,
      avatar_url, background_color, text_color
    );

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

export default router;

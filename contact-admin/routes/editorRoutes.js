// routes/editorRoutes.js
// Routes per Visual Editor (drag & drop interface)

import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { db } from '../config/database.js';

const router = express.Router();

// Tutte le routes richiedono autenticazione
router.use(ensureAuthenticated);

/**
 * Extract YouTube video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
function extractYouTubeId(url) {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate YouTube thumbnail URL from video ID
 * Uses maxresdefault for best quality, falls back to hqdefault if needed
 */
function getYouTubeThumbnail(videoId) {
  if (!videoId) return null;
  // maxresdefault is 1280x720, hqdefault is 480x360
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Auto-detect and set thumbnail_url for YouTube videos
 */
function autoSetThumbnail(url, currentThumbnail) {
  // If thumbnail already set manually, don't override
  if (currentThumbnail && currentThumbnail.trim()) {
    return currentThumbnail;
  }

  // Check if URL is YouTube
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return getYouTubeThumbnail(videoId);
  }

  return null;
}

// GET /editor/preview - Live preview iframe (uses real contact-site CSS)
router.get('/preview', async (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get() || {
      id: 1,
      name: '',
      role_it: '',
      role_en: '',
      bio_it: '',
      bio_en: '',
      avatar_url: ''
    };

    const links = db.prepare(`
      SELECT * FROM contact_links
      ORDER BY order_index ASC, created_at DESC
    `).all() || [];

    res.render('editor/preview', {
      title: 'Preview',
      settings,
      links
    });
  } catch (error) {
    console.error('Error loading preview:', error);
    res.status(500).send('Preview error: ' + error.message);
  }
});

// GET /editor/test - Debug test page
router.get('/test', async (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get() || {
      id: 1,
      name: '',
      role_it: '',
      role_en: '',
      bio_it: '',
      bio_en: '',
      avatar_url: ''
    };

    const links = db.prepare(`
      SELECT * FROM contact_links
      ORDER BY order_index ASC, created_at DESC
    `).all() || [];

    res.render('editor/test', {
      title: 'Editor Test - Contact Admin',
      settings,
      links
    });
  } catch (error) {
    console.error('Error loading test page:', error);
    res.status(500).send('Test page error: ' + error.message);
  }
});

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
      avatar_url: ''
    };

    const links = db.prepare(`
      SELECT * FROM contact_links
      ORDER BY order_index ASC, created_at DESC
    `).all() || [];

    const sections = db.prepare(`
      SELECT * FROM contact_sections
      ORDER BY order_index ASC
    `).all() || [];

    res.render('editor/visual-v2', {
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
      visible,
      thumbnail_url
    } = req.body;

    // Auto-detect YouTube thumbnail
    const finalThumbnail = autoSetThumbnail(url, thumbnail_url);

    const stmt = db.prepare(`
      UPDATE contact_links
      SET title_it = ?, title_en = ?, url = ?, icon = ?, visible = ?,
          thumbnail_url = ?, scheduled_start = NULL, scheduled_end = NULL
      WHERE id = ?
    `);

    stmt.run(title_it, title_en, url, icon, visible ? 1 : 0, finalThumbnail, id);

    res.json({
      success: true,
      message: 'Link updated',
      thumbnail_url: finalThumbnail
    });
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
      icon,
      thumbnail_url
    } = req.body;

    // Auto-detect YouTube thumbnail
    const finalThumbnail = autoSetThumbnail(url, thumbnail_url);

    // Get max order per category
    const maxOrder = db.prepare(
      'SELECT MAX(order_index) as max FROM contact_links WHERE category = ?'
    ).get(category);

    const order = (maxOrder?.max || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO contact_links
      (title_it, title_en, url, category, icon, order_index, visible, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const result = stmt.run(title_it, title_en, url, category, icon, order, finalThumbnail);

    res.json({
      success: true,
      message: 'Link created',
      id: result.lastInsertRowid,
      thumbnail_url: finalThumbnail
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
    console.log('[editorRoutes] Updating settings:', req.body);

    const {
      name,
      role_it,
      role_en,
      bio_it,
      bio_en,
      avatar_url
    } = req.body;

    const stmt = db.prepare(`
      UPDATE contact_settings
      SET name = ?, role_it = ?, role_en = ?, bio_it = ?, bio_en = ?, avatar_url = ?
      WHERE id = 1
    `);

    const result = stmt.run(
      name || '',
      role_it || '',
      role_en || '',
      bio_it || '',
      bio_en || '',
      avatar_url || ''
    );

    console.log('[editorRoutes] Settings updated, changes:', result.changes);
    res.json({ success: true, message: 'Settings updated', changes: result.changes });
  } catch (error) {
    console.error('[editorRoutes] Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Update failed', error: error.message });
  }
});

export default router;

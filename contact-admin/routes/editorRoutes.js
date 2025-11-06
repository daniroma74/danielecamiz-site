// routes/editorRoutes.js
// Routes per Visual Editor (drag & drop interface)

import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { db } from '../config/database.js';
import * as cheerio from 'cheerio';

const router = express.Router();

// Tutte le routes richiedono autenticazione
router.use(ensureAuthenticated);

/**
 * Extract YouTube video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID (live streams)
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
function extractYouTubeId(url) {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
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
 * Uses hqdefault (480x360) which exists for ALL videos
 * Note: maxresdefault doesn't exist for older/live videos
 */
function getYouTubeThumbnail(videoId) {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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

/**
 * Fetch Open Graph metadata from any URL
 * Extracts og:image, og:title, og:description, etc.
 * Works with Spotify, Apple Music, Bandcamp, YouTube (as fallback), and any OG-compliant site
 */
async function fetchOpenGraphMetadata(url) {
  try {
    console.log('[Metadata] Fetching:', url);

    // Check if it's YouTube first (faster, no HTTP request needed)
    const ytId = extractYouTubeId(url);
    if (ytId) {
      const ytThumb = getYouTubeThumbnail(ytId);
      console.log('[Metadata] YouTube detected:', ytThumb);
      return {
        thumbnail: ytThumb,
        title: null,
        description: null,
        source: 'youtube'
      };
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      redirect: 'follow',
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph metadata
    const metadata = {
      thumbnail: null,
      title: null,
      description: null,
      source: 'opengraph'
    };

    // Try various meta tag formats
    metadata.thumbnail =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[itemprop="image"]').attr('content');

    metadata.title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text();

    metadata.description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content');

    console.log('[Metadata] Extracted:', {
      url,
      thumbnail: metadata.thumbnail ? metadata.thumbnail.substring(0, 60) + '...' : 'none',
      title: metadata.title || 'none'
    });

    return metadata;
  } catch (error) {
    console.error('[Metadata] Fetch error:', error.message);
    return {
      thumbnail: null,
      title: null,
      description: null,
      error: error.message
    };
  }
}

// POST /editor/fetch-metadata - Auto-fetch thumbnail and metadata from URL
router.post('/fetch-metadata', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL required' });
    }

    const metadata = await fetchOpenGraphMetadata(url);

    res.json({
      success: true,
      metadata
    });
  } catch (error) {
    console.error('[fetch-metadata] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

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

    // Convert visible from number (0/1) to boolean for Vue.js checkbox v-model
    links.forEach(link => {
      link.visible = Boolean(link.visible);
    });

    const sections = db.prepare(`
      SELECT * FROM contact_sections
      ORDER BY order_index ASC
    `).all() || [];

    const groups = db.prepare(`
      SELECT * FROM link_groups
      ORDER BY order_index ASC, created_at DESC
    `).all() || [];

    res.render('editor/visual-v2', {
      title: 'Visual Editor - Contact Admin',
      settings,
      links,
      sections,
      groups
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
      thumbnail_url,
      group_id  // UPDATED: Use group_id (FK) instead of group_title (text)
    } = req.body;

    // Auto-detect YouTube thumbnail
    const finalThumbnail = autoSetThumbnail(url, thumbnail_url);

    // Convert visible to integer (handles boolean, number, or string)
    const visibleInt = visible === true || visible === 1 || visible === '1' ? 1 : 0;

    // Convert group_id: null or 0 means ungrouped
    const groupIdInt = group_id && group_id !== '0' ? parseInt(group_id) : null;

    console.log(`[editorRoutes] Updating link ${id}: visible=${visible} → ${visibleInt}, group_id=${groupIdInt || 'ungrouped'}`);

    const stmt = db.prepare(`
      UPDATE contact_links
      SET title_it = ?, title_en = ?, url = ?, icon = ?, visible = ?,
          thumbnail_url = ?, group_id = ?, scheduled_start = NULL, scheduled_end = NULL
      WHERE id = ?
    `);

    stmt.run(title_it, title_en, url, icon, visibleInt, finalThumbnail, groupIdInt, id);

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

// ============================================================================
// GROUPS MANAGEMENT API (Linktree-style visual groups)
// ============================================================================

// GET /editor/groups - Get all groups
router.get('/groups', async (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT * FROM link_groups
      ORDER BY order_index ASC, created_at DESC
    `).all();

    res.json({ success: true, groups });
  } catch (error) {
    console.error('[editorRoutes] Error fetching groups:', error);
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
});

// POST /editor/group - Create new group
router.post('/group', async (req, res) => {
  try {
    const { name, category = 'highlight' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name required' });
    }

    // Get max order
    const maxOrder = db.prepare(
      'SELECT MAX(order_index) as max FROM link_groups WHERE category = ?'
    ).get(category);

    const order = (maxOrder?.max || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO link_groups (name, category, order_index, visible)
      VALUES (?, ?, ?, 1)
    `);

    const result = stmt.run(name.trim(), category, order);

    res.json({
      success: true,
      message: 'Group created',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('[editorRoutes] Error creating group:', error);
    res.status(500).json({ success: false, message: 'Creation failed' });
  }
});

// PUT /editor/group/:id - Update group
router.put('/group/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, visible } = req.body;

    const visibleInt = visible === true || visible === 1 || visible === '1' ? 1 : 0;

    const stmt = db.prepare(`
      UPDATE link_groups
      SET name = ?, visible = ?
      WHERE id = ?
    `);

    stmt.run(name, visibleInt, id);

    res.json({ success: true, message: 'Group updated' });
  } catch (error) {
    console.error('[editorRoutes] Error updating group:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// DELETE /editor/group/:id - Delete group (ungroups all links in it)
router.delete('/group/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, remove group_id from all links in this group
    db.prepare('UPDATE contact_links SET group_id = NULL WHERE group_id = ?').run(id);

    // Then delete the group
    db.prepare('DELETE FROM link_groups WHERE id = ?').run(id);

    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    console.error('[editorRoutes] Error deleting group:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// POST /editor/groups/reorder - Bulk reorder groups
router.post('/groups/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format'
      });
    }

    const updateStmt = db.prepare(
      'UPDATE link_groups SET order_index = ? WHERE id = ?'
    );

    const transaction = db.transaction((items) => {
      for (const item of items) {
        updateStmt.run(item.order, item.id);
      }
    });

    transaction(items);

    res.json({ success: true, message: 'Groups reordered' });
  } catch (error) {
    console.error('[editorRoutes] Error reordering groups:', error);
    res.status(500).json({ success: false, message: 'Reorder failed' });
  }
});

// GET /editor/export - Export all data as JSON backup
router.get('/export', async (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM contact_settings').all();
    const links = db.prepare('SELECT * FROM contact_links ORDER BY category, order_index').all();
    const sections = db.prepare('SELECT * FROM contact_sections ORDER BY order_index').all();
    const groups = db.prepare('SELECT * FROM link_groups ORDER BY order_index').all();

    const exportData = {
      settings,
      links,
      sections,
      groups,
      exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="contact-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('[editorRoutes] Export error:', error);
    res.status(500).send('Error exporting data');
  }
});

export default router;

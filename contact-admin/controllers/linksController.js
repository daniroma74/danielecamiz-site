import { all, get, run } from '../config/database.js';

/**
 * Extract YouTube video ID from various YouTube URL formats
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
 */
function getYouTubeThumbnail(videoId) {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Auto-detect and set thumbnail_url for YouTube videos
 */
function autoSetThumbnail(url) {
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return getYouTubeThumbnail(videoId);
  }
  return null;
}

const listLinks = async (req, res) => {
  try {
    const category = req.query.category || 'all';

    let links;
    if (category === 'all') {
      links = await all('SELECT * FROM contact_links ORDER BY category, order_index');
    } else {
      links = await all(
        'SELECT * FROM contact_links WHERE category = ? ORDER BY order_index',
        [category]
      );
    }

    const sections = await all('SELECT * FROM contact_sections ORDER BY order_index');

    res.render('links/list', {
      title: 'Manage Links - Contact Admin',
      links,
      sections,
      currentCategory: category
    });
  } catch (error) {
    console.error('List links error:', error);
    res.status(500).send('Error loading links');
  }
};

const newLinkForm = async (req, res) => {
  const category = req.query.category || 'highlight';
  res.render('links/form', {
    title: 'New Link',
    link: null,
    category,
    isEdit: false
  });
};

const createLink = async (req, res) => {
  try {
    const {
      category,
      title_it,
      title_en,
      url,
      icon,
      visible = 1,
      order_index = 0,
      target = '_blank',
      badge_text,
      badge_color,
      scheduled_start,
      scheduled_end,
      is_internal = 0,
      description_it,
      description_en
    } = req.body;

    // Auto-detect YouTube thumbnail
    const thumbnail_url = autoSetThumbnail(url);

    await run(
      `INSERT INTO contact_links (
        category, title_it, title_en, url, icon, visible, order_index, target,
        badge_text, badge_color, scheduled_start, scheduled_end, is_internal,
        description_it, description_en, thumbnail_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category, title_it, title_en, url, icon, visible, order_index, target,
        badge_text || null,
        badge_color || null,
        scheduled_start || null,
        scheduled_end || null,
        is_internal,
        description_it || null,
        description_en || null,
        thumbnail_url
      ]
    );

    res.redirect(`/links?category=${category}`);
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).send('Error creating link');
  }
};

const editLinkForm = async (req, res) => {
  try {
    const link = await get('SELECT * FROM contact_links WHERE id = ?', [req.params.id]);

    if (!link) {
      return res.status(404).send('Link not found');
    }

    res.render('links/form', {
      title: 'Edit Link',
      link,
      category: link.category,
      isEdit: true
    });
  } catch (error) {
    console.error('Edit link form error:', error);
    res.status(500).send('Error loading link');
  }
};

const updateLink = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title_it,
      title_en,
      url,
      icon,
      visible = 1,
      order_index,
      target,
      badge_text,
      badge_color,
      scheduled_start,
      scheduled_end,
      is_internal = 0,
      description_it,
      description_en
    } = req.body;

    // Auto-detect YouTube thumbnail
    const thumbnail_url = autoSetThumbnail(url);

    await run(
      `UPDATE contact_links SET
        title_it = ?,
        title_en = ?,
        url = ?,
        icon = ?,
        visible = ?,
        order_index = ?,
        target = ?,
        badge_text = ?,
        badge_color = ?,
        scheduled_start = ?,
        scheduled_end = ?,
        is_internal = ?,
        description_it = ?,
        description_en = ?,
        thumbnail_url = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
      [
        title_it, title_en, url, icon, visible, order_index, target,
        badge_text || null,
        badge_color || null,
        scheduled_start || null,
        scheduled_end || null,
        is_internal,
        description_it || null,
        description_en || null,
        thumbnail_url,
        id
      ]
    );

    // Get category for redirect
    const link = await get('SELECT category FROM contact_links WHERE id = ?', [id]);
    res.redirect(`/links?category=${link.category}`);
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).send('Error updating link');
  }
};

const deleteLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await get('SELECT category FROM contact_links WHERE id = ?', [id]);

    await run('DELETE FROM contact_links WHERE id = ?', [id]);

    res.redirect(`/links?category=${link.category}`);
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).send('Error deleting link');
  }
};

const toggleVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    await run(
      `UPDATE contact_links
       SET visible = CASE WHEN visible = 1 THEN 0 ELSE 1 END,
           updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle visibility error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const reorderLinks = async (req, res) => {
  try {
    const { links } = req.body; // Array of { id, order_index }

    const stmt = run('BEGIN TRANSACTION');

    for (const link of links) {
      await run(
        'UPDATE contact_links SET order_index = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [link.order_index, link.id]
      );
    }

    await run('COMMIT');

    res.json({ success: true });
  } catch (error) {
    await run('ROLLBACK');
    console.error('Reorder links error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  listLinks,
  newLinkForm,
  createLink,
  editLinkForm,
  updateLink,
  deleteLink,
  toggleVisibility,
  reorderLinks
};

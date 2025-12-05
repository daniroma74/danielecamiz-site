import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { allQuery, getQuery, runQuery } from '../utils/database.js';
import { getVideoDetails } from '../utils/youtubeService.js';

const router = express.Router();

router.use(ensureAuthenticated);

// ============= DASHBOARD =============
router.get('/', async (req, res) => {
  try {
    const collections = await allQuery('SELECT COUNT(*) as count, type FROM gallery_collections GROUP BY type');
    const totalCollections = await getQuery('SELECT COUNT(*) as count FROM gallery_collections');

    const items = await allQuery('SELECT COUNT(*) as count, item_type FROM gallery_items GROUP BY item_type');

    const photos = items.find(i => i.item_type === 'photo')?.count || 0;
    const videos = items.find(i => i.item_type === 'video')?.count || 0;
    const audios = items.find(i => i.item_type === 'audio')?.count || 0;

    const cloudinaryStats = await getQuery('SELECT * FROM gallery_cloudinary_stats WHERE id = 1');

    // Get ALL collections with items count
    const allCollections = await allQuery(`
      SELECT c.*,
        (SELECT COUNT(*) FROM gallery_items WHERE collection_id = c.id) as items_count
      FROM gallery_collections c
      ORDER BY c.display_order ASC, c.created_at DESC
    `);

    res.render('pages/dashboard', {
      title: 'Gallery Admin',
      stats: {
        photos,
        videos,
        audios,
        collections: totalCollections?.count || 0,
        cloudinary: cloudinaryStats || { total_storage_bytes: 0 }
      },
      collectionsByType: collections,
      recentCollections: allCollections  // Renamed but contains ALL collections
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Errore caricamento dashboard');
  }
});

// ============= COLLEZIONI =============
// Redirect /collections to dashboard
router.get('/collections', (req, res) => {
  res.redirect('/gallery');
});

router.get('/collections/new', (req, res) => {
  res.render('pages/collection-edit', {
    title: 'Nuova Collezione - Gallery Admin',
    collection: null,
    items: [],
    isNew: true
  });
});

// Redirect /collections/:id to /collections/:id/edit
router.get('/collections/:id', (req, res) => {
  res.redirect(`/gallery/collections/${req.params.id}/edit`);
});

router.get('/collections/:id/edit', async (req, res) => {
  try {
    const collection = await getQuery('SELECT * FROM gallery_collections WHERE id = ?', [req.params.id]);
    if (!collection) {
      return res.status(404).send('Collezione non trovata');
    }

    // Get items in this collection
    const items = await allQuery(`
      SELECT *
      FROM gallery_items
      WHERE collection_id = ?
      ORDER BY display_order ASC, created_at DESC
    `, [req.params.id]);

    res.render('pages/collection-edit', {
      title: 'Modifica Collezione - Gallery Admin',
      collection,
      items,
      isNew: false
    });
  } catch (error) {
    console.error('Error loading collection:', error);
    res.status(500).send('Errore caricamento collezione');
  }
});

// API: Create collection
router.post('/api/collections', async (req, res) => {
  try {
    const {
      slug, type, title_it, title_en, description_it, description_en,
      cover_cloudinary_id, cover_local_path, is_published, is_featured, display_order,
      is_auto_sync, auto_sync_max_videos
    } = req.body;

    const result = await runQuery(`
      INSERT INTO gallery_collections (
        slug, type, title_it, title_en, description_it, description_en,
        cover_cloudinary_id, cover_local_path, is_published, is_featured, display_order,
        is_auto_sync, auto_sync_max_videos
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      slug, type, title_it, title_en, description_it, description_en,
      cover_cloudinary_id, cover_local_path,
      is_published ? 1 : 0, is_featured ? 1 : 0, display_order || 0,
      is_auto_sync ? 1 : 0, auto_sync_max_videos || 4
    ]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Update collection
router.put('/api/collections/:id', async (req, res) => {
  try {
    const {
      slug, type, title_it, title_en, description_it, description_en,
      cover_cloudinary_id, cover_local_path, is_published, is_featured, display_order,
      is_auto_sync, auto_sync_max_videos
    } = req.body;

    await runQuery(`
      UPDATE gallery_collections
      SET slug = ?, type = ?, title_it = ?, title_en = ?, description_it = ?, description_en = ?,
          cover_cloudinary_id = ?, cover_local_path = ?, is_published = ?, is_featured = ?,
          display_order = ?, is_auto_sync = ?, auto_sync_max_videos = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      slug, type, title_it, title_en, description_it, description_en,
      cover_cloudinary_id, cover_local_path,
      is_published ? 1 : 0, is_featured ? 1 : 0, display_order || 0,
      is_auto_sync ? 1 : 0, auto_sync_max_videos || 4,
      req.params.id
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete collection
router.delete('/api/collections/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM gallery_collections WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= FOTO =============
// Note: Photos GET route removed - use unified /media page instead

// API: Upload photo (multiplo supportato)
router.post('/api/photos', async (req, res) => {
  try {
    const {
      collection_id, cloudinary_id, cloudinary_folder, cloudinary_transforms,
      title_it, title_en, description_it, description_en, alt_it, alt_en, credits,
      width, height, file_size, file_format, is_published, display_order, taken_date
    } = req.body;

    const result = await runQuery(`
      INSERT INTO gallery_items (
        collection_id, item_type, cloudinary_id, cloudinary_folder, cloudinary_transforms,
        title_it, title_en, description_it, description_en, alt_it, alt_en, credits,
        width, height, file_size, file_format, is_published, display_order, taken_date
      )
      VALUES (?, 'photo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      collection_id || null, cloudinary_id, cloudinary_folder, cloudinary_transforms || null,
      title_it, title_en, description_it, description_en, alt_it, alt_en, credits,
      width, height, file_size, file_format, is_published ? 1 : 0, display_order || 0, taken_date
    ]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get single photo
router.get('/api/photos/:id', async (req, res) => {
  try {
    const photo = await getQuery(`
      SELECT * FROM gallery_items
      WHERE id = ? AND item_type = 'photo'
    `, [req.params.id]);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json(photo);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Update photo
router.put('/api/photos/:id', async (req, res) => {
  try {
    const {
      collection_id, title_it, title_en, description_it, description_en,
      alt_it, alt_en, credits, is_published, is_spotlight, display_order, taken_date,
      cloudinary_id  // ✅ Aggiungi possibilità di cambiare foto
    } = req.body;

    // Se cloudinary_id è fornito, aggiorna anche quello
    let sql, params;
    if (cloudinary_id !== undefined) {
      sql = `
        UPDATE gallery_items
        SET title_it = ?, title_en = ?, description_it = ?, description_en = ?,
            alt_it = ?, alt_en = ?, credits = ?, is_published = ?, is_spotlight = ?,
            display_order = ?, taken_date = ?, cloudinary_id = ?, updated_at = datetime('now')
        WHERE id = ? AND item_type = 'photo'
      `;
      params = [
        title_it, title_en, description_it, description_en,
        alt_it, alt_en, credits, is_published ? 1 : 0, is_spotlight ? 1 : 0,
        display_order || 0, taken_date, cloudinary_id,
        req.params.id
      ];
    } else {
      sql = `
        UPDATE gallery_items
        SET title_it = ?, title_en = ?, description_it = ?, description_en = ?,
            alt_it = ?, alt_en = ?, credits = ?, is_published = ?, is_spotlight = ?,
            display_order = ?, taken_date = ?, updated_at = datetime('now')
        WHERE id = ? AND item_type = 'photo'
      `;
      params = [
        title_it, title_en, description_it, description_en,
        alt_it, alt_en, credits, is_published ? 1 : 0, is_spotlight ? 1 : 0,
        display_order || 0, taken_date,
        req.params.id
      ];
    }

    await runQuery(sql, params);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete photo
router.delete('/api/photos/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM gallery_items WHERE id = ? AND item_type = ?', [req.params.id, 'photo']);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= MEDIA UNIFICATO =============
router.get('/media', async (req, res) => {
  try {
    const collection_id = req.query.collection;

    // Fetch photos
    let photos;
    if (collection_id) {
      photos = await allQuery(`
        SELECT * FROM gallery_items
        WHERE item_type = 'photo' AND collection_id = ?
        ORDER BY display_order ASC, created_at DESC
      `, [collection_id]);
    } else {
      photos = await allQuery(`
        SELECT * FROM gallery_items
        WHERE item_type = 'photo'
        ORDER BY display_order ASC, created_at DESC
      `);
    }

    // Fetch videos
    let videos;
    if (collection_id) {
      videos = await allQuery(`
        SELECT * FROM gallery_items
        WHERE item_type = 'video' AND collection_id = ?
        ORDER BY display_order ASC, created_at DESC
      `, [collection_id]);
    } else {
      videos = await allQuery(`
        SELECT * FROM gallery_items
        WHERE item_type = 'video'
        ORDER BY display_order ASC, created_at DESC
      `);
    }

    // Fetch audios
    let audios;
    if (collection_id) {
      audios = await allQuery(`
        SELECT * FROM gallery_items
        WHERE item_type = 'audio' AND collection_id = ?
        ORDER BY display_order ASC, created_at DESC
      `, [collection_id]);
    } else {
      audios = await allQuery(`
        SELECT * FROM gallery_items
        WHERE item_type = 'audio'
        ORDER BY display_order ASC, created_at DESC
      `);
    }

    const collections = await allQuery('SELECT * FROM gallery_collections ORDER BY title_it ASC');

    res.render('pages/media', {
      title: 'Media Manager - Gallery Admin',
      photos,
      videos,
      audios,
      collections,
      selectedCollection: collection_id || null
    });
  } catch (error) {
    console.error('Error loading media:', error);
    res.status(500).send('Errore caricamento media');
  }
});

// ============= VIDEO =============
// Note: Videos GET route removed - use unified /media page instead

// API: Sync YouTube - dual mode (auto from channel + manual IDs)
router.post('/api/videos/sync-youtube', async (req, res) => {
  try {
    const { mode, youtubeIds, channelId, maxVideos } = req.body;
    let videoIds = [];

    // Mode 1: Auto sync from YouTube channel
    if (mode === 'auto') {
      const { getLatestVideos } = await import('../utils/youtubeService.js');
      const { decode } = await import('html-entities');
      const max = parseInt(maxVideos) || 4;
      const collectionId = req.body.collectionId || null;

      const videos = await getLatestVideos(max);

      if (!videos || videos.length === 0) {
        return res.status(400).json({
          error: 'Impossibile recuperare video dal canale YouTube',
          details: 'Verifica che YT_API_KEY e YT_CHANNEL_ID siano configurati correttamente'
        });
      }

      // Import each video with metadata
      let imported = 0;
      for (const video of videos) {
        // Decode HTML entities in title
        const decodedTitle = decode(video.title);

        // Check if already exists
        const existing = await getQuery(
          'SELECT id FROM gallery_items WHERE youtube_id = ? AND item_type = ?',
          [video.id, 'video']
        );

        if (!existing) {
          await runQuery(`
            INSERT INTO gallery_items (
              item_type, collection_id, youtube_id, title_it, title_en, is_published, created_at
            ) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
          `, ['video', collectionId, video.id, decodedTitle, decodedTitle]);
          imported++;
        } else if (collectionId) {
          // If video exists but not in this collection, update it
          await runQuery(`
            UPDATE gallery_items
            SET collection_id = ?, title_it = ?, title_en = ?
            WHERE id = ?
          `, [collectionId, decodedTitle, decodedTitle, existing.id]);
        }
      }

      // Log sync
      const syncChannelId = channelId || process.env.YT_CHANNEL_ID || 'unknown';
      await runQuery(`
        INSERT INTO gallery_youtube_sync (
          channel_id, videos_found, videos_imported, sync_status, created_at
        )
        VALUES (?, ?, ?, 'success', datetime('now'))
      `, [syncChannelId, videos.length, imported]);

      return res.json({
        success: true,
        message: `Importati ${imported} nuovi video su ${videos.length} trovati dal canale`,
        imported,
        total: videos.length
      });
    }

    // Mode 2: Manual ID import
    else if (mode === 'manual') {
      if (!youtubeIds || !Array.isArray(youtubeIds) || youtubeIds.length === 0) {
        return res.status(400).json({ error: 'Fornire array di YouTube IDs' });
      }

      let imported = 0;
      for (const ytId of youtubeIds) {
        // Check if already exists
        const existing = await getQuery(
          'SELECT id FROM gallery_items WHERE youtube_id = ? AND item_type = ?',
          [ytId, 'video']
        );

        if (!existing) {
          // Create basic video entry
          await runQuery(`
            INSERT INTO gallery_items (
              item_type, youtube_id, title_it, is_published, created_at
            ) VALUES (?, ?, ?, 1, datetime('now'))
          `, ['video', ytId, `Video ${ytId}`]);
          imported++;
        }
      }

      // Log sync
      const syncChannelId = 'manual-import';
      await runQuery(`
        INSERT INTO gallery_youtube_sync (
          channel_id, videos_found, videos_imported, sync_status, created_at
        )
        VALUES (?, ?, ?, 'success', datetime('now'))
      `, [syncChannelId, youtubeIds.length, imported]);

      return res.json({
        success: true,
        message: `Importati ${imported} nuovi video su ${youtubeIds.length} totali`,
        imported,
        total: youtubeIds.length
      });
    }

    else {
      return res.status(400).json({ error: 'Mode non valida. Utilizzare "auto" o "manual"' });
    }
  } catch (error) {
    console.error('Error syncing YouTube:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get single video
router.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await getQuery(`
      SELECT * FROM gallery_items
      WHERE id = ? AND item_type = 'video'
    `, [req.params.id]);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Fetch YouTube video metadata
router.get('/api/videos/youtube-metadata/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const metadata = await getVideoDetails(videoId);

    if (!metadata) {
      return res.status(404).json({ error: 'Video not found or YouTube API error' });
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to extract YouTube ID from URL or return as-is if already an ID
function extractYouTubeId(input) {
  if (!input) return '';

  input = String(input).trim();

  // Direct ID (11 characters, alphanumeric + - and _)
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Extract from various YouTube URL formats
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it looks like an ID with extra params (e.g., "VIDEO_ID?si=...")
  const idMatch = input.match(/^([A-Za-z0-9_-]{11})/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return '';
}

// API: Add video
router.post('/api/videos', async (req, res) => {
  try {
    const {
      collection_id, youtube_id, title_it, title_en, description_it, description_en,
      timecode, is_spotlight, is_whitelisted, is_published, display_order, duration
    } = req.body;

    // Clean YouTube ID
    const cleanYouTubeId = extractYouTubeId(youtube_id);
    if (!cleanYouTubeId) {
      return res.status(400).json({ error: 'Invalid YouTube ID or URL' });
    }

    const result = await runQuery(`
      INSERT INTO gallery_items (
        collection_id, item_type, youtube_id, title_it, title_en, description_it, description_en,
        timecode, is_spotlight, is_whitelisted, is_published, display_order, duration
      )
      VALUES (?, 'video', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      collection_id || null, cleanYouTubeId, title_it, title_en, description_it, description_en,
      timecode, is_spotlight ? 1 : 0, is_whitelisted ? 1 : 0, is_published ? 1 : 0,
      display_order || 0, duration
    ]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Update video
router.put('/api/videos/:id', async (req, res) => {
  try {
    const {
      youtube_id, title_it, title_en, description_it, description_en,
      is_published, display_order
    } = req.body;

    // If youtube_id is provided, update it too (allows fixing wrong IDs)
    let sql, params;
    if (youtube_id !== undefined) {
      // Clean YouTube ID
      const cleanYouTubeId = extractYouTubeId(youtube_id);
      if (!cleanYouTubeId) {
        return res.status(400).json({ error: 'Invalid YouTube ID or URL' });
      }

      sql = `
        UPDATE gallery_items
        SET youtube_id = ?, title_it = ?, title_en = ?, description_it = ?, description_en = ?,
            is_published = ?, display_order = ?, updated_at = datetime('now')
        WHERE id = ? AND item_type = 'video'
      `;
      params = [
        cleanYouTubeId, title_it, title_en, description_it, description_en,
        is_published ? 1 : 0, display_order || 0, req.params.id
      ];
    } else {
      sql = `
        UPDATE gallery_items
        SET title_it = ?, title_en = ?, description_it = ?, description_en = ?,
            is_published = ?, display_order = ?, updated_at = datetime('now')
        WHERE id = ? AND item_type = 'video'
      `;
      params = [
        title_it, title_en, description_it, description_en,
        is_published ? 1 : 0, display_order || 0, req.params.id
      ];
    }

    await runQuery(sql, params);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete video
router.delete('/api/videos/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM gallery_items WHERE id = ? AND item_type = ?', [req.params.id, 'video']);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= AUDIO =============
// Note: Audios GET route removed - use unified /media page instead

// API: Get single audio
router.get('/api/audios/:id', async (req, res) => {
  try {
    const audio = await getQuery(`
      SELECT * FROM gallery_items
      WHERE id = ? AND item_type = 'audio'
    `, [req.params.id]);

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json(audio);
  } catch (error) {
    console.error('Error fetching audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Add audio
router.post('/api/audios', async (req, res) => {
  try {
    const {
      collection_id, bandcamp_url, bandcamp_embed_code, title_it, title_en,
      description_it, description_en, is_published, display_order, duration
    } = req.body;

    const result = await runQuery(`
      INSERT INTO gallery_items (
        collection_id, item_type, bandcamp_url, bandcamp_embed_code, title_it, title_en,
        description_it, description_en, is_published, display_order, duration
      )
      VALUES (?, 'audio', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      collection_id || null, bandcamp_url, bandcamp_embed_code, title_it, title_en,
      description_it, description_en, is_published ? 1 : 0, display_order || 0, duration
    ]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Update audio
router.put('/api/audios/:id', async (req, res) => {
  try {
    const {
      title_it, title_en, description_it, description_en,
      is_published, display_order
    } = req.body;

    await runQuery(`
      UPDATE gallery_items
      SET title_it = ?, title_en = ?, description_it = ?, description_en = ?,
          is_published = ?, display_order = ?, updated_at = datetime('now')
      WHERE id = ? AND item_type = 'audio'
    `, [
      title_it, title_en, description_it, description_en,
      is_published ? 1 : 0, display_order || 0, req.params.id
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete audio
router.delete('/api/audios/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM gallery_items WHERE id = ? AND item_type = ?', [req.params.id, 'audio']);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Reorder items
router.post('/api/items/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, display_order }

    for (const item of items) {
      await runQuery(`
        UPDATE gallery_items
        SET display_order = ?
        WHERE id = ?
      `, [item.display_order, item.id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering items:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= CATEGORIE =============
// Note: Categories GET route removed - use unified /media page instead

// API: Create category
router.post('/api/categories', async (req, res) => {
  try {
    const { name_it, name_en, slug, description_it, description_en, is_active, display_order } = req.body;

    const result = await runQuery(`
      INSERT INTO gallery_categories (name_it, name_en, slug, description_it, description_en, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name_it, name_en, slug, description_it, description_en, is_active ? 1 : 0, display_order || 0]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Update category
router.put('/api/categories/:id', async (req, res) => {
  try {
    const { name_it, name_en, slug, description_it, description_en, is_active, display_order } = req.body;

    await runQuery(`
      UPDATE gallery_categories
      SET name_it = ?, name_en = ?, slug = ?, description_it = ?, description_en = ?,
          is_active = ?, display_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [name_it, name_en, slug, description_it, description_en, is_active ? 1 : 0, display_order || 0, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete category
router.delete('/api/categories/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM gallery_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

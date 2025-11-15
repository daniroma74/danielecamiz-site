import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { allQuery, getQuery, runQuery } from '../utils/database.js';

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

    const recentCollections = await allQuery(`
      SELECT * FROM gallery_collections
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.render('pages/dashboard', {
      title: 'Dashboard - Gallery Admin',
      stats: {
        photos,
        videos,
        audios,
        collections: totalCollections?.count || 0,
        cloudinary: cloudinaryStats || { total_storage_bytes: 0 }
      },
      collectionsByType: collections,
      recentCollections
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Errore caricamento dashboard');
  }
});

// ============= COLLEZIONI =============
router.get('/collections', async (req, res) => {
  try {
    const type = req.query.type;
    let collections;

    if (type) {
      collections = await allQuery(`
        SELECT c.*, COUNT(gi.id) as items_count
        FROM gallery_collections c
        LEFT JOIN gallery_items gi ON c.id = gi.collection_id
        WHERE c.type = ?
        GROUP BY c.id
        ORDER BY c.display_order ASC, c.created_at DESC
      `, [type]);
    } else {
      collections = await allQuery(`
        SELECT c.*, COUNT(gi.id) as items_count
        FROM gallery_collections c
        LEFT JOIN gallery_items gi ON c.id = gi.collection_id
        GROUP BY c.id
        ORDER BY c.display_order ASC, c.created_at DESC
      `);
    }

    res.render('pages/collections', {
      title: 'Collezioni - Gallery Admin',
      collections,
      selectedType: type || null
    });
  } catch (error) {
    console.error('Error loading collections:', error);
    res.status(500).send('Errore caricamento collezioni');
  }
});

router.get('/collections/new', (req, res) => {
  res.render('pages/collection-edit', {
    title: 'Nuova Collezione - Gallery Admin',
    collection: null,
    isNew: true
  });
});

router.get('/collections/:id', async (req, res) => {
  try {
    const collection = await getQuery('SELECT * FROM gallery_collections WHERE id = ?', [req.params.id]);
    if (!collection) {
      return res.status(404).send('Collezione non trovata');
    }

    const items = await allQuery(`
      SELECT * FROM gallery_items
      WHERE collection_id = ?
      ORDER BY display_order ASC, created_at DESC
    `, [req.params.id]);

    res.render('pages/collection-detail', {
      title: `${collection.title_it} - Gallery Admin`,
      collection,
      items
    });
  } catch (error) {
    console.error('Error loading collection:', error);
    res.status(500).send('Errore caricamento collezione');
  }
});

router.get('/collections/:id/edit', async (req, res) => {
  try {
    const collection = await getQuery('SELECT * FROM gallery_collections WHERE id = ?', [req.params.id]);
    if (!collection) {
      return res.status(404).send('Collezione non trovata');
    }

    res.render('pages/collection-edit', {
      title: 'Modifica Collezione - Gallery Admin',
      collection,
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
      cover_cloudinary_id, cover_local_path, is_published, is_featured, display_order
    } = req.body;

    const result = await runQuery(`
      INSERT INTO gallery_collections (
        slug, type, title_it, title_en, description_it, description_en,
        cover_cloudinary_id, cover_local_path, is_published, is_featured, display_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      slug, type, title_it, title_en, description_it, description_en,
      cover_cloudinary_id, cover_local_path,
      is_published ? 1 : 0, is_featured ? 1 : 0, display_order || 0
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
      cover_cloudinary_id, cover_local_path, is_published, is_featured, display_order
    } = req.body;

    await runQuery(`
      UPDATE gallery_collections
      SET slug = ?, type = ?, title_it = ?, title_en = ?, description_it = ?, description_en = ?,
          cover_cloudinary_id = ?, cover_local_path = ?, is_published = ?, is_featured = ?,
          display_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      slug, type, title_it, title_en, description_it, description_en,
      cover_cloudinary_id, cover_local_path,
      is_published ? 1 : 0, is_featured ? 1 : 0, display_order || 0,
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
router.get('/photos', async (req, res) => {
  try {
    const collection_id = req.query.collection;
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

    const collections = await allQuery('SELECT * FROM gallery_collections ORDER BY title_it ASC');

    res.render('pages/photos', {
      title: 'Foto - Gallery Admin',
      photos,
      collections,
      selectedCollection: collection_id || null
    });
  } catch (error) {
    console.error('Error loading photos:', error);
    res.status(500).send('Errore caricamento foto');
  }
});

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

// API: Update photo
router.put('/api/photos/:id', async (req, res) => {
  try {
    const {
      collection_id, title_it, title_en, description_it, description_en,
      alt_it, alt_en, credits, is_published, display_order, taken_date
    } = req.body;

    await runQuery(`
      UPDATE gallery_items
      SET collection_id = ?, title_it = ?, title_en = ?, description_it = ?, description_en = ?,
          alt_it = ?, alt_en = ?, credits = ?, is_published = ?, display_order = ?,
          taken_date = ?, updated_at = datetime('now')
      WHERE id = ? AND item_type = 'photo'
    `, [
      collection_id || null, title_it, title_en, description_it, description_en,
      alt_it, alt_en, credits, is_published ? 1 : 0, display_order || 0, taken_date,
      req.params.id
    ]);

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

// ============= VIDEO =============
router.get('/videos', async (req, res) => {
  try {
    const videos = await allQuery(`
      SELECT * FROM gallery_items
      WHERE item_type = 'video'
      ORDER BY is_spotlight DESC, display_order ASC, created_at DESC
    `);

    const collections = await allQuery('SELECT * FROM gallery_collections ORDER BY title_it ASC');
    const lastSync = await getQuery('SELECT * FROM gallery_youtube_sync ORDER BY created_at DESC LIMIT 1');

    res.render('pages/videos', {
      title: 'Video - Gallery Admin',
      videos,
      collections,
      lastSync
    });
  } catch (error) {
    console.error('Error loading videos:', error);
    res.status(500).send('Errore caricamento video');
  }
});

// API: Sync YouTube (placeholder - da implementare con YouTube API)
router.post('/api/videos/sync-youtube', async (req, res) => {
  try {
    // TODO: Implementare sync con YouTube Data API v3
    res.json({ success: true, message: 'YouTube sync da implementare' });
  } catch (error) {
    console.error('Error syncing YouTube:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Add/Update video
router.post('/api/videos', async (req, res) => {
  try {
    const {
      collection_id, youtube_id, title_it, title_en, description_it, description_en,
      timecode, is_spotlight, is_whitelisted, is_published, display_order, duration
    } = req.body;

    const result = await runQuery(`
      INSERT INTO gallery_items (
        collection_id, item_type, youtube_id, title_it, title_en, description_it, description_en,
        timecode, is_spotlight, is_whitelisted, is_published, display_order, duration
      )
      VALUES (?, 'video', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      collection_id || null, youtube_id, title_it, title_en, description_it, description_en,
      timecode, is_spotlight ? 1 : 0, is_whitelisted ? 1 : 0, is_published ? 1 : 0,
      display_order || 0, duration
    ]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating video:', error);
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
router.get('/audios', async (req, res) => {
  try {
    const audios = await allQuery(`
      SELECT * FROM gallery_items
      WHERE item_type = 'audio'
      ORDER BY display_order ASC, created_at DESC
    `);

    const collections = await allQuery('SELECT * FROM gallery_collections ORDER BY title_it ASC');

    res.render('pages/audios', {
      title: 'Audio - Gallery Admin',
      audios,
      collections
    });
  } catch (error) {
    console.error('Error loading audios:', error);
    res.status(500).send('Errore caricamento audio');
  }
});

// API: Add/Update audio
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

// ============= CATEGORIE =============
router.get('/categories', async (req, res) => {
  try {
    const categories = await allQuery(`
      SELECT * FROM gallery_categories
      ORDER BY display_order ASC, name_it ASC
    `);

    res.render('pages/categories', {
      title: 'Categorie - Gallery Admin',
      categories
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).send('Errore caricamento categorie');
  }
});

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

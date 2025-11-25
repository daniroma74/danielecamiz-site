import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { allQuery, getQuery, runQuery } from '../utils/database.js';

const router = express.Router();

router.use(ensureAuthenticated);

// Dashboard
router.get('/', async (req, res) => {
  try {
    const sections = ['biography', 'curriculum', 'story'];
    const stats = {};

    for (const section of sections) {
      const it = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', [section, 'it']);
      const en = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', [section, 'en']);
      stats[section] = { it: !!it, en: !!en };
    }

    const presskitCount = await getQuery('SELECT COUNT(*) as count FROM press_kit_files WHERE is_published = 1');

    res.render('pages/dashboard', {
      title: 'Dashboard - Bio Admin',
      stats,
      presskitCount: presskitCount.count
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Errore caricamento dashboard');
  }
});

// Biography
router.get('/biography', async (req, res) => {
  try {
    const it = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', ['biography', 'it']);
    const en = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', ['biography', 'en']);

    res.render('pages/biography', {
      title: 'Biografia - Bio Admin',
      contentIt: it,
      contentEn: en
    });
  } catch (error) {
    console.error('Error loading biography:', error);
    res.status(500).send('Errore caricamento biografia');
  }
});

// Curriculum
router.get('/curriculum', async (req, res) => {
  try {
    const it = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', ['curriculum', 'it']);
    const en = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', ['curriculum', 'en']);

    res.render('pages/curriculum', {
      title: 'Curriculum - Bio Admin',
      contentIt: it,
      contentEn: en
    });
  } catch (error) {
    console.error('Error loading curriculum:', error);
    res.status(500).send('Errore caricamento curriculum');
  }
});

// Story
router.get('/story', async (req, res) => {
  try {
    const it = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', ['story', 'it']);
    const en = await getQuery('SELECT * FROM bio_content WHERE section = ? AND lang = ?', ['story', 'en']);

    res.render('pages/story', {
      title: 'Storia - Bio Admin',
      contentIt: it,
      contentEn: en
    });
  } catch (error) {
    console.error('Error loading story:', error);
    res.status(500).send('Errore caricamento storia');
  }
});

// Press Kit
router.get('/presskit', async (req, res) => {
  try {
    const assets = await allQuery(`
      SELECT * FROM press_kit_files
      ORDER BY type ASC, display_order ASC, created_at DESC
    `);

    res.render('pages/presskit-new', {
      title: 'Press Kit - Bio Admin',
      assets
    });
  } catch (error) {
    console.error('Error loading presskit:', error);
    res.status(500).send('Errore caricamento press kit');
  }
});

// Save bio content
router.post('/content/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { lang, title, intro, content, short_text, long_text } = req.body;

    const existing = await getQuery(
      'SELECT id FROM bio_content WHERE section = ? AND lang = ?',
      [section, lang]
    );

    if (existing) {
      await runQuery(`
        UPDATE bio_content
        SET title = ?, intro = ?, content = ?, short_text = ?, long_text = ?, updated_at = datetime('now')
        WHERE section = ? AND lang = ?
      `, [title, intro, content, short_text, long_text, section, lang]);
    } else {
      await runQuery(`
        INSERT INTO bio_content (section, lang, title, intro, content, short_text, long_text)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [section, lang, title, intro, content, short_text, long_text]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Presskit assets - updated to use press_kit_files table
router.post('/presskit/assets', async (req, res) => {
  try {
    const { type, category, cloudinary_id, cloudinary_url, youtube_id, youtube_url, title_it, title_en, description_it, description_en, file_size, format, width, height } = req.body;

    const result = await runQuery(`
      INSERT INTO press_kit_files
      (type, category, cloudinary_id, cloudinary_url, youtube_id, youtube_url,
       title_it, title_en, description_it, description_en,
       file_size, format, width, height, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `, [
      type, category || null,
      cloudinary_id || null, cloudinary_url || null,
      youtube_id || null, youtube_url || null,
      title_it || null, title_en || null,
      description_it || null, description_en || null,
      file_size || null, format || null,
      width || null, height || null
    ]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error adding asset:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/presskit/assets/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM press_kit_files WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

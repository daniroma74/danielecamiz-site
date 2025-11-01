import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import { allQuery, getQuery, runQuery } from '../utils/database.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/', async (req, res) => {
  try {
    const articlesCount = await getQuery('SELECT COUNT(*) as count FROM press_items WHERE kind = ?', ['article']);
    const quotesCount = await getQuery('SELECT COUNT(*) as count FROM press_quotes');

    const recentArticles = await allQuery(`
      SELECT pi.*, pi18n.title, pi18n.excerpt
      FROM press_items pi
      LEFT JOIN press_i18n pi18n ON pi.id = pi18n.press_id AND pi18n.lang = 'it'
      WHERE pi.kind = 'article'
      ORDER BY pi.created_at DESC
      LIMIT 5
    `);

    const recentQuotes = await allQuery(`
      SELECT * FROM press_quotes
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.render('pages/dashboard', {
      title: 'Dashboard - Press Admin',
      stats: {
        articles: articlesCount.count,
        quotes: quotesCount.count
      },
      recentArticles,
      recentQuotes
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Errore caricamento dashboard');
  }
});

router.get('/articles', async (req, res) => {
  try {
    const articles = await allQuery(`
      SELECT pi.*, pi18n.title, pi18n.excerpt
      FROM press_items pi
      LEFT JOIN press_i18n pi18n ON pi.id = pi18n.press_id AND pi18n.lang = 'it'
      WHERE pi.kind = 'article'
      ORDER BY pi.date DESC, pi.created_at DESC
    `);

    res.render('pages/articles', {
      title: 'Articoli - Press Admin',
      articles
    });
  } catch (error) {
    console.error('Error loading articles:', error);
    res.status(500).send('Errore caricamento articoli');
  }
});

router.get('/quotes', async (req, res) => {
  try {
    const quotes = await allQuery(`
      SELECT * FROM press_quotes
      ORDER BY display_order ASC, published_date DESC, created_at DESC
    `);

    res.render('pages/quotes', {
      title: 'Citazioni - Press Admin',
      quotes
    });
  } catch (error) {
    console.error('Error loading quotes:', error);
    res.status(500).send('Errore caricamento citazioni');
  }
});

router.get('/articles/new', (req, res) => {
  res.render('pages/article-edit', {
    title: 'Nuovo Articolo - Press Admin',
    article: null,
    isNew: true
  });
});

router.get('/articles/:id/edit', async (req, res) => {
  try {
    const article = await getQuery('SELECT * FROM press_items WHERE id = ?', [req.params.id]);
    const translations = await allQuery('SELECT * FROM press_i18n WHERE press_id = ?', [req.params.id]);

    res.render('pages/article-edit', {
      title: 'Modifica Articolo - Press Admin',
      article: {
        ...article,
        translations: translations.reduce((acc, t) => {
          acc[t.lang] = t;
          return acc;
        }, {})
      },
      isNew: false
    });
  } catch (error) {
    console.error('Error loading article:', error);
    res.status(500).send('Errore caricamento articolo');
  }
});

router.post('/articles', async (req, res) => {
  try {
    const { slug, publisher, date, url, title_it, title_en, excerpt_it, excerpt_en, body_md_it, body_md_en } = req.body;

    const result = await runQuery(`
      INSERT INTO press_items (slug, kind, publisher, date, url)
      VALUES (?, 'article', ?, ?, ?)
    `, [slug, publisher, date, url]);

    const articleId = result.lastID;

    if (title_it || excerpt_it || body_md_it) {
      await runQuery(`
        INSERT INTO press_i18n (press_id, lang, title, excerpt, body_md)
        VALUES (?, 'it', ?, ?, ?)
      `, [articleId, title_it, excerpt_it, body_md_it]);
    }

    if (title_en || excerpt_en || body_md_en) {
      await runQuery(`
        INSERT INTO press_i18n (press_id, lang, title, excerpt, body_md)
        VALUES (?, 'en', ?, ?, ?)
      `, [articleId, title_en, excerpt_en, body_md_en]);
    }

    res.json({ success: true, id: articleId });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/articles/:id', async (req, res) => {
  try {
    const { slug, publisher, date, url, title_it, title_en, excerpt_it, excerpt_en, body_md_it, body_md_en } = req.body;

    await runQuery(`
      UPDATE press_items
      SET slug = ?, publisher = ?, date = ?, url = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [slug, publisher, date, url, req.params.id]);

    await runQuery('DELETE FROM press_i18n WHERE press_id = ?', [req.params.id]);

    if (title_it || excerpt_it || body_md_it) {
      await runQuery(`
        INSERT INTO press_i18n (press_id, lang, title, excerpt, body_md)
        VALUES (?, 'it', ?, ?, ?)
      `, [req.params.id, title_it, excerpt_it, body_md_it]);
    }

    if (title_en || excerpt_en || body_md_en) {
      await runQuery(`
        INSERT INTO press_i18n (press_id, lang, title, excerpt, body_md)
        VALUES (?, 'en', ?, ?, ?)
      `, [req.params.id, title_en, excerpt_en, body_md_en]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/articles/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM press_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/quotes', async (req, res) => {
  try {
    const { quote_it, quote_en, source, source_role_it, source_role_en, published_date, url, is_published, is_featured, display_order } = req.body;

    const result = await runQuery(`
      INSERT INTO press_quotes (quote_it, quote_en, source, source_role_it, source_role_en, published_date, url, is_published, is_featured, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [quote_it, quote_en, source, source_role_it, source_role_en, published_date, url, is_published ? 1 : 0, is_featured ? 1 : 0, display_order || 0]);

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/quotes/:id', async (req, res) => {
  try {
    const { quote_it, quote_en, source, source_role_it, source_role_en, published_date, url, is_published, is_featured, display_order } = req.body;

    await runQuery(`
      UPDATE press_quotes
      SET quote_it = ?, quote_en = ?, source = ?, source_role_it = ?, source_role_en = ?, published_date = ?, url = ?, is_published = ?, is_featured = ?, display_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [quote_it, quote_en, source, source_role_it, source_role_en, published_date, url, is_published ? 1 : 0, is_featured ? 1 : 0, display_order || 0, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/quotes/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM press_quotes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

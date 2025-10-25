// news-admin/routes/news.js
import express from 'express';
import { queryDB, getOne, runDB } from '../utils/database.js';
import { ensureAuthenticated } from '../middleware/simpleAuth.js';
import { config } from '../config/config.js';

const router = express.Router();

// Lista news
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const status = req.query.status || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM news_posts';
    let params = [];
    
    if (status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const posts = await queryDB(sql, params);
    
    const countSql = status === 'all' 
      ? 'SELECT COUNT(*) as total FROM news_posts'
      : 'SELECT COUNT(*) as total FROM news_posts WHERE status = ?';
    const countParams = status === 'all' ? [] : [status];
    const { total } = await getOne(countSql, countParams);
    
    res.render('news-list', {
      posts,
      status,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('[NEWS] Error listing:', error);
    res.status(500).send('Errore caricamento news');
  }
});

// Form nuovo post
router.get('/new', ensureAuthenticated, (req, res) => {
  res.render('news-edit', {
    post: null,
    isNew: true,
    categories: config.defaults.categories
  });
});

// Form modifica post
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const post = await getOne('SELECT * FROM news_posts WHERE id = ?', [req.params.id]);
    
    if (!post) {
      return res.status(404).send('Post non trovato');
    }
    
    // Parse JSON fields
    if (post.tags) post.tags = JSON.parse(post.tags);
    if (post.gallery_images) post.gallery_images = JSON.parse(post.gallery_images);
    if (post.social_providers) post.social_providers = JSON.parse(post.social_providers);
    if (post.social_messages) post.social_messages = JSON.parse(post.social_messages);
    if (post.social_status) post.social_status = JSON.parse(post.social_status);
    
    res.render('news-edit', {
      post,
      isNew: false,
      categories: config.defaults.categories
    });
  } catch (error) {
    console.error('[NEWS] Error loading post:', error);
    res.status(500).send('Errore caricamento post');
  }
});

// Salva nuovo post
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const data = req.body;
    
    const sql = `
      INSERT INTO news_posts (
        slug, status, title_it, title_en, excerpt_it, excerpt_en,
        content_it, content_en, cover_image, gallery_images,
        category, tags, author, publish_date,
        meta_title_it, meta_title_en, meta_description_it, meta_description_en,
        social_share_on_publish, social_providers, social_messages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.slug,
      data.status || 'draft',
      data.title_it,
      data.title_en || null,
      data.excerpt_it || null,
      data.excerpt_en || null,
      data.content_it,
      data.content_en || null,
      data.cover_image || null,
      data.gallery_images ? JSON.stringify(data.gallery_images) : null,
      data.category || 'news',
      data.tags ? JSON.stringify(data.tags) : null,
      data.author || config.defaults.author,
      data.publish_date || null,
      data.meta_title_it || null,
      data.meta_title_en || null,
      data.meta_description_it || null,
      data.meta_description_en || null,
      data.social_share_on_publish ? 1 : 0,
      data.social_providers ? JSON.stringify(data.social_providers) : null,
      data.social_messages ? JSON.stringify(data.social_messages) : null
    ];
    
    const result = await runDB(sql, params);
    
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('[NEWS] Error creating post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Aggiorna post
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;
    
    const sql = `
      UPDATE news_posts SET
        slug = ?, status = ?, title_it = ?, title_en = ?,
        excerpt_it = ?, excerpt_en = ?, content_it = ?, content_en = ?,
        cover_image = ?, gallery_images = ?, category = ?, tags = ?,
        author = ?, publish_date = ?,
        meta_title_it = ?, meta_title_en = ?,
        meta_description_it = ?, meta_description_en = ?,
        social_share_on_publish = ?, social_providers = ?, social_messages = ?
      WHERE id = ?
    `;
    
    const params = [
      data.slug,
      data.status || 'draft',
      data.title_it,
      data.title_en || null,
      data.excerpt_it || null,
      data.excerpt_en || null,
      data.content_it,
      data.content_en || null,
      data.cover_image || null,
      data.gallery_images ? JSON.stringify(data.gallery_images) : null,
      data.category || 'news',
      data.tags ? JSON.stringify(data.tags) : null,
      data.author || config.defaults.author,
      data.publish_date || null,
      data.meta_title_it || null,
      data.meta_title_en || null,
      data.meta_description_it || null,
      data.meta_description_en || null,
      data.social_share_on_publish ? 1 : 0,
      data.social_providers ? JSON.stringify(data.social_providers) : null,
      data.social_messages ? JSON.stringify(data.social_messages) : null,
      id
    ];
    
    await runDB(sql, params);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[NEWS] Error updating post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Elimina post
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    await runDB('DELETE FROM news_posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[NEWS] Error deleting post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pubblica post
router.post('/:id/publish', ensureAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Aggiorna status a published
    await runDB(
      `UPDATE news_posts 
       SET status = 'published', 
           publish_date = COALESCE(publish_date, datetime('now')),
           updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );
    
    const post = await getOne('SELECT * FROM news_posts WHERE id = ?', [id]);
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('[NEWS] Error publishing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Depubblica post
router.post('/:id/unpublish', ensureAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    
    await runDB(
      `UPDATE news_posts 
       SET status = 'draft', 
           updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );
    
    const post = await getOne('SELECT * FROM news_posts WHERE id = ?', [id]);
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('[NEWS] Error unpublishing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pubblica sui social
router.post('/:id/publish-social', ensureAuthenticated, async (req, res) => {
  try {
    const post = await getOne('SELECT * FROM news_posts WHERE id = ?', [req.params.id]);
    
    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }
    
    const { providers, messages } = req.body;
    
    // Pubblica sui social
    const { publishToProviders } = await import('../../cms/services/social/index.js');
    
    const results = await publishToProviders({
      providers,
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title_it,
        url: `${config.frontendUrl}/news/${post.slug}`,
        imageUrl: post.cover_image
      },
      baseUrl: config.frontendUrl,
      overrides: messages
    });
    
    // Salva risultati
    await runDB(
      'UPDATE news_posts SET social_status = ? WHERE id = ?',
      [JSON.stringify(results), post.id]
    );
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('[NEWS] Error publishing to social:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pubblica su Contact Site (highlights)
router.post('/:id/publish-contact', ensureAuthenticated, async (req, res) => {
  try {
    const post = await getOne('SELECT * FROM news_posts WHERE id = ?', [req.params.id]);
    
    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }
    
    // Crea highlight per contact site
    const highlight = {
      id: `news_${post.id}`,
      type: 'news',
      title: post.title_it,
      excerpt: post.excerpt_it || post.content_it.substring(0, 150),
      image: post.cover_image,
      url: `${config.frontendUrl}/news/${post.slug}`,
      publishedAt: post.publish_date || post.created_at
    };
    
    // TODO: Chiama API contact site per aggiungere highlight
    // Per ora salviamo solo lo stato
    
    res.json({ success: true, highlight });
  } catch (error) {
    console.error('[NEWS] Error publishing to contact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
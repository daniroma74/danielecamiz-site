// news-admin/routes/news.js
import express from 'express';
import { queryDB, getOne, runDB } from '../utils/database.js';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
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
        social_share_on_publish, social_providers, social_messages,
        include_in_newsletter
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.include_in_newsletter || 0
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
        social_share_on_publish = ?, social_providers = ?, social_messages = ?,
        include_in_newsletter = ?
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
      data.include_in_newsletter || 0,
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

// ===== NEWSLETTER DIGEST ROUTES =====

// Newsletter Digest Dashboard
router.get('/newsletter', ensureAuthenticated, async (req, res) => {
  try {
    // Get selected posts (include_in_newsletter = 1 and not sent yet)
    const selectedPosts = await queryDB(
      `SELECT * FROM news_posts
       WHERE include_in_newsletter = 1
       AND (newsletter_sent_at IS NULL OR newsletter_sent_at = '')
       AND status = 'published'
       ORDER BY publish_date DESC`
    );

    // Get subscribers count
    const subscribersResult = await getOne(
      `SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active'`
    );
    const subscribersCount = subscribersResult ? subscribersResult.count : 0;

    // Get last digest sent
    const lastDigest = await getOne(
      `SELECT * FROM newsletter_digests WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 1`
    );

    res.render('newsletter-digest', {
      selectedPosts,
      subscribersCount,
      lastDigest
    });
  } catch (error) {
    console.error('[NEWS] Error loading newsletter digest:', error);
    res.status(500).send('Errore caricamento digest newsletter');
  }
});

// Newsletter Preview (HTML)
router.get('/newsletter/preview', ensureAuthenticated, async (req, res) => {
  try {
    const selectedPosts = await queryDB(
      `SELECT * FROM news_posts
       WHERE include_in_newsletter = 1
       AND (newsletter_sent_at IS NULL OR newsletter_sent_at = '')
       AND status = 'published'
       ORDER BY publish_date DESC`
    );

    // Generate preview HTML
    const html = generateDigestHTML(selectedPosts, config);

    res.json({ success: true, html });
  } catch (error) {
    console.error('[NEWS] Error generating preview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Newsletter Send
router.post('/newsletter/send', ensureAuthenticated, async (req, res) => {
  try {
    // Get selected posts
    const selectedPosts = await queryDB(
      `SELECT * FROM news_posts
       WHERE include_in_newsletter = 1
       AND (newsletter_sent_at IS NULL OR newsletter_sent_at = '')
       AND status = 'published'`
    );

    if (selectedPosts.length === 0) {
      return res.status(400).json({ error: 'Nessun post selezionato' });
    }

    // Get active subscribers
    const subscribers = await queryDB(
      `SELECT email FROM newsletter_subscribers WHERE status = 'active'`
    );

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'Nessun iscritto attivo' });
    }

    // Create digest record
    const digestName = `Digest ${new Date().toLocaleDateString('it-IT', {month: 'long', year: 'numeric'})}`;
    const postIds = selectedPosts.map(p => p.id);

    const digestResult = await runDB(
      `INSERT INTO newsletter_digests (digest_name, post_ids, status, recipient_count, sent_at)
       VALUES (?, ?, 'sent', ?, datetime('now'))`,
      [digestName, JSON.stringify(postIds), subscribers.length]
    );

    // TODO: Actually send emails via newsletter-service
    // For now, just mark posts as sent

    const now = new Date().toISOString();
    for (const post of selectedPosts) {
      await runDB(
        `UPDATE news_posts SET newsletter_sent_at = ? WHERE id = ?`,
        [now, post.id]
      );
    }

    res.json({
      success: true,
      sent: subscribers.length,
      digestId: digestResult.lastID
    });
  } catch (error) {
    console.error('[NEWS] Error sending newsletter:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== API FOR NEWSLETTER-SERVICE INTEGRATION =====

// API: Get selected posts for newsletter
router.get('/api/newsletter-posts', async (req, res) => {
  try {
    const selectedPosts = await queryDB(
      `SELECT id, slug, title_it, title_en, excerpt_it, excerpt_en,
              content_it, content_en, cover_image, category, publish_date, created_at
       FROM news_posts
       WHERE include_in_newsletter = 1
       AND (newsletter_sent_at IS NULL OR newsletter_sent_at = '')
       AND status = 'published'
       ORDER BY publish_date DESC`
    );

    res.json({
      success: true,
      posts: selectedPosts,
      count: selectedPosts.length
    });
  } catch (error) {
    console.error('[NEWS API] Error getting newsletter posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Mark posts as sent
router.post('/api/newsletter-posts/mark-sent', async (req, res) => {
  try {
    const { postIds } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No post IDs provided' });
    }

    const now = new Date().toISOString();

    for (const id of postIds) {
      await runDB(
        `UPDATE news_posts SET newsletter_sent_at = ? WHERE id = ?`,
        [now, id]
      );
    }

    res.json({ success: true, marked: postIds.length });
  } catch (error) {
    console.error('[NEWS API] Error marking posts as sent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to generate digest HTML
function generateDigestHTML(posts, config) {
  const headerImg = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1/danielecamiz/header-newsletter.jpg';

  let html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter Digest - Daniele Camiz</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1a1a1a; color: #ffffff; padding: 2rem; text-align: center; }
    .header h1 { margin: 0; font-size: 2rem; font-weight: 300; }
    .intro { padding: 2rem; font-size: 1.1rem; line-height: 1.6; color: #333; }
    .post { padding: 1.5rem; border-bottom: 1px solid #e0e0e0; }
    .post:last-child { border-bottom: none; }
    .post-title { font-size: 1.5rem; margin: 0 0 0.5rem; color: #1a1a1a; font-weight: 600; }
    .post-meta { color: #666; font-size: 0.9rem; margin-bottom: 0.75rem; }
    .post-excerpt { color: #444; line-height: 1.6; margin-bottom: 1rem; }
    .post-link { display: inline-block; background: #d4af37; color: #000; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: 600; }
    .post-link:hover { background: #c19b2b; }
    .footer { background: #1a1a1a; color: #999; padding: 2rem; text-align: center; font-size: 0.9rem; }
    .footer a { color: #d4af37; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📰 Newsletter Digest</h1>
      <p style="margin: 0.5rem 0 0; opacity: 0.9;">Daniele Camiz - Direttore d'Orchestra</p>
    </div>

    <div class="intro">
      <p>Caro lettore,</p>
      <p>Ecco le ultime notizie e aggiornamenti dal mondo della musica e dei concerti.</p>
    </div>
`;

  // Add each post
  posts.forEach(post => {
    const url = `${config.frontendUrl}/news/${post.slug}`;
    const date = new Date(post.publish_date || post.created_at).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    html += `
    <div class="post">
      <h2 class="post-title">${post.title_it}</h2>
      <p class="post-meta">${post.category || 'News'} • ${date}</p>
      <p class="post-excerpt">${post.excerpt_it || post.content_it.substring(0, 200) + '...'}</p>
      <a href="${url}" class="post-link">Leggi l'articolo completo →</a>
    </div>
`;
  });

  html += `
    <div class="footer">
      <p>Grazie per aver letto!</p>
      <p style="margin-top: 1rem;">
        <a href="${config.frontendUrl}">Visita il sito</a> •
        <a href="${config.frontendUrl}/newsletter/manage">Gestisci iscrizione</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

export default router;
// cms/utils/newsStore.js
// Store per news - LEGGE DAL DATABASE (news_posts table)

import sqliteMain from './sqliteMain.js';

const db = sqliteMain.getDb();

/**
 * Lista post pubblicati
 */
export function listPublished({ lang = '', limit = 100 } = {}) {
  const now = new Date().toISOString();
  
  let sql = `SELECT * FROM news_posts 
             WHERE status = 'published' 
             AND (publish_date IS NULL OR publish_date <= ?)`;
  
  const params = [now];
  
  // Filtro lingua: verifica che ci sia contenuto nella lingua richiesta
  if (lang) {
    if (lang === 'it') {
      sql += ' AND title_it IS NOT NULL';
    } else if (lang === 'en') {
      sql += ' AND title_en IS NOT NULL';
    }
  }
  
  sql += ' ORDER BY publish_date DESC, created_at DESC LIMIT ?';
  params.push(limit);
  
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('[newsStore] listPublished error:', err);
        resolve([]);
      } else {
        resolve(rows.map(row => normalizePost(row, lang)));
      }
    });
  });
}

/**
 * Lista tutti i post (con filtri)
 */
export function list({ lang = '', status = '', q = '', offset = 0, limit = 20 } = {}) {
  let sql = 'SELECT * FROM news_posts WHERE 1=1';
  const params = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  if (q) {
    sql += ' AND (title_it LIKE ? OR title_en LIKE ? OR content_it LIKE ? OR content_en LIKE ?)';
    const search = `%${q}%`;
    params.push(search, search, search, search);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  return new Promise((resolve, reject) => {
    // Count total
    let countSql = 'SELECT COUNT(*) as total FROM news_posts WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    if (q) {
      countSql += ' AND (title_it LIKE ? OR title_en LIKE ? OR content_it LIKE ? OR content_en LIKE ?)';
      const search = `%${q}%`;
      countParams.push(search, search, search, search);
    }
    
    db.get(countSql, countParams, (err, row) => {
      if (err) {
        console.error('[newsStore] count error:', err);
        resolve({ total: 0, items: [] });
        return;
      }
      
      const total = row?.total || 0;
      
      db.all(sql, params, (err2, rows) => {
        if (err2) {
          console.error('[newsStore] list error:', err2);
          resolve({ total, items: [] });
        } else {
          resolve({ 
            total, 
            items: rows.map(normalizePost) 
          });
        }
      });
    });
  });
}

/**
 * Recupera post per ID
 */
export function getById(id) {
  const sql = 'SELECT * FROM news_posts WHERE id = ?';
  
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('[newsStore] getById error:', err);
        resolve(null);
      } else {
        resolve(row ? normalizePost(row) : null);
      }
    });
  });
}

/**
 * Recupera post per slug o ID
 */
export function getByIdOrSlug(idOrSlug, { lang } = {}) {
  const sql = lang
    ? 'SELECT * FROM news_posts WHERE (id = ? OR slug = ?) AND (title_it IS NOT NULL OR title_en IS NOT NULL) LIMIT 1'
    : 'SELECT * FROM news_posts WHERE (id = ? OR slug = ?) LIMIT 1';
  
  return new Promise((resolve, reject) => {
    db.get(sql, [idOrSlug, idOrSlug], (err, row) => {
      if (err) {
        console.error('[newsStore] getByIdOrSlug error:', err);
        resolve(null);
      } else {
        resolve(row ? normalizePost(row) : null);
      }
    });
  });
}

/**
 * Normalizza post dal DB al formato usato dal frontend
 */
function normalizePost(row) {
  if (!row) return null;
  
  // Determina lingua principale
  const hasIt = !!row.title_it;
  const hasEn = !!row.title_en;
  const lang = hasIt ? 'it' : (hasEn ? 'en' : 'it');
  
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    lang: lang,
    
    // Titoli
    title: lang === 'it' ? row.title_it : row.title_en,
    title_it: row.title_it,
    title_en: row.title_en,
    
    // Contenuti
    excerpt: lang === 'it' ? row.excerpt_it : row.excerpt_en,
    excerpt_it: row.excerpt_it,
    excerpt_en: row.excerpt_en,
    content_md: lang === 'it' ? row.content_it : row.content_en,
    content_it: row.content_it,
    content_en: row.content_en,
    
    // Media
    cover_url: row.cover_image,
    gallery_images: row.gallery_images ? JSON.parse(row.gallery_images) : [],
    
    // Meta
    category: row.category,
    category_id: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    author: row.author,
    
    // Date
    published_at: row.publish_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    
    // SEO
    seo: {
      title: lang === 'it' ? row.meta_title_it : row.meta_title_en,
      description: lang === 'it' ? row.meta_description_it : row.meta_description_en,
      og_image: row.cover_image
    },
    
    // Social
    social: {
      share_on_publish: !!row.social_share_on_publish,
      providers: row.social_providers ? JSON.parse(row.social_providers) : {},
      message_overrides: row.social_messages ? JSON.parse(row.social_messages) : {},
      status: row.social_status ? JSON.parse(row.social_status) : {}
    }
  };
}

/**
 * Crea nuovo post (usato dall'admin)
 */
export function create(data) {
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
    data.title_it || data.title,
    data.title_en || null,
    data.excerpt_it || data.excerpt || null,
    data.excerpt_en || null,
    data.content_it || data.content_md || data.content,
    data.content_en || null,
    data.cover_url || data.cover_image || null,
    data.gallery_images ? JSON.stringify(data.gallery_images) : null,
    data.category || 'news',
    data.tags ? JSON.stringify(data.tags) : null,
    data.author || 'Daniele Camiz',
    data.published_at || data.publish_date || new Date().toISOString(),
    data.seo?.title || null,
    null,
    data.seo?.description || null,
    null,
    data.social?.share_on_publish ? 1 : 0,
    data.social?.providers ? JSON.stringify(data.social.providers) : null,
    data.social?.message_overrides ? JSON.stringify(data.social.message_overrides) : null
  ];
  
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('[newsStore] create error:', err);
        reject(err);
      } else {
        getById(this.lastID).then(resolve).catch(reject);
      }
    });
  });
}

/**
 * Aggiorna post
 */
export function update(id, data) {
  const sql = `
    UPDATE news_posts SET
      slug = ?, status = ?, title_it = ?, title_en = ?,
      excerpt_it = ?, excerpt_en = ?, content_it = ?, content_en = ?,
      cover_image = ?, gallery_images = ?, category = ?, tags = ?,
      author = ?, publish_date = ?,
      meta_title_it = ?, meta_title_en = ?, meta_description_it = ?, meta_description_en = ?,
      social_share_on_publish = ?, social_providers = ?, social_messages = ?, social_status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [
    data.slug,
    data.status,
    data.title_it || data.title,
    data.title_en || null,
    data.excerpt_it || data.excerpt || null,
    data.excerpt_en || null,
    data.content_it || data.content_md || data.content,
    data.content_en || null,
    data.cover_url || data.cover_image || null,
    data.gallery_images ? JSON.stringify(data.gallery_images) : null,
    data.category,
    data.tags ? JSON.stringify(data.tags) : null,
    data.author,
    data.published_at || data.publish_date,
    data.seo?.title || null,
    null,
    data.seo?.description || null,
    null,
    data.social?.share_on_publish ? 1 : 0,
    data.social?.providers ? JSON.stringify(data.social.providers) : null,
    data.social?.message_overrides ? JSON.stringify(data.social.message_overrides) : null,
    data.social?.status ? JSON.stringify(data.social.status) : null,
    id
  ];
  
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('[newsStore] update error:', err);
        reject(err);
      } else {
        getById(id).then(resolve).catch(reject);
      }
    });
  });
}

/**
 * Pubblica post
 */
export function publish(id) {
  const sql = `
    UPDATE news_posts 
    SET status = 'published', 
        publish_date = COALESCE(publish_date, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  return new Promise((resolve, reject) => {
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('[newsStore] publish error:', err);
        reject(err);
      } else {
        getById(id).then(resolve).catch(reject);
      }
    });
  });
}

/**
 * Rimuovi post
 */
export function remove(id) {
  const sql = 'DELETE FROM news_posts WHERE id = ?';
  
  return new Promise((resolve, reject) => {
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('[newsStore] remove error:', err);
        reject(err);
      } else {
        resolve({ success: true, changes: this.changes });
      }
    });
  });
}
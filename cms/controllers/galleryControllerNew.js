// cms/controllers/galleryControllerNew.js
import path from 'path';
import { getDb as getMainDb } from '../utils/sqliteMain.js';
import { listPageCss } from '../utils/assetHelpers.js';
import { resolveAsset } from '../utils/mediaResolver.js';
import { getLatestVideos } from '../utils/youtubeService.js';

const CMS_ROOT = process.cwd();
const I18N_DIR = path.join(CMS_ROOT, 'data', 'i18n');

/* ===================== DB helpers ===================== */
function qAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function qGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

/* ===================== Asset resolution ===================== */
function resolveCover(collection) {
  if (collection.cover_cloudinary_id) {
    return resolveAsset(
      { storage: 'cloudinary', cloudinary_id: collection.cover_cloudinary_id },
      { width: 800, crop: 'fill', quality: 'auto', format: 'auto' }
    );
  }
  if (collection.cover_local_path) {
    return collection.cover_local_path.startsWith('/')
      ? collection.cover_local_path
      : `/uploads/${collection.cover_local_path}`;
  }
  return '/img/placeholder-gallery.jpg';
}

function resolveItemMedia(item) {
  if (item.item_type === 'photo' && item.cloudinary_id) {
    return {
      thumbnail: resolveAsset(
        { storage: 'cloudinary', cloudinary_id: item.cloudinary_id },
        { width: 600, crop: 'fill', quality: 'auto', format: 'auto' }
      ),
      full: resolveAsset(
        { storage: 'cloudinary', cloudinary_id: item.cloudinary_id },
        { width: 1920, crop: 'limit', quality: 'auto', format: 'auto' }
      )
    };
  }

  if (item.item_type === 'video' && item.youtube_id) {
    return {
      thumbnail: `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${item.youtube_id}`,
      embed: `https://www.youtube.com/embed/${item.youtube_id}`
    };
  }

  if (item.item_type === 'audio' && item.bandcamp_url) {
    return {
      url: item.bandcamp_url,
      embed: item.bandcamp_embed_code || null
    };
  }

  return null;
}

/* ===================== Controllers ===================== */

/**
 * Gallery Overview - Shows photo/video/audio sections
 */
export async function getGalleryOverview(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const db = await getMainDb();

    // Count collections by type
    const stats = await qAll(db, `
      SELECT
        type,
        COUNT(*) as count
      FROM gallery_collections
      WHERE is_published = 1
      GROUP BY type
    `);

    const statsByType = {};
    stats.forEach(s => { statsByType[s.type] = s.count; });

    // Count total items by type
    const itemStats = await qAll(db, `
      SELECT
        gi.item_type,
        COUNT(*) as count
      FROM gallery_items gi
      JOIN gallery_collections gc ON gi.collection_id = gc.id
      WHERE gi.is_published = 1 AND gc.is_published = 1
      GROUP BY gi.item_type
    `);

    const itemsByType = {};
    itemStats.forEach(s => { itemsByType[s.item_type] = s.count; });

    // Get preview images for photos (first 3 published photo collections' covers)
    const photoCovers = await qAll(db, `
      SELECT cover_cloudinary_id
      FROM gallery_collections
      WHERE type = 'photo' AND is_published = 1 AND cover_cloudinary_id IS NOT NULL
      ORDER BY is_featured DESC, display_order ASC, created_at DESC
      LIMIT 3
    `);
    const photoPreviewImages = photoCovers.map(c =>
      resolveAsset(
        { storage: 'cloudinary', cloudinary_id: c.cover_cloudinary_id },
        { width: 800, crop: 'fill', quality: 'auto', format: 'auto' }
      )
    );

    // Get preview image for videos - use auto-sync YouTube if available
    let videoPreviewImage = null;

    // Check for auto-sync video collection
    const autoSyncVideoCollection = await qGet(db, `
      SELECT is_auto_sync, auto_sync_max_videos
      FROM gallery_collections
      WHERE type = 'video' AND is_published = 1 AND is_auto_sync = 1
      LIMIT 1
    `);

    if (autoSyncVideoCollection && autoSyncVideoCollection.is_auto_sync) {
      try {
        const videos = await getLatestVideos(1);
        if (videos.length > 0) {
          videoPreviewImage = `https://img.youtube.com/vi/${videos[0].id}/hqdefault.jpg`;
        }
      } catch (err) {
        console.error('[galleryController] Error fetching YouTube preview for overview:', err.message);
      }
    }

    // Fallback to latest manual video
    if (!videoPreviewImage) {
      const latestVideo = await qGet(db, `
        SELECT gi.youtube_id
        FROM gallery_items gi
        JOIN gallery_collections gc ON gi.collection_id = gc.id
        WHERE gi.item_type = 'video' AND gi.is_published = 1 AND gc.is_published = 1
        ORDER BY gi.created_at DESC
        LIMIT 1
      `);
      videoPreviewImage = latestVideo?.youtube_id
        ? `https://img.youtube.com/vi/${latestVideo.youtube_id}/hqdefault.jpg`
        : null;
    }

    // Get preview image for audio (first audio collection cover)
    const audioCover = await qGet(db, `
      SELECT cover_cloudinary_id
      FROM gallery_collections
      WHERE type = 'audio' AND is_published = 1 AND cover_cloudinary_id IS NOT NULL
      ORDER BY is_featured DESC, display_order ASC, created_at DESC
      LIMIT 1
    `);
    const audioPreviewImage = audioCover?.cover_cloudinary_id
      ? resolveAsset(
          { storage: 'cloudinary', cloudinary_id: audioCover.cover_cloudinary_id },
          { width: 800, crop: 'fill', quality: 'auto', format: 'auto' }
        )
      : null;

    console.log('[GALLERY OVERVIEW] videoPreviewImage:', videoPreviewImage);
    console.log('[GALLERY OVERVIEW] photoPreviewImages:', photoPreviewImages);

    const sections = [
      {
        type: 'photos',
        title: lang === 'en' ? 'Photos' : 'Foto',
        description: lang === 'en'
          ? `${itemsByType.photo || 0} photos in ${statsByType.photo || 0} collections`
          : `${itemsByType.photo || 0} foto in ${statsByType.photo || 0} collezioni`,
        icon: 'fa-images',
        url: '/gallery/photos',
        count: itemsByType.photo || 0,
        previewImages: photoPreviewImages
      },
      {
        type: 'videos',
        title: 'Video',
        description: lang === 'en'
          ? `${itemsByType.video || 0} videos in ${statsByType.video || 0} collections`
          : `${itemsByType.video || 0} video in ${statsByType.video || 0} collezioni`,
        icon: 'fa-video',
        url: '/gallery/videos',
        count: itemsByType.video || 0,
        previewImage: videoPreviewImage
      },
      {
        type: 'audio',
        title: 'Audio',
        description: lang === 'en'
          ? `${itemsByType.audio || 0} tracks in ${statsByType.audio || 0} collections`
          : `${itemsByType.audio || 0} brani in ${statsByType.audio || 0} collezioni`,
        icon: 'fa-music',
        url: '/gallery/audio',
        count: itemsByType.audio || 0,
        previewImage: audioPreviewImage
      }
    ];

    const title = lang === 'en' ? 'Gallery' : 'Galleria';
    const description = lang === 'en'
      ? 'Photos, videos and audio recordings from concerts and performances'
      : 'Foto, video e registrazioni audio da concerti ed esibizioni';

    const cssFiles = listPageCss('gallery');

    return res.renderPage('pages/frontend/gallery-overview', {
      layout: 'layouts/base-frontend',
      lang,
      title,
      description,
      pageMeta: { title, description },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts: [],
      sections
    });
  } catch (err) {
    console.error('[galleryController] getGalleryOverview error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: lang === 'en' ? 'Error loading Gallery' : 'Errore caricamento Galleria',
      description: ''
    });
  }
}

/**
 * Collections by type (photos, videos, audio)
 */
export async function getGalleryCollectionsByType(req, res) {
  try {
    const type = req.params.type; // 'photos', 'videos', 'audio'
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const db = await getMainDb();

    // Map URL type to DB type
    const typeMap = {
      'photos': 'photo',
      'videos': 'video',
      'audio': 'audio'
    };

    const dbType = typeMap[type];
    if (!dbType) {
      return res.redirect('/gallery');
    }

    const titleCol = lang === 'en' ? 'title_en' : 'title_it';
    const descCol = lang === 'en' ? 'description_en' : 'description_it';

    // Get collections of this type
    const collections = await qAll(db, `
      SELECT
        gc.id,
        gc.slug,
        gc.type,
        gc.${titleCol} as title,
        gc.${descCol} as description,
        gc.cover_cloudinary_id,
        gc.cover_local_path,
        gc.is_featured,
        gc.display_order,
        gc.is_auto_sync,
        gc.auto_sync_max_videos,
        (SELECT COUNT(*) FROM gallery_items WHERE collection_id = gc.id AND is_published = 1) as item_count
      FROM gallery_collections gc
      WHERE gc.type = ? AND gc.is_published = 1
      ORDER BY gc.is_featured DESC, gc.display_order ASC, gc.created_at DESC
    `, [dbType]);

    // Resolve covers and auto-set for auto-sync video collections
    for (const c of collections) {
      // If it's an auto-sync video collection without a manual cover, use latest video thumbnail
      if (c.is_auto_sync && c.type === 'video' && !c.cover_cloudinary_id) {
        try {
          const videos = await getLatestVideos(1);
          if (videos.length > 0) {
            c.cover_url = `https://img.youtube.com/vi/${videos[0].id}/hqdefault.jpg`;
          } else {
            c.cover_url = resolveCover(c);
          }
        } catch (err) {
          console.error('[galleryController] Error fetching YouTube cover for collection:', err.message);
          c.cover_url = resolveCover(c);
        }
      } else {
        c.cover_url = resolveCover(c);
      }
      c.url = `/gallery/${type}/${c.slug}`;
    }

    const pageTitle = {
      'photos': lang === 'en' ? 'Photo Collections' : 'Collezioni Fotografiche',
      'videos': lang === 'en' ? 'Video Collections' : 'Collezioni Video',
      'audio': lang === 'en' ? 'Audio Collections' : 'Collezioni Audio'
    };

    const title = pageTitle[type];
    const description = lang === 'en'
      ? `Browse all ${type} collections`
      : `Esplora tutte le collezioni ${type === 'photos' ? 'fotografiche' : type === 'videos' ? 'video' : 'audio'}`;

    const cssFiles = listPageCss('gallery');

    return res.renderPage('pages/frontend/gallery-collections', {
      layout: 'layouts/base-frontend',
      lang,
      title,
      description,
      pageMeta: { title, description },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts: [],
      collections,
      type,
      typeLabel: pageTitle[type]
    });
  } catch (err) {
    console.error('[galleryController] getGalleryCollectionsByType error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: lang === 'en' ? 'Error loading Collections' : 'Errore caricamento Collezioni',
      description: ''
    });
  }
}

/**
 * Collection detail with items
 */
export async function getGalleryCollectionDetail(req, res) {
  try {
    const { type, slug } = req.params;
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const db = await getMainDb();

    const titleCol = lang === 'en' ? 'title_en' : 'title_it';
    const descCol = lang === 'en' ? 'description_en' : 'description_it';

    // Get collection
    const collection = await qGet(db, `
      SELECT
        gc.id,
        gc.slug,
        gc.type,
        gc.${titleCol} as title,
        gc.${descCol} as description,
        gc.cover_cloudinary_id,
        gc.cover_local_path,
        gc.is_auto_sync,
        gc.auto_sync_max_videos
      FROM gallery_collections gc
      WHERE gc.slug = ? AND gc.is_published = 1
    `, [slug]);

    if (!collection) {
      return res.redirect('/gallery');
    }

    let items = [];

    // If auto-sync collection, fetch latest videos from YouTube
    if (collection.is_auto_sync && collection.type === 'video') {
      try {
        const videos = await getLatestVideos(collection.auto_sync_max_videos || 4);

        items = videos.map(video => ({
          id: video.id,
          item_type: 'video',
          youtube_id: video.id,
          title: video.title,
          description: video.description || '',
          alt: '',
          credits: null,
          width: null,
          height: null,
          duration: null,
          is_spotlight: 0,
          display_order: 0,
          media: {
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            embed: `https://www.youtube.com/embed/${video.id}`
          }
        }));

        // Auto-set collection cover to latest video thumbnail
        if (videos.length > 0 && !collection.cover_cloudinary_id) {
          collection.cover_url = `https://img.youtube.com/vi/${videos[0].id}/hqdefault.jpg`;
        }
      } catch (err) {
        console.error('[galleryController] Error fetching YouTube videos:', err.message);
        items = []; // Empty items on error
      }
    } else {
      // Manual collection - get items from database
      const itemTitleCol = lang === 'en' ? 'title_en' : 'title_it';
      const itemDescCol = lang === 'en' ? 'description_en' : 'description_it';
      const itemAltCol = lang === 'en' ? 'alt_en' : 'alt_it';

      items = await qAll(db, `
        SELECT
          gi.id,
          gi.item_type,
          gi.cloudinary_id,
          gi.youtube_id,
          gi.bandcamp_url,
          gi.bandcamp_embed_code,
          gi.${itemTitleCol} as title,
          gi.${itemDescCol} as description,
          gi.${itemAltCol} as alt,
          gi.credits,
          gi.width,
          gi.height,
          gi.duration,
          gi.is_spotlight,
          gi.display_order
        FROM gallery_items gi
        WHERE gi.collection_id = ? AND gi.is_published = 1
        ORDER BY gi.display_order ASC, gi.created_at DESC
      `, [collection.id]);

      // Resolve media for manual items
      items.forEach(item => {
        item.media = resolveItemMedia(item);
      });
    }

    const cssFiles = listPageCss('gallery');

    return res.renderPage('pages/frontend/gallery-detail', {
      layout: 'layouts/base-frontend',
      lang,
      title: collection.title,
      description: collection.description || '',
      pageMeta: { title: collection.title, description: collection.description || '' },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts: [],
      collection,
      items,
      type,
      backUrl: `/gallery/${type}`
    });
  } catch (err) {
    console.error('[galleryController] getGalleryCollectionDetail error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: lang === 'en' ? 'Error loading Collection' : 'Errore caricamento Collezione',
      description: ''
    });
  }
}

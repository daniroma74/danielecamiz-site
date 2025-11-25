// cms/controllers/pressKitController.js
// Press-Kit page controller (EPK - Electronic Press Kit)

import path from 'path';
import { getDb as getMainDb } from '../utils/sqliteMain.js';
import { listPageCss, havePageJs } from '../utils/assetHelpers.js';

const CMS_ROOT = process.cwd();

/**
 * Load press-kit files from database
 */
async function loadPressKitFiles(lang = 'it') {
  try {
    const db = await getMainDb();

    // Photos
    const photos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, cloudinary_id, cloudinary_url, category,
                title_${lang} as title, description_${lang} as description,
                width, height, format, display_order
         FROM press_kit_files
         WHERE type = 'photo' AND is_published = 1
         ORDER BY display_order ASC, created_at DESC`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });

    // Videos
    const videos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, youtube_id, youtube_url,
                title_${lang} as title, description_${lang} as description,
                display_order
         FROM press_kit_files
         WHERE type = 'video' AND is_published = 1
         ORDER BY display_order ASC, created_at DESC`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });

    // Documents
    const documents = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, cloudinary_id, cloudinary_url, category,
                title_${lang} as title, description_${lang} as description,
                file_size, format, display_order
         FROM press_kit_files
         WHERE type = 'document' AND is_published = 1
         ORDER BY display_order ASC, created_at DESC`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });

    return { photos, videos, documents };
  } catch (err) {
    console.error('[pressKit] Error loading files:', err);
    return { photos: [], videos: [], documents: [] };
  }
}

/**
 * Load bio content for press-kit
 */
async function loadBioContent(lang = 'it') {
  try {
    const db = await getMainDb();

    const bio = await new Promise((resolve, reject) => {
      db.get(
        `SELECT short_text, long_text, profile_photo_cloudinary_id
         FROM bio_content
         WHERE section = 'biography' AND lang = ? AND is_published = 1`,
        [lang],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    return bio || { short_text: '', long_text: '', profile_photo_cloudinary_id: null };
  } catch (err) {
    console.error('[pressKit] Error loading bio:', err);
    return { short_text: '', long_text: '', profile_photo_cloudinary_id: null };
  }
}

/**
 * GET /press-kit
 * Display Electronic Press Kit page
 */
export async function getPressKitPage(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    const labelsAll = res.locals.labels || {};

    // Load press-kit files
    const { photos, videos, documents } = await loadPressKitFiles(lang);

    // Load bio content
    const bio = await loadBioContent(lang);

    // i18n labels
    const title = lang === 'en' ? 'Press Kit - Daniele Camiz' : 'Press Kit - Daniele Camiz';
    const description = lang === 'en'
      ? 'Electronic Press Kit for conductor Daniele Camiz. Biography, high-resolution photos, videos, and downloadable materials.'
      : 'Electronic Press Kit del direttore d\'orchestra Daniele Camiz. Biografia, foto ad alta risoluzione, video e materiali scaricabili.';

    const cssFiles = listPageCss('press-kit');
    const pageScripts = [];
    const entry = havePageJs('press-kit');
    if (entry) pageScripts.push(entry);

    return res.renderPage('pages/frontend/press-kit', {
      layout: 'layouts/base-frontend',
      lang,
      labels: labelsAll,
      title,
      description,
      pageMeta: { title, description },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      // Data
      bio,
      photos,
      videos,
      documents,
      // Helpers
      photosByCategory: photos.reduce((acc, photo) => {
        const cat = photo.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(photo);
        return acc;
      }, {}),
      documentsByCategory: documents.reduce((acc, doc) => {
        const cat = doc.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(doc);
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('[pressKitController] getPressKitPage error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading Press Kit' : 'Errore caricando il Press Kit',
      description: (lang === 'en') ? 'Error loading press kit page' : 'Errore nel caricamento della pagina press kit'
    });
  }
}

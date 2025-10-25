// cms/controllers/videoController.js
import path from 'path';
import fs from 'fs/promises';

import { listPageCss } from '../utils/assetHelpers.js';
import * as yt from '../utils/youtubeService.js';
import { getDb as getMainDb } from '../utils/sqliteMain.js';
import { resolveMediaById } from '../utils/mediaResolver.js';
import { mdToHtml } from '../utils/utils.js';

const CMS_ROOT = process.cwd();
const I18N_DIR = path.join(CMS_ROOT, 'data', 'i18n');

/* ===================== helpers ===================== */
async function readJSONSafe(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadVideoLabels(lang = 'it') {
  const tryPaths = [
    path.join(I18N_DIR, `labels-video-${lang}.json`),
    path.join(I18N_DIR, 'labels-video-it.json'),
    path.join(I18N_DIR, 'labels-video-en.json')
  ];
  for (const p of tryPaths) {
    const data = await readJSONSafe(p);
    if (data && typeof data === 'object') return data;
  }
  return {};
}

function flattenVideoLabels(obj) {
  if (obj && typeof obj === 'object' && obj.video && typeof obj.video === 'object') {
    return { ...obj.video };
  }
  return obj || {};
}

function makePlatformUrl(platform, externalId) {
  const id = externalId || '';
  if (!platform) return '';
  if (/^https?:\/\//i.test(id)) return id;
  if (platform === 'youtube') return id ? `https://www.youtube.com/watch?v=${id}` : '';
  if (platform === 'vimeo') return id ? `https://vimeo.com/${id}` : '';
  return '';
}

/* ===================== DB loader (new repo) ===================== */
async function loadVideosFromDb(lang = 'it', limit = 12) {
  try {
    const db = await getMainDb();
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT v.id, v.slug, v.platform, v.external_id, v.event_id, v.thumbnail_id,
                v.status, v.published_at, v.created_at,
                i.title, i.description_md
           FROM videos v
           LEFT JOIN videos_i18n i ON (i.video_id = v.id AND i.lang = ?)
          ORDER BY CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END,
                   v.published_at DESC, v.created_at DESC
          LIMIT ?`,
        [lang, limit],
        (err, r) => (err ? reject(err) : resolve(r || []))
      );
    });

    // Chapters by video id
    const chaptersByVideo = await new Promise((resolve, reject) => {
      db.all(
        `SELECT video_id, t_seconds, label_it, label_en
           FROM video_chapters
          ORDER BY video_id ASC, t_seconds ASC`,
        [],
        (err, r) => (err ? reject(err) : resolve(r || []))
      );
    });
    const chMap = new Map();
    for (const c of chaptersByVideo) {
      const arr = chMap.get(c.video_id) || [];
      arr.push({ t_seconds: c.t_seconds, label_it: c.label_it || '', label_en: c.label_en || '' });
      chMap.set(c.video_id, arr);
    }

    const mapped = await Promise.all(rows.map(async r => ({
      id: r.id,
      slug: r.slug,
      platform: r.platform,
      external_id: r.external_id,
      url: makePlatformUrl(r.platform, r.external_id),
      event_id: r.event_id,
      title: r.title || '',
      description_html: r.description_md ? `<div class=\"content-md\">${mdToHtml(r.description_md)}</div>` : '',
      thumbnail: r.thumbnail_id ? (await resolveMediaById(r.thumbnail_id, { width: 1200, crop: 'fill', quality: 'auto', format: 'auto' })) : '',
      status: r.status || 'draft',
      published_at: r.published_at || r.created_at,
      chapters: chMap.get(r.id) || []
    })));

    return mapped;
  } catch (err) {
    console.warn('[video] DB load failed, fallback to YouTube utils:', err?.message || err);
    return [];
  }
}

/* ===================== controller ===================== */
export async function getVideoPage(req, res) {
  try {
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();

    // ---- Labels (claim, titoli, ecc.) ----
    const labelsAll = res.locals.labels || {};
    const labelsVideoRaw = await loadVideoLabels(lang);
    const labelsVideoFlat = flattenVideoLabels(labelsVideoRaw);

    const mergedLabels = { ...labelsAll };
    mergedLabels.video = { ...(labelsAll.video || {}), ...labelsVideoFlat };
    mergedLabels.pages = {
      ...(labelsAll.pages || {}),
      video: { ...(labelsAll.pages?.video || {}), ...labelsVideoFlat }
    };
    res.locals.labels = mergedLabels;

    const videoLabels = mergedLabels.video || {};

    // ---- Sorgente dati: preferisci DB, poi fallback a YouTube ----
    let lastVideo = null;
    let playlists = [];
    let videoItems = await loadVideosFromDb(lang, 12);

    if (!videoItems.length) {
      try {
        if (yt && typeof yt.getLatestVideos === 'function') {
          const arr = await yt.getLatestVideos(6);
          videoItems = Array.isArray(arr) ? arr : [];
          lastVideo = videoItems[0] || null;
        } else if (yt && typeof yt.getLastVideo === 'function') {
          lastVideo = await yt.getLastVideo();
        }
      } catch (e) {
        console.error('YouTube fetch error (videos):', e?.message || e);
      }

      try {
        if (yt && typeof yt.getPlaylists === 'function') {
          const pls = await yt.getPlaylists();
          playlists = Array.isArray(pls) ? pls : [];
        }
      } catch (e) {
        console.error('YouTube fetch error (playlists):', e?.message || e);
      }
    } else {
      lastVideo = videoItems.find(v => v.status === 'published') || videoItems[0] || null;
      playlists = []; // opzionale: playlist dal DB in futuro
    }

    // ---- Meta + assets ----
    const title = videoLabels.title || (lang === 'en' ? 'Videos' : 'Video');
    const description = videoLabels.claim || '';

    const cssFiles = listPageCss('video');
    const pageScripts = [
      '/js/modules/video/video-init.js'
    ];

    return res.renderPage('pages/frontend/video', {
      layout: 'layouts/base-frontend',
      lang,
      labels: mergedLabels,
      pageMeta: { title, description },
      title,
      description,
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      videoLabels,
      lastVideo,
      playlists,
      videoItems
    });
  } catch (err) {
    console.error('[videoController] getVideoPage error:', err);
    const lang = (res.locals.lang || req.language || 'it').toLowerCase();
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading Videos' : 'Errore caricando la pagina Video',
      description: ''
    });
  }
}
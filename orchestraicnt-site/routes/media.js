// orchestraicnt-site/routes/media.js
// Endpoint per gestire video YouTube con modalità auto/manual

const express = require('express');
const router = express.Router();
const { localDB } = require('../config/database');

/**
 * Helper per estrarre ID YouTube da URL
 */
function getYouTubeID(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

/**
 * GET /api/media/videos
 * Restituisce i 3 video configurati (mix auto/manual)
 */
router.get('/videos', async (req, res) => {
  try {
    // Carica tutte le settings necessarie usando localDB
    const settings = {};
    const rows = await localDB.all(
      `SELECT setting_key, setting_value FROM site_settings
       WHERE setting_key LIKE 'media_%'`
    );
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    const playlistId = settings.media_youtube_playlist_id || '';
    const videos = [];

    // Carica video automatici dalla playlist/canale se necessario
    let autoVideos = [];
    const hasAutoMode = ['1', '2', '3'].some(i => settings[`media_video_${i}_mode`] === 'auto');

    if (hasAutoMode) {
      try {
        // Importa dynamically il servizio YouTube
        const ytService = await import('../../cms/utils/youtubeService.js');

        if (playlistId && ytService.getLatestVideosFromPlaylist) {
          autoVideos = await ytService.getLatestVideosFromPlaylist(playlistId, 10);
        } else if (ytService.getLatestVideos) {
          autoVideos = await ytService.getLatestVideos(10);
        }
      } catch (err) {
        console.error('[Media API] Error loading auto videos:', err);
      }
    }

    let autoIndex = 0;

    // Costruisci array di 3 video
    for (let i = 1; i <= 3; i++) {
      const mode = settings[`media_video_${i}_mode`] || 'manual';

      if (mode === 'auto') {
        // Modalità automatica - prendi dalla playlist/canale
        if (autoVideos[autoIndex]) {
          videos.push({
            id: autoVideos[autoIndex].id,
            title: autoVideos[autoIndex].title,
            thumbnail: autoVideos[autoIndex].thumbnail
          });
          autoIndex++;
        }
      } else {
        // Modalità manuale - usa URL dal database
        const url = settings[`media_video_${i}_url`];
        const title = settings[`media_video_${i}_title`];
        const videoId = getYouTubeID(url);

        if (videoId && title) {
          videos.push({
            id: videoId,
            title: title,
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          });
        }
      }
    }

    res.json({ success: true, videos });
  } catch (error) {
    console.error('[Media API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// cms/routes/api/youtubeRoutes.js
// Endpoint per ottenere i video YouTube più recenti
import express from 'express';
import { getLatestVideos } from '../../utils/youtubeService.js';

const router = express.Router();

/**
 * GET /api/youtube/latest?max=3
 * Restituisce gli ultimi video YouTube dal canale configurato
 */
router.get('/latest', async (req, res) => {
  try {
    const max = parseInt(req.query.max, 10) || 3;
    const maxClamped = Math.max(1, Math.min(10, max)); // Limita tra 1 e 10

    const videos = await getLatestVideos(maxClamped);

    res.json(videos);
  } catch (error) {
    console.error('[YouTube API] Error fetching latest videos:', error);
    res.status(500).json({
      error: 'Failed to fetch videos',
      message: error.message
    });
  }
});

export default router;

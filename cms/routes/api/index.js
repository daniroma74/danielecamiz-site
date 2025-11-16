// cms/routes/api/index.js
import express from 'express';
import attendanceRoutes from './attendanceRoutes.js';
import lineupRoutes from './lineupRoutes.js';
import repertoireApi from './repertoireApi.js';
import youtubeRoutes from './youtubeRoutes.js';

const router = express.Router();

// Mount sub-routes
router.use('/attendance', attendanceRoutes);
router.use('/lineup', lineupRoutes);
router.use('/repertoire', repertoireApi);
router.use('/youtube', youtubeRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'cms-api',
        timestamp: new Date().toISOString() 
    });
});

export default router;
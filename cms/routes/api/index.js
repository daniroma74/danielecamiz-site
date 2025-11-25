// cms/routes/api/index.js
import express from 'express';
import attendanceRoutes from './attendanceRoutes.js';
import lineupRoutes from './lineupRoutes.js';
import repertoireApi from './repertoireApi.js';
import youtubeRoutes from './youtubeRoutes.js';
import newsletterApi from './newsletterApi.js';

const router = express.Router();

// Mount sub-routes
router.use('/attendance', attendanceRoutes);
router.use('/lineup', lineupRoutes);
router.use('/repertoire', repertoireApi);
router.use('/youtube', youtubeRoutes);
router.use('/newsletter', newsletterApi);

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'cms-api',
        timestamp: new Date().toISOString() 
    });
});

export default router;
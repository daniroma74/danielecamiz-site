

// cms/routes/sitemapRoutes.js
import express from 'express';
import { getNewsSitemap } from '../controllers/sitemapController.js';

const router = express.Router();

// News sitemap with hreflang alternates
router.get('/sitemap-news.xml', getNewsSitemap);

export default router;
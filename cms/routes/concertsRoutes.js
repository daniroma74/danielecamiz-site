// cms/routes/concertsRoutes.js
import express from 'express';
import { getConcertsPage } from '../controllers/concertsController.js';

const router = express.Router();

// GET /concerts → render concerts page (SSR)
router.get('/', getConcertsPage);

export default router;
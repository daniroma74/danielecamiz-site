// cms/routes/homeRoutes.js
import express from 'express';
import { getHomePage } from '../controllers/homeController.js';

const router = express.Router();

// Home: delega totale al controller (niente logica qui)
router.get('/', getHomePage);
// Explicit language roots delegate to the same controller
router.get('/it', getHomePage);
router.get('/en', getHomePage);

export default router;
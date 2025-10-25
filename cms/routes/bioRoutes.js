// cms/routes/bioRoutes.js
import express from 'express';
import { getBio } from '../controllers/bioController.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await getBio(req, res);
  } catch (err) {
    console.error('bio route error:', err);
    return res.status(500).renderPage('pages/frontend/bio', {
      title: (res.locals.lang === 'en') ? 'Biography' : 'Biografia',
      cssFiles: [],
      pageScripts: [],
      claim: '',
      bio: {}
    });
  }
});

export default router;
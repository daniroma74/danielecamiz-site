// cms/routes/repertoireRoutes.js
import express from 'express';
import { getRepertoirePage, debugRepertoire } from '../controllers/repertoireController.js';

const router = express.Router();

/* ⚠️ Rotte più specifiche PRIMA di quelle parametriche */
router.get('/__debug', debugRepertoire);      // debug puro JSON
router.get('/ping', (req, res) => res.type('text').send('OK')); // sanity check rapido

// Rotte “dedicate”
router.get('/composer/:composerSlug', getRepertoirePage);

// Rotta parametrica GENERICA: deve stare dopo le specifiche
router.get('/:categorySlug', getRepertoirePage);

// Root della sezione
router.get('/', getRepertoirePage);

export default router;

// concerts-admin/routes/admin.js
import { Router } from 'express';
import { requireAuth } from '../middleware/simpleAuth.js';
import ConcertsController from '../controllers/concertsController.js';
import RepertoireController from '../controllers/repertoireController.js';

const router = Router();

// Istanzia i controller
const concertsController = new ConcertsController();
const repertoireController = new RepertoireController();

// TUTTE le routes admin richiedono autenticazione
router.use(requireAuth);

// Dashboard
router.get('/', (req, res, next) => concertsController.list(req, res, next));
router.get('/dashboard', (req, res, next) => concertsController.list(req, res, next));

// Concerti
router.get('/concert/new', (req, res, next) => concertsController.editor(req, res, next));
router.get('/concert/:id/edit', (req, res, next) => concertsController.editor(req, res, next));
router.get('/search', (req, res, next) => concertsController.renderSearch(req, res, next));

// Repertorio
router.get('/repertoire', (req, res, next) => repertoireController.list(req, res, next));

export default router;
// concerts-admin/routes/admin.js
import { Router } from 'express';
import ConcertsController from '../controllers/concertsController.js';
const router = Router();
const concertsController = new ConcertsController();

// Note: ensureAuthenticated is applied at server.js level for /admin routes
// No need to import or reapply it here

router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', (req, res, next) => concertsController.renderDashboard(req, res, next));
router.get('/repertoire', (req, res, next) => concertsController.renderRepertoire(req, res, next));
router.get('/concert/new', (req, res, next) => concertsController.renderEditor(req, res, next));
router.get('/concert/:id/edit', (req, res, next) => concertsController.renderEditor(req, res, next));

export default router;
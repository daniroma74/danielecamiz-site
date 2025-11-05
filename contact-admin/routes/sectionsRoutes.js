import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import sectionsController from '../controllers/sectionsController.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/', sectionsController.listSections);
router.post('/:id', sectionsController.updateSection);
router.post('/:id/toggle', sectionsController.toggleVisibility);

export default router;

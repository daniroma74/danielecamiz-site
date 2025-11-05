import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import linksController from '../controllers/linksController.js';

const router = express.Router();

// Require authentication for all links routes
router.use(ensureAuthenticated);

// List all links (with filters)
router.get('/', linksController.listLinks);

// New link form
router.get('/new', linksController.newLinkForm);

// Create link
router.post('/', linksController.createLink);

// Edit link form
router.get('/:id/edit', linksController.editLinkForm);

// Update link
router.post('/:id', linksController.updateLink);

// Delete link
router.post('/:id/delete', linksController.deleteLink);

// Toggle visibility
router.post('/:id/toggle', linksController.toggleVisibility);

// Reorder links (bulk update)
router.post('/reorder', linksController.reorderLinks);

export default router;

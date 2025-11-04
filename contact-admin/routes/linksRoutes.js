import express from 'express';
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

router.use(requireAuth);

// Links controller
import linksController from '../controllers/linksController.js';

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

// newsRoutes.js
import express from 'express';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';
import * as C from '../../controllers/admin/newsController.js';

const router = express.Router();

// Guard section
router.use(ensureAuthenticated);

// List + edit views
router.get('/', C.renderList);
router.get('/new', C.renderNew);
router.get('/:id/edit', C.renderEdit);

// API CRUD
router.post('/api', C.apiCreate);
router.put('/api/:id', C.apiUpdate);
router.delete('/api/:id', C.apiDelete);

// Quick actions
router.post('/api/:id/publish', C.apiPublish);
router.post('/api/:id/depublish', C.apiDepublish);
router.post('/api/:id/duplicate', C.apiDuplicate);

// Preview SSR
router.get('/preview/:id', C.previewSSR);

// Export newsletter (HTML/JSON)
router.get('/api/:id/export/:format', C.exportNewsletter);

export default router;
import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  req.session && req.session.authenticated ? next() : res.redirect('/auth/login');
};

router.use(requireAuth);

import sectionsController from '../controllers/sectionsController.js';

router.get('/', sectionsController.listSections);
router.post('/:id', sectionsController.updateSection);
router.post('/:id/toggle', sectionsController.toggleVisibility);

export default router;

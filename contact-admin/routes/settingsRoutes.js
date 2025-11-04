import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  req.session && req.session.authenticated ? next() : res.redirect('/auth/login');
};

router.use(requireAuth);

import settingsController from '../controllers/settingsController.js';

router.get('/', settingsController.showSettings);
router.post('/', settingsController.updateSettings);

export default router;

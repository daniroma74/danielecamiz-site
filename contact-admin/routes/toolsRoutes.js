import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  req.session && req.session.authenticated ? next() : res.redirect('/auth/login');
};

router.use(requireAuth);

import toolsController from '../controllers/toolsController.js';

router.get('/qrcode', toolsController.generateQRCode);
router.get('/preview', toolsController.previewSite);
router.get('/export', toolsController.exportData);

export default router;

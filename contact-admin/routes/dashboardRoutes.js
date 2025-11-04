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

// Dashboard controller
import dashboardController from '../controllers/dashboardController.js';

router.get('/', dashboardController.showDashboard);

export default router;

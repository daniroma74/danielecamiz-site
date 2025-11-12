/**
 * Gallery Routes
 * Gestione galleria immagini Cloudinary
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  /**
   * GET /admin/gallery
   * Pagina principale galleria
   */
  router.get('/gallery', requireAuth, (req, res) => {
    res.render('gallery/index', {
      title: 'Galleria',
      user: req.session.user
    });
  });

  return router;
};

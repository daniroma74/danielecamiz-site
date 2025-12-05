/**
 * Admin Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/dashboard
  router.get('/dashboard', requireAuth, (req, res) => {
    try {
      // better-sqlite3 is synchronous - much simpler!
      const stats = {
        countries: db.prepare('SELECT COUNT(*) as count FROM countries').get()?.count || 0,
        activeSongs: db.prepare('SELECT COUNT(*) as count FROM repertoire WHERE is_active = 1').get()?.count || 0,
        concerts: db.prepare('SELECT COUNT(*) as count FROM concerts WHERE is_published = 1').get()?.count || 0,
        projects: db.prepare('SELECT COUNT(*) as count FROM solidarity_projects WHERE is_active = 1').get()?.count || 0,
        maestri: db.prepare('SELECT COUNT(*) as count FROM team_members WHERE is_active = 1').get()?.count || 0,
        galleryImages: db.prepare('SELECT COUNT(*) as count FROM gallery_images WHERE is_published = 1').get()?.count || 0
      };

      const recentSongs = db.prepare(`
        SELECT r.*, c.name as country_name, c.flag
        FROM repertoire r
        JOIN countries c ON r.country_id = c.id
        ORDER BY r.created_at DESC
        LIMIT 5
      `).all();

      res.render('dashboard', {
        title: 'Dashboard',
        user: req.session,
        stats,
        recentSongs: recentSongs || []
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).send('Errore caricamento dashboard');
    }
  });

  return router;
};

/**
 * Admin Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/dashboard
  router.get('/dashboard', requireAuth, async (req, res) => {
    try {
      // Helper to promisify db.get
      const dbGet = (query) => new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Helper to promisify db.all
      const dbAll = (query) => new Promise((resolve, reject) => {
        db.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get all statistics in parallel
      const [
        countries,
        activeSongs,
        concerts,
        projects,
        teamMembers,
        galleryImages,
        recentSongs
      ] = await Promise.all([
        dbGet('SELECT COUNT(*) as count FROM countries'),
        dbGet('SELECT COUNT(*) as count FROM repertoire WHERE is_active = 1'),
        dbGet('SELECT COUNT(*) as count FROM concerts WHERE is_published = 1'),
        dbGet('SELECT COUNT(*) as count FROM solidarity_projects WHERE is_active = 1'),
        dbGet('SELECT COUNT(*) as count FROM team_members WHERE is_active = 1'),
        dbGet('SELECT COUNT(*) as count FROM gallery_images WHERE is_published = 1'),
        dbAll(`SELECT r.*, c.name as country_name, c.flag
               FROM repertoire r
               JOIN countries c ON r.country_id = c.id
               ORDER BY r.created_at DESC
               LIMIT 5`)
      ]);

      const stats = {
        countries: countries?.count || 0,
        activeSongs: activeSongs?.count || 0,
        concerts: concerts?.count || 0,
        projects: projects?.count || 0,
        teamMembers: teamMembers?.count || 0,
        galleryImages: galleryImages?.count || 0
      };

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

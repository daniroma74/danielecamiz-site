/**
 * Admin Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/dashboard
  router.get('/dashboard', requireAuth, (req, res) => {
    // Get statistics
    const stats = {};

    db.get('SELECT COUNT(*) as count FROM countries', (err, row) => {
      stats.countries = row ? row.count : 0;
    });

    db.get('SELECT COUNT(*) as count FROM repertoire WHERE is_active = 1', (err, row) => {
      stats.activeSongs = row ? row.count : 0;
    });

    db.get('SELECT COUNT(*) as count FROM repertoire WHERE is_active = 0', (err, row) => {
      stats.inactiveSongs = row ? row.count : 0;
    });

    // Get recent songs
    db.all(
      `SELECT r.*, c.name as country_name, c.flag
       FROM repertoire r
       JOIN countries c ON r.country_id = c.id
       ORDER BY r.created_at DESC
       LIMIT 5`,
      (err, recentSongs) => {
        res.render('dashboard', {
          title: 'Dashboard',
          user: req.session,
          stats,
          recentSongs: recentSongs || []
        });
      }
    );
  });

  return router;
};

import { all, get } from '../config/database.js';
import { config } from '../config/config.js';

const showDashboard = async (req, res) => {
  try {
    // Get settings
    const settings = await get('SELECT * FROM contact_settings WHERE id = 1');

    // Count links by category
    const linkStats = await all(`
      SELECT category, COUNT(*) as count, SUM(visible) as visible_count
      FROM contact_links
      GROUP BY category
      ORDER BY
        CASE category
          WHEN 'highlight' THEN 1
          WHEN 'social' THEN 2
          WHEN 'contact' THEN 3
          WHEN 'extra' THEN 4
        END
    `);

    // Recent links (last 5)
    const recentLinks = await all(`
      SELECT * FROM contact_links
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Scheduled links (future)
    const scheduledLinks = await all(`
      SELECT * FROM contact_links
      WHERE scheduled_start > datetime('now')
      ORDER BY scheduled_start ASC
      LIMIT 5
    `);

    // Stats summary
    const totalLinks = await get('SELECT COUNT(*) as count FROM contact_links');
    const activeLinks = await get('SELECT COUNT(*) as count FROM view_active_contact_links');

    res.render('dashboard/index', {
      title: 'Dashboard - Contact Admin',
      settings,
      linkStats,
      recentLinks,
      scheduledLinks,
      totalLinks: totalLinks.count,
      activeLinks: activeLinks.count,
      config
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).send(`Error loading dashboard: ${error.message}`);
  }
};

export default { showDashboard };

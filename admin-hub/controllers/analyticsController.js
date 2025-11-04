// controllers/analyticsController.js
// Controller per Analytics Centralizzate

const crypto = require('crypto');
const { all, get, run } = require('../config/database');

// Hash IP per privacy
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'salt').digest('hex');
}

// ============================================
// TRACKING (PUBLIC)
// ============================================

exports.trackEvent = async (req, res) => {
  try {
    const {
      module,
      type,
      category,
      label,
      value = 1
    } = req.body;

    // Validazione
    if (!module || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: module, type'
      });
    }

    // Privacy-friendly tracking
    const userSession = req.cookies?.analytics_session || crypto.randomUUID();
    const ipHash = hashIP(req.ip);
    const userAgent = req.get('user-agent');
    const referer = req.get('referer');

    // Insert evento
    await run(
      `INSERT INTO hub_analytics_events (
        module_id, event_type, event_category, event_label, event_value,
        user_session, user_agent, referer, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [module, type, category, label, value, userSession, userAgent, referer, ipHash]
    );

    // Set cookie sessione (1 ora)
    res.cookie('analytics_session', userSession, {
      maxAge: 3600000,
      httpOnly: true,
      sameSite: 'lax'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ success: false, message: 'Tracking failed' });
  }
};

// ============================================
// QUERY (PROTECTED)
// ============================================

exports.getSummary = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const moduleFilter = req.query.module;

    let query = `
      SELECT
        module_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_session) as unique_sessions,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM hub_analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `;
    const params = [days];

    if (moduleFilter) {
      query += ` AND module_id = ?`;
      params.push(moduleFilter);
    }

    query += ` GROUP BY module_id ORDER BY total_events DESC`;

    const results = await all(query, params);

    res.json({
      success: true,
      days,
      summary: results
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Query failed' });
  }
};

exports.getModuleStats = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const days = parseInt(req.query.days) || 30;

    // Stats aggregate
    const stats = await get(
      `SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT user_session) as unique_sessions,
        COUNT(DISTINCT event_category) as unique_categories,
        MIN(created_at) as first_event,
        MAX(created_at) as last_event
      FROM hub_analytics_events
      WHERE module_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')`,
      [moduleId, days]
    );

    // Top events per categoria
    const topByCategory = await all(
      `SELECT
        event_category,
        event_label,
        COUNT(*) as count
      FROM hub_analytics_events
      WHERE module_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY event_category, event_label
      ORDER BY count DESC
      LIMIT 20`,
      [moduleId, days]
    );

    res.json({
      success: true,
      moduleId,
      days,
      stats,
      topEvents: topByCategory
    });
  } catch (error) {
    console.error('Module stats error:', error);
    res.status(500).json({ success: false, message: 'Query failed' });
  }
};

exports.getTopContent = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 10;

    const results = await all(
      `SELECT
        module_id,
        event_category,
        event_label,
        COUNT(*) as total_events,
        MAX(created_at) as last_event
      FROM hub_analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY module_id, event_category, event_label
      ORDER BY total_events DESC
      LIMIT ?`,
      [days, limit]
    );

    res.json({
      success: true,
      days,
      limit,
      topContent: results
    });
  } catch (error) {
    console.error('Top content error:', error);
    res.status(500).json({ success: false, message: 'Query failed' });
  }
};

exports.getDailyStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const moduleFilter = req.query.module;

    let query = `
      SELECT
        DATE(created_at) as date,
        module_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_session) as unique_sessions
      FROM hub_analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `;
    const params = [days];

    if (moduleFilter) {
      query += ` AND module_id = ?`;
      params.push(moduleFilter);
    }

    query += ` GROUP BY DATE(created_at), module_id ORDER BY date DESC`;

    const results = await all(query, params);

    res.json({
      success: true,
      days,
      dailyStats: results
    });
  } catch (error) {
    console.error('Daily stats error:', error);
    res.status(500).json({ success: false, message: 'Query failed' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const days = parseInt(req.query.days) || 30;
    const moduleFilter = req.query.module;

    let query = `
      SELECT * FROM hub_analytics_events
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `;
    const params = [days];

    if (moduleFilter) {
      query += ` AND module_id = ?`;
      params.push(moduleFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const results = await all(query, params);

    if (format === 'csv') {
      // CSV export
      const headers = Object.keys(results[0] || {}).join(',');
      const rows = results.map(r => Object.values(r).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // JSON export
      res.json({
        success: true,
        count: results.length,
        data: results
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

exports.getRealtimeStats = async (req, res) => {
  try {
    const results = await all(
      `SELECT
        module_id,
        event_type,
        event_label,
        COUNT(*) as count,
        MAX(created_at) as last_event
      FROM hub_analytics_events
      WHERE created_at >= datetime('now', '-5 minutes')
      GROUP BY module_id, event_type, event_label
      ORDER BY last_event DESC`,
      []
    );

    res.json({
      success: true,
      realtime: results
    });
  } catch (error) {
    console.error('Realtime stats error:', error);
    res.status(500).json({ success: false, message: 'Query failed' });
  }
};

exports.cleanupOldData = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 365;

    const result = await run(
      `DELETE FROM hub_analytics_events
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [days]
    );

    res.json({
      success: true,
      deleted: result.changes,
      message: `Deleted events older than ${days} days`
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, message: 'Cleanup failed' });
  }
};

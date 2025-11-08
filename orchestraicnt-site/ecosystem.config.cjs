/**
 * PM2 Ecosystem Configuration
 * Orchestra ICNT Website
 */

module.exports = {
  apps: [{
    name: 'orchestraicnt-site',
    script: './server.js',

    // Instances
    instances: 1,
    exec_mode: 'fork',

    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3100
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3100
    },

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Restart
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_memory_restart: '200M',

    // Advanced
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Source maps
    source_map_support: true,

    // Other
    merge_logs: true,
    time: true
  }]
};

/**
 * Usage:
 *
 * Start:
 *   pm2 start ecosystem.config.cjs
 *
 * Production:
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Stop:
 *   pm2 stop orchestraicnt-site
 *
 * Restart:
 *   pm2 restart orchestraicnt-site
 *
 * Logs:
 *   pm2 logs orchestraicnt-site
 *
 * Monitor:
 *   pm2 monit
 *
 * Startup script:
 *   pm2 startup
 *   pm2 save
 */

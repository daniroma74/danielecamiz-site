/**
 * PM2 Ecosystem Configuration
 * Coro Raro Website
 */

module.exports = {
  apps: [{
    name: 'cororaro-site',
    script: './server.js',

    // Instances
    instances: 1,
    exec_mode: 'fork',

    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3120
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3120
    },

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Restart
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'public'],
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
  }],

  deploy: {
    production: {
      user: 'daniele',
      host: 'cororaro.it',
      ref: 'origin/main',
      repo: 'git@github.com:daniroma74/danielecamiz-site.git',
      path: '/home/daniele/danielecamiz-site/cororaro-site',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production'
    }
  }
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
 *   pm2 stop cororaro-site
 *
 * Restart:
 *   pm2 restart cororaro-site
 *
 * Logs:
 *   pm2 logs cororaro-site
 *
 * Monitor:
 *   pm2 monit
 *
 * Startup script:
 *   pm2 startup
 *   pm2 save
 */

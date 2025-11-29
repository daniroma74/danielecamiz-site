module.exports = {
  apps: [{
    name: 'admin-hub',
    script: './server.js',
    cwd: '/home/daniele/danielecamiz-site/admin-hub',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 2000,
    exp_backoff_restart_delay: 100,
    kill_timeout: 5000,
    listen_timeout: 5000,
    env: {
      NODE_ENV: 'production',
      PORT: 3100,

      // Security Secrets
      SESSION_SECRET: '250ef1aaa7ec31c4ba1a860cc73a7e1b1b466bed2ebf9fb84967116fe9f4de15',
      JWT_SECRET: 'fade92bbaf724d0c4c7db078e137517633e9faefa89fee9eea61022ccc03ae4b',
      COOKIE_SECRET: 'c0ff10225559cfa208be5779d6d9c35667065359460d5c54fa6367968f0b060b',
      CSRF_SECRET: '2d7e08b0ae58c61f90d4517da60e9db3c4c0bcc34d88548772683d5a37da1799',

      // Domain Configuration
      MAIN_DOMAIN: 'danielecamiz.com',
      HUB_DOMAIN: 'hub.danielecamiz.com',

      // Database
      DB_PATH: '../cms/db/main.sqlite',

      // Session Management
      SESSION_NAME: 'hub_session',
      SESSION_TIMEOUT: 3600000,
      SESSION_SECURE: true,
      SESSION_SAME_SITE: 'lax',

      // Rate Limiting
      RATE_LIMIT_WINDOW: 15,
      RATE_LIMIT_LOGIN_MAX: 5,
      RATE_LIMIT_MAX_REQUESTS: 100,

      // 2FA Configuration
      TOTP_ISSUER: 'danielecamiz.com',
      TOTP_WINDOW: 2,

      // Logging
      LOG_LEVEL: 'info',
      DB_LOG_LEVEL: 'info',

      // Maintenance
      MAINTENANCE_MODE: false
    },
    error_file: '/home/daniele/danielecamiz-site/shared/logs/admin-hub-error.log',
    out_file: '/home/daniele/danielecamiz-site/shared/logs/admin-hub-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

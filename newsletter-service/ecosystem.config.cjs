// newsletter-service/ecosystem.config.js
// PM2 Configuration - CORRETTA

module.exports = {
  apps: [{
    name: 'newsletter-service',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',  // IMPORTANTE: fork, non cluster!
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      NEWSLETTER_PORT: 3006,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'DanieleCamiz2025!',
      SESSION_SECRET: 'newsletter-admin-secret-production-2025'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
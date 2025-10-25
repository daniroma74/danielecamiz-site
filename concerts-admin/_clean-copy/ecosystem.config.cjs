// concerts-admin/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'concerts-admin',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
  NODE_ENV: 'production',
  PORT: 3004,  // ← Cambiato da 5001 a 3004
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'Vyasaji74',
  SESSION_SECRET: 'concerts-admin-secret-production-2025'
},
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true
  }]
};
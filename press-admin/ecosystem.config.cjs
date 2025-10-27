module.exports = {
  apps: [{
    name: 'press-admin',
    script: './server.js',
    cwd: '/home/daniele/danielecamiz-site/press-admin',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'staging',
      PRESS_ADMIN_PORT: 3012
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

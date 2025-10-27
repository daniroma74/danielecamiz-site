module.exports = {
  apps: [{
    name: 'bio-admin',
    script: './server.js',
    cwd: '/home/daniele/danielecamiz-site/bio-admin',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      BIO_ADMIN_PORT: 3011
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

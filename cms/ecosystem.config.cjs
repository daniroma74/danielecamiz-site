module.exports = {
  apps: [
    {
      name: 'staging-site',
      script: './templateServer.js',
      cwd: '/home/daniele/danielecamiz-site/cms',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001,
        CLOUDINARY_CLOUD_NAME: 'dnwhnz2xy'
      },
      error_file: '../shared/logs/staging-site-error.log',
      out_file: '../shared/logs/staging-site-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

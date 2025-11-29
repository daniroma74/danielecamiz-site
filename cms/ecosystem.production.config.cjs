module.exports = {
  apps: [
    {
      name: 'cms-site',
      script: './templateServer.js',
      cwd: '/home/daniele/danielecamiz-site/cms',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        CLOUDINARY_CLOUD_NAME: 'dnwhnz2xy',
        CLOUDINARY_API_KEY: '475369637192245',
        CLOUDINARY_API_SECRET: 'M5oAuFh6ArdI8KT-A13bcKyvao0',
        BASE_URL: 'https://staging.danielecamiz.com',
        YT_API_KEY: 'AIzaSyCdZnBgGrvDwM8J4MxqpIY8ALelvtLib6Q',
        YT_CHANNEL_ID: 'UCC8ZMU-Kj6tOi24kKEsUwXw',
        GA4_MEASUREMENT_ID: 'G-Y86Z5R79D7',
        MAIN_SQLITE_PATH: '/home/daniele/danielecamiz-site/cms/db/main.sqlite'
      },
      error_file: '/home/daniele/.pm2/logs/cms-site-error.log',
      out_file: '/home/daniele/.pm2/logs/cms-site-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

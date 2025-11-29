module.exports = {
  apps: [{
    name: 'newsletter-service',
    script: './server.js',
    cwd: '/home/daniele/danielecamiz-site/newsletter-service',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 2000,
    env: {
      NODE_ENV: 'production',
      NEWSLETTER_PORT: 3006,

      // JWT Secret for Hub authentication
      JWT_SECRET: 'fade92bbaf724d0c4c7db078e137517633e9faefa89fee9eea61022ccc03ae4b',

      // Admin credentials
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'admin',

      // Database
      MAIN_SQLITE_PATH: '/home/daniele/danielecamiz-site/cms/db/main.sqlite',

      // Cloudinary (if needed)
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

      // Admin Hub
      ADMIN_HUB_URL: 'https://hub.danielecamiz.com'
    },
    error_file: '/home/daniele/danielecamiz-site/shared/logs/newsletter-error.log',
    out_file: '/home/daniele/danielecamiz-site/shared/logs/newsletter-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

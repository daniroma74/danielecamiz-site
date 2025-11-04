// news-admin/ecosystem.config.cjs
const fs = require('fs');
const path = require('path');

// Leggi .env del CMS
const cmsEnv = {};
const envPath = path.join(__dirname, '..', 'cms', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) cmsEnv[match[1].trim()] = match[2].trim();
  });
}

module.exports = {
  apps: [{
    name: 'news-admin',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3005,
      
      // Auth - IMPORTARE DA .env PER SICUREZZA
      NEWS_ADMIN_USER: process.env.NEWS_ADMIN_USER || 'admin',
      NEWS_ADMIN_PASS: process.env.NEWS_ADMIN_PASS, // OBBLIGATORIO: definire in .env
      SESSION_SECRET: cmsEnv.SESSION_SECRET || process.env.SESSION_SECRET,
      
      // Database
      MAIN_SQLITE_PATH: '../cms/db/main.sqlite',
      
      // Cloudinary (da CMS)
      CLOUDINARY_CLOUD_NAME: cmsEnv.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: cmsEnv.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: cmsEnv.CLOUDINARY_API_SECRET,
      
      // Social (da CMS)
      FB_SYSTEM_USER_TOKEN: cmsEnv.FB_SYSTEM_USER_TOKEN,
      FB_TARGET_PAGE_IDS: cmsEnv.FB_TARGET_PAGE_IDS,
      LINKEDIN_ACCESS_TOKEN: cmsEnv.LINKEDIN_ACCESS_TOKEN,
      LINKEDIN_API_VERSION: cmsEnv.LINKEDIN_API_VERSION || '202508',
      THREADS_ACCESS_TOKEN: cmsEnv.THREADS_ACCESS_TOKEN,
      THREADS_USER_ID: cmsEnv.THREADS_USER_ID,
      
      // URLs
      SITE_BASE_URL: 'https://staging.danielecamiz.com',
      CONTACT_SITE_URL: 'https://contact.danielecamiz.com',
      ADMIN_HUB_URL: 'https://hub.danielecamiz.com'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true
  }]
};

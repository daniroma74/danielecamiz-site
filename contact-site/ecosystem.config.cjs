// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'contact-site',
      script: 'server.js',                                  // relativo alla cwd
      cwd: '/home/daniele/danielecamiz-site/contact-site',  // ✅ path giusta
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '200M',

      // log (relativi alla cwd)
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // env
      env: {
        NODE_ENV: 'production',
        PORT: 4003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4003
      }
    }
  ]
};

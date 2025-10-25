// /home/daniele/danielecamiz-site/icnt-stagione/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'icnt-stagione',
    script: '/home/daniele/danielecamiz-site/icnt-stagione/server.js',
    cwd: '/home/daniele/danielecamiz-site/icnt-stagione',
    exec_mode: 'fork',
    instances: 1,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3026,
      DB_PATH: '/home/daniele/danielecamiz-site/cms/db/main.sqlite',
      SEASON_CODE: '2025-26',
      BASE_URL: 'https://icnt.danielecamiz.com'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    autorestart: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
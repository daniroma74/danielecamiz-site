module.exports = {
  apps: [{
    name: 'staging-site',
    script: './templateServer.js',
    cwd: '/home/daniele/danielecamiz-site/cms',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    min_uptime: '5s',
    max_restarts: 10,
    restart_delay: 1000,
    exp_backoff_restart_delay: 100,
    kill_timeout: 5000,
    listen_timeout: 5000,
    env: {
      NODE_ENV: 'staging'
    },
    error_file: '/home/daniele/danielecamiz-site/shared/logs/staging-site-error.log',
    out_file: '/home/daniele/danielecamiz-site/shared/logs/staging-site-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

module.exports = {
  apps: [{
    name: 'landing-multi',
    script: './server.js',
    cwd: '/home/daniele/danielecamiz-site/landing',
    env: {
      NODE_ENV: 'production',
      LANDING_PORT: 3002,
      BASE_URL: 'https://danielecamiz.com'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
}
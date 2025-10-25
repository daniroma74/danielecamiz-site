module.exports = {
  apps: [
    {
      name: "orchestraicnt-portal",
      script: "server.js",
      cwd: "/home/daniele/danielecamiz-site/orchestraicnt-portal",
      instances: 1,              // 1 istanza: evita doppie letture allo Sheet
      exec_mode: "fork",         // niente cluster
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_memory_restart: "300M",
      time: true,
      out_file: "/home/daniele/.pm2/logs/icnt-portal-out.log",
      error_file: "/home/daniele/.pm2/logs/icnt-portal-error.log"
    }
  ]
}

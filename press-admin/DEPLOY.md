# Deploy PRESS-ADMIN

## 1. Configurazione Nginx

```bash
sudo cp /tmp/press-admin.danielecamiz.com.conf /etc/nginx/sites-available/press-admin.danielecamiz.com

sudo ln -s /etc/nginx/sites-available/press-admin.danielecamiz.com /etc/nginx/sites-enabled/

sudo nginx -t

sudo systemctl reload nginx
```

## 2. SSL Certificate

Usa il certificato wildcard Cloudflare esistente:
- `/etc/ssl/cloudflare/wildcard.crt`
- `/etc/ssl/cloudflare/wildcard.key`

## 3. Avvio con PM2

```bash
cd /home/daniele/danielecamiz-site/press-admin

pm2 start ecosystem.config.cjs

pm2 save
```

## 4. Verifica

```bash
pm2 logs press-admin

pm2 status

curl http://localhost:3012
```

## 5. Accesso

URL: https://press-admin.staging.danielecamiz.com
Username: admin
Password: DanieleCamiz2025!

## Comandi Utili

```bash
pm2 restart press-admin

pm2 stop press-admin

pm2 delete press-admin

pm2 logs press-admin --lines 50

pm2 monit
```

## Database

Path: /home/daniele/danielecamiz-site/cms/db/main.sqlite

Tabelle create:
- press_quotes (nuova)
- press_items (esistente, riusata)
- press_i18n (esistente, riusata)

## Migrazione Dati

Eseguita con successo:
- 4 citazioni migrate da press-it.json

Per rieseguire la migrazione:
```bash
cd /home/daniele/danielecamiz-site/press-admin
node scripts/migrate-press-data.js
```

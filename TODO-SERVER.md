# CHECKLIST DEPLOYMENT - Esegui questi comandi sul server

## 1. PULL del branch (dal server)
```bash
cd ~/danielecamiz-site
git pull origin claude/session-scripts-011CUoMaULBEc6ErgbH4ZpUS
```

## 2. RUN MIGRATIONS database
```bash
cd ~/danielecamiz-site/cms/db
sqlite3 main.sqlite < migrations/033_create_contact_tables.sql
sqlite3 main.sqlite < migrations/034_seed_contact_data.sql

# Verifica che funzioni
sqlite3 main.sqlite "SELECT COUNT(*) FROM contact_links;"
# Deve dire: 13
```

## 3. INSTALL dipendenze
```bash
# Contact-site
cd ~/danielecamiz-site/contact-site
npm install

# Contact-admin
cd ~/danielecamiz-site/contact-admin
npm install
```

## 4. CREA file .env per contact-admin
```bash
cd ~/danielecamiz-site/contact-admin
nano .env
```

Copia e incolla questo:
```bash
CONTACT_ADMIN_PORT=3014
CONTACT_ADMIN_USER=admin
CONTACT_ADMIN_PASS=DanieleCamiz2025!
MAIN_SQLITE_PATH=/home/daniele/danielecamiz-site/cms/db/main.sqlite
ADMIN_HUB_URL=http://localhost:3100
JWT_SECRET=<copia_da_hub/.env>
SESSION_SECRET=<genera_random>
CONTACT_SITE_URL=https://contact.danielecamiz.com
SITE_BASE_URL=https://staging.danielecamiz.com
NODE_ENV=production
```

**IMPORTANTE:** Apri `~/danielecamiz-site/admin-hub/.env` e copia il valore di `JWT_SECRET` nello stesso campo sopra

## 5. AGGIORNA contact-site/.env
```bash
cd ~/danielecamiz-site/contact-site
nano .env
```

Aggiungi/modifica queste righe:
```bash
DB_PATH=/home/daniele/danielecamiz-site/cms/db/main.sqlite
HUB_ANALYTICS_URL=http://localhost:3100/api/analytics/track
```

## 6. START contact-admin con PM2
```bash
cd ~/danielecamiz-site/contact-admin
pm2 start ecosystem.config.cjs
pm2 save
```

## 7. RESTART contact-site
```bash
pm2 restart contact-site
```

## 8. VERIFICA che tutto giri
```bash
pm2 status
# Devi vedere:
# - contact-site (port 4003) - online
# - contact-admin (port 3014) - online
# - admin-hub (port 3100) - online
```

## 9. CONFIGURA NGINX per contact-admin
```bash
sudo nano /etc/nginx/sites-available/contact-admin.danielecamiz.com
```

Copia questo:
```nginx
server {
    listen 443 ssl http2;
    server_name contact-admin.danielecamiz.com;

    ssl_certificate /etc/ssl/certs/danielecamiz.com.pem;
    ssl_certificate_key /etc/ssl/private/danielecamiz.com-key.pem;

    location / {
        proxy_pass http://localhost:3014;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name contact-admin.danielecamiz.com;
    return 301 https://$server_name$request_uri;
}
```

Poi:
```bash
sudo ln -s /etc/nginx/sites-available/contact-admin.danielecamiz.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 10. CONFIGURA DNS su Cloudflare
- Vai su Cloudflare dashboard
- Aggiungi record A:
  - Nome: `contact-admin`
  - Contenuto: `116.203.79.66`
  - Proxy: ON (nuvola arancione)
  - TTL: Auto

## 11. TEST finale
```bash
# Test locale
curl http://localhost:4003 | head
curl http://localhost:3014/auth/login | head

# Test pubblico (dopo DNS)
curl https://contact.danielecamiz.com | head
curl https://contact-admin.danielecamiz.com/auth/login | head
```

## FATTO! 🎉

Ora puoi:
- Visitare https://contact.danielecamiz.com (nuovo design)
- Accedere a https://contact-admin.danielecamiz.com (admin panel)
  - Username: admin
  - Password: DanieleCamiz2025!

---

## Se qualcosa non funziona

```bash
# Vedi i log
pm2 logs contact-site
pm2 logs contact-admin

# Riavvia tutto
pm2 restart all
```

# 🚀 Deploy Completo - Coro Raro Landing System

Guida step-by-step per mettere in produzione il sistema landing con sottodomini dinamici.

---

## 📋 Prerequisiti

- Server Ubuntu/Debian con accesso root
- Dominio `cororaro.it` su Cloudflare
- Nginx installato
- Node.js 18+ installato
- PM2 installato globalmente (`npm i -g pm2`)
- Email service configurato

---

## 1️⃣ Configurazione Cloudflare DNS

### Records DNS da Creare

Vai su Cloudflare → DNS → Records:

```
Type    Name              Content              Proxy   TTL
------------------------------------------------------------
A       @                 YOUR_SERVER_IP       ✅      Auto
A       *                 YOUR_SERVER_IP       ⚠️ OFF  Auto
A       landing-admin     YOUR_SERVER_IP       ✅      Auto
A       staging           YOUR_SERVER_IP       ✅      Auto
```

**IMPORTANTE:**
- Record wildcard `*` → Proxy deve essere **OFF** (nuvola grigia) per funzionare con SSL wildcard
- Altri record → Proxy può essere ON (nuvola arancione)

### Configurazione Email Routing

1. Cloudflare → Email → Email Routing
2. Aggiungi destinazione: `info@cororaro.it` → forward a tua email personale
3. Crea regola forwarding per tutto il dominio
4. Configura SPF/DKIM/DMARC (Cloudflare lo fa automaticamente)

**Credenziali SMTP per inviare email:**

Opzione A - **Cloudflare Email Workers** (gratis, 100k/giorno):
```env
SMTP_HOST=smtp.cloudflare.com
SMTP_PORT=587
SMTP_USER=info@cororaro.it
SMTP_PASS=<genera-password-dall-api-cloudflare>
```

Opzione B - **Gmail** (più facile ma limitato):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=<password-app-google>
```

Opzione C - **SendGrid** (professionale, 100 email/giorno gratis):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
EMAIL_FROM=Coro Raro <info@cororaro.it>
```

---

## 2️⃣ SSL Certificate (Wildcard)

Serve un certificato SSL **wildcard** per `*.cororaro.it`.

### Installa Certbot con Cloudflare plugin

```bash
sudo apt update
sudo apt install certbot python3-certbot-dns-cloudflare
```

### Crea file credenziali Cloudflare

```bash
mkdir -p ~/.secrets
nano ~/.secrets/cloudflare.ini
```

Contenuto (ottieni API Token da Cloudflare → My Profile → API Tokens):
```ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
```

Proteggi il file:
```bash
chmod 600 ~/.secrets/cloudflare.ini
```

### Genera certificato wildcard

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d cororaro.it \
  -d *.cororaro.it \
  --email tua-email@example.com \
  --agree-tos
```

Certificati saranno in: `/etc/letsencrypt/live/cororaro.it/`

### Auto-renewal

Certbot configura auto-renewal automaticamente. Testa con:
```bash
sudo certbot renew --dry-run
```

---

## 3️⃣ Deploy Applicazione

### Clone/Pull Repository

```bash
cd /home/daniele/danielecamiz-site
git pull origin claude/cororaro-admin-simplify-01JeFEzUQVAm4aviA68stPeh
```

### Setup Landing System

```bash
cd cororaro-landing

# Installa dipendenze
npm install

# Crea .env con le tue credenziali
cp .env.example .env
nano .env
```

Configura `.env`:
```env
PORT=3121
NODE_ENV=production

# Database (condiviso con cororaro-site)
DB_PATH=../cororaro-site/db/cororaro.db

# Session secret (genera uno random)
SESSION_SECRET=super-secret-random-string-change-me-2024

# Email SMTP (scegli opzione sopra)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
EMAIL_FROM=Coro Raro <info@cororaro.it>

# Domain
BASE_DOMAIN=cororaro.it
```

### Applica database migrations

```bash
node db/apply-migrations.js
```

Output:
```
📄 Running migration: 001_landing_tables.sql
   ✅ Migration applied successfully

📋 Verifying tables:
   ✓ concert_bookings (0 rows)
   ✓ concert_landing_settings (0 rows)
   ✓ concert_newsletter (0 rows)
```

### Avvia con PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Configura auto-start al boot
```

Verifica:
```bash
pm2 logs cororaro-landing
pm2 status
```

---

## 4️⃣ Configurazione Nginx

### Copia configurazione

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/cororaro-landing.conf
```

### Modifica se necessario

```bash
sudo nano /etc/nginx/sites-available/cororaro-landing.conf
```

Verifica che i path SSL siano corretti:
```nginx
ssl_certificate /etc/letsencrypt/live/cororaro.it/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/cororaro.it/privkey.pem;
```

### Abilita sito

```bash
sudo ln -s /etc/nginx/sites-available/cororaro-landing.conf /etc/nginx/sites-enabled/
```

### Testa configurazione

```bash
sudo nginx -t
```

Output deve essere:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Ricarica Nginx

```bash
sudo systemctl reload nginx
```

---

## 5️⃣ Test Sistema

### Test Admin

Vai su: `https://landing-admin.cororaro.it/admin/landing`

Dovresti vedere:
- Lista concerti (se ne hai creati nel sito principale)
- Possibilità di creare landing page

### Test Landing Pubblica

1. Crea una landing per un concerto dall'admin
2. Il concerto deve avere uno "slug" (es: `natale-2024`)
3. La landing sarà disponibile su: `https://natale-2024.cororaro.it`

### Test Prenotazione

1. Apri una landing pubblica
2. Compila form prenotazione
3. Controlla che arrivi email di conferma
4. Verifica nel database:

```bash
sqlite3 /home/daniele/danielecamiz-site/cororaro-site/db/cororaro.db
SELECT * FROM concert_bookings ORDER BY created_at DESC LIMIT 5;
```

### Test Email

```bash
# Vai nei log dell'app
pm2 logs cororaro-landing --lines 50

# Cerca righe come:
# 📧 Email sent: <message-id>
```

Se non partono email, controlla:
- Credenziali SMTP nel `.env`
- Porta 587 aperta sul server (`telnet smtp.gmail.com 587`)
- Log errori: `pm2 logs cororaro-landing --err`

---

## 6️⃣ Creazione Landing Pages

### Workflow Completo

1. **Crea concerto** dal sito principale (`https://staging.cororaro.it/admin`)
   - Titolo: "Concerto di Natale 2024"
   - Slug: `natale-2024` (questo diventa il sottodominio!)
   - Data, luogo, programma, ecc.
   - **Pubblica** il concerto (is_published = 1)

2. **Crea landing page** (`https://landing-admin.cororaro.it/admin/landing`)
   - Clicca "Crea Landing" sul concerto
   - Editor visuale: personalizza titolo, sottotitolo, descrizione
   - Scegli cosa mostrare: programma, mappa, form prenotazione
   - Scegli colori personalizzati
   - Salva

3. **Landing è live!**
   - URL: `https://natale-2024.cororaro.it`
   - Condividi sui social, via email, WhatsApp, ecc.

4. **Gestisci prenotazioni**
   - Vedi nel database o crea dashboard admin (TODO)
   - Email automatiche ai partecipanti

---

## 7️⃣ Troubleshooting

### Sottodominio non funziona

Controlla:
```bash
# 1. DNS risolve?
dig concerto-natale25.cororaro.it

# 2. Nginx proxy correttamente?
sudo tail -f /var/log/nginx/cororaro-landing-error.log

# 3. App in ascolto?
pm2 status
netstat -tlnp | grep 3121
```

### SSL error

```bash
# Verifica certificato
sudo certbot certificates

# Se scaduto, rinnova
sudo certbot renew

# Reload nginx
sudo systemctl reload nginx
```

### Email non partono

```bash
# Test connessione SMTP
telnet smtp.gmail.com 587
# Premi Ctrl+] poi quit

# Verifica credenziali
cat .env | grep SMTP

# Log app
pm2 logs cororaro-landing | grep -i mail
```

### Landing mostra 404

Controlla:
```bash
# 1. Concert exists and is published?
sqlite3 ../cororaro-site/db/cororaro.db "SELECT id, title, slug, is_published FROM concerts WHERE slug='natale-2024';"

# 2. App riceve richiesta?
pm2 logs cororaro-landing --lines 30

# 3. Routing funziona?
# Controlla nei log che appaia: "Host: natale-2024.cororaro.it"
```

---

## 8️⃣ Monitoring

### PM2 Monitoring

```bash
# Status
pm2 status

# Logs live
pm2 logs cororaro-landing

# Metrics
pm2 monit

# Restart se necessario
pm2 restart cororaro-landing
```

### Nginx Logs

```bash
# Access log
sudo tail -f /var/log/nginx/cororaro-landing-access.log

# Error log
sudo tail -f /var/log/nginx/cororaro-landing-error.log
```

---

## 9️⃣ Update/Deploy Nuove Modifiche

```bash
# Pull changes
cd /home/daniele/danielecamiz-site
git pull origin main

# Update dependencies se serve
cd cororaro-landing
npm install

# Restart app
pm2 restart cororaro-landing

# Check tutto ok
pm2 logs cororaro-landing --lines 20
```

---

## 🎯 Checklist Deploy

- [ ] DNS Cloudflare configurato (wildcard + landing-admin)
- [ ] SSL wildcard certificate ottenuto
- [ ] Email SMTP configurato (Cloudflare/Gmail/SendGrid)
- [ ] Database migrations applicate
- [ ] .env configurato con credenziali production
- [ ] PM2 avviato e salvato
- [ ] Nginx configurato e ricaricato
- [ ] Test admin funziona (`landing-admin.cororaro.it`)
- [ ] Test landing pubblica funziona (`test.cororaro.it`)
- [ ] Test form prenotazione e email
- [ ] Monitoring attivo (PM2 + logs)

---

## 📞 Supporto

Se qualcosa non funziona:

1. Controlla i log: `pm2 logs cororaro-landing`
2. Controlla Nginx: `sudo tail -f /var/log/nginx/cororaro-landing-error.log`
3. Controlla DNS: `dig concerto-test.cororaro.it`
4. Controlla SSL: `curl -I https://landing-admin.cororaro.it`

Per aiuto, contatta: daniele@example.com

---

**Fatto! 🎉**
Il sistema è in produzione e pronto per creare landing bellissime!

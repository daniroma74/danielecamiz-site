# 🎵 Coro Raro - Sito Web Ufficiale

Sito web pubblico per **Coro Raro**, coro del quartiere Prati Fiscali a Roma.

**20 anni di musica, solidarietà e multiculturalità.**

---

## 📋 Indice

- [Stack Tecnologico](#-stack-tecnologico)
- [Struttura Progetto](#-struttura-progetto)
- [Installazione](#-installazione)
- [Configurazione](#-configurazione)
- [Deploy e Produzione](#-deploy-e-produzione)
- [Personalizzazione](#-personalizzazione)
- [Manutenzione](#-manutenzione)

---

## 🛠️ Stack Tecnologico

### Frontend
- **HTML5** - Semantico, accessibile (WCAG AA+)
- **CSS3** - Custom properties, Grid, Flexbox
- **JavaScript ES6+** - Vanilla JS, no framework
- **Google Fonts** - Merriweather, Open Sans, Crimson Text

### Backend
- **Node.js** (v18+)
- **Express.js** - Server HTTP e API REST
- **dotenv** - Gestione variabili ambiente

### DevOps
- **PM2** - Process manager per produzione
- **Nginx** - Reverse proxy, SSL, caching
- **Let's Encrypt** - Certificati SSL gratuiti
- **Git** - Version control

### Design System
- **Palette:** Terracotta (#D2691E), Verde Oliva (#6B8E23), Oro Antico (#DAA520)
- **Tipografia:** Font maggiorati per accessibilità (età media più alta)
- **Mobile-first:** Responsive da 320px a 4K

---

## 📁 Struttura Progetto

```
cororaro-site/
├── public/                    # File statici serviti da Nginx
│   ├── index.html            # Homepage (SPA)
│   ├── css/
│   │   └── style.css         # Stylesheet principale (1224 righe)
│   ├── js/
│   │   └── main.js           # JavaScript client-side
│   ├── assets/
│   │   ├── images/           # Logo, hero, gallery (DA AGGIUNGERE)
│   │   └── IMAGES_README.md  # Guida immagini
│   ├── robots.txt            # SEO - crawling rules
│   └── sitemap.xml           # SEO - mappa sito
│
├── server.js                  # Server Express (API backend)
├── package.json              # Dipendenze Node.js
├── ecosystem.config.cjs      # Configurazione PM2
├── .env.example              # Template variabili ambiente
├── .gitignore                # File esclusi da git
├── nginx.conf.example        # Configurazione Nginx
└── README.md                 # Questa guida
```

---

## 🚀 Installazione

### 1. Requisiti

```bash
# Node.js 18+ e npm
node --version  # v18.x.x o superiore
npm --version   # 8.x.x o superiore

# PM2 (globale)
npm install -g pm2

# Nginx
nginx -v  # nginx/1.18.0 o superiore
```

### 2. Clone Repository

```bash
cd /home/daniele/danielecamiz-site
git pull origin claude/create-orchestra-icnt-site-011CUviyEKRqnSZwtfoNJwAh
```

### 3. Installa Dipendenze

```bash
cd cororaro-site
npm install
```

### 4. Configura Environment

```bash
cp .env.example .env
nano .env
```

**Compila le variabili:**
```env
# Server
NODE_ENV=production
PORT=3120

# Email (per form contatti)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=password-app-gmail
CONTACT_EMAIL=info@cororaro.it

# Social Media
FACEBOOK_URL=https://facebook.com/cororaro
INSTAGRAM_URL=https://instagram.com/cororaro
YOUTUBE_URL=https://youtube.com/@cororaro

# Recaptcha (opzionale, per anti-spam)
RECAPTCHA_SECRET_KEY=your-secret-key
```

---

## ⚙️ Configurazione

### Nginx Setup

#### 1. Copia configurazione

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/cororaro.it.conf
sudo ln -s /etc/nginx/sites-available/cororaro.it.conf /etc/nginx/sites-enabled/
```

#### 2. Modifica percorsi (se necessario)

```bash
sudo nano /etc/nginx/sites-available/cororaro.it.conf
```

Verifica:
- `root /home/daniele/danielecamiz-site/cororaro-site/public;`
- `proxy_pass http://127.0.0.1:3120;` (porta backend)

#### 3. Test configurazione

```bash
sudo nginx -t
```

Deve mostrare: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

#### 4. Ricarica Nginx

```bash
sudo systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)

```bash
# Per produzione (cororaro.it)
sudo certbot --nginx -d cororaro.it -d www.cororaro.it

# Per staging (staging.cororaro.it)
sudo certbot --nginx -d staging.cororaro.it

# Test auto-renewal
sudo certbot renew --dry-run
```

**Nota:** Se usi Cloudflare con proxy abilitato (orange cloud), certbot potrebbe fallire. In tal caso:
- Disabilita temporaneamente il proxy Cloudflare (grigio)
- Ottieni il certificato
- Riattiva il proxy

Oppure usa **Cloudflare Origin Certificate** direttamente.

### Basic Auth per Staging

Il file `/etc/nginx/.htpasswd-stage` dovrebbe già esistere. Se no:

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-stage admin
# Inserisci password quando richiesto
```

---

## 🎯 Deploy e Produzione

### Avvio con PM2

```bash
cd /home/daniele/danielecamiz-site/cororaro-site

# Start
pm2 start ecosystem.config.cjs

# Verifica stato
pm2 status

# Logs
pm2 logs cororaro-site

# Restart
pm2 restart cororaro-site

# Stop
pm2 stop cororaro-site

# Salva configurazione PM2
pm2 save
pm2 startup
```

### Verifica Funzionamento

1. **Backend API:**
```bash
curl http://localhost:3120/api/health
# Deve restituire: {"status":"ok","service":"Coro Raro API"}
```

2. **Frontend (staging):**
```bash
curl -I https://staging.cororaro.it
# Deve restituire: HTTP/2 200
```

3. **Produzione:**
```bash
curl -I https://cororaro.it
# Deve restituire: HTTP/2 200
```

### Deployment Workflow

```bash
# Sul server
cd /home/daniele/danielecamiz-site
git pull origin <branch-name>

cd cororaro-site
npm install  # Se ci sono nuove dipendenze

pm2 restart cororaro-site
pm2 logs cororaro-site --lines 50
```

---

## 🎨 Personalizzazione

### 1. Contenuti Homepage

Modifica `public/index.html`:

#### Testi Sezione Hero
```html
<!-- Linea 45-60 circa -->
<div class="stats-grid">
  <div class="stat-item">
    <div class="stat-number">20</div>
    <div class="stat-label">Anni di Attività</div>
  </div>
  <!-- Modifica i numeri secondo dati reali -->
</div>
```

#### Date Concerti
```html
<!-- Linea 140 circa - sezione #concerti -->
<div class="concert-card">
  <div class="concert-date">15 Dicembre 2024</div>
  <h3 class="concert-title">Concerto di Natale</h3>
  <!-- ... -->
</div>
```

#### Video YouTube
```html
<!-- Linea 280 circa - sezione #media -->
<iframe
  src="https://www.youtube.com/embed/TUO_ID_VIDEO"
  <!-- Sostituisci TUO_ID_VIDEO con l'ID reale -->
></iframe>
```

### 2. Immagini

Leggi la guida completa: `public/assets/IMAGES_README.md`

**File necessari:**
- `public/assets/images/logo.png` (500px larghezza, <50KB)
- `public/assets/images/hero-choir.jpg` (1920x1080px, <200KB)
- `public/assets/images/choir-group.jpg` (1200x800px, <150KB)
- `public/favicon.ico` (32x32px)

**Ottimizzazione:**
```bash
# Usa TinyPNG online o ImageMagick
convert input.jpg -resize 1920x1080^ -quality 85 output.jpg
```

### 3. Colori e Design

Modifica `public/css/style.css` (linee 1-50):

```css
:root {
  /* Palette principale */
  --terracotta: #D2691E;      /* Colore primario caldo */
  --verde-oliva: #6B8E23;     /* Accento natura */
  --oro-antico: #DAA520;      /* Highlights */

  /* Modifica questi per cambiare il look */
  --avorio: #FFF8E7;          /* Sfondo sezioni alternate */
  --grigio-caldo: #8B7355;    /* Testo secondario */
}
```

### 4. Email Contact Form

Il form invia a `/api/contact`. Configura email in `.env`:

**Opzione A - Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=app-password  # Crea "App Password" nelle impostazioni Google
CONTACT_EMAIL=info@cororaro.it
```

**Opzione B - SendGrid/Mailgun/SES:**
Modifica `server.js` (linee 30-80) per integrare il servizio scelto.

### 5. Social Media Links

Modifica `public/index.html` (linee 500+ nel footer):

```html
<div class="social-links">
  <a href="https://facebook.com/cororaro" target="_blank">
    <i class="fab fa-facebook"></i>
  </a>
  <!-- Aggiorna tutti i link social -->
</div>
```

---

## 🔧 Manutenzione

### Aggiornamento Concerti

1. Apri `public/index.html`
2. Vai alla sezione `<section id="concerti">`
3. Aggiungi nuove card o modifica esistenti:

```html
<div class="concert-card">
  <div class="concert-date">25 Gennaio 2025</div>
  <h3 class="concert-title">Nuovo Concerto</h3>
  <div class="concert-location">
    <i class="fas fa-map-marker-alt"></i>
    Auditorium Parco della Musica
  </div>
  <p class="concert-description">
    Descrizione del concerto...
  </p>
  <a href="#" class="btn btn-outline">Info e Biglietti</a>
</div>
```

4. Commit e push:
```bash
git add public/index.html
git commit -m "feat: add January 2025 concert"
git push
```

5. Deploy:
```bash
# Sul server
git pull
pm2 restart cororaro-site
```

### Backup

```bash
# Backup database (se implementato in futuro)
# Backup file statici
tar -czf backup-cororaro-$(date +%Y%m%d).tar.gz \
  /home/daniele/danielecamiz-site/cororaro-site/public/assets/images

# Upload su cloud storage
# aws s3 cp backup-cororaro-*.tar.gz s3://bucket/backups/
```

### Monitoraggio

```bash
# Logs PM2
pm2 logs cororaro-site --lines 100

# Logs Nginx
sudo tail -f /var/log/nginx/cororaro-access.log
sudo tail -f /var/log/nginx/cororaro-error.log

# Stato processo
pm2 monit

# Risorse sistema
htop  # Cerca processo "node" su porta 3120
```

### Aggiornamenti Sicurezza

```bash
# Aggiorna dipendenze Node.js
npm update
npm audit fix

# Verifica vulnerabilità
npm audit

# Aggiorna Node.js (tramite nvm)
nvm install 20
nvm use 20
npm install

# Riavvia
pm2 restart cororaro-site
```

---

## 📊 Performance e SEO

### Performance Checklist

- [x] Gzip compression (Nginx)
- [x] Static file caching (1 anno immagini, 1 mese CSS/JS)
- [x] Lazy loading immagini
- [x] Font preloading
- [ ] **TODO:** Implementa WebP per immagini
- [ ] **TODO:** Service Worker per offline support

### SEO Checklist

- [x] `sitemap.xml` configurato
- [x] `robots.txt` configurato
- [x] Meta tags Open Graph e Twitter Card
- [x] Schema.org structured data (Organization, MusicGroup)
- [x] Alt text su tutte le immagini
- [x] Semantic HTML5
- [ ] **TODO:** Google Search Console setup
- [ ] **TODO:** Google Analytics/Matomo

### Testa Performance

```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://cororaro.it --view

# WebPageTest
# https://www.webpagetest.org/

# GTmetrix
# https://gtmetrix.com/
```

**Target:**
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >95

---

## 🐛 Troubleshooting

### Problema: 502 Bad Gateway

**Causa:** Backend non raggiungibile

**Fix:**
```bash
# Verifica PM2
pm2 status
pm2 restart cororaro-site

# Verifica porta
netstat -tlnp | grep 3120
# Deve mostrare processo node in LISTEN

# Test backend diretto
curl http://localhost:3120/api/health
```

### Problema: 403 Forbidden

**Causa:** Nginx non trova i file o permessi errati

**Fix:**
```bash
# Verifica file esistono
ls -la /home/daniele/danielecamiz-site/cororaro-site/public/index.html

# Verifica permessi
chmod -R 755 /home/daniele/danielecamiz-site/cororaro-site/public

# Verifica configurazione Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Problema: Form non funziona

**Causa:** Variabili ambiente email non configurate

**Fix:**
```bash
# Verifica .env
cat /home/daniele/danielecamiz-site/cororaro-site/.env

# Controlla logs
pm2 logs cororaro-site --lines 50

# Test endpoint manualmente
curl -X POST http://localhost:3120/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"Test"}'
```

### Problema: CSS/JS non aggiornato

**Causa:** Cache browser o Nginx

**Fix:**
```bash
# Clear cache Nginx
sudo systemctl reload nginx

# Browser: CTRL+F5 (hard refresh)

# Aggiungi version query string in HTML
<link rel="stylesheet" href="/css/style.css?v=1.0.1">
```

---

## 📞 Supporto

### Documentazione Utile

- [Express.js Docs](https://expressjs.com/)
- [PM2 Docs](https://pm2.keymetrics.io/docs/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)

### Contatti Sviluppo

Per modifiche al sito o problemi tecnici, contatta lo sviluppatore.

---

## 📝 Changelog

### v1.0.0 - 2024-11-08

**Iniziale release:**
- Homepage completa con 7 sezioni (Hero, Chi Siamo, Repertorio, Progetti Solidarietà, Concerti, Media, Contatti)
- Design terracotta/verde/oro con accessibilità migliorata
- Backend Express con API contact/newsletter
- PM2 configuration per production
- Nginx setup con SSL e staging environment
- Documentazione completa

---

## 📜 License

© 2024 Coro Raro - Tutti i diritti riservati.

Il codice sorgente del sito è proprietario. Le immagini, testi e contenuti multimediali sono di proprietà di Coro Raro e non possono essere utilizzati senza autorizzazione.

---

**🎼 Buona musica e buon lavoro! 🎶**

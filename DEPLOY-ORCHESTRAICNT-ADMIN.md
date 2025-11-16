# Deploy Admin Panel Orchestra ICNT

## 📋 Checklist Deployment

Il pannello admin è stato creato e committato. Segui questi passaggi per il deployment:

### 1. ⚙️ Configurazione .env

Aggiorna `/home/daniele/danielecamiz-site/orchestraicnt-site/.env`:

```bash
cd /home/daniele/danielecamiz-site/orchestraicnt-site

# Modifica .env con le credenziali corrette
nano .env
```

**Valori richiesti**:
```env
PORT=4012
NODE_ENV=production

# Cloudinary (usa le stesse credenziali degli altri siti)
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

### 2. 🔧 Nginx Configuration

```bash
# Copia la nuova configurazione nginx
sudo cp /home/daniele/danielecamiz-site/nginx-orchestraicnt-protected.conf \
  /etc/nginx/sites-available/orchestraicnt

# Abilita il sito (se non già fatto)
sudo ln -sf /etc/nginx/sites-available/orchestraicnt \
  /etc/nginx/sites-enabled/orchestraicnt

# Test configurazione
sudo nginx -t

# Riavvia nginx
sudo systemctl reload nginx
```

**Cosa è stato aggiunto in nginx**:
- ✅ `location /admin/` → proxy to Node:4012
- ✅ `location /api/` → proxy to Node:4012
- ✅ `location /shared/` → proxy to Node:4012 (Cloudinary, TinyMCE)

### 3. 🚀 Avvia Server Node

```bash
cd /home/daniele/danielecamiz-site/orchestraicnt-site

# Installa dipendenze (se non già fatto)
npm install

# Inizializza database locale (prima volta)
node -e "
const { initLocalDB } = require('./config/database');
initLocalDB()
  .then(() => console.log('✅ DB initialized'))
  .catch(err => console.error('❌ Error:', err));
"

# Avvia con PM2
pm2 start ecosystem.config.cjs --env production

# Salva configurazione PM2
pm2 save

# Verifica che sia in running
pm2 list
pm2 logs orchestraicnt-site
```

### 4. ✅ Verifica Funzionamento

Testa questi URL (ricorda l'autenticazione HTTP Basic):

1. **Admin Panel**:
   - https://orchestraicnt.danielecamiz.com/admin
   - Dovresti vedere il pannello di gestione impostazioni

2. **API Settings**:
   - https://orchestraicnt.danielecamiz.com/api/settings
   - Dovresti ricevere JSON con tutte le impostazioni

3. **API Concerti**:
   - https://orchestraicnt.danielecamiz.com/api/concerts/upcoming?limit=3
   - Dovresti ricevere i prossimi 3 concerti Orchestra ICNT

4. **Sito Pubblico**:
   - https://orchestraicnt.danielecamiz.com
   - Tutto il contenuto deve caricarsi dinamicamente dalle API

### 5. 🔍 Troubleshooting

**Se /admin rimanda alla home**:
```bash
# Verifica che il server Node sia in running
pm2 list | grep orchestraicnt

# Verifica i log
pm2 logs orchestraicnt-site --lines 50

# Verifica che nginx proxi correttamente
curl -I http://localhost:4012/admin
```

**Se le API non funzionano**:
```bash
# Verifica che il server risponda sulla porta 4012
curl http://localhost:4012/api/settings

# Verifica i log del server
pm2 logs orchestraicnt-site
```

**Se il database non si inizializza**:
```bash
# Verifica i permessi
ls -la orchestraicnt-site/admin/db/

# Ricrea il database
cd orchestraicnt-site
rm -f admin/db/icnt.sqlite
node -e "const {initLocalDB}=require('./config/database');initLocalDB().then(()=>console.log('OK'))"
```

### 6. 📊 Struttura Creata

```
orchestraicnt-site/
├── admin/                    # Pannello admin
│   ├── controllers/          # Controller admin
│   ├── routes/              # Routes admin
│   ├── views/               # EJS templates
│   └── db/                  # Database locale ICNT
│       ├── schema.sql       # Schema DB
│       └── icnt.sqlite      # DB (auto-creato)
├── config/
│   └── database.js          # Connessioni DB (locale + condiviso)
├── controllers/
│   └── apiController.js     # API pubbliche
├── routes/
│   └── api.js              # Routes API
└── server.js               # Server aggiornato
```

### 7. 🎯 Funzionalità Disponibili

**Pannello Admin** (`/admin`):
- ✅ Hero Section (immagine, titoli, claim, CTA)
- ✅ Chi Siamo (testo, immagini, features)
- ✅ Concerti (labels, link stagione)
- ✅ Media (titoli)
- ✅ Contatti (email, telefono, indirizzo)
- ✅ Footer & Social (copyright, social links)
- ✅ SEO (title, description, keywords)

**API Pubbliche**:
- ✅ `GET /api/settings` - Tutte le impostazioni
- ✅ `GET /api/concerts/upcoming?limit=N` - Concerti futuri Orchestra ICNT

**Database**:
- ✅ Locale: `admin/db/icnt.sqlite` (impostazioni ICNT)
- ✅ Condiviso: `cms/db/main.sqlite` (concerti da concerts-admin)

---

## 📝 Note Importanti

1. **Credenziali Cloudinary**: Usa le stesse degli altri siti (cororaro, concerts-admin, ecc.)

2. **Concerti Automatici**: I concerti sono pescati automaticamente dal database condiviso (`cms/db/main.sqlite`) con filtro Orchestra ICNT. Qualsiasi concerto aggiunto da `concerts-admin` con orchestra="Orchestra ICNT" apparirà automaticamente.

3. **Link Stagione Completa**: Il pulsante "Vedi tutta la stagione" è configurabile dall'admin e punta di default a `https://icnt.danielecamiz.com`.

4. **HTTP Basic Auth**: Il sito è protetto, ricorda username/password.

5. **Zero Hardcoded**: Tutto il contenuto del sito è caricato dinamicamente dalle API - nessun contenuto hardcoded nel frontend.

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Aggiorna .env con credenziali Cloudinary e PORT=4012
# 2. Deploy nginx
sudo cp nginx-orchestraicnt-protected.conf /etc/nginx/sites-available/orchestraicnt
sudo nginx -t && sudo systemctl reload nginx

# 3. Avvia server
cd orchestraicnt-site
npm install
pm2 restart orchestraicnt-site || pm2 start ecosystem.config.cjs --env production
pm2 save

# 4. Verifica
pm2 logs orchestraicnt-site
curl http://localhost:4012/api/settings
```

Poi vai su https://orchestraicnt.danielecamiz.com/admin 🎉

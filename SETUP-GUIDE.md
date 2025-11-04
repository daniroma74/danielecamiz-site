# 🚀 GUIDA SETUP COMPLETO

**Data:** 2025-11-04
**Versione:** 1.0

---

## 📋 PREREQUISITI

- Node.js installato
- PM2 installato globalmente (`npm install -g pm2`)
- Git configurato
- Accesso al server

---

## 🔧 SETUP AUTOMATICO (CONSIGLIATO)

### 1. Sul Server - Pull delle modifiche

```bash
cd ~/danielecamiz-site
git pull origin claude/session-scripts-011CUoMaULBEc6ErgbH4ZpUS
```

### 2. Esegui lo script di setup

```bash
cd ~/danielecamiz-site
./setup-env.sh
```

Lo script creerà automaticamente:
- ✅ Tutti i file `.env` necessari
- ✅ Secret casuali per sicurezza
- ✅ Configurazione password di backup
- ✅ Integrazione con admin-hub

### 3. Riavvia i servizi PM2

```bash
pm2 restart all
pm2 status
```

### 4. Crea utente admin su hub (se non esiste già)

```bash
cd ~/danielecamiz-site/admin-hub
npm run create-admin
```

Inserisci:
- **Username:** `daniele` (o quello che preferisci)
- **Email:** `tua@email.com`
- **Password:** `DanieleCamiz2025!` (o la password che vuoi usare per hub)
- **2FA:** `y` (consigliato) o `n`

Se scegli 2FA, ti verrà mostrato un QR code da scannerizzare con Google Authenticator o app simili.

---

## 🔐 CREDENZIALI CONFIGURATE

### Password di Backup (tutti i moduli)
- **Username:** `admin`
- **Password:** `DanieleCamiz2025!`

Questa è la password di **emergenza** che funziona se l'admin-hub non risponde.

### Password Hub (configurazione manuale al punto 4)
- **Username:** `daniele` (o quello che scegli)
- **Password:** Quella che scegli durante `npm run create-admin`

Questa è la password **principale** che usi normalmente.

---

## 🎯 COME FUNZIONA L'AUTENTICAZIONE

### Scenario A: Normale (90% dei casi)

1. Vai su **https://hub.danielecamiz.com**
2. Login con credenziali hub
3. Click sul modulo che vuoi aprire
4. **Accesso automatico** senza rifare login!

### Scenario B: Emergenza (hub non risponde)

1. Vai direttamente su **https://news-admin.danielecamiz.com** (o altro modulo)
2. Login con password di backup:
   - Username: `admin`
   - Password: `DanieleCamiz2025!`
3. Accesso garantito!

---

## 📁 FILE .ENV CREATI

Lo script `setup-env.sh` crea questi file:

```
admin-hub/.env           ← Configurazione hub centrale
news-admin/.env          ← Backup auth news
concerts-admin/.env      ← Backup auth concerti
newsletter-service/.env  ← Backup auth newsletter
bio-admin/.env          ← Backup auth biografia
press-admin/.env        ← Backup auth stampa
gallery-admin/.env      ← Backup auth gallery
icnt-stagione/.env      ← Config stagione ICNT
contact-site/.env       ← Config sito contatti
```

**IMPORTANTE:** I file `.env` sono in `.gitignore` e NON vengono committati su Git per sicurezza!

---

## 🔑 SECRET GENERATI AUTOMATICAMENTE

Lo script genera automaticamente:

- `SESSION_SECRET` - Firma sessioni Express
- `JWT_SECRET` - Firma token JWT (condiviso hub + moduli)
- `COOKIE_SECRET` - Firma cookie
- `CSRF_SECRET` - Protezione CSRF

Ogni modulo ha il suo `SESSION_SECRET` unico per sicurezza.

---

## 🛠️ CONFIGURAZIONI AGGIUNTIVE

### Cloudinary (per upload immagini)

Se usi Cloudinary, aggiungi al file `cms/.env`:

```bash
CLOUDINARY_CLOUD_NAME=il-tuo-cloud-name
CLOUDINARY_API_KEY=la-tua-api-key
CLOUDINARY_API_SECRET=il-tuo-api-secret
```

Gli altri moduli leggeranno automaticamente da lì.

### Email (per newsletter)

Nel file `newsletter-service/.env`, decommenta e configura:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tua@email.com
SMTP_PASS=la-tua-app-password
EMAIL_FROM=newsletter@danielecamiz.com
```

### Social Media (per auto-posting news)

Nel file `news-admin/.env`, decommenta e configura:

```bash
FB_SYSTEM_USER_TOKEN=il-tuo-token
FB_TARGET_PAGE_IDS=id1,id2
LINKEDIN_ACCESS_TOKEN=il-tuo-token
THREADS_ACCESS_TOKEN=il-tuo-token
THREADS_USER_ID=il-tuo-user-id
```

---

## ✅ VERIFICA SETUP

### 1. Controlla che tutti i moduli siano online

```bash
pm2 status
```

Dovrebbe mostrare tutti i processi **online** (verde).

### 2. Verifica i log (cerca errori)

```bash
pm2 logs --lines 50
```

### 3. Testa il login hub

```bash
curl -I https://hub.danielecamiz.com
```

Dovrebbe rispondere **200 OK** o **302 Redirect**.

### 4. Testa modulo diretto

```bash
curl -I https://news-admin.danielecamiz.com
```

Dovrebbe rispondere **200 OK** o **302 Redirect**.

---

## 🔧 TROUBLESHOOTING

### Problema: PM2 non riavvia un modulo

```bash
pm2 delete <nome-modulo>
cd ~/danielecamiz-site/<nome-modulo>
pm2 start ecosystem.config.cjs
```

### Problema: Errore "JWT_SECRET not defined"

Verifica che il file `.env` esista:

```bash
ls -la ~/danielecamiz-site/admin-hub/.env
cat ~/danielecamiz-site/admin-hub/.env | grep JWT_SECRET
```

Se manca, riesegui `./setup-env.sh`.

### Problema: Login fallisce con password corretta

1. Controlla i log:
   ```bash
   pm2 logs admin-hub --lines 50
   ```

2. Verifica che il database esista:
   ```bash
   ls -la ~/danielecamiz-site/admin-hub/database/sessions.db
   ```

3. Ricrea utente admin:
   ```bash
   cd ~/danielecamiz-site/admin-hub
   npm run create-admin
   ```

### Problema: Module token verification failed

Verifica che `JWT_SECRET` sia lo stesso in:
- `admin-hub/.env`
- `<modulo>/.env`

Deve essere **identico** per funzionare.

---

## 🔒 SICUREZZA

### ✅ Cose da fare SUBITO

1. **Cambia la password di backup** (quella in questo file)
   - Edita `setup-env.sh` → cambia `ADMIN_PASSWORD`
   - Riesegui: `./setup-env.sh`

2. **Abilita 2FA su hub**
   ```bash
   cd admin-hub
   npm run create-admin
   # Scegli "y" quando chiede 2FA
   ```

3. **Ruota i secret periodicamente** (ogni 3-6 mesi)
   - Rigenera con `./setup-env.sh`
   - Riavvia servizi con `pm2 restart all`

### ❌ Cose da NON fare MAI

1. ❌ NON committare file `.env` su git
2. ❌ NON usare password deboli (min 12 caratteri)
3. ❌ NON condividere `JWT_SECRET` pubblicamente
4. ❌ NON disabilitare HTTPS in produzione

---

## 📊 PORTE MODULI

| Modulo | Porta | Subdomain | Auth |
|--------|-------|-----------|------|
| admin-hub | 3100 | hub.danielecamiz.com | Primary |
| cms | 3001 | staging.danielecamiz.com | - |
| coming-soon | 3000 | www.danielecamiz.com | - |
| landing | 3002 | landing.danielecamiz.com | Hub |
| concerts-admin | 3004 | concerts-admin.danielecamiz.com | Hub + Backup |
| news-admin | 3005 | news-admin.danielecamiz.com | Hub + Backup |
| newsletter-service | 3006 | newsletter.danielecamiz.com | Hub + Backup |
| bio-admin | 3011 | bio-admin.danielecamiz.com | Hub + Backup |
| press-admin | 3012 | press-admin.danielecamiz.com | Hub + Backup |
| gallery-admin | 3013 | gallery-admin.danielecamiz.com | Hub + Backup |
| icnt-stagione | 3026 | icnt-stagione.danielecamiz.com | - |
| contact-site | 4003 | contact.danielecamiz.com | - |

---

## 🎯 PROSSIMI PASSI

Dopo aver completato il setup:

1. ✅ Testa login su hub
2. ✅ Testa accesso a tutti i moduli da hub
3. ✅ Testa login diretto su un modulo (backup)
4. ✅ Configura Cloudinary (se necessario)
5. ✅ Configura SMTP per newsletter (se necessario)
6. ⏭️ Procedi con refactoring contact-site (prossimo task)

---

## 📞 SUPPORTO

Se qualcosa non funziona:

1. Controlla i log: `pm2 logs`
2. Verifica .env: `cat <modulo>/.env`
3. Riavvia servizi: `pm2 restart all`
4. Consulta `CRITICAL-FIXES.md` per problemi noti

---

**Fine guida - Generato automaticamente**

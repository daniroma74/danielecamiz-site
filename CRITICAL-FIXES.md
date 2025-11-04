# 🔧 CRITICAL FIXES APPLIED

**Data:** 2025-11-04
**Branch:** claude/session-scripts-011CUoMaULBEc6ErgbH4ZpUS

---

## 🔴 PROBLEMI CRITICI RISOLTI

### 1. ✅ Conflitto Porte (press-admin vs gallery-admin)

**Problema:** Entrambi i moduli usavano la porta 3012

**Fix applicato:**
- `gallery-admin/config/config.js:11` → Porta cambiata da 3012 a **3013**
- `gallery-admin/ecosystem.config.cjs:12` → Porta cambiata da 3012 a **3013**

**Azione richiesta sul server:**
```bash
# Riavvia gallery-admin con la nuova porta
pm2 restart gallery-admin
# Verifica che sia attivo sulla porta 3013
pm2 status
```

---

### 2. ✅ Password Hardcoded Rimosse

**Problema:** Password in chiaro nei file ecosystem.config.cjs (rischio sicurezza)

**File modificati:**
1. `news-admin/ecosystem.config.cjs:31`
2. `concerts-admin/ecosystem.config.cjs:15`
3. `newsletter-service/ecosystem.config.cjs:17`
4. `concerts-admin/_clean-copy/ecosystem.config.cjs:15`

**Password esposte (ORA RIMOSSE):**
- ❌ `DanieleCamiz2025!` (news-admin, concerts-admin, newsletter-service)
- ❌ `Vyasaji74` (concerts-admin backup)

**AZIONE CRITICA RICHIESTA:**

#### A. Creare/aggiornare file .env sul server

Ogni modulo deve avere il proprio `.env` file con le password:

**Per news-admin (`news-admin/.env`):**
```bash
NEWS_ADMIN_USER=admin
NEWS_ADMIN_PASS=<NUOVA_PASSWORD_SICURA>
SESSION_SECRET=<SECRET_CASUALE_64_CHAR>
```

**Per concerts-admin (`concerts-admin/.env`):**
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<NUOVA_PASSWORD_SICURA>
SESSION_SECRET=<SECRET_CASUALE_64_CHAR>
```

**Per newsletter-service (`newsletter-service/.env`):**
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<NUOVA_PASSWORD_SICURA>
SESSION_SECRET=<SECRET_CASUALE_64_CHAR>
```

#### B. Generare nuove password sicure

Sul server, esegui:
```bash
# Genera password casuali sicure
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Ripeti 3 volte per avere 3 password diverse
```

#### C. Riavviare i servizi PM2

Dopo aver creato i file .env:
```bash
pm2 restart news-admin
pm2 restart concerts-admin
pm2 restart newsletter-service
```

#### D. Cambiare le password esposte

Le password `DanieleCamiz2025!` e `Vyasaji74` sono state esposte nel codice sorgente e nella history di git.
**DEVI cambiarle immediatamente** con password nuove e uniche.

---

### 3. ✅ Path Assoluto Hardcoded Fixato

**Problema:** `icnt-stagione/server.js:28` conteneva path assoluto che non funziona su altri server

**Path vecchio (RIMOSSO):**
```javascript
const DB_PATH = process.env.DB_PATH || '/home/daniele/danielecamiz-site/cms/db/main.sqlite';
```

**Path nuovo (RELATIVO):**
```javascript
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');
```

**Azione richiesta sul server:**
```bash
# Riavvia icnt-stagione con il nuovo path
pm2 restart icnt-stagione
# Verifica che il database sia accessibile
pm2 logs icnt-stagione --lines 20
```

---

## 📋 CHECKLIST POST-FIX (DA FARE SUL SERVER)

### Priorità Immediata:

- [ ] **Pull delle modifiche dal repository**
  ```bash
  cd ~/danielecamiz-site
  git fetch origin
  git checkout main  # o il branch con le fix
  git pull origin main
  ```

- [ ] **Creare file .env mancanti** (vedi sezione "Password Hardcoded")
  ```bash
  # news-admin
  nano ~/danielecamiz-site/news-admin/.env
  # concerts-admin
  nano ~/danielecamiz-site/concerts-admin/.env
  # newsletter-service
  nano ~/danielecamiz-site/newsletter-service/.env
  ```

- [ ] **Riavviare i servizi PM2**
  ```bash
  pm2 restart news-admin
  pm2 restart concerts-admin
  pm2 restart newsletter-service
  pm2 restart icnt-stagione
  pm2 restart gallery-admin
  ```

- [ ] **Verificare che tutti i servizi siano online**
  ```bash
  pm2 status
  pm2 logs --lines 50
  ```

- [ ] **Testare i login dei moduli admin** con le nuove password

- [ ] **Verificare che icnt-stagione acceda al database**
  ```bash
  pm2 logs icnt-stagione --lines 20
  # Cerca errori tipo "SQLITE_CANTOPEN" o "no such file"
  ```

### Priorità Alta:

- [ ] **Ruotare le password esposte** (`DanieleCamiz2025!`, `Vyasaji74`)
  - Cambiare password admin su tutti i moduli
  - Cambiare password SSH se è la stessa

- [ ] **Verificare i subdomain Nginx**
  - gallery-admin ora è su porta 3013
  - Aggiornare configurazione Nginx se necessario
  ```bash
  sudo nano /etc/nginx/sites-available/gallery-admin.danielecamiz.com
  # Verifica che il proxy_pass punti a http://localhost:3013
  sudo nginx -t
  sudo systemctl reload nginx
  ```

---

## 📊 RIEPILOGO PORTE MODULI

| Modulo | Porta | Subdomain | Status |
|--------|-------|-----------|--------|
| cms | 3001 | staging.danielecamiz.com | ✅ |
| coming-soon | 3000 | www.danielecamiz.com | ✅ |
| landing | 3002 | landing.danielecamiz.com | ✅ |
| concerts-admin | 3004 | concerts-admin.danielecamiz.com | ✅ |
| news-admin | 3005 | news-admin.danielecamiz.com | ✅ |
| newsletter-service | 3006 | newsletter.danielecamiz.com | ✅ |
| bio-admin | 3011 | bio-admin.danielecamiz.com | ✅ |
| **press-admin** | **3012** | press-admin.danielecamiz.com | ✅ |
| **gallery-admin** | **3013** ⬆️ NEW | gallery-admin.danielecamiz.com | ⚠️ Aggiorna Nginx |
| icnt-stagione | 3026 | icnt-stagione.danielecamiz.com | ✅ |
| admin-hub | 3100 | hub.danielecamiz.com | ✅ |
| contact-site | 4003 | contact.danielecamiz.com | ✅ |

---

## 🔒 BEST PRACTICES FUTURE

### 1. Non committare mai:
- File `.env`
- File `ecosystem.config.cjs` con credenziali
- Password o secret di qualsiasi tipo

### 2. Usare sempre:
- `process.env.VARIABLE_NAME` per credenziali
- File `.env` locali (gitignored)
- Password generate casuali (min 32 caratteri)
- Secret rotatati periodicamente

### 3. Per aggiungere nuovi moduli:
- Usa template senza credenziali hardcoded
- Documenta variabili d'ambiente richieste
- Verifica conflitti di porte prima del deploy

---

## 📞 SUPPORTO

Se qualcosa non funziona dopo le modifiche:

1. Controlla i log PM2: `pm2 logs <module-name> --lines 50`
2. Verifica file .env: `cat ~/danielecamiz-site/<module>/.env`
3. Testa connessione database: `sqlite3 ~/danielecamiz-site/cms/db/main.sqlite ".tables"`
4. Verifica porte libere: `netstat -tlnp | grep <PORT>`

---

**Fine documento - Generato automaticamente da Claude Code**

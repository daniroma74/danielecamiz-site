# 🔐 SECURITY AUDIT - 29 Novembre 2025

## ⚠️ SITUAZIONE CHIAVI API

### Repository Status
- **Nome**: daniroma74/danielecamiz-site
- **Visibilità**: 🔴 **PUBBLICO** (verificato con HTTP 200)
- **GitHub Alert**: ✅ Ricevuto warning per chiavi esposte

### Chiavi Trovate in `cms/.env`
```
CLOUDINARY_CLOUD_NAME=dnwhnz2xy
CLOUDINARY_API_KEY=475369637192245
CLOUDINARY_API_SECRET=M5oAuFh6ArdI8KT-A13bcKyvao0
YT_API_KEY=AIzaSyCdZnBgGrvDwM8J4MxqpIY8ALelvtLib6Q
GA4_MEASUREMENT_ID=G-Y86Z5R79D7
```

### Analisi .gitignore
✅ **CORRETTO**: `.env` è nel .gitignore
✅ **VERIFICATO**: Solo `.env.example` files sono tracciati in git
✅ **CONCLUSIONE**: Le chiavi NON sono attualmente nel repository

### 🎯 Probabilità Scenario
GitHub ha segnalato = le chiavi sono state **committate in passato** e poi rimosse.
Anche se rimosse, la history git le contiene ancora.

---

## 🚨 AZIONI IMMEDIATE RICHIESTE

### 🔴 PRIORITÀ 1: Rigenera Chiavi (URGENTE)

Anche se le chiavi non sono più visibili nel repo attuale, potrebbero essere nella history.
**Best practice**: rigenerare TUTTE le chiavi esposte.

#### 1.1 Cloudinary
```
1. Vai su: https://cloudinary.com/console
2. Login con il tuo account
3. Settings → Security → API Keys
4. Clicca "Regenerate API Secret"
5. Copia le nuove credenziali
6. Aggiorna cms/.env con i nuovi valori
```

**ATTENZIONE**: Dopo la rigenerazione, le vecchie chiavi smetteranno di funzionare!
Devi aggiornare `.env` in TUTTI gli ambienti:
- Locale (development)
- Staging
- Production

#### 1.2 YouTube API
```
1. Vai su: https://console.cloud.google.com
2. Seleziona il progetto
3. APIs & Services → Credentials
4. Trova "YT_API_KEY"
5. Clicca "..." → "Regenerate Key" o crea nuova key
6. Elimina la vecchia key
7. Copia la nuova key
8. Aggiorna cms/.env
```

#### 1.3 Google Analytics
✅ **SICURO**: Il Measurement ID (G-Y86Z5R79D7) è pubblico per design.
Non è una chiave segreta, può essere esposta senza rischi.

---

### 🟡 PRIORITÀ 2: Pulisci Git History (OPZIONALE ma consigliato)

Se vuoi rimuovere completamente le chiavi dalla history git:

#### Opzione A: BFG Repo-Cleaner (RACCOMANDATO)
```bash
# 1. Backup completo
cd ~/
tar -czf danielecamiz-site-backup-$(date +%Y%m%d).tar.gz danielecamiz-site/

# 2. Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
mv bfg-1.14.0.jar ~/bfg.jar

# 3. Clone mirror del repository
cd ~/
git clone --mirror git@github.com:daniroma74/danielecamiz-site.git
cd danielecamiz-site.git

# 4. Rimuovi file .env dalla history
java -jar ~/bfg.jar --delete-files .env

# 5. Cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Push forzato (ATTENZIONE!)
git push --force

# 7. Cleanup locale
cd ~/danielecamiz-site
git pull origin main --rebase
```

#### Opzione B: Lascia com'è (se hai già rigenerato le chiavi)
Se le chiavi sono state rigenerate, quelle nella history sono inutili.
Non è più urgente pulire la history (ma è comunque best practice).

---

### 🟢 PRIORITÀ 3: Verifica Sicurezza Generale

#### 3.1 Security Headers (Nginx)
```nginx
# File: /etc/nginx/sites-available/staging.danielecamiz.com
server {
    # ... existing config ...

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CSP (Content Security Policy)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://res.cloudinary.com data:; font-src 'self'; connect-src 'self' https://www.google-analytics.com;" always;
}
```

#### 3.2 Verifica File Permissions
```bash
# I file .env devono essere leggibili solo dal proprietario
chmod 600 cms/.env
chmod 600 */**.env

# Verifica
ls -la cms/.env
# Deve mostrare: -rw------- (600)
```

#### 3.3 Firewall Check
```bash
# Verifica che solo le porte necessarie siano esposte
sudo ufw status

# Dovrebbero essere aperte solo:
# - 22 (SSH)
# - 80 (HTTP)
# - 443 (HTTPS)
```

---

## ✅ CHECKLIST SICUREZZA POST-FIX

Dopo aver rigenerato le chiavi:

- [ ] Cloudinary: nuova API Secret generata
- [ ] YouTube: nuova API Key generata
- [ ] cms/.env aggiornato (locale)
- [ ] Staging .env aggiornato (server)
- [ ] Production .env aggiornato (quando vai live)
- [ ] Test Cloudinary funziona con nuove chiavi
- [ ] Test YouTube API funziona con nuova chiave
- [ ] Google Analytics tracking attivo (GA4)
- [ ] Security headers configurati in Nginx
- [ ] File .env permissions = 600
- [ ] (Opzionale) Git history pulita con BFG

---

## 📝 SCRIPT RAPIDO AGGIORNAMENTO CHIAVI

Quando hai le nuove chiavi, usa questo script:

```bash
#!/bin/bash
# File: update-api-keys.sh

# IMPORTANTE: Modifica questi valori con le tue NUOVE chiavi
NEW_CLOUDINARY_API_KEY="NUOVA_KEY_QUI"
NEW_CLOUDINARY_API_SECRET="NUOVO_SECRET_QUI"
NEW_YT_API_KEY="NUOVA_YOUTUBE_KEY_QUI"

# Update cms/.env
cd ~/danielecamiz-site/cms
sed -i "s/CLOUDINARY_API_KEY=.*/CLOUDINARY_API_KEY=$NEW_CLOUDINARY_API_KEY/" .env
sed -i "s/CLOUDINARY_API_SECRET=.*/CLOUDINARY_API_SECRET=$NEW_CLOUDINARY_API_SECRET/" .env
sed -i "s/YT_API_KEY=.*/YT_API_KEY=$NEW_YT_API_KEY/" .env

echo "✅ Chiavi aggiornate in cms/.env"

# Restart services
pm2 restart cms-site
echo "✅ Server riavviato"

# Test Cloudinary
echo "🧪 Testing Cloudinary..."
curl -s -u "$NEW_CLOUDINARY_API_KEY:$NEW_CLOUDINARY_API_SECRET" \
  "https://api.cloudinary.com/v1_1/dnwhnz2xy/resources/image?max_results=1" | jq '.resources[0].public_id'

if [ $? -eq 0 ]; then
  echo "✅ Cloudinary funziona!"
else
  echo "❌ Cloudinary ERROR - verifica le chiavi"
fi
```

---

## 🎯 TIMELINE CONSIGLIATA

### OGGI (30 min)
1. ✅ Verifica repository pubblico (FATTO)
2. ⏳ Rigenera Cloudinary API Secret
3. ⏳ Rigenera YouTube API Key
4. ⏳ Aggiorna cms/.env
5. ⏳ Test funzionamento

### DOMANI (opzionale)
1. Pulisci git history con BFG (se vuoi)
2. Configura security headers in Nginx

### POST-LANCIO
1. Monitora logs per accessi non autorizzati
2. Setup alerting per tentativi di accesso sospetti

---

## 📚 RIFERIMENTI

- **Cloudinary Security**: https://cloudinary.com/documentation/security
- **Google Cloud API Security**: https://cloud.google.com/docs/authentication/api-keys
- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **OWASP Security Headers**: https://owasp.org/www-project-secure-headers/

---

## 💡 LEZIONI APPRESE

### Come Evitare in Futuro

1. **MAI committare file .env**
   - Verifica sempre `.gitignore` PRIMA del primo commit
   - Usa `.env.example` come template (senza valori reali)

2. **Usa Secret Management**
   - Opzioni: Vault, AWS Secrets Manager, GitHub Secrets
   - Per progetti piccoli: `.env` + .gitignore è sufficiente

3. **Git Pre-commit Hooks**
   ```bash
   # .git/hooks/pre-commit
   if git diff --cached --name-only | grep -q "\.env$"; then
     echo "❌ ERROR: Stai tentando di committare un file .env!"
     exit 1
   fi
   ```

4. **GitHub Secret Scanning**
   - Abilita "Secret Scanning" nel repository settings
   - Riceverai alert automatici per chiavi esposte

---

**Status**: 🔴 AZIONE RICHIESTA - Rigenera le chiavi API
**Urgenza**: ALTA (repository pubblico)
**Tempo stimato**: 30 minuti
**Impatto**: CRITICO per sicurezza produzione

---

*Report generato il 29 Novembre 2025 - Claude Code Security Audit*

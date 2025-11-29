# 🔒 CRITICAL: API Keys Security

## ⚠️ PROBLEMA TROVATO

Le seguenti API keys sono **esposte nel file `.env`** e potrebbero essere compromesse:

1. **Cloudinary**: API Key + API Secret
2. **YouTube**: API Key
3. **Facebook**: System User Token + Page Token
4. **Threads**: Access Token
5. **LinkedIn**: Access Token + Client Secret

## 🚨 AZIONE IMMEDIATA RICHIESTA

### Passo 1: Rigenerare Tutte le Chiavi

#### A) Cloudinary
1. Login su https://cloudinary.com/console
2. Settings > Security > API Keys
3. Click "Regenerate API Secret"
4. **Copia il nuovo API Secret** (appare solo una volta!)
5. Aggiorna `.env`:
   ```bash
   CLOUDINARY_API_SECRET=<nuovo_secret>
   ```

#### B) YouTube Data API
1. Login su https://console.cloud.google.com
2. APIs & Services > Credentials
3. Trova la chiave esistente
4. Click sui 3 pallini > "Regenerate key" o crea nuova chiave
5. Aggiungi restrizioni:
   - **Application restrictions**: HTTP referrers
   - **Referrers**: `danielecamiz.com/*`, `staging.danielecamiz.com/*`
   - **API restrictions**: Solo "YouTube Data API v3"
6. Aggiorna `.env`:
   ```bash
   YT_API_KEY=<nuova_key>
   ```

#### C) Facebook/Meta Tokens
1. Login su https://developers.facebook.com
2. La tua app > Settings > Basic
3. App Secret > "Reset App Secret"
4. Tools > Graph API Explorer
5. Genera nuovo System User Token con i permessi necessari:
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
6. Aggiorna `.env`:
   ```bash
   FB_SYSTEM_USER_TOKEN=<nuovo_token>
   FB_PAGE_TOKEN=<nuovo_page_token>
   ```

#### D) Threads Access Token
1. Login su https://developers.facebook.com (stesso account Facebook)
2. Threads API > Tools > Access Token Tool
3. Genera nuovo token con scopo `threads_basic` + `threads_content_publish`
4. Aggiorna `.env`:
   ```bash
   THREADS_ACCESS_TOKEN=<nuovo_token>
   ```

#### E) LinkedIn Access Token
1. Login su https://www.linkedin.com/developers/apps
2. La tua app > Auth
3. "Regenerate OAuth 2.0 tokens"
4. Copia nuovo Client Secret
5. Aggiorna `.env`:
   ```bash
   LINKEDIN_CLIENT_SECRET=<nuovo_secret>
   LINKEDIN_ACCESS_TOKEN=<nuovo_access_token>
   ```

### Passo 2: Proteggi i Nuovi Secrets

#### Opzione A: Environment Variables (Consigliato per PM2)

Invece di mettere i secrets nel `.env`, usali direttamente in PM2:

```bash
# NON mettere più secrets nel .env!
# Invece, aggiungili all'ecosystem config:

# ecosystem.production.config.cjs
env: {
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  YT_API_KEY: process.env.YT_API_KEY,
  // ... etc
}
```

Poi esporta le variabili nella shell prima di avviare PM2:

```bash
export CLOUDINARY_API_SECRET="<valore_segreto>"
export YT_API_KEY="<valore_segreto>"
# ...
pm2 start ecosystem.production.config.cjs
```

#### Opzione B: PM2 Ecosystem Secrets (Più Semplice)

Tieni i secrets nell'ecosystem config (che NON va su Git):

1. Aggiungi `.gitignore`:
   ```
   ecosystem.production.config.cjs
   .env
   ```

2. Usa valori reali nell'ecosystem:
   ```javascript
   env: {
     CLOUDINARY_API_SECRET: 'valore_reale_qui',
     YT_API_KEY: 'valore_reale_qui',
     // ...
   }
   ```

### Passo 3: Verifica che `.env` NON sia su Git

```bash
cd /home/daniele/danielecamiz-site
git status

# Se vedi .env nella lista, RIMUOVILO:
git rm --cached cms/.env
git commit -m "Remove sensitive .env file"

# Assicurati che .gitignore contenga:
echo ".env" >> .gitignore
echo "ecosystem.production.config.cjs" >> .gitignore
git add .gitignore
git commit -m "Add .env and ecosystem to gitignore"
```

### Passo 4: Controlla Git History

Se `.env` era già su Git, le chiavi vecchie sono ancora visibili nella history!

**Soluzione Drastica** (se il repo è privato):
```bash
# Crea backup
cd /home/daniele/danielecamiz-site
tar -czf ~/danielecamiz-backup-$(date +%Y%m%d).tar.gz .

# Rimuovi .env dalla history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch cms/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (ATTENZIONE!)
git push origin --force --all
```

**Soluzione Sicura** (se hai dubbi):
- Rigenera TUTTE le chiavi API (vedi Passo 1)
- Così anche se qualcuno ha la vecchia history, le chiavi vecchie non funzionano più

## ✅ Checklist Post-Rotazione

Dopo aver rigenerato tutte le chiavi:

- [ ] Aggiornato `.env` con nuove chiavi
- [ ] Aggiornato `ecosystem.production.config.cjs`
- [ ] Riavviato PM2: `pm2 restart cms-site --update-env`
- [ ] Testato Cloudinary (upload/caricamento immagini)
- [ ] Testato YouTube (embed video)
- [ ] Testato Facebook (condivisione)
- [ ] Testato Threads (condivisione)
- [ ] Testato LinkedIn (condivisione)
- [ ] Verificato che `.env` sia in `.gitignore`
- [ ] Fatto commit per rimuovere `.env` da Git

## 📝 Best Practices Future

1. **MAI** committare `.env` su Git
2. **MAI** hardcodare secrets nel codice
3. Usa sempre variabili d'ambiente
4. Ruota le chiavi ogni 6-12 mesi
5. Usa secrets manager in produzione (es. AWS Secrets Manager, HashiCorp Vault)
6. Limita le permissioni delle API keys al minimo necessario
7. Monitora l'uso delle API per individuare accessi sospetti

## 🔍 Come Verificare se le Chiavi sono State Compromesse

### Cloudinary
- Dashboard > Reports > Transformations
- Controlla se ci sono richieste anomale

### YouTube
- Google Cloud Console > APIs & Services > Credentials
- Click sulla chiave > "Metrics"
- Controlla usage insolito

### Facebook/Threads/LinkedIn
- Controlla activity logs nelle rispettive dashboard
- Cerca accessi da IP sconosciuti

## 💡 Alternative Sicure

Per produzione seria, considera:

1. **AWS Systems Manager Parameter Store** (gratis)
2. **HashiCorp Vault** (più complesso)
3. **PM2 Plus** (paid, gestione secrets integrata)
4. **Docker Secrets** (se usi Docker)

## 🆘 Domande?

Se hai dubbi sulla rotazione, meglio chiedere prima di procedere. Alcune API hanno limiti di rigenerazione (es. Facebook).

---

**Priorità**: 🔴 CRITICA - Da fare PRIMA del lancio pubblico
**Tempo stimato**: 2-3 ore (inclusi test)
**Difficoltà**: Media (richiede accesso a tutti i servizi)

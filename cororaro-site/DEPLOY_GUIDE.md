# 🚀 Guida Rapida al Deploy - Coro Raro

## Istruzioni per trasferire il sito sul server con il nuovo mappamondo interattivo

---

## 📋 Prerequisiti Server

Assicurati che sul server siano già installati:

- **Node.js** 18+ e npm
- **PM2** (process manager)
- **Nginx** (web server)
- **Git**

---

## 🎯 Deploy Step-by-Step

### 1. Connessione al Server

```bash
ssh daniele@danielecamiz.com
# oppure
ssh daniele@[IP-DEL-SERVER]
```

### 2. Posizionati nella Directory del Progetto

```bash
cd /home/daniele/danielecamiz-site
```

### 3. Pull del Codice con il Mappamondo

```bash
# Verifica branch corrente
git branch

# Pull delle modifiche (con il mappamondo interattivo)
git pull origin claude/create-orchestra-icnt-site-011CUviyEKRqnSZwtfoNJwAh

# Verifica che i file siano aggiornati
git log --oneline -5
```

Dovresti vedere il commit: `feat: add interactive SVG world map for repertoire visualization`

### 4. Installa/Aggiorna Dipendenze

```bash
cd cororaro-site
npm install
```

### 5. Verifica Configurazione

```bash
# Verifica che esista il file .env
ls -la .env

# Se non esiste, crealo
cp .env.example .env
nano .env
```

Configurazione minima `.env`:
```env
NODE_ENV=production
PORT=3120
```

### 6. Test Locale (Opzionale)

```bash
# Avvia il server in test
npm start

# In un altro terminale, testa
curl http://localhost:3120
```

Premi `CTRL+C` per fermare il test.

### 7. Avvia/Riavvia con PM2

```bash
# Se è la prima volta (nuovo deploy)
pm2 start ecosystem.config.cjs --env production

# Se il sito è già attivo (aggiornamento)
pm2 restart cororaro-site

# Verifica stato
pm2 status

# Guarda i logs in tempo reale
pm2 logs cororaro-site --lines 50
```

### 8. Configura Nginx (Prima Volta)

Solo se è il **primo deploy**, configura Nginx:

```bash
# Copia la configurazione
sudo cp nginx.conf.example /etc/nginx/sites-available/staging.cororaro.it.conf

# Crea symbolic link
sudo ln -s /etc/nginx/sites-available/staging.cororaro.it.conf /etc/nginx/sites-enabled/

# Test configurazione
sudo nginx -t

# Se OK, ricarica Nginx
sudo systemctl reload nginx
```

### 9. SSL Certificate (Prima Volta)

Solo per il **primo deploy**:

```bash
# Per staging
sudo certbot --nginx -d staging.cororaro.it

# Oppure per produzione
sudo certbot --nginx -d cororaro.it -d www.cororaro.it
```

### 10. Salva Configurazione PM2 (Prima Volta)

```bash
# Salva per auto-restart al riavvio server
pm2 save
pm2 startup
# Esegui il comando suggerito da PM2
```

---

## ✅ Verifica Funzionamento

### Test Backend

```bash
curl http://localhost:3120
# Deve restituire l'HTML del sito
```

### Test Frontend (Staging)

```bash
curl -I https://staging.cororaro.it
# Deve restituire: HTTP/2 200
```

### Test Browser

Apri il browser e vai a:
- **Staging:** https://staging.cororaro.it
- **Produzione:** https://cororaro.it

Vai alla sezione **"Repertorio"** e verifica che:
- ✅ Il mappamondo SVG sia visibile
- ✅ Le bandierine si animino (pulsazione)
- ✅ Hover sulle bandierine mostri il tooltip
- ✅ Click sulle bandierine funzioni su mobile

---

## 🔄 Aggiornamenti Futuri

Quando fai modifiche al sito in futuro:

```bash
# Sul server
cd /home/daniele/danielecamiz-site
git pull origin <nome-branch>

cd cororaro-site
npm install  # Solo se ci sono nuove dipendenze

pm2 restart cororaro-site
pm2 logs cororaro-site --lines 30
```

---

## 🛠️ Comandi Utili PM2

```bash
# Stato di tutti i processi
pm2 status

# Logs in tempo reale
pm2 logs cororaro-site

# Logs ultimi 100 righe
pm2 logs cororaro-site --lines 100

# Stop (fermare)
pm2 stop cororaro-site

# Restart (riavviare)
pm2 restart cororaro-site

# Delete (rimuovere completamente)
pm2 delete cororaro-site

# Monitor risorse
pm2 monit
```

---

## 🐛 Troubleshooting

### Problema: 502 Bad Gateway

**Soluzione:**
```bash
pm2 status
pm2 restart cororaro-site
pm2 logs cororaro-site
```

### Problema: Porta già in uso

**Soluzione:**
```bash
# Trova processo sulla porta 3120
sudo lsof -i :3120

# Oppure
sudo netstat -tulpn | grep 3120

# Killa il processo esistente
pm2 delete cororaro-site
pm2 start ecosystem.config.cjs --env production
```

### Problema: Mappamondo non si vede

**Causa:** Cache browser o file non aggiornati

**Soluzione:**
```bash
# Sul server
cd /home/daniele/danielecamiz-site/cororaro-site
git pull
pm2 restart cororaro-site

# Sul browser
# Premi CTRL+F5 (hard refresh) o CTRL+SHIFT+R
# Oppure apri in modalità incognito
```

### Problema: Nginx non trova i file

**Soluzione:**
```bash
# Verifica percorsi in configurazione Nginx
sudo nano /etc/nginx/sites-available/staging.cororaro.it.conf

# Verifica che root sia:
# root /home/daniele/danielecamiz-site/cororaro-site/public;

# Verifica permessi
chmod -R 755 /home/daniele/danielecamiz-site/cororaro-site/public

# Ricarica Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 Monitoraggio

### Logs Nginx

```bash
# Access logs
sudo tail -f /var/log/nginx/cororaro-access.log

# Error logs
sudo tail -f /var/log/nginx/cororaro-error.log
```

### Logs PM2

```bash
# Console output
tail -f ~/danielecamiz-site/cororaro-site/logs/out.log

# Errori
tail -f ~/danielecamiz-site/cororaro-site/logs/error.log
```

### Uso Risorse

```bash
# CPU e memoria del processo
pm2 monit

# Oppure con htop
htop
# Cerca processo "node" - porta 3120
```

---

## 🎨 Cosa è stato aggiunto

### Nuovo Mappamondo Interattivo

**File modificati:**
1. `public/index.html` - SVG mappamondo con bandierine animate
2. `public/css/style.css` - Stili e animazioni (pulsazione, wave, hover)
3. `public/js/main.js` - Classe WorldMap per interattività

**Caratteristiche:**
- 🗺️ SVG responsivo con 5 continenti
- 🚩 4 bandierine animate (Africa, Europa, Asia, Americhe)
- 💬 Tooltip interattivi con info repertorio
- ✨ Animazioni fluide (pulse, wave, hover)
- 📱 Supporto touch per mobile
- ♿ Accessibilità keyboard

---

## 📞 Supporto

Per problemi o domande:
- Controlla il README completo: `cat README.md`
- Verifica logs: `pm2 logs cororaro-site`
- Contatta lo sviluppatore

---

## ✅ Checklist Finale

Dopo il deploy, verifica:

- [ ] `pm2 status` mostra `cororaro-site` come **online**
- [ ] `curl https://staging.cororaro.it` restituisce HTML
- [ ] Browser: sito carica senza errori console
- [ ] Sezione Repertorio: mappamondo visibile
- [ ] Hover su bandierine: tooltip appare
- [ ] Animazioni bandierine: pulsazione attiva
- [ ] Mobile: click su bandierine funziona
- [ ] Tutte le sezioni scrollano correttamente

---

**🎼 Buon deploy e buona musica! 🎶**

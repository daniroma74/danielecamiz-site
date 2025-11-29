# CONFIGURAZIONE PORTE - danielecamiz.com

**Data ultimo aggiornamento**: 2025-11-29

## SITUAZIONE ATTUALE

### Servizi PM2 e Porte

| Servizio | Porta | Stato | URL Pubblico | Note |
|----------|-------|-------|--------------|------|
| **coming-soon** | 3000 | ✅ ONLINE | www.danielecamiz.com | Coming soon page pubblica |
| **cms-site** | 3001 | ✅ ONLINE | www.danielecamiz.com | Sito principale (templateServer.js) |
| landing | 3002 | ✅ ONLINE | danielecamiz.com | Landing page redirect |
| concerts-admin | 3004 | ✅ ONLINE | - | Admin concerti (interno) |
| news-admin | 3005 | ✅ ONLINE (localhost only) | news-admin.danielecamiz.com | Admin news |
| bio-admin | 4002 | ✅ ONLINE | bio-admin.danielecamiz.com | Admin bio |
| contact-admin | 4003 | ✅ ONLINE | contact-admin.danielecamiz.com | Admin contatti |
| admin-hub | 4001 | ✅ ONLINE | hub.danielecamiz.com | Hub amministrazione |
| gallery-admin | 4005 | ✅ ONLINE | gallery-admin.danielecamiz.com | Admin galleria |
| press-admin | 4006 | ✅ ONLINE | press-admin.danielecamiz.com | Admin press |
| newsletter-service | 4007 | ✅ ONLINE | - | Servizio newsletter |
| orchestraicnt-site | 3007 | ✅ ONLINE | icnt.danielecamiz.com | Sito Orchestra ICNT |
| cororaro-site | 3008 | ✅ ONLINE | cororaro.it | Sito Coro Raro |

### ✅ PROBLEMI RISOLTI

1. **Coming-soon page non attiva** → RISOLTO
   - Creata coming-soon/server.js con pagina temporanea
   - Avviata su porta 3000 con PM2
   - Status: https://www.danielecamiz.com/ → 200 OK ✅

2. **EJS template error** → RISOLTO
   - Fix: `cms/views/helpers/responsive-image.ejs:81` (`-%>` → `%>`)
   - Status pagine ora disponibili (press, news, concerts) ✅

### ⚠️ PROBLEMI RESIDUI

**Bio e Gallery danno ancora 500:**
- https://www.danielecamiz.com/bio → 500
- https://www.danielecamiz.com/gallery → 500

Possibile causa: Altri template EJS usano responsive-image con sintassi non corretta.

**Pagine funzionanti:**
- https://www.danielecamiz.com/ → 200 (coming-soon)
- https://www.danielecamiz.com/press → 200 ✅
- https://www.danielecamiz.com/news → 200 ✅
- https://www.danielecamiz.com/concerts → 200 ✅

## CONFIGURAZIONE NGINX

### Produzione (www.danielecamiz.com)
- **Porta attuale**: 3000 (coming-soon page)
- **File**: `/etc/nginx/sites-available/danielecamiz.conf`
- **Quando andare live**: cambiare proxy da 3000 → 3001

```bash
# Quando si va live, eseguire:
sudo sed -i 's/localhost:3000/localhost:3001/g' /etc/nginx/sites-available/danielecamiz.conf
sudo nginx -t
sudo systemctl reload nginx
```

### Staging (staging.danielecamiz.com)
- **Porta**: 3001 (CMS completo)
- **Status**: Già configurato correttamente ✅

## TESTING

```bash
# Test sito pubblico (coming-soon)
curl -I https://www.danielecamiz.com/

# Test staging (CMS completo)
curl -I https://staging.danielecamiz.com/bio
curl -I https://staging.danielecamiz.com/gallery
curl -I https://staging.danielecamiz.com/press

# Test locale CMS
curl -I http://localhost:3001/bio
curl -I http://localhost:3001/gallery

# Test locale coming-soon
curl -I http://localhost:3000/
```

## FILE DI CONFIGURAZIONE CHIAVE

### CMS (Sito Principale)
- **Script**: `cms/templateServer.js`
- **Porta definita**: `process.env.PORT || 3001` (riga 435)
- **Ecosystem**: `cms/ecosystem.production.config.cjs`
- **PM2 name**: `cms-site`
- **URL**: https://www.danielecamiz.com

### Nginx
- **Config file**: `/etc/nginx/sites-available/danielecamiz.conf`
- **Symlink**: `/etc/nginx/sites-enabled/danielecamiz.conf`
- **Porta proxy**: Attualmente 3000 ❌ → Deve essere 3001 ✅

## ALTRO PROBLEMA RISOLTO

### EJS Template Error
**File**: `cms/views/helpers/responsive-image.ejs:81`

Aveva `-%>` invece di `%>`, causando errori di parsing su tutte le pagine con immagini.

**Fix applicato**: Cambiato da `-%>` a `%>` ✅

## COMANDI UTILI

```bash
# Verifica porte in ascolto
netstat -tlnp | grep LISTEN | grep -E ":(300[0-9]|400[0-9])"

# Controlla stato PM2
pm2 list

# Riavvia CMS
pm2 restart cms-site

# Log CMS in tempo reale
pm2 logs cms-site

# Test locale CMS
curl -I http://localhost:3001/

# Test pubblico
curl -I https://www.danielecamiz.com/
```

## CRONOLOGIA MODIFICHE

- **2025-11-29**: Fix EJS helper responsive-image (-%> → %>)
- **2025-11-29**: Identificato problema nginx proxy (3000 vs 3001)
- **2025-11-29**: Documentazione completa porte e configurazione

# Cloudflare DNS Auto-Create Service

Servizio condiviso per creare automaticamente record DNS su Cloudflare per sottodomini dinamici.

## 🎯 Cosa Fa

Quando salvi una landing page per un evento/concerto, il sistema:

1. ✅ **Salva landing** nel database (sempre)
2. 🌐 **Tenta di creare** record DNS su Cloudflare (best-effort)
3. ✅ **Fallback garantito** - se Cloudflare API fallisce, wildcard DNS funziona comunque

## 🔧 Setup

### 1. Ottieni Cloudflare API Token

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **My Profile** → **API Tokens** → **Create Token**
3. Usa template: **Edit zone DNS**
4. Configura permessi:
   - **Zone**: DNS: Edit
   - **Zone**: Zone: Read
5. Sotto "Zone Resources":
   - Include → Specific zone → scegli il tuo dominio
6. Copia il token generato

### 2. Trova Zone ID

1. Vai su Cloudflare Dashboard
2. Seleziona il tuo dominio
3. Overview → sidebar destra → sezione **API**
4. Copia "Zone ID"

### 3. Configura .env

**Per cororaro-landing:**
```env
# Domain
BASE_DOMAIN=cororaro.it
SERVER_IP=1.2.3.4

# Cloudflare DNS
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ZONE_ID=your-zone-id-here
CLOUDFLARE_PROXY=true  # Orange cloud ON
```

**Per landing (danielecamiz):**
```env
# Domain
BASE_DOMAIN=danielecamiz.com
SERVER_IP=1.2.3.4

# Cloudflare DNS
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ZONE_ID=your-zone-id-here
CLOUDFLARE_PROXY=true  # Orange cloud ON
```

### 4. Wildcard DNS Fallback

Anche se configuri Cloudflare API, mantieni il record wildcard come backup:

```
Type: A
Name: *
Content: YOUR_SERVER_IP
Proxy: OFF (nuvola grigia)
```

## 📊 Come Funziona

### Scenario 1: Cloudflare API Configurato

```
1. Salvi landing per slug "natale-2025"
2. Sistema salva nel DB ✅
3. Sistema chiama Cloudflare API
4. Se successo:
   → Record DNS creato: natale-2025.cororaro.it
   → Proxy Cloudflare attivo (CDN, protezione)
5. Se fallisce:
   → Wildcard DNS funziona comunque
   → Landing accessibile immediatamente
```

### Scenario 2: Cloudflare API NON Configurato

```
1. Salvi landing per slug "natale-2025"
2. Sistema salva nel DB ✅
3. Wildcard DNS route automaticamente
4. Landing accessibile subito: natale-2025.cororaro.it
```

## ✅ Vantaggi Sistema Ibrido

| Feature | Wildcard Solo | Con Cloudflare API |
|---------|---------------|-------------------|
| Funzionamento immediato | ✅ | ✅ |
| Zero configurazione | ✅ | ⚠️ Token richiesto |
| Proxy Cloudflare (CDN) | ❌ | ✅ |
| DDoS Protection | ❌ | ✅ |
| Analytics per landing | ❌ | ✅ |
| Fallback garantito | ✅ | ✅ |

## 🔍 Troubleshooting

### API Token non valido

```bash
# Test manuale API
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

Risposta dovrebbe essere `"success": true`

### Record non creato

Controlla i log dell'app:

```bash
# Cororaro
pm2 logs cororaro-landing | grep -i cloudflare

# Landing danielecamiz
pm2 logs landing | grep -i cloudflare
```

Messaggi attesi:
- ✅ `DNS record created: slug.domain.it`
- ⚠️ `Cloudflare DNS creation skipped` (se API non configurata o fallisce)

### Landing non raggiungibile

1. **Verifica wildcard DNS**:
   ```bash
   dig test.cororaro.it
   ```
   Deve risolvere a tuo server IP

2. **Verifica Nginx**:
   ```bash
   sudo nginx -t
   curl -I https://test.cororaro.it
   ```

3. **Verifica app**:
   ```bash
   pm2 status
   pm2 logs cororaro-landing --lines 50
   ```

## 🚀 Best Practices

### Quando Usare Proxy Cloudflare

```env
# Raccomandato: ON per landing pubbliche
CLOUDFLARE_PROXY=true
```

**Vantaggi:**
- CDN globale (velocità)
- DDoS protection
- SSL automatico
- Analytics

**Svantaggi:**
- Richiede certificato Origin (Let's Encrypt va bene)
- IP reale server nascosto (buono per sicurezza)

### Quando NON Usare

```env
# Proxy OFF se serve IP reale
CLOUDFLARE_PROXY=false
```

Solo se:
- Serve IP reale per logging
- Vuoi controllo totale headers
- Testing locale

## 📝 API Functions

```javascript
import {
  createRecordBestEffort,
  deleteRecordBestEffort
} from '../../shared/services/cloudflare-dns.js';

// Create DNS record (non-blocking)
await createRecordBestEffort(
  'natale-2025',              // slug
  'cororaro.it',              // domain
  '1.2.3.4',                  // server IP
  'api-token',                // Cloudflare API token
  'zone-id',                  // Cloudflare Zone ID
  true                        // proxied (orange cloud)
);

// Delete DNS record (non-blocking)
await deleteRecordBestEffort(
  'natale-2025',              // slug
  'cororaro.it',              // domain
  'api-token',                // Cloudflare API token
  'zone-id'                   // Cloudflare Zone ID
);
```

## 🔐 Security

- ✅ API Token è read-only per altri dati Cloudflare
- ✅ Token può solo modificare DNS della zona specificata
- ✅ Token non ha accesso a billing, settings, analytics
- ✅ Best-effort: fallimento non blocca applicazione

## 📞 Supporto

Se problemi:
1. Controlla logs: `pm2 logs [app-name] | grep -i cloudflare`
2. Testa API token manualmente (curl sopra)
3. Verifica wildcard DNS funziona: `dig *.cororaro.it`

---

**Servizio usato da:**
- `cororaro-landing` (Coro Raro)
- `landing` (I Concerti nel Tempio - danielecamiz.com)

# Google Analytics 4 - Setup Instructions

## ✅ Codice Implementato

Il codice per Google Analytics 4 è già stato integrato nel sito e rispetta completamente il GDPR:

- ✅ Script GA4 caricato solo se l'utente accetta i cookie di misurazione
- ✅ IP anonimizzato (`anonymize_ip: true`)
- ✅ Supporto per cookie consent banner esistente
- ✅ Tracking eventi già configurato (es. condivisioni social)

## 📋 Passi per Attivare Analytics

### 1. Crea Proprietà GA4

1. Vai su https://analytics.google.com/
2. Click su "Admin" (ingranaggio in basso a sinistra)
3. Click su "Create Property"
4. Nome: "Daniele Camiz - Official Website"
5. Seleziona timezone: "Italy"
6. Seleziona valuta: "EUR - Euro"
7. Click "Next"

### 2. Configura Data Stream

1. Seleziona "Web"
2. Website URL: `https://danielecamiz.com`
3. Stream name: "Website principale"
4. Click "Create stream"
5. **Copia il MEASUREMENT ID** (formato: `G-XXXXXXXXXX`)

### 3. Aggiorna Configurazione Sito

Apri il file `/home/daniele/danielecamiz-site/cms/.env` e sostituisci:

```bash
# Analytics
GA4_MEASUREMENT_ID=G-XXXXXXXXXX  ⬅️ Sostituisci con il tuo vero ID
```

### 4. Aggiorna PM2 Config

Apri il file `/home/daniele/danielecamiz-site/cms/ecosystem.production.config.cjs` e aggiorna:

```javascript
GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',  ⬅️ Sostituisci con il tuo vero ID
```

### 5. Riavvia il Sito

```bash
pm2 restart cms-site
```

### 6. Verifica Funzionamento

1. Apri il sito in una finestra privata
2. Accetta i cookie di misurazione nel banner
3. Apri Chrome DevTools > Console
4. Dovresti vedere: `[Analytics] GA4 initialized with consent`
5. In GA4, vai su "Reports" > "Realtime" e verifica che vedi la tua visita

## 🔍 Eventi Tracciati Automaticamente

GA4 traccia automaticamente:
- ✅ **page_view** - Ogni cambio pagina
- ✅ **click** - Click su link esterni
- ✅ **scroll** - Scroll al 90% della pagina
- ✅ **video_start** / **video_complete** - Video YouTube embedded
- ✅ **share** - Condivisioni social (Facebook, Twitter, LinkedIn, Threads)

## 📊 Eventi Custom Già Implementati

Nel codice esistono già chiamate a `window.gtag()` per:
- Condivisioni articoli news
- Click su link esterni
- Download file (se implementato)

## 🎯 Metriche Consigliate da Monitorare

Una volta attivo GA4, ti consiglio di monitorare:

1. **Traffico per pagina**: Quali pagine sono più visitate?
2. **Durata sessione**: Quanto tempo gli utenti restano sul sito?
3. **Tasso di rimbalzo**: Quanti utenti escono subito?
4. **Referrer**: Da dove arrivano i visitatori? (Google, social, diretto?)
5. **Dispositivi**: Desktop vs Mobile vs Tablet
6. **Paesi**: Geografia degli utenti

## 🔒 Privacy & GDPR

✅ **Il tuo sito è già conforme GDPR** per quanto riguarda analytics:

- GA4 si carica SOLO dopo il consenso utente
- IP anonimizzato
- Cookie banner implementato e funzionante
- Policy privacy già presente su `/privacy`

## 📝 Note

- Placeholder attuale: `G-XXXXXXXXXX` (non funziona finché non sostituisci con ID reale)
- GA4 impiega 24-48h per mostrare dati storici completi
- I dati in tempo reale sono disponibili immediatamente
- Il codice è già production-ready, devi solo configurare l'ID

## 🚀 Bonus: Google Search Console

Dopo aver configurato GA4, ti consiglio anche di collegare Google Search Console:

1. Vai su https://search.google.com/search-console
2. Aggiungi proprietà: `https://danielecamiz.com`
3. Verifica con metodo "GA4" (più facile ora che GA4 è attivo)
4. Invia la sitemap: `https://danielecamiz.com/sitemap.xml`

Questo ti permetterà di vedere:
- Come Google vede il tuo sito
- Keyword che portano traffico
- Errori di indicizzazione
- Prestazioni di ricerca

---

💡 **Tutto pronto!** Sostituisci solo l'ID e riavvia il sito.

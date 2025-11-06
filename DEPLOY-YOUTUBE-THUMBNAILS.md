# 🚀 Deploy YouTube Thumbnails - Guida Completa

## 📋 Cosa è Stato Risolto

### ✅ 1. Persistenza Dati
**Problema**: Nome, bio e link si resettavano dopo ogni riavvio
**Causa**: File WAL corrotti nel database SQLite
**Soluzione**: Rimossi file .sqlite-wal e .sqlite-shm corrotti
**Status**: ✅ RISOLTO - confermato dall'utente

### ✅ 2. Thumbnail YouTube - Filosofia Corretta
**Problema**: Thumbnail non apparivano né nell'editor né nel sito
**Causa Principale**: Veniva usato `maxresdefault.jpg` che NON esiste per tutti i video (specialmente live stream e video vecchi)
**Soluzione**: Cambiato a `hqdefault.jpg` (480x360) che esiste per TUTTI i video YouTube

**Filosofia**:
- ✅ Basta inserire il link YouTube nel campo URL
- ✅ Il thumbnail viene generato AUTOMATICAMENTE
- ✅ NON serve compilare nessun campo thumbnail
- ✅ NON viene salvato nel database (generato al volo)

### ✅ 3. Campo Icon Corrotto
**Problema**: Campo `icon` conteneva URL completi invece di nomi file
**Esempio**: `icon = 'https://mozart-symphonies-challenge19.danielecamiz.com'`
**Soluzione**: Eseguito SQL UPDATE per pulire il campo
**Status**: ✅ RISOLTO

### ⚠️ 4. Toggle Visibility (PROBLEMA PARZIALE)
**Problema**: Toggle mostrano tutti OFF anche se il database ha visible=1
**Status**: Backend aggiornato con logging, ma UI potrebbe non caricare correttamente lo stato
**Da Verificare**: Dopo deploy, controllare se i toggle riflettono lo stato reale

## 🔧 Come Funziona Ora

### Inserire un Link YouTube

1. Apri l'editor: `/editor/visual`
2. Aggiungi un nuovo highlight
3. Compila i campi:
   - **Nome**: Titolo del video
   - **Link**: URL YouTube (uno qualsiasi di questi formati)
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://www.youtube.com/live/VIDEO_ID` ← Ora supportato!
     - `https://youtu.be/VIDEO_ID`
     - `https://www.youtube.com/embed/VIDEO_ID`
4. Salva

**Risultato**: Il thumbnail appare automaticamente nell'anteprima e nel sito!

### Formato Thumbnail

**Prima (NON funzionava)**:
```
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
❌ Non esiste per live stream e video vecchi → 404 Error
```

**Ora (funziona sempre)**:
```
https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg
✅ Esiste per TUTTI i video YouTube (480x360)
```

## 📦 Deploy Sul Server

### Prerequisiti
- Accesso SSH al server
- PM2 in esecuzione

### Passo 1: Pull del Codice

```bash
cd ~/danielecamiz-site
git fetch origin
git checkout claude/project-review-011CUoMaULBEc6ErgbH4ZpUS
git pull origin claude/project-review-011CUoMaULBEc6ErgbH4ZpUS
```

### Passo 2: Verifica File Modificati

```bash
git log --oneline -3
# Dovresti vedere:
# 3ffd6a2 fix: use hqdefault.jpg for YouTube thumbnails (exists for all videos)
```

### Passo 3: Riavvia Servizi PM2

```bash
pm2 restart contact-admin contact-site
```

### Passo 4: Verifica Deploy

```bash
# Controlla che i servizi siano in esecuzione
pm2 status

# Verifica i log
pm2 logs contact-site --lines 20
# Dovresti vedere:
# [Thumbnail] YouTube → https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg
```

## ✅ Test Post-Deploy

### Test 1: Thumbnail Esistente
1. Apri il sito pubblico
2. Cerca un link YouTube nella sezione "In Evidenza"
3. ✅ Il thumbnail dovrebbe essere visibile
4. ❌ Se vedi errore 404, controlla i log PM2

### Test 2: Nuovo Link YouTube
1. Vai su `/editor/visual`
2. Aggiungi nuovo highlight con questo link di test:
   ```
   https://www.youtube.com/live/GhEGpoOITlY
   ```
3. Titolo: "Mozart Piano Concertos"
4. Salva
5. ✅ Guarda l'anteprima → thumbnail dovrebbe apparire
6. ✅ Apri il sito → thumbnail dovrebbe essere visibile

### Test 3: Toggle Visibility
1. Vai su `/editor/visual`
2. Controlla lo stato dei toggle
3. ✅ **Dovrebbero riflettere lo stato reale** (non tutti OFF)
4. Cambia un toggle da ON a OFF
5. Ricarica la pagina
6. ✅ Il toggle dovrebbe essere ancora OFF (stato persistito)

### Test 4: Persistenza Dati (già testato, ma verifica ancora)
1. Modifica nome o bio in `/settings`
2. Salva
3. Riavvia PM2: `pm2 restart contact-admin contact-site`
4. Ricarica la pagina
5. ✅ I dati devono essere ancora presenti

## 🐛 Troubleshooting

### Problema: Thumbnail ancora 404

**Verifica 1 - Codice aggiornato:**
```bash
cd ~/danielecamiz-site
grep -n "hqdefault" contact-site/server.js
# Dovresti vedere: return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
```

**Verifica 2 - Log server:**
```bash
pm2 logs contact-site --lines 50 | grep Thumbnail
# Dovresti vedere: [Thumbnail] YouTube → https://img.youtube.com/vi/.../hqdefault.jpg
```

**Verifica 3 - Browser:**
- Apri Developer Tools (F12)
- Tab Network
- Ricarica la pagina
- Cerca richieste a `img.youtube.com`
- Se vedi ancora `maxresdefault.jpg` → cache del browser (premi Ctrl+Shift+R)

### Problema: Toggle ancora tutti OFF

**Verifica Database:**
```bash
cd ~/danielecamiz-site/cms/db
sqlite3 main.sqlite "SELECT id, title_it, visible FROM contact_links LIMIT 10;"
# Controlla i valori di 'visible' (dovrebbero essere 1 o 0, non NULL)
```

**Verifica Log Backend:**
```bash
pm2 logs contact-admin --lines 50 | grep visible
# Dovresti vedere: [editorRoutes] Updating link X: visible=1 → 1
```

**Se i toggle non riflettono lo stato:**
- Problema potrebbe essere nel frontend (Vue.js non carica correttamente i dati)
- Controlla la console del browser per errori JavaScript

### Problema: Dati non persistono

**Verifica 1 - Nessun rebuild-simple.js:**
```bash
cd ~/danielecamiz-site
grep -r "rebuild-simple" .
# NON dovrebbe apparire nulla negli script di avvio PM2
```

**Verifica 2 - Database scrivibile:**
```bash
ls -la cms/db/main.sqlite
# Controlla i permessi (dovrebbe essere scrivibile dall'utente PM2)
```

**Verifica 3 - Nessun file WAL corrotto:**
```bash
ls -la cms/db/*.sqlite*
# Se vedi .sqlite-shm o .sqlite-wal con dimensioni strane, rimuovili
```

## 📊 File Modificati in Questo Deploy

### 1. contact-site/server.js (linee 87-106)
**Cosa fa**: Genera thumbnail YouTube automaticamente sul sito pubblico

```javascript
// Helper: Auto-detect YouTube thumbnail from URL
// Supports: /watch?v=, /live/, youtu.be/, /embed/, /v/
function getYouTubeThumbnail(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Use hqdefault (480x360) instead of maxresdefault - exists for ALL videos
      const thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      console.log(`[Thumbnail] YouTube → ${thumbUrl}`);
      return thumbUrl;
    }
  }
  return null;
}
```

### 2. contact-admin/routes/editorRoutes.js (linee 22-48)
**Cosa fa**: Genera thumbnail YouTube nell'editor backend

- Aggiunto supporto per `/live/` (live stream)
- Cambiato da `maxresdefault` a `hqdefault`
- Aggiunto logging per debug toggle visibility

### 3. contact-admin/views/editor/preview.ejs (linee 71-87)
**Cosa fa**: Genera thumbnail YouTube nell'anteprima live dell'editor

- Stessa logica del server pubblico
- Aggiornato a `hqdefault.jpg`

## 🎯 Riepilogo Modifiche

### Formati YouTube Supportati
✅ `https://www.youtube.com/watch?v=VIDEO_ID` (video normali)
✅ `https://www.youtube.com/live/VIDEO_ID` (live stream) ← NUOVO
✅ `https://youtu.be/VIDEO_ID` (short link)
✅ `https://www.youtube.com/embed/VIDEO_ID` (embedded)
✅ `https://www.youtube.com/v/VIDEO_ID` (vecchio formato)

### Qualità Thumbnail
- **Prima**: maxresdefault (1280x720) - non disponibile per tutti i video
- **Ora**: hqdefault (480x360) - disponibile per TUTTI i video

### Flusso Utente Finale
1. Apri editor
2. Inserisci link YouTube nel campo "Link"
3. Salva
4. **Fatto!** Thumbnail appare automaticamente

## 📝 Note Importanti

1. **NON usare `rebuild-simple.js`** - cancella tutti i dati!
2. **Solo highlights mostrano thumbnail** - social/contact/extra hanno solo icone
3. **Thumbnail NON sono nel database** - generati al volo dal link
4. **Toggle visibility**: Backend aggiornato, da verificare che UI rifletta stato corretto

## 🎉 Risultato Atteso

Dopo il deploy:

✅ I thumbnail YouTube appaiono automaticamente nell'editor e nel sito
✅ Supporto per live stream YouTube (`/live/`)
✅ Nessun errore 404 per i thumbnail
✅ I dati persistono dopo riavvio PM2
✅ L'editor è semplice da usare (3 campi: nome, link, icona)

## 🔍 Ulteriori Verifiche Necessarie

1. **Toggle UI**: Controllare se l'editor carica correttamente lo stato dei toggle dal database
2. **CSS Cards**: Verificare se le card sono ancora bianche finché non ci si passa sopra col mouse
3. **Performance**: Verificare che il caricamento dei thumbnail non rallenti la pagina

## 📞 Se Qualcosa Non Funziona

1. Controlla i log PM2: `pm2 logs contact-site --lines 50`
2. Verifica la console del browser (F12)
3. Controlla che il codice sia aggiornato: `git log --oneline -3`
4. Svuota cache del browser (Ctrl+Shift+R)
5. Verifica che il database non abbia file WAL corrotti

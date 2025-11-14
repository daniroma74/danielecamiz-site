# 📋 PROMPT PER LA PROSSIMA SESSIONE - Daniele Camiz Site

Ciao! Continuo dal lavoro precedente. Situazione attuale del progetto danielecamiz-site su staging:

## ✅ COMPLETATO:
1. ✅ **Navbar mobile dropdown** - allineamento sottogallerie a destra
2. ✅ **Archive concerts modal** - raggruppamento movimenti consecutivi
3. ✅ **Contact-site** - stile unificato con main site
4. ✅ **Repertoire Priority 1** - ritratti compositori (7/55), cards hover migliorati, count-up stats

## 🎯 TASKS RIMANENTI:

### TASK A: Repertoire - Completare ritratti compositori
**Obiettivo**: Aggiungere ritratti per gli altri 48 compositori importanti

**File di lavoro**: `/home/daniele/danielecamiz-site/composer_portraits.sql`
- Già preparato con struttura e TODO per tutti i compositori
- 7 compositori già completati (Beethoven, Mozart, Brahms, Schubert, Grieg, Dvořák, Schumann)
- 48 compositori da aggiungere (commentati con -- UPDATE)

**Comando per vedere compositori senza ritratto**:
```bash
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite "SELECT id, full_name FROM composers WHERE portrait_url IS NULL OR portrait_url = '' ORDER BY full_name;"
```

**Priorità compositori da aggiungere** (cerca su Wikimedia Commons):
1. Giuseppe Verdi (id=23)
2. Giacomo Puccini (id=21)
3. Pëtr Il'ič Tchaikovskij (id=36)
4. Johann Sebastian Bach (id=25)
5. Fryderyk Chopin (id=12)
6. Georg Friedrich Händel (id=17)
7. Gustav Mahler (id=19)
8. Felix Mendelssohn Bartholdy (id=4)
9. Franz Joseph Haydn (id=13)
10. Gioachino Rossini (id=22)

**Procedura**:
1. Cercare ritratti public domain su Wikimedia Commons: https://commons.wikimedia.org/wiki/Category:Portrait_paintings_of_composers
2. Usare formato thumbnail 400px: `/thumb/X/XX/Filename.jpg/400px-Filename.jpg`
3. Scommentare la riga in `composer_portraits.sql` e sostituire `URL_HERE`
4. Eseguire: `sqlite3 cms/db/main.sqlite < composer_portraits.sql`
5. Restart: `NODE_ENV=staging pm2 restart staging-site`
6. **Non serve commit** (database in .gitignore, modifiche già attive su staging)

---

### TASK B: Repertoire Priority 2
**Tempo stimato**: 4-5 ore

#### 1. Sezione "Ascolta" con player embed (3-4 ore)
**Obiettivo**: Aggiungere brani audio featured per far ascoltare il repertorio

**Step implementazione**:
1. Aggiungere campo `audio_url` a tabella `works`:
   ```sql
   ALTER TABLE works ADD COLUMN audio_url TEXT;
   ALTER TABLE works ADD COLUMN audio_platform TEXT; -- 'youtube', 'spotify', 'soundcloud'
   ```

2. Creare nuova sezione in `/home/daniele/danielecamiz-site/cms/views/pages/frontend/repertoire.ejs`:
   - Posizionare dopo la sezione hero, prima delle tabs
   - Titolo: "Ascolta" (IT) / "Listen" (EN)
   - Grid 2 colonne desktop, 1 mobile
   - Max 6-8 brani featured

3. Design card audio player:
   - Thumbnail/copertina grande
   - Titolo brano + compositore
   - Embedded player (iframe YouTube/Spotify)
   - Data esecuzione + venue (opzionale)

4. CSS nuovo in `/home/daniele/danielecamiz-site/frontend/css/pages/repertoire/repertoire-new.css`:
   ```css
   .rep-audio-section { }
   .rep-audio-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
   .rep-audio-card { background: dark theme; border-radius: 16px; overflow: hidden; }
   .rep-audio-player { aspect-ratio: 16/9; }
   ```

**Domande per utente**:
- Preferisci YouTube, Spotify, SoundCloud o mix?
- Hai già link pronti o devo usare placeholder?
- Quanti brani vuoi featured? (suggerisco 6-8)

#### 2. Badge categorie più evidenti + colori (1 ora)
**Obiettivo**: Distinguere visivamente le categorie di brani

**Step implementazione**:
1. Mappare categorie esistenti nel database:
   ```bash
   sqlite3 cms/db/main.sqlite "SELECT DISTINCT category_name FROM works WHERE category_name IS NOT NULL;"
   ```

2. Assegnare colori per categoria in CSS:
   ```css
   .rep-work-cat-opera { background: #e74c3c; }
   .rep-work-cat-sinfonica { background: #3498db; }
   .rep-work-cat-concerto { background: #d4af37; }
   .rep-work-cat-camera { background: #27ae60; }
   .rep-work-cat-corale { background: #9b59b6; }
   ```

3. Ingrandire badge nelle cards (da 0.8em a 1em)

4. (Opzionale) Aggiungere legenda categorie con filtro click:
   - Riga di badge cliccabili sopra la griglia
   - Click filtra per categoria
   - All/Tutti per reset

---

### TASK C: Repertoire Priority 3 (OPZIONALE - VALUTARE CON UTENTE)
**Tempo stimato**: 10-14 ore

#### 1. Timeline visiva (4-6 ore)
**Obiettivo**: Vista cronologica interattiva del repertorio

**Tecnologie**:
- Libreria: Timeline.js, vis-timeline, o custom con CSS Grid
- Scrolling orizzontale
- Milestone markers per anni chiave

**Step**:
1. Query per raggruppare brani per anno di composizione/prima esecuzione
2. HTML structure con scrollable timeline
3. CSS con position: sticky per anni
4. JS per smooth scroll e interazioni

#### 2. Mappa geografica (6-8 ore)
**Obiettivo**: Visualizzare dove sono stati eseguiti i concerti

**Tecnologie**:
- Leaflet.js (open source, leggero)
- Markers per location concerti
- Cluster per città con molti concerti

**Step**:
1. Estrarre coordinate da tabella `concerts` (venues/cities)
2. Aggiungere campi `lat`, `lng` se mancanti
3. Integrare Leaflet.js
4. Popup con dettagli concerto (data, venue, programma)
5. Filtro per anno/compositore

**Note**: Richiede geocoding per venue se coordinate non presenti. Valutare necessità con utente.

---

### TASK D: Unificazione Admin Panels con Cloudinary
**Obiettivo**: Tutti i 5 admin panels devono usare la stessa interfaccia Cloudinary

**Panels da unificare**:
- `/home/daniele/danielecamiz-site/bio-admin/`
- `/home/daniele/danielecamiz-site/news-admin/`
- `/home/daniele/danielecamiz-site/gallery-admin/`
- `/home/daniele/danielecamiz-site/press-admin/`
- `/home/daniele/danielecamiz-site/concerts-admin/`

**Procedura**:
1. **Ricerca esistente**:
   ```bash
   grep -r "cloudinary" /home/daniele/danielecamiz-site/*/server.js
   grep -r "cloudinary" /home/daniele/danielecamiz-site/*/views/**/*.ejs
   ```
   Identificare quale panel ha già Cloudinary funzionante (probabilmente gallery-admin)

2. **Analisi componente**:
   - Leggere implementazione nel panel che funziona
   - Identificare config (API keys, upload preset, folder structure)
   - Estrarre widget HTML/JS riutilizzabile

3. **Creazione componente condiviso**:
   - Opzione A: Creare partial EJS in `cms/views/partials/cloudinary-uploader.ejs`
   - Opzione B: Shared npm package se strutture molto diverse
   - Includere config centralizzata in `.env`

4. **Applicazione agli altri panels**:
   - Sostituire upload locale con Cloudinary widget
   - Aggiornare routes per salvare Cloudinary URLs
   - Aggiornare database schema se necessario
   - Test upload per ogni panel

5. **PM2 Restart**:
   ```bash
   pm2 restart bio-admin news-admin gallery-admin press-admin concerts-admin
   ```

**Domande per utente**:
- Quale admin panel usi di più?
- Quale panel ha già Cloudinary funzionante?
- Stessa cartella Cloudinary per tutti o separate?

---

## 🔧 INFORMAZIONI TECNICHE:

### Server Staging
- **URL**: https://staging.danielecamiz.com
- **Credenziali**: `daniele:Vyasaji74`
- **Working directory**: `/home/daniele/danielecamiz-site`
- **PM2 restart**: `NODE_ENV=staging pm2 restart staging-site`
- **PM2 list**: `pm2 list` (mostra tutti i processi)

### Database
- **SQLite**: `/home/daniele/danielecamiz-site/cms/db/main.sqlite`
- **In .gitignore**: Modifiche immediate su staging senza commit
- **Backup automatici**: `cms/db/main.sqlite.backup-*` (giornalieri)
- **Schema inspection**: `sqlite3 cms/db/main.sqlite "PRAGMA table_info(TABLE_NAME);"`

### CSS Load Order (IMPORTANTE)
1. `normalize.css`
2. `globals.css`
3. Vari componenti (navbar.css, hero.css, etc.)
4. **`responsive.css` (ULTIMO)** ← Usa `!important` per override mobile

File layout: `/home/daniele/danielecamiz-site/cms/views/layouts/base-frontend.ejs` (righe 68-74)

### Cloudflare Cache
- Purge via dashboard se necessario per CSS/JS changes
- Cache-busting già implementato: `?v=<%= Date.now() %>`
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Linux/Win)

### File Structure
```
/home/daniele/danielecamiz-site/
├── cms/
│   ├── controllers/
│   │   └── concertsController.js (fetchPrograms con grouping movimenti)
│   ├── db/
│   │   └── main.sqlite
│   └── views/
│       ├── layouts/
│       │   └── base-frontend.ejs
│       └── pages/
│           └── frontend/
│               ├── repertoire.ejs
│               └── ...
├── frontend/
│   ├── css/
│   │   ├── components/
│   │   │   └── navbar.css
│   │   ├── pages/
│   │   │   └── repertoire/
│   │   │       └── repertoire-new.css
│   │   └── utils/
│   │       └── responsive.css (ULTIMO!)
│   └── js/
│       └── modules/
│           └── repertoire/
│               └── repertoire.js
├── contact-site/ (porta 3012, stile aggiornato)
├── bio-admin/
├── news-admin/
├── gallery-admin/
├── press-admin/
├── concerts-admin/
└── composer_portraits.sql ← FILE DI LAVORO PER RITRATTI
```

---

## 📝 ORDINE SUGGERITO DI ESECUZIONE:

1. **Task A** (30-60 min) - Completare ritratti compositori prioritari (almeno top 10)
2. **Task B.2** (1 ora) - Badge categorie colorate (quick win visibile)
3. **Task B.1** (3-4 ore) - Sezione "Ascolta" con player
4. **Task D** (3-4 ore) - Unificazione admin Cloudinary
5. **Task C** (opzionale) - Solo se utente richiede timeline/mappa

---

## ❓ DOMANDE DA FARE ALL'UTENTE ALL'INIZIO SESSIONE:

1. **Ritratti compositori**: Vuoi completare tutti i 48 compositori o solo i ~15 più importanti?
2. **Sezione Ascolta**: Preferisci YouTube, Spotify, SoundCloud o mix? Hai già link pronti?
3. **Priority 3**: La timeline visiva e mappa geografica sono davvero necessarie o possiamo saltarle?
4. **Admin Cloudinary**: Quale admin panel usi di più? Quale ha già Cloudinary funzionante?
5. **Ordine**: Preferisci completare prima il repertoire o gli admin panels?

---

## 🚀 QUICK START COMANDI:

```bash
# Check composer portraits status
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite "SELECT COUNT(*) as with_portrait FROM composers WHERE portrait_url IS NOT NULL AND portrait_url <> '';"

# Apply portraits updates
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite < composer_portraits.sql

# Restart staging
NODE_ENV=staging pm2 restart staging-site

# Check which admin has Cloudinary
grep -l "cloudinary" /home/daniele/danielecamiz-site/*/server.js

# Git status
git status

# Commit changes
git add . && git commit -m "feat: [description]" && git status
```

---

## 📊 PROGRESS TRACKING:

- [x] Navbar mobile dropdown fix
- [x] Concerts modal movements grouping
- [x] Contact-site style unification
- [x] Repertoire Priority 1 (portraits 7/55 + hover + count-up)
- [ ] **Repertoire portraits completion (48 remaining)**
- [ ] **Repertoire Priority 2 (audio player + category badges)**
- [ ] Repertoire Priority 3 (timeline + map) - OPTIONAL
- [ ] Admin panels Cloudinary unification

---

**File ready**: `/home/daniele/danielecamiz-site/composer_portraits.sql`
**Staging live**: https://staging.danielecamiz.com/repertoire (daniele:Vyasaji74)

Fammi sapere da dove vuoi partire! 🚀

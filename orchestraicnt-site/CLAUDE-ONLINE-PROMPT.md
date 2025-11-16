# Prompt per Claude Online - Orchestra ICNT Site

**Copia e incolla questo prompt quando lavori online su orchestraicnt-site**

---

## Contesto Progetto

Stai lavorando sul sito web **Orchestra ICNT** (`orchestraicnt-site`), un sito one-page per l'Orchestra ICNT (un ensemble sinfonico di giovani musicisti a Roma). Il sito è gestito tramite un pannello admin custom con database SQLite.

**Servizio PM2**: `orchestraicnt-site`
**Porta**: 3110
**Percorso progetto**: `/home/daniele/danielecamiz-site/orchestraicnt-site`

### Stack Tecnico
- **Backend**: Node.js + Express.js
- **Template Engine**: EJS (per admin panel)
- **Database**: SQLite (doppio: locale + condiviso)
- **Frontend**: Vanilla JavaScript (SPA con routing client-side)
- **Asset Management**: Cloudinary (integrato)
- **Editor**: TinyMCE (integrato da /shared)

### Architettura Database

**Database Locale** (`admin/db/icnt.sqlite`):
- Tabella `site_settings` con tutte le impostazioni del sito
- Categorie: hero, about, concerts, media, contact, footer, social, SEO
- Ogni setting ha: `setting_key`, `setting_value`, `description`, `updated_at`

**Database Condiviso** (`cms/db/main.sqlite`):
- Tabella `concerts` - Concerti gestiti centralmente
- Tabella `concert_performers` - Personale (orchestra, conductor, soloist)
- View `view_concert_personnel_agg` - Aggregazione dati personale

### File Chiave

```
orchestraicnt-site/
├── server.js                           # Server Express (PORT 3110)
├── .env                                # Environment (PORT=3110)
├── admin/
│   ├── routes/admin.js                 # Route admin
│   ├── controllers/settingsController.js  # CRUD settings
│   ├── views/settings/index.ejs        # Admin UI (810 righe)
│   └── db/icnt.sqlite                  # Database locale
├── config/database.js                  # Connessioni DB (locale + shared)
├── controllers/apiController.js        # API logic ⚠️ BUG QUI
├── routes/api.js                       # API routes
└── public/
    ├── index.html                      # SPA frontend (496 righe)
    └── js/main.js                      # JavaScript (817 righe)
```

---

## 🐛 Bug da Risolvere (PRIORITY 1)

### BUG #1: API Concerts Endpoint Broken ❌

**File**: `controllers/apiController.js`
**Linee**: 38-103
**Errore**: `SQLITE_ERROR: no such column: cp.orchestra`

**Causa**: La query usa nomi di colonne sbagliati. La view `view_concert_personnel_agg` ha:
- `orchestra_name` (NON `orchestra`)
- `conductor_name` (NON `conductor`)
- `soloists_list` (NON `soloists`)

**Fix**: Sostituisci l'intera funzione `getUpcomingConcerts` con:

```javascript
async function getUpcomingConcerts(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 3;

    // ✅ FIXED: Use correct column names from view
    const concerts = await sharedDB.all(`
      SELECT
        c.id,
        c.title,
        c.date,
        c.location,
        c.poster_cloudinary_id,
        c.program_notes,
        cp.orchestra_name,
        cp.conductor_name,
        cp.soloists_list
      FROM concerts c
      LEFT JOIN view_concert_personnel_agg cp ON cp.concert_id = c.id
      WHERE (c.is_future = 1 OR date(c.date) >= date('now'))
        AND (cp.orchestra_name IS NULL OR LOWER(cp.orchestra_name) LIKE '%icnt%')
      ORDER BY c.date ASC
      LIMIT ?
    `, [limit]);

    // ✅ Format concerts for frontend
    const formattedConcerts = concerts.map(concert => {
      // Parse program notes JSON if exists
      let repertoire = [];
      try {
        if (concert.program_notes) {
          const parsed = JSON.parse(concert.program_notes);
          if (parsed.repertoire && Array.isArray(parsed.repertoire)) {
            repertoire = parsed.repertoire;
          }
        }
      } catch (e) {
        console.warn(`[API] Could not parse program_notes for concert ${concert.id}`);
      }

      return {
        id: concert.id,
        title: concert.title,
        date: concert.date,
        location: concert.location,
        poster: concert.poster_cloudinary_id,
        orchestra: concert.orchestra_name || '',
        conductor: concert.conductor_name || '',
        soloists: concert.soloists_list || '',
        repertoire: repertoire
      };
    });

    res.json({
      success: true,
      concerts: formattedConcerts
    });

  } catch (error) {
    console.error('[API] Error loading concerts:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento dei concerti',
      error: error.message
    });
  }
}
```

**Test**:
```bash
curl http://localhost:3110/api/concerts/upcoming?limit=3 | jq
# Dovrebbe restituire 3 concerti ICNT upcoming
```

---

### BUG #2: Admin Panel Non Si Apre ❌

**Problema**: Visitando `/admin` si viene reindirizzati alla home invece di vedere il pannello admin.

**File da Controllare**:
1. `server.js` - Verifica ordine route (admin DEVE essere prima del catch-all)
2. `admin/controllers/settingsController.js` - Verifica path rendering view
3. `admin/views/partials/footer.ejs` - Verifica script includes

**Possibile Fix #1** - Verifica View Rendering:

In `admin/controllers/settingsController.js` linea 25:
```javascript
// Prova questa sintassi se non funziona:
res.render('admin/views/settings/index', { /* ... */ });
```

**Possibile Fix #2** - Aggiungi Script Necessari:

Verifica che `admin/views/partials/footer.ejs` o `header.ejs` includano:

```html
<!-- Prima del </body> -->

<!-- TinyMCE -->
<script src="/shared/vendor/tinymce/tinymce.min.js"></script>
<script src="/shared/config/editor-config.js"></script>

<!-- CloudinaryManager -->
<script src="/shared/cloudinary-manager/client.js"></script>
<script src="/shared/cloudinary-manager/ui-notifications.js"></script>

</body>
```

**Possibile Fix #3** - Verifica Route Order:

In `server.js`, assicurati che le route admin siano PRIMA del catch-all:

```javascript
// Linea 48-49 - Admin routes (DEVONO essere qui)
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// ...altro codice...

// Linea 106-112 - Catch-all DEVE essere DOPO
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.status(404).send('Admin route not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

**Test**:
```bash
curl -I http://localhost:3110/admin
# Dovrebbe restituire 200 OK e HTML (non 404 o redirect)
```

---

### ISSUE #3: Link Stagione Non Funziona

**File**: `public/js/main.js`
**Linea**: ~630-650 (dentro `ContentLoader.loadSettings()`)

**Problema**: Il bottone "Vedi tutta la stagione" ha `href="#"` invece del link da database.

**Fix**: Aggiungi questo codice nella funzione `ContentLoader.loadSettings()`:

```javascript
// Trova dove vengono aggiornate le altre impostazioni concerts, e aggiungi:

if (s.concerts_cta_text) {
  const btn = document.getElementById('view-season-btn');
  if (btn) {
    const textNode = btn.childNodes[0];
    if (textNode) textNode.textContent = s.concerts_cta_text + ' ';
  }
}

if (s.concerts_cta_link) {
  const btn = document.getElementById('view-season-btn');
  if (btn) btn.href = s.concerts_cta_link;
}
```

**Nota**: Il database ha già il valore corretto (`https://icnt.danielecamiz.com`), serve solo applicarlo al bottone.

**Test**:
- Apri `http://localhost:3110`
- Scroll alla sezione concerti
- Verifica che il bottone "Vedi tutta la stagione" linki a `icnt.danielecamiz.com`

---

## ✅ Cosa Funziona Già

- ✅ Servizio stabile (PM2 status: online, 0 unstable restarts)
- ✅ API Settings: `/api/settings` funziona perfettamente
- ✅ Frontend carica correttamente
- ✅ Database locale e condiviso accessibili
- ✅ Logo e immagini hero si vedono
- ✅ Admin UI è completo (810 righe EJS con tutte le sezioni)
- ✅ Database settings ha già `concerts_cta_link = https://icnt.danielecamiz.com`

---

## 📊 API Endpoints

### GET `/api/settings` ✅ WORKING
Carica tutte le impostazioni dal database locale.

**Response**:
```json
{
  "success": true,
  "settings": {
    "hero_background": "https://res.cloudinary.com/...",
    "hero_title": "Orchestra ICNT",
    "concerts_cta_link": "https://icnt.danielecamiz.com",
    ...
  }
}
```

### GET `/api/concerts/upcoming?limit=3` ❌ BROKEN
Carica concerti futuri con Orchestra ICNT. **Richiede FIX #1**.

**Response attesa** (dopo fix):
```json
{
  "success": true,
  "concerts": [
    {
      "id": 64,
      "title": "Mozart Symphonies Challenge N.19",
      "date": "2025-12-07",
      "location": "Chiesa valdese di piazza Cavour – Roma",
      "poster": "...",
      "orchestra": "Orchestra ICNT",
      "conductor": "Daniele Camiz",
      "soloists": "",
      "repertoire": [...]
    }
  ]
}
```

---

## 🎨 Frontend - Struttura Classi

**File**: `public/js/main.js`

1. **Navbar** - Navigazione sticky con scroll effects
2. **BackToTop** - Bottone scroll-to-top
3. **ContactForm** - Form validazione e submit AJAX
4. **Newsletter** - Newsletter subscription
5. **Animations** - Intersection Observer per fade-in
6. **ContentLoader** ⭐ - Carica contenuti da API
   - `loadSettings()` - Fetcha `/api/settings` e popola tutto il sito
   - `loadConcerts()` - Fetcha `/api/concerts/upcoming` e crea card concerti

**Inizializzazione** (linea 781-817):
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  new Navbar();
  new BackToTop();
  new ContactForm();
  new Newsletter();
  new Animations();

  await ContentLoader.loadSettings();
  await ContentLoader.loadConcerts();
});
```

---

## 🎛️ Admin Panel - Sezioni Editabili

**File**: `admin/views/settings/index.ejs`

L'admin panel permette di modificare TUTTE queste sezioni:

1. **Hero Section**: background, title, subtitle, claim, 2 CTA buttons
2. **Chi Siamo**: label, title, image, badge, intro (TinyMCE), description (TinyMCE), 3 features
3. **Concerti**: label, title, subtitle, CTA text, CTA link
4. **Media**: label, title, subtitle
5. **Contatti**: title, subtitle, email, phone, address
6. **Footer & Social**: copyright, Facebook, Instagram, YouTube, Twitter
7. **SEO**: site title, description, keywords

**Features**:
- ✅ Cloudinary upload per immagini (bottone "📷 Carica Immagine")
- ✅ TinyMCE per testi ricchi (about_intro, about_description)
- ✅ Form AJAX con success/error alerts
- ✅ Responsive (grid 2 colonne → 1 su mobile)

---

## 🚀 Comandi PM2

```bash
# Check status
pm2 status orchestraicnt-site

# Restart dopo modifiche
pm2 restart orchestraicnt-site

# View logs
pm2 logs orchestraicnt-site --lines 50

# Flush logs
pm2 flush orchestraicnt-site

# Save PM2 state
pm2 save
```

---

## 🧪 Testing Checklist

Dopo aver applicato i fix, testa:

### 1. API Tests
```bash
# Settings API
curl http://localhost:3110/api/settings | jq '.success'
# Output atteso: true

# Concerts API (dopo fix)
curl http://localhost:3110/api/concerts/upcoming?limit=3 | jq '.concerts | length'
# Output atteso: 3

# Admin access (dopo fix)
curl -I http://localhost:3110/admin | grep HTTP
# Output atteso: HTTP/1.1 200 OK
```

### 2. Browser Tests
- [ ] Frontend: `http://localhost:3110`
  - [ ] Hero carica con background
  - [ ] Logo in navbar
  - [ ] Sezione concerti mostra 3 card
  - [ ] Bottone "Vedi tutta la stagione" linka a icnt.danielecamiz.com

- [ ] Admin: `http://localhost:3110/admin`
  - [ ] Pannello si apre
  - [ ] Form popolato con valori correnti
  - [ ] Bottone Cloudinary funziona
  - [ ] TinyMCE si inizializza
  - [ ] Salvataggio aggiorna il database

---

## 🔍 Query Database Utili

```bash
# View current settings
sqlite3 /home/daniele/danielecamiz-site/orchestraicnt-site/admin/db/icnt.sqlite \
  "SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'concerts_%'"

# View upcoming concerts
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite \
  "SELECT id, title, date FROM concerts WHERE date >= date('now') ORDER BY date ASC LIMIT 3"

# View concert performers
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite \
  "SELECT concert_id, role, name FROM concert_performers WHERE concert_id = 64"

# Test the view
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite \
  "SELECT * FROM view_concert_personnel_agg WHERE concert_id = 64"
```

---

## ⚙️ Environment

**Port**: 3110 (verificato in `.env` e `server.js`)

**Nota Porte**: Durante lavoro online c'è stata confusione con porte (3100? 3110? 4012?). La porta CORRETTA è **3110**. Non modificare!

---

## 📝 Note Importanti

1. **Database Duale**:
   - Locale per settings del sito ICNT
   - Condiviso per concerti (gestiti da concerts-admin)

2. **View SQL**: `view_concert_personnel_agg` ha colonne:
   - `concert_id`
   - `orchestra_name` ← NON `orchestra`
   - `conductor_name` ← NON `conductor`
   - `chorus_name`
   - `soloists_list` ← NON `soloists`

3. **Filtro Orchestra**: Tutti i concerti upcoming hanno già "Orchestra ICNT" nel campo `orchestra_name`. Il filtro ICNT funziona correttamente nei dati.

4. **Link Stagione**: Database ha già `https://icnt.danielecamiz.com` in `concerts_cta_link`. Serve solo applicarlo al bottone frontend.

5. **Admin Panel**: È già completo! Tutte le sezioni sono editabili. Serve solo far funzionare l'accesso.

---

## 🎯 Tasks Priority

1. **PRIORITY 1**: Fix BUG #1 (API Concerts) - 5 minuti
2. **PRIORITY 1**: Fix BUG #2 (Admin Access) - 10 minuti
3. **PRIORITY 2**: Fix ISSUE #3 (Season Link) - 2 minuti
4. **PRIORITY 3**: Test everything - 10 minuti

**Tempo totale stimato**: ~30 minuti

---

## 📚 Risorse Condivise

Il progetto usa risorse dalla cartella `/home/daniele/danielecamiz-site/shared/`:

- **CloudinaryManager**: `/shared/cloudinary-manager/`
  - `client.js` - Upload e gestione immagini
  - `ui-notifications.js` - Notifiche UI

- **TinyMCE**: `/shared/vendor/tinymce/`
  - `tinymce.min.js` - Editor core
  - Config: `/shared/config/editor-config.js`

- **TinyMCE Unified System**: `/shared/tinymce/`
  - Sistema unificato v1.0 (nuovo)
  - `config.js` - Config centralizzata

**Nota**: Admin panel usa ancora il vecchio sistema (`editor-config.js`), ma è backward compatible.

---

## ✅ Workflow Suggerito

1. **Leggi il TECHNICAL-REPORT.md** per dettagli completi
2. **Applica FIX #1** (API Concerts) in `controllers/apiController.js`
3. **Testa**: `curl http://localhost:3110/api/concerts/upcoming?limit=3`
4. **Applica FIX #2** (Admin Access) - verifica view path e script includes
5. **Testa**: Visita `http://localhost:3110/admin` nel browser
6. **Applica FIX #3** (Season Link) in `public/js/main.js`
7. **Testa**: Verifica link bottone nel browser
8. **Restart PM2**: `pm2 restart orchestraicnt-site`
9. **Test finale**: Segui la checklist sopra

---

## 🔗 Link Utili

- **Frontend**: http://localhost:3110
- **Admin**: http://localhost:3110/admin
- **API Settings**: http://localhost:3110/api/settings
- **API Concerts**: http://localhost:3110/api/concerts/upcoming?limit=3

- **PM2 Logs**: `/home/daniele/.pm2/logs/orchestraicnt-site-*.log`
- **Database Locale**: `/home/daniele/danielecamiz-site/orchestraicnt-site/admin/db/icnt.sqlite`
- **Database Condiviso**: `/home/daniele/danielecamiz-site/cms/db/main.sqlite`

---

**Fine Prompt** - Buon lavoro! 🎵

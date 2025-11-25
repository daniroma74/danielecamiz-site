# 🎯 PROPOSTA: Newsletter System + Press-Kit Professionale

**Data:** 21 Novembre 2025
**Obiettivo:** Semplificare gestione newsletter + Press-kit professionale internazionale

---

## 📧 PARTE 1: SISTEMA NEWSLETTER SEMPLIFICATO

### 🔍 SITUAZIONE ATTUALE

**Database** (già in `main.sqlite`):
- ✅ `newsletter_subscribers` - con campi: `preferences`, `lang`, `source`
- ✅ `newsletter_campaigns`
- ✅ `newsletter_templates`
- ✅ `newsletter_stats` (tracking: sent, opened, clicked)
- ✅ `newsletter_settings`
- ✅ `newsletter_logs`
- ✅ `newsletter_digests` (per raggruppare news)

**Form iscrizione**:
- ✅ Form su `/news` (CSS + JS completi)
- ❌ Endpoint API `/api/newsletter/subscribe` **MANCANTE**

**Newsletter Service**:
- ✅ Admin panel su porta 3006 (con auth)
- ✅ Editor campagne
- ✅ Gestione iscritti

---

## 🎯 PROBLEMA DA RISOLVERE

**Due fonti di iscrizione con esigenze diverse:**

1. **Sito danielecamiz.com/news** → vuole:
   - News del sito (articoli, progetti, interviste)
   - Info sui concerti ICNT?

2. **Landing Page concerti ICNT** → vuole:
   - News concerti ICNT (programmi, date)
   - News del sito Daniele?

**Domanda chiave**: Come segmentare gli iscritti?

---

## 💡 SOLUZIONE PROPOSTA: 3 OPZIONI

### OPZIONE A: Segmentazione Binaria (Più Semplice)
```
newsletter_subscribers.preferences:
- 'site' = Solo news sito (articoli, progetti, interviste)
- 'icnt' = Solo concerti ICNT
- 'both' = Tutto (default)
```

**Vantaggi**:
- ✅ Semplicissimo da gestire
- ✅ Un solo campo (`preferences`)
- ✅ Chiaro per l'utente

**Svantaggi**:
- ⚠️ Poca granularità

---

### OPZIONE B: Tag-Based (Flessibile)
```
newsletter_subscribers.tags (JSON):
["site_news", "icnt_concerts", "interviews", "projects"]
```

**Vantaggi**:
- ✅ Massima flessibilità
- ✅ Puoi aggiungere categorie senza cambiare schema

**Svantaggi**:
- ⚠️ Più complesso da gestire nell'admin
- ⚠️ Rischio di frammentazione eccessiva

---

### OPZIONE C: Hybrid - Due Boolean + Tags (Raccomandato)
```sql
ALTER TABLE newsletter_subscribers ADD COLUMN wants_site_news INTEGER DEFAULT 1;
ALTER TABLE newsletter_subscribers ADD COLUMN wants_concerts INTEGER DEFAULT 1;
-- Mantieni 'tags' per future espansioni
```

**Form iscrizione**:
```
[ ] Voglio ricevere news dal sito (articoli, progetti)
[ ] Voglio ricevere info sui concerti ICNT
```

**Vantaggi**:
- ✅ Intuitivo per l'utente
- ✅ Facile query SQL: `WHERE wants_concerts = 1`
- ✅ Espandibile con tags per future segmentazioni

**Svantaggi**:
- Nessuno rilevante

---

## 🛠️ IMPLEMENTAZIONE RACCOMANDATA

### 1. **Schema DB Aggiornato**
```sql
-- Aggiungi campi a newsletter_subscribers
ALTER TABLE newsletter_subscribers
  ADD COLUMN wants_site_news INTEGER DEFAULT 1 CHECK(wants_site_news IN (0,1));

ALTER TABLE newsletter_subscribers
  ADD COLUMN wants_concerts INTEGER DEFAULT 1 CHECK(wants_concerts IN (0,1));

-- Indici per performance
CREATE INDEX idx_ns_wants_site ON newsletter_subscribers(wants_site_news);
CREATE INDEX idx_ns_wants_concerts ON newsletter_subscribers(wants_concerts);
```

### 2. **API Endpoint `/api/newsletter/subscribe`**

**File**: `cms/routes/api/newsletterApi.js` (nuovo)

```javascript
import express from 'express';
import { getDb } from '../../utils/sqliteMain.js';

const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { email, lang = 'it', wants_site_news = true, wants_concerts = true, source = 'website' } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  try {
    const db = await getDb();

    // Check if already exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id, status FROM newsletter_subscribers WHERE email = ?', [email.toLowerCase()],
        (err, row) => err ? reject(err) : resolve(row));
    });

    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Re-subscribe
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE newsletter_subscribers
             SET status = 'active', wants_site_news = ?, wants_concerts = ?,
                 updated_at = datetime('now'), unsubscribed_at = NULL
             WHERE email = ?`,
            [wants_site_news ? 1 : 0, wants_concerts ? 1 : 0, email.toLowerCase()],
            (err) => err ? reject(err) : resolve()
          );
        });
        return res.json({ ok: true, message: 'resubscribed' });
      }
      return res.json({ ok: true, message: 'already_subscribed' });
    }

    // Insert new subscriber
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO newsletter_subscribers
         (email, lang, wants_site_news, wants_concerts, source, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
        [email.toLowerCase(), lang, wants_site_news ? 1 : 0, wants_concerts ? 1 : 0, source],
        (err) => err ? reject(err) : resolve()
      );
    });

    return res.json({ ok: true, message: 'subscribed' });
  } catch (err) {
    console.error('[newsletter] Subscribe error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

export default router;
```

**Monta in** `cms/routes/api/index.js`:
```javascript
import newsletterApi from './newsletterApi.js';
router.use('/newsletter', newsletterApi);
```

### 3. **Form su /news - Aggiornamento**

**File**: `cms/views/pages/frontend/news.ejs` (riga 121)

```html
<form id="newsletter_form" class="newsletter-card__form" action="#" method="post" data-lang="<%= lang %>" onsubmit="return false">
  <input id="newsletter_email" name="email" class="input" type="email"
         placeholder="<%= lang==='en' ? 'email address' : 'indirizzo email' %>"
         aria-label="email" autocomplete="email" required />

  <div class="newsletter-preferences">
    <label>
      <input type="checkbox" name="wants_site_news" value="1" checked>
      <%= lang==='en' ? 'Site news (articles, projects)' : 'News del sito (articoli, progetti)' %>
    </label>
    <label>
      <input type="checkbox" name="wants_concerts" value="1" checked>
      <%= lang==='en' ? 'Concert updates' : 'Aggiornamenti concerti' %>
    </label>
  </div>

  <input type="hidden" name="lang" value="<%= lang %>">
  <input type="hidden" name="source" value="website">
  <button class="btn" type="submit"><%= lang==='en' ? 'Subscribe' : 'Iscriviti' %></button>
  <div id="newsletter_feedback" class="newsletter-card__feedback" aria-live="polite" role="status"></div>
</form>
```

**JS già pronto** (`frontend/js/modules/news/news.js:227`) - basta aggiungere i nuovi campi:

```javascript
// Dentro initNewsletterForm() - riga 227
const wants_site_news = form.querySelector('[name="wants_site_news"]')?.checked ?? true;
const wants_concerts = form.querySelector('[name="wants_concerts"]')?.checked ?? true;

const res = await fetch('/api/newsletter/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, consent: true, lang, wants_site_news, wants_concerts, source: 'website' })
});
```

### 4. **Form su Landing Page ICNT**

Stesso endpoint, ma `source: 'landing'` e defaults diversi:
```javascript
{
  email: "...",
  lang: "it",
  wants_site_news: false,  // Default OFF per landing
  wants_concerts: true,     // Default ON per landing
  source: "landing"
}
```

### 5. **Admin Newsletter - Filtri Campagne**

**File**: `newsletter-service/views/pages/campaign-editor.ejs`

Aggiungi selettore audience:
```html
<label>Destinatari:</label>
<select name="audience_filter">
  <option value="all">Tutti gli iscritti</option>
  <option value="site_news">Solo chi vuole news sito</option>
  <option value="concerts">Solo chi vuole concerti</option>
  <option value="both">Solo chi vuole entrambi</option>
</select>
```

**Query invio** (in `newsletter-service/controllers/campaignController.js`):
```javascript
let query = 'SELECT * FROM newsletter_subscribers WHERE status = "active"';

if (audience_filter === 'site_news') {
  query += ' AND wants_site_news = 1';
} else if (audience_filter === 'concerts') {
  query += ' AND wants_concerts = 1';
} else if (audience_filter === 'both') {
  query += ' AND wants_site_news = 1 AND wants_concerts = 1';
}
```

---

## 🎨 UX/UI MIGLIORAMENTI ADMIN

### Dashboard Semplificata

```
┌─────────────────────────────────────────────────┐
│  📊 PANORAMICA ISCRITTI                         │
├─────────────────────────────────────────────────┤
│  👥 Totali attivi:        245                   │
│  📰 Solo news sito:       89  (36%)             │
│  🎵 Solo concerti:        67  (27%)             │
│  🌟 Entrambi:             89  (36%)             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  📧 CREA CAMPAGNA                               │
├─────────────────────────────────────────────────┤
│  [ Nuovo Digest News Sito ]  [ Concerto ICNT ] │
└─────────────────────────────────────────────────┘
```

**Button actions**:
- "Nuovo Digest News Sito" → Pre-select `audience_filter: site_news`
- "Concerto ICNT" → Pre-select `audience_filter: concerts`, load template concerti

---

# 🎼 PARTE 2: PRESS-KIT PROFESSIONALE 2025

## 📚 BEST PRACTICES INTERNAZIONALI

Secondo le ricerche aggiornate al 2025, un EPK (Electronic Press Kit) professionale deve includere:

### ✅ 8 COMPONENTI ESSENZIALI

1. **Biography** (Short + Long)
   - Short: 2-3 frasi (elevator pitch)
   - Long: 200-300 parole (biografia dettagliata)

2. **Professional Photos**
   - High-res (minimo 300 DPI)
   - Varietà: ritratto, azione (dirigendo), dietro le quinte
   - Formati: Orizzontale + Verticale

3. **Music/Audio**
   - 3-5 tracks migliori (solo best work!)
   - Embed YouTube/SoundCloud

4. **Video**
   - Live performance (priorità assoluta)
   - 2-3 video professionali

5. **Press Reviews & Highlights**
   - Citazioni stampa
   - Riconoscimenti/premi

6. **Achievements & CV**
   - Highlights: premi, prime esecuzioni
   - CV completo (PDF scaricabile)

7. **Social & Streaming Links**
   - Instagram, YouTube, Spotify, ecc.

8. **Contact Information**
   - Email booking
   - Management info

---

## 🛠️ ARCHITETTURA PROPOSTA

### OPZIONE 1: Press-Kit Come Pagina Dedicata (Raccomandato)

**URL**: `danielecamiz.com/press-kit` o `/epk`

**Vantaggi**:
- ✅ SEO-friendly
- ✅ Facile da condividere
- ✅ Sempre aggiornato
- ✅ Trackable (analytics)

**Struttura**:
```
/press-kit
  ├── Short Bio (con "Read more" → long bio)
  ├── Download Section
  │   ├── [ 📄 CV completo PDF ]
  │   ├── [ 📷 Foto alta risoluzione (ZIP) ]
  │   └── [ 📄 Bio ufficiale (PDF) ]
  ├── Photos Gallery (thumbnails → full res download)
  ├── Videos (embedded YouTube)
  ├── Audio Highlights (embedded)
  ├── Press Quotes
  ├── Achievements
  └── Contact
```

### OPZIONE 2: Press-Kit PDF Generato (Complementare)

Per chi preferisce scaricare tutto insieme, genera PDF on-demand con:
- Bio
- Foto (basse res per dimensione file)
- Link a video/audio
- Contatti

**Tool**: Puppeteer o PDF-lib

---

## 🗄️ DATABASE SCHEMA SEMPLIFICATO

### Approccio Unificato (Raccomandato)

**Elimina** `presskit_assets` (troppo complesso).
**Usa** solo `bio_content` + nuova tabella `press_kit_files`:

```sql
CREATE TABLE press_kit_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('photo', 'video', 'audio', 'document')),
  category TEXT, -- es. 'action_shot', 'portrait', 'performance', 'cv'
  cloudinary_id TEXT NOT NULL,
  title_it TEXT,
  title_en TEXT,
  description_it TEXT,
  description_en TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_press_kit_type ON press_kit_files(type);
CREATE INDEX idx_press_kit_order ON press_kit_files(display_order);
```

**Gestione**:
- Upload foto → salva in `press_kit_files` con `type: 'photo'`
- Upload CV → salva con `type: 'document'`, `category: 'cv'`
- Frontend `/press-kit` query tutte le categorie

---

## 🎯 UX ADMIN SEMPLIFICATA

### Bio-Admin → Nuova Sezione "Press-Kit"

```
┌─────────────────────────────────────────────────┐
│  📁 PRESS-KIT MANAGER                           │
├─────────────────────────────────────────────────┤
│  📄 DOCUMENTI                                   │
│  [ Upload CV PDF ]         cv_daniele_2025.pdf ✓│
│  [ Upload Bio PDF ]        bio_official.pdf    ✓│
│                                                  │
│  📷 FOTO PROFESSIONALI                          │
│  [ Upload Photos ]                               │
│  ┌────┐ ┌────┐ ┌────┐                          │
│  │ 📸 │ │ 📸 │ │ 📸 │  [+]                    │
│  └────┘ └────┘ └────┘                          │
│  Ritratto  Azione  Backstage                    │
│  [⬆️] [⬇️] [🗑️]  [⬆️] [⬇️] [🗑️]  [⬆️] [⬇️] [🗑️]    │
│                                                  │
│  🎥 VIDEO                                       │
│  [ Aggiungi YouTube URL ]                       │
│  • Brahms Symphony No.1 - Roma 2024  [🗑️]      │
│  • Mozart Requiem - Firenze 2024     [🗑️]      │
│                                                  │
│  [ 👁️ ANTEPRIMA PRESS-KIT ]                     │
│  [ 💾 SALVA ]                                   │
└─────────────────────────────────────────────────┘
```

**Workflow**:
1. Upload → Cloudinary (con preset `press_kit_unsigned`)
2. Salva cloudinary_id + metadata in `press_kit_files`
3. Frontend `/press-kit` mostra tutto automaticamente

---

## 📋 TASK DI IMPLEMENTAZIONE

### Newsletter (Stima: 3-4 ore)

- [ ] Aggiungere campi `wants_site_news`, `wants_concerts` a DB
- [ ] Creare `cms/routes/api/newsletterApi.js`
- [ ] Montare endpoint in `cms/routes/api/index.js`
- [ ] Aggiornare form su `/news` con checkboxes
- [ ] Aggiornare `news.js` per inviare nuovi campi
- [ ] Aggiungere filtro audience in campaign editor
- [ ] Testare flusso completo iscrizione

### Press-Kit (Stima: 4-5 ore)

- [ ] Creare tabella `press_kit_files`
- [ ] Creare pagina `/press-kit` (controller + view)
- [ ] Aggiungere sezione "Press-Kit" in bio-admin
- [ ] Implementare upload manager (riuso cloudinary-manager)
- [ ] Implementare display ordinato (drag & drop?)
- [ ] Testare download file
- [ ] Verificare responsive

---

## ❓ DECISIONI RICHIESTE

### Newsletter
1. **Opzione segmentazione**: A, B o C (raccomando C - Hybrid)
2. **Default checkboxes su /news**: Entrambi checked? Solo site_news?
3. **Default su landing ICNT**: Solo concerts? O entrambi?

### Press-Kit
1. **Approccio**: Solo pagina web? O anche PDF scaricabile?
2. **Foto**: Quante categorie? (ritratto, azione, backstage, altro?)
3. **Video**: Solo embed YouTube? O anche upload diretto?

---

## 🚀 PROSSIMI PASSI

Dopo tue risposte alle domande sopra, posso:
1. Implementare schema DB aggiornato
2. Creare endpoint API newsletter
3. Aggiornare form e JS
4. Creare pagina `/press-kit`
5. Aggiungere sezione admin press-kit

**Tempo totale stimato**: 7-9 ore per implementazione completa.

---

*Documento preparato da Claude Code - 21 Novembre 2025*

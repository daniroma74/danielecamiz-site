# 🗺️ ROADMAP: Unificazione Editor Cloudinary e TinyMCE

## 📋 Obiettivo
Unificare completamente gli editor Cloudinary e TinyMCE in tutti gli 8 pannelli admin con UX/UI identica e codice condiviso.

## 📦 Stato Attuale

### ✅ Risorse Condivise Esistenti
- `/shared/js/cloudinary-widget.js` - Widget Cloudinary unificato
- `/shared/config/editor-config.js` - Configurazione TinyMCE condivisa
- `/shared/vendor/tinymce/` - TinyMCE library

### 📊 Pannelli Admin (8 totali)
1. **Bio Admin** - biografia, curriculum, storia, presskit
2. **Gallery Admin** - foto, video, audio, collezioni
3. **Press Admin** - articoli stampa, citazioni
4. **News Admin** - articoli news
5. **Contact Admin** - visual editor (nessun editor testo)
6. **Concerts Admin** - concerti, repertorio
7. **Newsletter Service** - campagne email
8. **Landing/Events Admin** - landing page eventi

### 🔍 Uso Attuale Editor

#### Cloudinary (19 file)
- **Bio**: presskit.ejs
- **Concerts**: dashboard.ejs, concert-editor.ejs
- **Gallery**: 5 file (collections, photos, images, etc.)
- **Landing**: 6 file (editor, dashboard, archive, etc.)
- **News**: news-edit.ejs
- **Newsletter**: campaign-editor.ejs
- **Press**: article-edit.ejs

#### TinyMCE (9 file)
- **Bio**: biography.ejs, curriculum.ejs, story.ejs, page-layout.ejs
- **Concerts**: concert-editor.ejs
- **Landing**: editor.ejs
- **News**: news-edit.ejs
- **Newsletter**: campaign-editor.ejs
- **Press**: article-edit.ejs

---

## 🎯 PIANO DI AZIONE

### FASE 1: Audit e Standardizzazione
**Obiettivo**: Capire le variazioni attuali e definire lo standard

#### 1.1 Analisi Implementazioni Correnti
- [ ] Verificare come ogni pannello carica Cloudinary widget
- [ ] Verificare come ogni pannello inizializza TinyMCE
- [ ] Identificare differenze in configurazione, stili, callback
- [ ] Documentare pattern di upload (folder, preset, validazione)

#### 1.2 Definire Standard UX/UI
- [ ] Design sistema bottoni uniformi (es: "📸 Carica Immagine")
- [ ] Definire messaggi di errore/successo uniformi
- [ ] Definire preview immagini uniformi
- [ ] Definire toolbar TinyMCE standard per ogni contesto

#### 1.3 Definire Standard Tecnico
- [ ] Convenzioni nomi folder Cloudinary per pannello
- [ ] Convenzioni upload preset
- [ ] Gestione errori uniforme
- [ ] Validazione file uniforme (size, formato)

---

### FASE 2: Potenziamento Librerie Condivise
**Obiettivo**: Rendere gli editor condivisi completi e riutilizzabili

#### 2.1 Cloudinary Widget Unificato
**File**: `/shared/js/cloudinary-widget.js`

Miglioramenti necessari:
- [ ] Aggiungere UI helper per bottone standard
- [ ] Aggiungere preview component riutilizzabile
- [ ] Aggiungere gestione errori con notifiche uniformi
- [ ] Aggiungere preset configurazioni per pannello
- [ ] Documentazione inline completa

```javascript
// Esempio target API:
CloudinaryEditor.createButton({
  targetElement: '#upload-btn',
  folder: 'bio/presskit',
  onSuccess: (imageData) => { /* ... */ },
  preset: 'bio-admin'
});

CloudinaryEditor.createImagePreview({
  targetElement: '#preview-container',
  imageUrl: '...',
  editable: true,
  onRemove: () => { /* ... */ }
});
```

#### 2.2 TinyMCE Config Unificato
**File**: `/shared/config/editor-config.js`

Miglioramenti necessari:
- [ ] Aggiungere preset per ogni tipo di pannello
- [ ] Uniformare toolbar per contesto (blog vs newsletter vs bio)
- [ ] Integrare Cloudinary button in modo standard
- [ ] Aggiungere helper di inizializzazione semplificato
- [ ] Documentazione inline completa

```javascript
// Esempio target API:
SharedEditor.init('#content-editor', {
  preset: 'blog', // blog | newsletter | bio
  cloudinaryFolder: 'news/articles',
  onSave: (content) => { /* ... */ }
});
```

#### 2.3 Componenti UI Condivisi
**Nuovo file**: `/shared/js/editor-ui-components.js`

- [ ] Bottoni upload uniformi (HTML + CSS)
- [ ] Preview box immagini uniformi
- [ ] Loading spinners
- [ ] Messaggi notifica (successo/errore)
- [ ] Modal per crop/edit immagini

---

### FASE 3: Applicazione a Pannelli (Priorità)
**Obiettivo**: Migrare pannello per pannello agli editor unificati

#### Priorità Alta (uso intensivo editor)
**3.1 News Admin**
- [ ] Migrare TinyMCE a config condivisa preset 'blog'
- [ ] Migrare Cloudinary a widget condiviso
- [ ] Testare creazione/modifica articolo
- [ ] Verificare upload immagini in articolo

**3.2 Press Admin**
- [ ] Migrare TinyMCE a config condivisa preset 'blog'
- [ ] Migrare Cloudinary a widget condiviso
- [ ] Testare creazione/modifica articolo stampa

**3.3 Newsletter Service**
- [ ] Verificare TinyMCE preset 'newsletter' (già presente)
- [ ] Migrare Cloudinary a widget condiviso
- [ ] Testare creazione campagna email

**3.4 Bio Admin**
- [ ] Migrare TinyMCE a config condivisa preset 'bio'
- [ ] Migrare Cloudinary presskit a widget condiviso
- [ ] Testare biografia/curriculum/storia/presskit

#### Priorità Media
**3.5 Concerts Admin**
- [ ] Migrare TinyMCE concert-editor a config condivisa
- [ ] Migrare Cloudinary a widget condiviso
- [ ] Testare creazione/modifica concerto

**3.6 Landing/Events Admin**
- [ ] Migrare TinyMCE a config condivisa preset 'events'
- [ ] Migrare Cloudinary uploads a widget condiviso
- [ ] Testare creazione/modifica landing page

**3.7 Gallery Admin**
- [ ] Migrare Cloudinary a widget condiviso (uso massiccio)
- [ ] Standardizzare UI upload foto/video
- [ ] Testare upload e gestione media

#### Priorità Bassa
**3.8 Contact Admin**
- Nessun editor di testo, solo visual editor già fatto
- Eventuale integrazione Cloudinary se necessario

---

### FASE 4: Testing e Validazione
**Obiettivo**: Assicurare funzionalità corretta ovunque

#### 4.1 Test Funzionali
- [ ] Upload immagini funziona in ogni pannello
- [ ] Selezione da Media Library funziona
- [ ] TinyMCE si inizializza correttamente
- [ ] Salvataggio contenuti funziona
- [ ] Preview immagini funziona

#### 4.2 Test Cross-Browser
- [ ] Chrome/Edge (desktop)
- [ ] Firefox
- [ ] Safari (se disponibile)
- [ ] Mobile responsive

#### 4.3 Test UX
- [ ] Bottoni hanno stile uniforme
- [ ] Messaggi errore sono chiari
- [ ] Loading states visibili
- [ ] Workflow intuitivo

---

### FASE 5: Documentazione
**Obiettivo**: Documentare per manutenzione futura

#### 5.1 Documentazione Sviluppatore
- [ ] README per `/shared/js/cloudinary-widget.js`
- [ ] README per `/shared/config/editor-config.js`
- [ ] Esempi di uso in ogni contesto
- [ ] Troubleshooting comuni

#### 5.2 Documentazione Utente
- [ ] Guida uso Cloudinary widget
- [ ] Guida uso TinyMCE editor
- [ ] FAQ comuni

---

## 📅 Timeline Stimata

### Sprint 1 (Settimana 1)
- Completare FASE 1: Audit
- Iniziare FASE 2: Potenziamento librerie

### Sprint 2 (Settimana 2)
- Completare FASE 2
- Iniziare FASE 3: News, Press, Newsletter (priorità alta)

### Sprint 3 (Settimana 3)
- Completare FASE 3: Bio, Concerts, Landing
- Iniziare FASE 4: Testing

### Sprint 4 (Settimana 4)
- Completare FASE 4
- Completare FASE 5: Documentazione
- **GO LIVE** 🚀

---

## 🎨 Design System Editor

### Bottoni Upload Standard
```html
<button class="cloudinary-upload-btn">
  <i class="fas fa-cloud-upload-alt"></i>
  Carica Immagine
</button>
```

CSS:
```css
.cloudinary-upload-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cloudinary-upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
```

### Preview Box Standard
```html
<div class="image-preview-box">
  <img src="..." alt="Preview">
  <button class="remove-btn">🗑️</button>
</div>
```

### TinyMCE Toolbar Standard
- **Blog/News/Press**: Full toolbar con tabelle
- **Newsletter**: Toolbar ridotta (no tabelle complesse)
- **Bio**: Toolbar media con formattazione avanzata

---

## ⚠️ Considerazioni Importanti

### Compatibilità
- Assicurare che TinyMCE 8 Promise-based funzioni ovunque
- CloudinaryManager deve essere caricato prima di editor

### Performance
- Lazy load TinyMCE dove possibile
- Preload Cloudinary widget solo quando necessario

### Sicurezza
- Validare upload sul backend
- Sanitizzare contenuto TinyMCE prima del save
- Verificare permessi folder Cloudinary

### Accessibilità
- Alt text per tutte le immagini
- Keyboard navigation nei widget
- Screen reader friendly

---

## 📊 Metriche di Successo

- ✅ 100% pannelli usano editor condivisi
- ✅ 0 duplicazione codice editor
- ✅ UI/UX identica in tutti i pannelli
- ✅ Nessun bug di upload/save
- ✅ Documentazione completa
- ✅ Tempo di sviluppo ridotto per nuove feature

---

## 🔄 Prossimi Passi Immediati

1. **Approvazione Roadmap**: Confermare priorità e timeline
2. **Kick-off FASE 1**: Iniziare audit implementazioni correnti
3. **Setup Testing Environment**: Preparare ambiente per test sistematici

---

**Documento creato**: 2025-11-15
**Versione**: 1.0
**Owner**: Sviluppo Admin Panels

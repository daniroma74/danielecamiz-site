# Piano: Editor Visuale per Contact-Admin (Tipo Linktree)

## Problema Attuale
Contact-admin è troppo macchinoso:
- 5+ pagine diverse per gestire contenuti
- Nessuna anteprima live
- Difficile capire come appaiono i link
- No drag & drop per riordinare
- Mancano miniature per link evidenza

## Obiettivo
Creare un editor single-page tipo Linktree con:
- **Split view**: Editor a sinistra, Anteprima live a destra
- **Drag & drop** per riordinare link
- **Edit inline** senza cambiare pagina
- **Miniature** per link evidenza
- **Cambio immediato** visibile in anteprima

## Architettura Proposta

### Frontend (Single Page App)
```
┌─────────────────────────────────────┬──────────────────────────────┐
│  EDITOR PANEL (50%)                 │  PREVIEW PANEL (50%)         │
├─────────────────────────────────────┼──────────────────────────────┤
│                                     │                              │
│ ┌─ Settings ─────────────────────┐ │  ┌────────────────────────┐  │
│ │ Name: [Daniele Camiz          ]│ │  │   Avatar + Name        │  │
│ │ Role: [Direttore d'Orchestra ]│ │  │                        │  │
│ │ Bio:  [Textarea...            ]│ │  │  "Daniele Camiz"       │  │
│ └────────────────────────────────┘ │  │  Direttore d'Orchestra │  │
│                                     │  │  Short bio...          │  │
│ ┌─ Highlights ───────────────────┐ │  └────────────────────────┘  │
│ │  [+] Add Highlight              │ │                              │
│ │                                 │ │  ┌───────────┐ ┌─────────┐  │
│ │  🎵 Sito Ufficiale    [≡] [✎]  │ │  │ [icon]    │ │ [icon]  │  │
│ │  📧 Newsletter        [≡] [✎]  │ │  │ Sito      │ │ News    │  │
│ │                                 │ │  └───────────┘ └─────────┘  │
│ └────────────────────────────────┘ │                              │
│                                     │  ── Social ──               │
│ ┌─ Social Links ─────────────────┐ │  [Instagram]                │
│ │  [+] Add Social                 │ │  [Facebook]                 │
│ │                                 │ │                             │
│ │  Instagram        [≡] [✎] [👁] │ │  ── Contact ──              │
│ │  Facebook         [≡] [✎] [👁] │ │  [Email]                    │
│ │  YouTube          [≡] [✎] [👁] │ │  [Phone]                    │
│ └────────────────────────────────┘ │                              │
│                                     │  ── Altri Link ──           │
│ ┌─ Contact ──────────────────────┐ │  [Bio]                       │
│ │  Email            [≡] [✎]      │ │  [Concerti]                 │
│ │  Phone            [≡] [✎]      │ │                             │
│ └────────────────────────────────┘ │                              │
│                                     │  Footer                      │
│ ┌─ Tools ────────────────────────┐ │                              │
│ │  [QR Code] [Export] [Publish]  │ │                              │
│ └────────────────────────────────┘ │                              │
└─────────────────────────────────────┴──────────────────────────────┘
```

### Stack Tecnologico

**Backend (keep as is):**
- Express.js
- better-sqlite3
- Existing API endpoints (già funzionanti)

**Frontend (new):**
- **Vue.js 3** con Composition API (leggero, reattivo)
- **Sortable.js** per drag & drop
- **Tailwind CSS** per styling rapido
- **Alpine.js** alternativa se vogliamo più leggero

### File Structure
```
contact-admin/
├── views/
│   └── editor/
│       └── visual.ejs          # Single page editor
├── public/
│   ├── js/
│   │   ├── visual-editor.js    # Main Vue app
│   │   ├── components/
│   │   │   ├── EditorPanel.js
│   │   │   ├── PreviewPanel.js
│   │   │   ├── LinkEditor.js
│   │   │   └── SettingsEditor.js
│   │   └── lib/
│   │       ├── vue.esm-browser.js
│   │       └── Sortable.min.js
│   └── css/
│       └── visual-editor.css
└── routes/
    └── editorRoutes.js         # New routes for editor
```

### API Endpoints Needed (molti già esistono!)

**Esistenti (riusare):**
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `GET /api/links` - Get all links
- `POST /api/links` - Create link
- `PUT /api/links/:id` - Update link
- `DELETE /api/links/:id` - Delete link
- `POST /api/links/reorder` - Reorder links

**Nuovi (da creare):**
- `GET /api/preview` - Get rendered preview HTML
- `POST /api/publish` - Publish changes (trigger cache refresh)

### Features Implementation

#### 1. Settings Editor (Top Section)
```javascript
// Component: SettingsEditor.vue
{
  name_it: String,
  name_en: String,
  role_it: String,
  role_en: String,
  bio_it: Text,
  bio_en: Text,
  avatar: URL,
  footer_it: String,
  footer_en: String
}
```
- Edit inline
- Auto-save dopo 2 secondi di inattività
- Preview aggiornato in tempo reale

#### 2. Links Editor (Collapsible Sections)
```javascript
// Component: LinkEditor.vue
{
  id: Number,
  category: 'highlight' | 'social' | 'contact' | 'extra',
  title_it: String,
  title_en: String,
  url: String,
  icon: String,
  visible: Boolean,
  order_index: Number,
  badge_text: String,
  badge_color: Color
}
```

**Features:**
- Drag handle [≡] per riordinare (Sortable.js)
- Edit button [✎] apre modal inline
- Visibility toggle [👁] per show/hide
- Miniatura/icona preview
- Badge editor inline
- Scheduled dates picker

#### 3. Highlight Cards con Miniature
```javascript
// Special rendering per highlights
{
  icon: URL/path,
  thumbnail: Generated da icon + title,
  layout: 'grid' | 'list'
}
```
- Mostra icona grande in anteprima
- Cambio icona drag & drop oppure URL
- Preview immediato in anteprima panel

#### 4. Preview Panel (Live)
```javascript
// Component: PreviewPanel.vue
- Iframe che carica /api/preview
- Si aggiorna ogni volta che cambia data
- Responsive toggle (mobile/desktop view)
- Language toggle (IT/EN)
```

#### 5. Drag & Drop Implementation
```javascript
// Using Sortable.js
new Sortable(el, {
  animation: 150,
  handle: '.drag-handle',
  onEnd: (evt) => {
    // Update order via API
    fetch('/api/links/reorder', {
      method: 'POST',
      body: JSON.stringify({ orders: newOrder })
    });
  }
});
```

#### 6. Real-time Preview
```javascript
// Vue.js reactivity
watch(
  () => [settings, links],
  debounce(() => {
    updatePreview();
  }, 500)
);
```

### UI/UX Details

**Colors & Style:**
- Background: Clean white/light grey
- Accent: Gold theme (consistent with brand)
- Buttons: Clear primary actions
- Drag handles: Subtle grey, visible on hover

**Interactions:**
- Smooth animations (150ms)
- Instant feedback on save
- Loading states per azioni async
- Toast notifications per successo/errori

**Responsiveness:**
- Desktop: Split 50/50
- Tablet: Collapsible preview
- Mobile: Tabs (Edit | Preview)

### Implementation Steps

**Phase 1: Setup (2 ore)**
1. Create visual.ejs template
2. Setup Vue.js + Sortable.js
3. Create basic split layout

**Phase 2: Settings Editor (2 ore)**
1. Settings form component
2. Auto-save functionality
3. Real-time preview update

**Phase 3: Links Editor (4 ore)**
1. Link list component
2. Add/Edit/Delete functionality
3. Drag & drop integration
4. Inline editing

**Phase 4: Preview Panel (2 ore)**
1. Preview iframe setup
2. Language toggle
3. Responsive view toggle
4. Real-time updates

**Phase 5: Polish (2 ore)**
1. Icons & miniatures
2. Badge editor
3. Scheduled dates
4. QR code / Export tools

**Total: ~12 ore**

### Migration Plan

**Option A: Replace Current (Recommended)**
- New route: `/editor` (visual editor)
- Keep old `/dashboard`, `/links`, etc as fallback
- Redirect dashboard to `/editor` by default
- Users can switch back if needed

**Option B: Parallel**
- Keep both systems
- Add "Switch to Visual Editor" button
- Users choose their preference

### Benefits

✅ **Usabilità:**
- Single page, no navigation hell
- See changes immediately
- Intuitive drag & drop

✅ **Velocità:**
- 10x faster workflow
- No page reloads
- Instant preview

✅ **User Experience:**
- Similar to Linktree (users know this UX)
- No learning curve
- Professional feel

✅ **Maintainability:**
- Clean Vue components
- Reusable API backend
- Easy to extend

### Tech Decisions

**Why Vue.js 3?**
- Reactive system perfetto per live preview
- Composition API è semplice e pulito
- No build step necessario (ESM browser)
- Piccolo footprint (~34KB)

**Why Sortable.js?**
- Battle-tested library
- Smooth animations
- Touch support
- Zero dependencies

**Why not React?**
- Troppo pesante per questo caso
- Richiede build step
- Vue è più immediato per questo use case

**Why not plain JavaScript?**
- Troppo codice manuale per reattività
- Vue gestisce automaticamente DOM updates
- Più manutenibile

### Next Steps

1. **Approva questo piano** ✓
2. **Creo branch** `feature/visual-editor`
3. **Implemento Phase 1-5** step by step
4. **Test con te** dopo ogni phase
5. **Deploy** quando approvato

### Notes

- Mantengo backend API esistenti (già funzionano!)
- Zero breaking changes per chi usa API
- Progressive enhancement (fallback disponibile)
- Mobile-first approach

---

**Domande per te:**
1. Vuoi che inizio subito con Phase 1?
2. Preferisci Option A (replace) o B (parallel)?
3. Ci sono feature specifiche che vuoi prioritizzare?


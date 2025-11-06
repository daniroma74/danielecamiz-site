# 🚀 Deploy Groups Architecture - Complete Redesign

## 📋 Cosa È Stato Fatto

### ✅ 1. Dashboard 404 - RISOLTO
**Problema**: Dashboard non esisteva, dava 404 anche dall'editor
**Soluzione**:
- Creata `contact-admin/views/dashboard.ejs` con design moderno
- Quick links a: Visual Editor, Settings, Export
- Root (`/`) ora redirige a `/dashboard`
- Dashboard accessibile con autenticazione

**Status**: ✅ COMPLETATO

### ✅ 2. Accesso Diretto 404 - RISOLTO
**Problema**: `/editor/visual` dava 404, accessibile solo da Hub
**Soluzione**:
- Route `/dashboard` con `ensureAuthenticated` middleware
- Flow: Login → Dashboard → Editor
- Mantiene sia JWT da Hub che sessione locale

**Status**: ✅ COMPLETATO

### ✅ 3. Gruppi Linktree - RIDISEGNATO COMPLETAMENTE
**Problema Originale**: "il meccanismo dei gruppi è macchinoso... è da rifare e ripensare proprio dal punto di vista strutturale"

**Problema Specifico**:
- Usava campo testuale `group_title` (utente doveva digitare nome gruppo in ogni link)
- Gruppi non avevano effetto in anteprima o sito
- Nessuna gestione visuale

**Soluzione Architettonica**:
- ✅ Creata tabella `link_groups` relazionale
- ✅ Aggiunto campo `group_id` (FK) in `contact_links`
- ✅ UI visuale per gestione gruppi con design gradient
- ✅ Dropdown select invece di campo testo
- ✅ Gruppi funzionano correttamente in preview e sito

**Status**: ✅ COMPLETATO

---

## 🏗️ Architettura Gruppi - Prima vs Dopo

### ❌ Prima (Approccio Sbagliato)

```
contact_links
├── id
├── title_it
├── url
└── group_title TEXT  ← Utente digita "Nuovi Album" in ogni link
```

**Problemi**:
- Typo = gruppi duplicati ("Nuovi Album" vs "Nuovi album")
- Nessuna gestione centralizzata
- Impossibile riordinare gruppi
- Gruppi non funzionavano nel rendering

### ✅ Dopo (Architettura Corretta)

```
link_groups                    contact_links
├── id (PK)                    ├── id
├── name                       ├── title_it
├── category                   ├── url
├── order_index                └── group_id (FK) → link_groups.id
└── visible
```

**Vantaggi**:
- ✅ Gruppi creati centralmente
- ✅ Nomi consistenti (no typo)
- ✅ Riordinamento gruppi
- ✅ Toggle visibilità per gruppo
- ✅ Relazione one-to-many corretta

---

## 📦 File Modificati

### 1. `contact-admin/migrate-groups-architecture.js` (NUOVO)
**Cosa fa**: Script di migrazione database
- Crea tabella `link_groups`
- Aggiunge colonna `group_id` a `contact_links`
- Migra dati esistenti da `group_title` a `link_groups`
- Mostra summary delle operazioni

**Quando eseguirlo**: UNA SOLA VOLTA sul server dopo deploy

### 2. `contact-admin/routes/editorRoutes.js`
**Modifiche**:
- **GET /editor/visual**: Carica e passa `groups` al template
- **PUT /editor/link/:id**: Usa `group_id` invece di `group_title`
- **Nuove API aggiunte**:
  - `GET /editor/groups` - Lista tutti i gruppi
  - `POST /editor/group` - Crea nuovo gruppo
  - `PUT /editor/group/:id` - Aggiorna gruppo
  - `DELETE /editor/group/:id` - Elimina gruppo (ungroupa i link)
  - `POST /editor/groups/reorder` - Riordina gruppi
- **GET /editor/export**: Include `groups` nel backup JSON

### 3. `contact-admin/views/editor/visual-v2.ejs`
**Modifiche**:

**Vue.js Data**:
```javascript
data() {
  return {
    groups: <%- JSON.stringify(groups) %>,  // NUOVO
    showGroupManager: false,                 // NUOVO
    newGroupName: ''                         // NUOVO
    // ... esistenti
  }
}
```

**Nuova Sezione UI**: "Gestione Gruppi (Linktree-style)"
- Design gradient viola (visivamente distintivo)
- Input per creare nuovi gruppi
- Lista gruppi con inline editing
- Toggle visibilità per gruppo
- Pulsante elimina gruppo

**Campo Group Modificato**: Da text input a select dropdown
```html
<!-- PRIMA -->
<input type="text" v-model="link.group_title" placeholder="📁 Gruppo...">

<!-- DOPO -->
<select v-model="link.group_id" @change="saveLink(link)">
  <option :value="null">📂 Senza Gruppo</option>
  <option v-for="group in groups" :value="group.id">
    📁 {{ group.name }}
  </option>
</select>
```

**Nuovi Metodi Vue**:
- `createGroup()` - Crea gruppo via API
- `updateGroup(group)` - Aggiorna gruppo
- `deleteGroup(groupId)` - Elimina gruppo
- `loadGroups()` - Ricarica gruppi da server
- `getGroupName(groupId)` - Helper per risolvere ID → nome

**Metodo Aggiornato**:
```javascript
getGroupedLinks(category) {
  // PRIMA: Raggruppava per group_title (testo)
  // DOPO: Raggruppa per group_id, ordina per order_index
}
```

### 4. `contact-admin/views/dashboard.ejs` (NUOVO)
**Cosa fa**: Dashboard minimale con quick links
**Design**: Gradient cards con hover effects
**Links**: Visual Editor (primario), Settings, Export

### 5. `contact-admin/server.js`
**Modifiche**:
- Route `/dashboard` con `ensureAuthenticated`
- Root `/` redirect a `/dashboard` (invece di `/editor/visual`)

### 6. `contact-site/server.js`
**Modifiche**:
```javascript
// PRIMA: Leggeva group_title dal DB
groupKey = link.group_title || null;

// DOPO: Carica link_groups table e risolve group_id
const groups = db.prepare('SELECT * FROM link_groups WHERE visible = 1').all();
const group = groups.find(g => g.id === link.group_id);
groupKey = group ? group.name : null;
```

---

## 🚀 Deploy Sul Server

### Passo 1: Pull del Codice

```bash
cd ~/danielecamiz-site
git fetch origin
git checkout claude/project-review-011CUoMaULBEc6ErgbH4ZpUS
git pull origin claude/project-review-011CUoMaULBEc6ErgbH4ZpUS
```

### Passo 2: Verifica Commit

```bash
git log --oneline -5
# Dovresti vedere:
# 4192366 feat: complete groups architecture redesign with visual management
# 12822ef fix: resolve 404 errors and add group_title backend support
```

### Passo 3: IMPORTANTE - Esegui Migrazione Database

```bash
cd ~/danielecamiz-site/contact-admin
node migrate-groups-architecture.js
```

**Output atteso**:
```
🔄 Starting groups architecture migration...
📦 Creating link_groups table...
✅ link_groups table created
📦 Adding group_id column to contact_links...
✅ group_id column added

🔄 Migrating existing group_title data...
   No existing groups to migrate

📊 Database Summary:
   Groups: 0
   Links in groups: 0

✅ Groups architecture migration completed successfully!
```

**⚠️ NOTA**: Se hai già link con `group_title` popolati, lo script li migreràautomaticamente a gruppi relazionali.

### Passo 4: Riavvia Servizi PM2

```bash
pm2 restart contact-admin contact-site
```

### Passo 5: Verifica Servizi

```bash
pm2 status
pm2 logs contact-admin --lines 20
pm2 logs contact-site --lines 20
```

---

## ✅ Test Post-Deploy

### Test 1: Dashboard Accessibile

1. Apri browser: `https://contact-admin.tuodominio.com/dashboard`
2. ✅ Dovrebbe mostrare dashboard con 3 card
3. Click su "Visual Editor"
4. ✅ Dovrebbe aprire `/editor/visual`

### Test 2: Accesso Diretto

**Scenario A - Login Diretto**:
1. Apri: `https://contact-admin.tuodominio.com/`
2. Dovresti vedere login o essere rediretto a dashboard
3. ✅ Non dovrebbe dare 404

**Scenario B - Da Hub**:
1. Login ad Admin Hub
2. Click su "Contact Admin"
3. ✅ JWT dovrebbe autenticarti direttamente

### Test 3: Gruppi - Creazione

1. Vai su `/editor/visual`
2. Espandi sezione "📁 Gestione Gruppi"
3. Inserisci nome: "Nuovi Album"
4. Click "Crea"
5. ✅ Gruppo appare nella lista
6. ✅ Dropdown nei link highlight mostra il gruppo

### Test 4: Gruppi - Assegnazione Link

1. Nella sezione "⭐ In Evidenza"
2. Trova un link esistente
3. Apri dropdown sotto il titolo
4. Seleziona "📁 Nuovi Album"
5. ✅ Link si salva automaticamente
6. ✅ Nell'anteprima il link appare sotto "Nuovi Album"

### Test 5: Gruppi - Visualizzazione Sito

1. Apri sito pubblico: `https://contact.tuodominio.com/`
2. Scroll a sezione "In Evidenza"
3. ✅ Dovrebbe mostrare:
   ```
   Nuovi Album
   ┌─────────┐
   │  Link 1 │
   └─────────┘

   (links senza gruppo)
   ┌─────────┐
   │  Link 2 │
   └─────────┘
   ```

### Test 6: Gruppi - Editing

1. In `/editor/visual` → Gestione Gruppi
2. Modifica nome gruppo: "Nuovi Album" → "Latest Releases"
3. Blur/tab fuori dal campo
4. Ricarica anteprima
5. ✅ Nome gruppo aggiornato

### Test 7: Gruppi - Visibilità

1. In Gestione Gruppi, toggle OFF un gruppo
2. ✅ Nell'anteprima, il gruppo scompare
3. ✅ I link del gruppo rimangono visibili come "senza gruppo"
4. Toggle ON
5. ✅ Gruppo riappare

### Test 8: Gruppi - Eliminazione

1. Click 🗑️ su un gruppo
2. Conferma eliminazione
3. ✅ Gruppo sparisce
4. ✅ Link vengono spostati in "Senza Gruppo"
5. ✅ Nessun link viene cancellato

---

## 🎯 Come Usare i Gruppi (User Guide)

### Workflow Corretto

**1. Crea Gruppi Prima**
- Vai in "Gestione Gruppi"
- Crea tutti i gruppi che ti servono:
  - "Nuovi Album"
  - "Live Recordings"
  - "Video"
  - etc.

**2. Assegna Link ai Gruppi**
- Nella sezione "In Evidenza"
- Ogni link ha dropdown sotto il titolo
- Seleziona gruppo desiderato
- Salva automatico

**3. Riordina Gruppi (opzionale)**
- I gruppi appaiono nell'ordine di creazione
- Usa drag handle ☰ per riordinare (TODO: da implementare)

**4. Gestisci Visibilità**
- Toggle OFF = gruppo nascosto (link diventano "senza gruppo")
- Toggle ON = gruppo visibile

### Esempi Pratici

**Esempio 1: Organizzare Album per Anno**
```
Gruppi:
- "Album 2024"
- "Album 2023"
- "Album Storici"

Link:
- Mozart Symphonies Challenge → "Album 2024"
- Beethoven Piano Sonatas → "Album 2023"
- Bach Goldberg Variations → "Album Storici"
```

**Esempio 2: Separare Live vs Studio**
```
Gruppi:
- "🎥 Live Recordings"
- "🎵 Studio Albums"

Link:
- Live at Carnegie Hall → "🎥 Live Recordings"
- Studio Album 2024 → "🎵 Studio Albums"
```

---

## 🐛 Troubleshooting

### Problema: 404 su Dashboard

**Verifica 1 - Codice aggiornato**:
```bash
cd ~/danielecamiz-site
git log --oneline -1
# Dovrebbe mostrare: 12822ef fix: resolve 404 errors...
```

**Verifica 2 - PM2 riavviato**:
```bash
pm2 status
# contact-admin dovrebbe essere "online"
```

**Verifica 3 - File dashboard.ejs esiste**:
```bash
ls -la contact-admin/views/dashboard.ejs
# Dovrebbe esistere
```

### Problema: Gruppi Non Appaiono nel Dropdown

**Verifica 1 - Migrazione eseguita**:
```bash
cd ~/danielecamiz-site/cms/db
# Controlla se tabella link_groups esiste
# (usa DB browser o migration script)
```

**Verifica 2 - Gruppi creati**:
```bash
# Nel browser, apri console (F12)
# In /editor/visual, controlla:
console.log(app.groups)
# Dovrebbe mostrare array di gruppi
```

**Verifica 3 - API gruppi funzionante**:
```bash
# Nel browser, apri console e testa:
fetch('/editor/groups').then(r => r.json()).then(console.log)
# Dovrebbe mostrare: { success: true, groups: [...] }
```

### Problema: Gruppi Non Appaiono sul Sito Pubblico

**Verifica 1 - Link assegnati a gruppi**:
```bash
# Nel browser, /editor/visual
# Controlla che i link abbiano group_id impostato
```

**Verifica 2 - Sito riavviato**:
```bash
pm2 restart contact-site
```

**Verifica 3 - Log sito**:
```bash
pm2 logs contact-site --lines 50
# Cerca errori SQL o "group" keyword
```

### Problema: Database Corrupted

**Sintomo**: `SqliteError: malformed database schema`

**Fix**:
```bash
cd ~/danielecamiz-site/cms/db
rm -f *.sqlite-shm *.sqlite-wal
pm2 restart contact-admin contact-site
```

---

## 📊 Struttura Dati Finale

### Tabella: link_groups

| id | name | category | order_index | visible | created_at |
|----|------|----------|-------------|---------|------------|
| 1  | Nuovi Album | highlight | 1 | 1 | 2024-... |
| 2  | Live | highlight | 2 | 1 | 2024-... |

### Tabella: contact_links

| id | title_it | url | category | group_id | visible |
|----|----------|-----|----------|----------|---------|
| 10 | Mozart Challenge | https://... | highlight | 1 | 1 |
| 11 | Live Rome | https://... | highlight | 2 | 1 |
| 12 | Instagram | https://... | social | NULL | 1 |

### Rendering Logico

```javascript
// Backend (contact-site/server.js)
links.forEach(link => {
  // Resolve group_id → group_name
  let groupName = null;
  if (link.group_id) {
    const group = groups.find(g => g.id === link.group_id);
    groupName = group ? group.name : null;
  }

  // Group by resolved name
  highlightGroups[groupName || null].push(link);
});

// Frontend (contact.ejs)
highlightGroups = {
  "Nuovi Album": [ { text: "Mozart Challenge", ... } ],
  "Live": [ { text: "Live Rome", ... } ],
  null: [ { text: "Ungrouped Link", ... } ]  // Senza gruppo
}
```

---

## 🎉 Risultato Finale

### User Experience

✅ **Dashboard**: Landing page moderna con quick access
✅ **Accesso Diretto**: Login → Dashboard → Editor (no 404)
✅ **Gestione Gruppi**: UI visuale collapsibile con gradient design
✅ **Creazione Gruppi**: Input + pulsante "Crea"
✅ **Assegnazione Link**: Dropdown select (no typing!)
✅ **Editing Gruppi**: Inline editing con auto-save
✅ **Visibilità Gruppi**: Toggle per nascondere/mostrare
✅ **Eliminazione Gruppi**: Pulsante con conferma (ungroupa link)
✅ **Anteprima Live**: Gruppi visibili in real-time
✅ **Sito Pubblico**: Gruppi renderizzati con stile Linktree

### Developer Experience

✅ **Database Relazionale**: Architettura corretta con FK
✅ **RESTful API**: Endpoint chiari per CRUD gruppi
✅ **Vue.js Reactive**: Gestione stato con v-model
✅ **Migration Script**: Setup database automatizzato
✅ **Type Safety**: group_id come INTEGER (FK)
✅ **Cascade Logic**: DELETE gruppo → links.group_id = NULL

### Performance

✅ **Single Query**: Carica tutti i gruppi in una query
✅ **Client-Side Grouping**: Raggruppamento in-memory
✅ **Auto-Save**: Salvataggio incrementale (no perdita dati)
✅ **Optimistic UI**: Aggiornamenti immediati nell'editor

---

## 📝 Note Importanti

### ⚠️ Breaking Changes

1. **Database Schema**: Richiede migrazione (script fornito)
2. **API Cambiata**: `group_title` → `group_id` (gestito automaticamente)
3. **Export Format**: Backup JSON ora include tabella `groups`

### 🔒 Sicurezza

- Tutti gli endpoint gruppi richiedono autenticazione (`ensureAuthenticated`)
- Input validato (nome gruppo non vuoto)
- Cascading delete sicuro (ungroupa link invece di cancellarli)

### 🚀 Prossimi Step (Opzionali)

- [ ] Drag & drop per riordinare gruppi (Sortable.js)
- [ ] Drag & drop per spostare link tra gruppi
- [ ] Bulk assign: seleziona multipli link → assegna a gruppo
- [ ] Group statistics: mostra numero link per gruppo
- [ ] Group templates: crea set predefiniti di gruppi

---

## 📞 Support

Se qualcosa non funziona:

1. **Controlla log PM2**: `pm2 logs contact-admin --lines 50`
2. **Controlla browser console**: F12 → Console tab
3. **Verifica database**: Controlla che migrazione sia completata
4. **Test API manualmente**: Usa browser console per fetch('/editor/groups')
5. **Riavvia tutto**: `pm2 restart all`

---

## 🎯 Checklist Deploy

- [ ] Pull codice da branch `claude/project-review-011CUoMaULBEc6ErgbH4ZpUS`
- [ ] Eseguire `node migrate-groups-architecture.js`
- [ ] Riavviare PM2: `pm2 restart contact-admin contact-site`
- [ ] Test Dashboard accessibile (no 404)
- [ ] Test Accesso diretto `/editor/visual` (no 404)
- [ ] Test Gestione Gruppi visibile nell'editor
- [ ] Test Creazione gruppo funzionante
- [ ] Test Assegnazione link a gruppo funzionante
- [ ] Test Gruppi appaiono nell'anteprima
- [ ] Test Gruppi appaiono nel sito pubblico
- [ ] Test Editing nome gruppo funzionante
- [ ] Test Toggle visibilità gruppo funzionante
- [ ] Test Eliminazione gruppo funzionante
- [ ] Backup database: `cp cms/db/main.sqlite cms/db/main.sqlite.backup-$(date +%Y%m%d)`

✅ **Deploy Completato!**

# CloudinaryManager - Sistema Unificato di Gestione Media

Sistema completo per gestire upload, browse, eliminazione e organizzazione di immagini su Cloudinary.

## 📦 Inclusione nei Pannelli

Per usare CloudinaryManager in un pannello admin, includere questi file nell'ordine:

```html
<!-- Cloudinary Manager - Sistema UI -->
<script src="/shared/cloudinary-manager/ui-notifications.js"></script>
<script src="/shared/cloudinary-manager/ui-loading.js"></script>
<script src="/shared/cloudinary-manager/client.js"></script>
```

**IMPORTANTE:** L'ordine è fondamentale! `client.js` dipende dagli altri due.

## 🎯 API Completa

### Inizializzazione (Opzionale)
Per usare un account Cloudinary diverso dal default:

```javascript
CloudinaryManager.init({
  cloudName: 'altro-account',
  defaultFolder: 'custom-folder',
  defaultPreset: 'custom-preset',
  apiPrefix: '/api/cloudinary'
});
```

### Upload Immagini

```javascript
// Upload diretto
const result = await CloudinaryManager.upload(file, {
  preset: 'gallery_unsigned',
  folder: 'danielecamiz/news'
});

if (result.success) {
  console.log(result.url, result.publicId);
}
```

### Dialog Picker Unificato (3-in-1)

```javascript
CloudinaryManager.showImageDialog((result) => {
  console.log('Immagine selezionata:', result.url, result.publicId);
}, {
  folder: 'danielecamiz/news',
  preset: 'gallery_unsigned'
});
```

Il dialog include 3 metodi:
1. **Sfoglia Cloudinary** - Browse immagini esistenti con breadcrumb navigation
2. **Incolla URL** - Usa URL o public_id esistente
3. **Carica Nuovo** - Upload da computer o drag&drop

### Gestione Cartelle

```javascript
// Crea cartella
CloudinaryManager.createFolder('danielecamiz/news/2025', (result) => {
  if (result.success) console.log('Cartella creata!');
});

// Prompt user-friendly per creare cartella
CloudinaryManager.promptCreateFolder('danielecamiz/news', (result) => {
  // callback dopo creazione
});

// Sposta immagine
CloudinaryManager.moveImage('danielecamiz/news/img1', 'danielecamiz/archive', (result) => {
  if (result.success) console.log('Immagine spostata!');
});
```

### ✨ NUOVO: Eliminazione Immagini

```javascript
CloudinaryManager.deleteImage('danielecamiz/news/img1', (result) => {
  if (result.success) {
    console.log('Immagine eliminata definitivamente');
  }
});
```

**Nota:** L'eliminazione è **definitiva** e invalida la cache CDN.

### Trasformazioni URL

```javascript
const url = CloudinaryManager.getTransformedUrl('danielecamiz/news/img1', {
  width: 800,
  height: 600,
  crop: 'fill',
  quality: 'auto',
  gravity: 'face'
});
```

### Integrazione TinyMCE

```javascript
// Inserisce immagine nell'editor attivo
CloudinaryManager.insertIntoEditor(imageUrl);
```

## 🎨 Sistema Notifiche

Incluso automaticamente con `ui-notifications.js`:

```javascript
// Notifiche toast
CloudinaryNotifications.success('Upload completato!');
CloudinaryNotifications.error('Errore upload');
CloudinaryNotifications.warning('Attenzione!');
CloudinaryNotifications.info('Info message');

// Loading permanente (devi chiuderlo manualmente)
const loadingId = CloudinaryNotifications.loading('Caricamento...');
CloudinaryNotifications.hide(loadingId);

// Clear all
CloudinaryNotifications.clear();
```

## ⏳ Sistema Loading

Incluso automaticamente con `ui-loading.js`:

```javascript
// Spinner inline
const spinner = CloudinaryLoading.spinner({ size: 32, color: '#d4af37' });
document.body.appendChild(spinner);

// Overlay fullscreen
CloudinaryLoading.overlay.show('Caricamento...');
CloudinaryLoading.overlay.hide();

// Progress bar
const { element, update } = CloudinaryLoading.progressBar({ height: 4, color: '#d4af37' });
document.body.appendChild(element);
update(50); // 50%

// Loading inline in un elemento
CloudinaryLoading.inline(targetElement, 'Caricamento immagini...');

// Skeleton loader
const skeleton = CloudinaryLoading.skeleton({ width: '100%', height: '150px' });
```

## 🗂️ Struttura Cartelle Cloudinary

Convenzione standard per tutti i pannelli:

```
danielecamiz/
├── news/
│   └── 2025/
├── press/
│   └── 2025/
├── gallery/
│   ├── photos/
│   ├── videos/
│   └── audio/
├── bio/
│   └── presskit/
├── concerts/
│   └── 2025/
└── events/
    └── 2025/
```

Le cartelle anno vengono create automaticamente dall'upload.

## 🔐 Backend Routes

Il sistema richiede questi endpoint Express (già configurati in `routes.js`):

- `GET /api/cloudinary/images` - Lista immagini
- `GET /api/cloudinary/search` - Cerca immagini
- `GET /api/cloudinary/folders` - Lista folder root
- `GET /api/cloudinary/subfolders` - Lista subfolder
- `POST /api/cloudinary/create-folder` - Crea cartella
- `POST /api/cloudinary/move-image` - Sposta immagine
- `DELETE /api/cloudinary/delete-image` - ✨ NUOVO: Elimina immagine

Per configurare le routes nel server:

```javascript
import cloudinaryRoutes from './shared/cloudinary-manager/routes.js';
app.use('/api/cloudinary', cloudinaryRoutes);
```

## ✨ Funzionalità Implementate

- ✅ Upload diretto a Cloudinary
- ✅ Dialog picker 3-in-1 (browse/URL/upload)
- ✅ Browse immagini con navigazione cartelle
- ✅ Breadcrumb navigation
- ✅ Ricerca locale live
- ✅ Creazione cartelle
- ✅ Spostamento immagini
- ✅ **Eliminazione immagini** (NUOVO!)
- ✅ Trasformazioni URL
- ✅ Multi-account support
- ✅ Notifiche toast eleganti (NUOVO!)
- ✅ Loading states con spinner (NUOVO!)
- ✅ Integrazione TinyMCE

## 🚧 Funzionalità in Roadmap

- ⏳ Selezione multipla
- ⏳ Upload multiplo con progress bar
- ⏳ Gestione tag
- ⏳ Filtri e ordinamento
- ⏳ Context menu (right-click)
- ⏳ Batch operations
- ⏳ Video/audio support

## 🐛 Troubleshooting

### CloudinaryManager non definito
Verifica che i file siano inclusi nell'ordine corretto:
1. `ui-notifications.js`
2. `ui-loading.js`
3. `client.js`

### Notifiche non appaiono
Controlla che `ui-notifications.js` sia caricato prima di `client.js`.

### Delete non funziona
Verifica che il server abbia la route `DELETE /api/cloudinary/delete-image` configurata.

## 📝 Changelog

### v2.0.0 (2025-11-15)
- ✨ **NUOVO:** Sistema notifiche toast (ui-notifications.js)
- ✨ **NUOVO:** Sistema loading/spinner (ui-loading.js)
- ✨ **NUOVO:** Eliminazione immagini con conferma
- ✨ **NUOVO:** Bottone delete con hover effect
- 🔧 Sostituzione di tutti gli `alert()` con notifiche toast
- 🔧 Loading states durante fetch immagini
- 🔧 Spinner durante upload

### v1.0.0 (2024-11-14)
- Versione iniziale con upload, browse, folders, move

---

**Sviluppato da:** Daniele Camiz Website Admin System
**Ultima modifica:** 2025-11-15

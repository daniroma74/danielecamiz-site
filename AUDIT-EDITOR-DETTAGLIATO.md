# 🔍 AUDIT DETTAGLIATO: Editor Cloudinary e TinyMCE

**Data**: 2025-11-15
**Obiettivo**: Analizzare implementazioni attuali per standardizzazione

---

## 1️⃣ NEWS ADMIN ✅ ANALIZZATO

### 📄 File Analizzato
- `/news-admin/views/news-edit.ejs` (487 righe)
- `/news-admin/public/js/news-editor.js`

### TinyMCE Implementation

**✅ USO CORRETTO SHARED EDITOR**
```javascript
// Riga 475-483 di news-edit.ejs
window.SharedEditor.init('textarea.editor', 'blog', {
  height: 600,
  getUploadOptions: () => ({
    preset: 'gallery_unsigned',
    folder: 'danielecamiz/gallery'  // ⚠️ Dovrebbe essere 'danielecamiz/news'
  })
});
```

**Dettagli:**
- ✅ Usa `/shared/config/editor-config.js`
- ✅ Preset: `'blog'` (corretto per articoli)
- ✅ Upload immagini via Cloudinary integrato
- ⚠️ Folder sbagliata (usa 'gallery' invece di 'news')
- ✅ Height: 600px
- ✅ Due editor: `#content_it` e `#content_en`

**Toolbar TinyMCE** (da preset 'blog'):
```
undo redo | formatselect | bold italic underline |
alignleft aligncenter alignright | bullist numlist |
link image | removeformat | table | code | help | cloudinaryImage
```

### Cloudinary Implementation

**CloudinaryManager** (NOT usando cloudinary-widget.js condiviso!)

**Metodo upload cover:**
```javascript
// Riga 146-152 di news-editor.js
window.CloudinaryManager.showImageDialog((result) => {
  document.getElementById('cover_image').value = result.url;
  displayCoverPreview(result.url);
}, {
  preset: 'poster_horizontal_unsigned',
  folder: 'danielecamiz/news'  // ✅ Folder corretta
});
```

**Metodo upload gallery:**
```javascript
// Riga 161-169 di news-editor.js
window.CloudinaryManager.showImageDialog((result) => {
  const currentGallery = JSON.parse(document.getElementById('gallery_images')?.value || '[]');
  const updatedGallery = [...currentGallery, result.url];
  document.getElementById('gallery_images').value = JSON.stringify(updatedGallery);
  updateGalleryPreview(updatedGallery);
}, {
  preset: 'gallery_unsigned',
  folder: 'danielecamiz/news'  // ✅ Folder corretta
});
```

**Preset Usati:**
- `poster_horizontal_unsigned` - per cover image (1920x1080)
- `gallery_unsigned` - per gallery images

**Script Caricati:**
```html
<!-- Riga 18 -->
<script src="/shared/cloudinary-manager/client.js"></script>
```

⚠️ **NON USA** `/shared/js/cloudinary-widget.js`!
Usa invece un `CloudinaryManager` custom (`/shared/cloudinary-manager/client.js`)

### UI/UX

**Upload Bottoni:**
- 📷 Cover: Click su preview placeholder
- ➕ Gallery: Bottone "Aggiungi Immagini"

**Stile Upload Area:**
```css
.image-upload-area .image-preview {
  cursor: pointer;
  border: 2px dashed #ddd;
  border-radius: 8px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Preview:**
- Cover: Single image con bottone remove (✕)
- Gallery: Grid di immagini con remove su ogni item

### Pattern Identificati

**✅ BUONI:**
1. Usa `SharedEditor.init()` per TinyMCE
2. Preset separati per cover vs gallery
3. Folder Cloudinary organizzate (`danielecamiz/news`)
4. Preview immagini immediate
5. Tab-based editor (Contenuto, Media, SEO, Social, Settings)
6. Gestione errori con alert

**⚠️ DA MIGLIORARE:**
1. Non usa `/shared/js/cloudinary-widget.js` condiviso
2. Usa `CloudinaryManager` diverso (dove è definito?)
3. TinyMCE folder upload sbagliata ('gallery' vs 'news')
4. Alert troppo semplici (serve notification system)
5. Nessun loading state visibile
6. Preview non ha crop/edit

---

## 2️⃣ PRESS ADMIN (TODO)

### 📄 File da Analizzare
- `/press-admin/views/pages/article-edit.ejs`
- `/press-admin/public/js/...`

---

## 3️⃣ NEWSLETTER SERVICE (TODO)

### 📄 File da Analizzare
- `/newsletter-service/views/pages/campaign-editor.ejs`
- `/newsletter-service/public/js/...`

---

## 4️⃣ BIO ADMIN (TODO)

### 📄 File da Analizzare
- `/bio-admin/views/pages/biography.ejs`
- `/bio-admin/views/pages/curriculum.ejs`
- `/bio-admin/views/pages/story.ejs`
- `/bio-admin/views/pages/presskit.ejs`

---

## 5️⃣ CONCERTS ADMIN (TODO)

### 📄 File da Analizzare
- `/concerts-admin/views/pages/concert-editor.ejs`

---

## 6️⃣ LANDING/EVENTS ADMIN (TODO)

### 📄 File da Analizzare
- `/landing/views/pages/admin/editor.ejs`

---

## 7️⃣ GALLERY ADMIN (TODO)

### 📄 File da Analizzare
- `/gallery-admin/views/pages/photos.ejs`
- `/gallery-admin/views/pages/images.ejs`
- `/gallery-admin/views/pages/collections.ejs`

---

## 📊 RIEPILOGO PROGRESSIVO

### Pannelli Analizzati: 1/7

| Pannello | TinyMCE | Cloudinary | Usa Shared? | Note |
|----------|---------|------------|-------------|------|
| **News Admin** | ✅ SharedEditor | ⚠️ CloudinaryManager custom | Parziale | TinyMCE OK, Cloudinary custom |
| Press Admin | ❓ | ❓ | ❓ | TODO |
| Newsletter | ❓ | ❓ | ❓ | TODO |
| Bio Admin | ❓ | ❓ | ❓ | TODO |
| Concerts | ❓ | ❓ | ❓ | TODO |
| Landing | ❓ | ❓ | ❓ | TODO |
| Gallery | ❓ | ❓ | ❓ | TODO |

---

## 🔑 SCOPERTE CHIAVE

### CloudinaryManager vs cloudinary-widget.js

**Esistono DUE sistemi Cloudinary:**

1. **`/shared/cloudinary-manager/client.js`** (custom, usato da News)
   - API: `CloudinaryManager.showImageDialog(callback, options)`
   - API: `CloudinaryManager.upload(file, options)`

2. **`/shared/js/cloudinary-widget.js`** (widget standard)
   - API: `createUnifiedCloudinaryWidget(config, onSuccess, options)`
   - API: `openCloudinaryPicker(config, onSuccess, options)`

❓ **DOMANDA CRITICA**: Quale dei due dovremmo standardizzare?

**Opzioni:**
- A) Migrare tutti a `cloudinary-widget.js` (più standard)
- B) Migrare tutti a `CloudinaryManager` (attualmente più usato?)
- C) Unificare i due in un sistema unico

### TinyMCE Preset

**Preset definiti in `/shared/config/editor-config.js`:**
- `default` - Base
- `newsletter` - Light, pulito
- `concerts` - Dark mode
- `blog` - Full featured

**Servono altri preset?**
- `bio` - Per biografia/curriculum?
- `events` - Per landing page?

---

## 🎯 PROSSIMI PASSI

1. ✅ Completato: News Admin audit
2. ⏳ In corso: Analizzare CloudinaryManager implementation
3. 📋 TODO: Audit Press Admin
4. 📋 TODO: Audit Newsletter Service
5. 📋 TODO: Audit Bio Admin
6. 📋 TODO: Audit Concerts Admin
7. 📋 TODO: Audit Landing/Events
8. 📋 TODO: Audit Gallery Admin

---

**Ultimo aggiornamento**: 2025-11-15 20:45
**Analizzato da**: Claude Code

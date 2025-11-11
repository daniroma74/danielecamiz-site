# 📸 Configurazione Upload Preset Cloudinary per Coro Raro

## 🎯 Upload Preset da Creare

Vai su: **https://console.cloudinary.com/settings/upload**

Crea questi 4 preset unsigned:

---

### 1️⃣ **cororaro_concerts** (Locandine Concerti)

**Settings:**
- **Preset name**: `cororaro_concerts`
- **Signing Mode**: ✅ **Unsigned**
- **Folder**: `cororaro/concerts`
- **Use filename as Public ID**: ❌ No
- **Unique filename**: ✅ Yes
- **Overwrite**: ❌ No

**Transformations:**
- **Quality**: Auto
- **Format**: Auto
- **Width**: 1600px (limit)
- **Crop**: Limit

**Uso**: Locandine e poster dei concerti

---

### 2️⃣ **cororaro_gallery** (Galleria Foto)

**Settings:**
- **Preset name**: `cororaro_gallery`
- **Signing Mode**: ✅ **Unsigned**
- **Folder**: `cororaro/gallery`
- **Use filename as Public ID**: ❌ No
- **Unique filename**: ✅ Yes
- **Overwrite**: ❌ No

**Transformations:**
- **Quality**: Auto
- **Format**: Auto
- **Width**: 2000px (limit)
- **Crop**: Limit

**Uso**: Foto di concerti, prove, eventi, backstage

---

### 3️⃣ **cororaro_team** (Foto Membri Coro)

**Settings:**
- **Preset name**: `cororaro_team`
- **Signing Mode**: ✅ **Unsigned**
- **Folder**: `cororaro/team`
- **Use filename as Public ID**: ❌ No
- **Unique filename**: ✅ Yes
- **Overwrite**: ❌ No

**Transformations:**
- **Quality**: Auto
- **Format**: Auto
- **Width**: 800px
- **Height**: 800px
- **Crop**: Fill
- **Gravity**: Faces (Auto)

**Uso**: Foto profilo di direttori, coristi, staff

---

### 4️⃣ **cororaro_general** (Immagini Generali)

**Settings:**
- **Preset name**: `cororaro_general`
- **Signing Mode**: ✅ **Unsigned**
- **Folder**: `cororaro/general`
- **Use filename as Public ID**: ❌ No
- **Unique filename**: ✅ Yes
- **Overwrite**: ❌ No

**Transformations:**
- **Quality**: Auto
- **Format**: Auto
- **Width**: 1200px (limit)
- **Crop**: Limit

**Uso**: Logo coro, banner sito, immagini sezioni "Chi siamo", "Storia", foto sale prove/location, loghi sponsor

---

## 📁 Struttura Cartelle su Cloudinary

Dopo aver creato i preset, la struttura sarà:

```
cororaro/
├── concerts/
│   ├── 2024/
│   └── 2025/
├── gallery/
│   ├── 2024/
│   └── 2025/
├── team/
│   ├── direttori/
│   ├── coristi/
│   └── staff/
└── general/
    ├── logo/
    ├── banner/
    └── locations/
```

Le sottocartelle vengono create automaticamente quando carichi file.

---

## ✅ Come Creare un Preset (Passo-Passo)

1. Vai su https://console.cloudinary.com/settings/upload
2. Click su **"Add upload preset"** (in alto a destra)
3. Inserisci il nome (es: `cororaro_concerts`)
4. **Signing Mode**: Seleziona "Unsigned"
5. **Folder**: Inserisci `cororaro/concerts`
6. Scorri giù fino a **"Edit"** sotto "Eager transformations"
7. Click **"+ Add eager transformation"**
8. Imposta:
   - Width: 1600 (o come da tabella sopra)
   - Crop: limit
   - Quality: auto
   - Format: auto
9. Click **"Save"**
10. Ripeti per tutti gli altri 3 preset

---

## 🔧 Verifica Configurazione

Dopo aver creato i preset, verifica su:
**https://console.cloudinary.com/settings/upload**

Dovresti vedere tutti e 4 i preset nella lista con badge **"Unsigned"**.

---

## 🚀 Utilizzo nel Codice

I preset sono già configurati in `/public/js/cloudinary-config.js`:

```javascript
const CORO_RARO_PRESETS = {
  concerts: {
    preset: 'cororaro_concerts',
    folder: 'cororaro/concerts'
  },
  gallery: {
    preset: 'cororaro_gallery',
    folder: 'cororaro/gallery'
  },
  team: {
    preset: 'cororaro_team',
    folder: 'cororaro/team'
  },
  general: {
    preset: 'cororaro_general',
    folder: 'cororaro/general'
  }
};
```

Per usarlo nei form admin:

```javascript
// Esempio: Upload locandina concerto
CloudinaryManager.showImageDialog((result) => {
  console.log('Immagine caricata:', result.url);
}, {
  preset: 'cororaro_concerts',
  folder: 'cororaro/concerts'
});

// Esempio: Upload foto membro coro
CloudinaryManager.showImageDialog((result) => {
  console.log('Foto membro:', result.url);
}, {
  preset: 'cororaro_team',
  folder: 'cororaro/team'
});

// Esempio: Upload logo/banner
CloudinaryManager.showImageDialog((result) => {
  console.log('Logo caricato:', result.url);
}, {
  preset: 'cororaro_general',
  folder: 'cororaro/general'
});
```

---

## 📝 Note Importanti

- ✅ **Unsigned preset** = Nessuna firma richiesta lato client
- ✅ **Quality Auto** = Cloudinary ottimizza automaticamente
- ✅ **Format Auto** = Converte in WebP quando il browser lo supporta
- ✅ **Unique filename** = Previene sovrascritture accidentali
- ⚠️ **Non condividere** i preset signed (se ne crei)
- ⚠️ Le credenziali API (key/secret) sono nel file `.env` (mai commitare!)

---

## 🎨 Esempio Trasformazioni

Cloudinary genera automaticamente:
- **Originale**: `https://res.cloudinary.com/dbxmszhyl/image/upload/cororaro/concerts/abc123.jpg`
- **Ottimizzato**: `https://res.cloudinary.com/dbxmszhyl/image/upload/q_auto,f_auto/cororaro/concerts/abc123.jpg`
- **Thumbnail**: `https://res.cloudinary.com/dbxmszhyl/image/upload/w_200,h_200,c_fill/cororaro/concerts/abc123.jpg`

Tutto gestito automaticamente dal sistema! 🎉

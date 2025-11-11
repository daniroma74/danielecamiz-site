# 📸 Configurazione Upload Preset Cloudinary per Coro Raro

## 🎯 Upload Preset da Creare

Vai su: **https://console.cloudinary.com/settings/upload**

Crea questi 5 preset unsigned:

---

### 1️⃣ **cororaro_repertoire** (Copertine Brani)

**Settings:**
- **Preset name**: `cororaro_repertoire`
- **Signing Mode**: ✅ **Unsigned**
- **Folder**: `cororaro/repertoire`
- **Use filename as Public ID**: ❌ No
- **Unique filename**: ✅ Yes
- **Overwrite**: ❌ No

**Transformations:**
- **Quality**: Auto
- **Format**: Auto
- **Width**: 1200px (limit)
- **Crop**: Limit

**Uso**: Immagini copertina per i brani del repertorio

---

### 2️⃣ **cororaro_concerts** (Locandine Concerti)

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

### 3️⃣ **cororaro_gallery** (Galleria Foto)

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

**Uso**: Foto della galleria eventi/concerti

---

### 4️⃣ **cororaro_news** (Immagini News/Blog)

**Settings:**
- **Preset name**: `cororaro_news`
- **Signing Mode**: ✅ **Unsigned**
- **Folder**: `cororaro/news`
- **Use filename as Public ID**: ❌ No
- **Unique filename**: ✅ Yes
- **Overwrite**: ❌ No

**Transformations:**
- **Quality**: Auto
- **Format**: Auto
- **Width**: 1200px (limit)
- **Crop**: Limit

**Uso**: Immagini per articoli/news/blog

---

### 5️⃣ **cororaro_team** (Foto Membri Coro)

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

**Uso**: Foto profilo membri del coro

---

## 📁 Struttura Cartelle su Cloudinary

Dopo aver creato i preset, la struttura sarà:

```
cororaro/
├── repertoire/
│   ├── 2024/
│   └── 2025/
├── concerts/
│   ├── 2024/
│   └── 2025/
├── gallery/
│   ├── 2024/
│   └── 2025/
├── news/
│   ├── 2024/
│   └── 2025/
└── team/
```

Le sottocartelle per anno vengono create automaticamente dal sistema quando carichi file.

---

## ✅ Come Creare un Preset (Passo-Passo)

1. Vai su https://console.cloudinary.com/settings/upload
2. Click su **"Add upload preset"** (in alto a destra)
3. Inserisci il nome (es: `cororaro_repertoire`)
4. **Signing Mode**: Seleziona "Unsigned"
5. **Folder**: Inserisci `cororaro/repertoire`
6. Scorri giù fino a **"Edit"** sotto "Eager transformations"
7. Click **"+ Add eager transformation"**
8. Imposta:
   - Width: 1200 (o come da tabella sopra)
   - Crop: limit
   - Quality: auto
   - Format: auto
9. Click **"Save"**
10. Ripeti per tutti gli altri preset

---

## 🔧 Verifica Configurazione

Dopo aver creato i preset, verifica su:
**https://console.cloudinary.com/settings/upload**

Dovresti vedere tutti e 5 i preset nella lista con badge **"Unsigned"**.

---

## 🚀 Utilizzo nel Codice

I preset sono già configurati in `/public/js/cloudinary-config.js`:

```javascript
const CORO_RARO_PRESETS = {
  repertoire: {
    preset: 'cororaro_repertoire',
    folder: 'cororaro/repertoire'
  },
  concerts: {
    preset: 'cororaro_concerts',
    folder: 'cororaro/concerts'
  },
  gallery: {
    preset: 'cororaro_gallery',
    folder: 'cororaro/gallery'
  },
  news: {
    preset: 'cororaro_news',
    folder: 'cororaro/news'
  },
  team: {
    preset: 'cororaro_team',
    folder: 'cororaro/team'
  }
};
```

Per usarlo nei form admin:

```javascript
// Esempio: Upload immagine concerto
CloudinaryManager.showImageDialog((result) => {
  console.log('Immagine caricata:', result.url);
}, {
  preset: 'cororaro_concerts',
  folder: 'cororaro/concerts'
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

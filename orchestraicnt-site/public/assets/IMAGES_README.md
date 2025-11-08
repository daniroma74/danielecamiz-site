# 📸 Guida Immagini Orchestra ICNT

Questa cartella contiene tutte le immagini necessarie per il sito.

---

## 🖼️ Immagini Richieste

### 1. Logo
**File:** `images/logo.png`
- **Dimensioni:** 500px larghezza (altezza proporzionale)
- **Formato:** PNG con trasparenza
- **Peso:** < 50KB
- **Uso:** Navbar, footer, social sharing

### 2. Hero Image
**File:** `images/hero-orchestra.jpg`
- **Dimensioni:** 1920x1080px (Full HD)
- **Formato:** JPG ottimizzato
- **Peso:** < 200KB
- **Uso:** Immagine principale homepage
- **Suggerimenti:**
  - Orchestra in concerto
  - Angolazione dal pubblico o dal palco
  - Illuminazione drammatica
  - Alta qualità ma compressa

### 3. Foto Gruppo
**File:** `images/orchestra-group.jpg`
- **Dimensioni:** 1200x800px
- **Formato:** JPG ottimizzato
- **Peso:** < 150KB
- **Uso:** Sezione "Chi Siamo"
- **Suggerimenti:**
  - Tutti i musicisti insieme
  - Professionale ma amichevole
  - Buona illuminazione

### 4. Favicon
**File:** `favicon.ico`
- **Dimensioni:** 32x32px, 16x16px
- **Formato:** ICO multisize
- **Uso:** Tab browser
- **Tool:** https://realfavicongenerator.net/

---

## 🎬 Video/Media

I video sono embedded da YouTube, quindi non servono file locali.

**Cosa fare:**
1. Carica video su YouTube
2. Copia l'ID del video (parte dopo `v=` nell'URL)
3. Sostituisci in `index.html`:

```html
<!-- Cerca questa parte -->
<iframe src="https://www.youtube.com/embed/TUO_ID_VIDEO"></iframe>
```

---

## 🛠️ Ottimizzazione Immagini

### Tool Online
- **TinyPNG**: https://tinypng.com/
- **Squoosh**: https://squoosh.app/
- **ImageOptim**: https://imageoptim.com/ (Mac)

### Comandi CLI
```bash
# ImageMagick - resize
convert input.jpg -resize 1920x1080^ -gravity center -extent 1920x1080 output.jpg

# ImageMagick - compress
convert input.jpg -quality 85 -strip output.jpg

# WebP conversion
cwebp -q 80 input.jpg -o output.webp
```

### Script Node.js
```javascript
// sharp package
const sharp = require('sharp');

sharp('input.jpg')
  .resize(1920, 1080, { fit: 'cover' })
  .jpeg({ quality: 85, progressive: true })
  .toFile('output.jpg');
```

---

## 📐 Dimensioni Consigliate

| Uso | Dimensioni | Peso Max | Formato |
|-----|------------|----------|---------|
| Logo | 500x auto | 50KB | PNG |
| Hero | 1920x1080 | 200KB | JPG |
| Foto gruppo | 1200x800 | 150KB | JPG |
| Gallery | 800x600 | 100KB | JPG |
| Thumbnail | 400x300 | 50KB | JPG |
| Favicon | 32x32 | 5KB | ICO |

---

## 🎨 Linee Guida Foto

### Stile Generale
- ✅ Professionale ma accogliente
- ✅ Colori vivaci (rosso del logo)
- ✅ Buona illuminazione naturale/artificiale
- ✅ Nitide, alta risoluzione
- ❌ Evitare foto sfocate o pixelate
- ❌ Evitare watermark visibili

### Cosa Fotografare
1. **Orchestra completa** in concerto
2. **Sezioni** (archi, fiati, percussioni)
3. **Direttore** d'orchestra
4. **Pubblico** durante concerti
5. **Prove** e backstage
6. **Sala concerti** vuota/piena
7. **Close-up strumenti**
8. **Momenti candidi** tra musicisti

### Fotografi
Se possibile, ingaggia un fotografo professionista per:
- Foto ufficiali orchestra
- Concerti importanti
- Materiale promozionale

---

## 🔄 Aggiornamenti

Aggiorna regolarmente le immagini:
- Dopo ogni concerto importante
- Cambio stagione
- Nuovi membri orchestra
- Eventi speciali

---

## 📝 Checklist

- [ ] Logo PNG trasparente caricato
- [ ] Hero image ottimizzata
- [ ] Foto gruppo attuale
- [ ] Favicon generato e caricato
- [ ] Tutte le immagini < peso massimo
- [ ] Formati corretti (PNG/JPG)
- [ ] Alt text aggiunto in HTML
- [ ] Test su dispositivi mobili

---

## 🆘 Supporto

Per aiuto con le immagini:
- Editing: GIMP (gratis), Photoshop
- Batch processing: XnConvert, ImageMagick
- Online: Photopea.com (Photoshop-like gratis)

---

**Nota:** Tutte le immagini devono rispettare il copyright.
Usa solo foto di proprietà dell'orchestra o con licenza appropriata.

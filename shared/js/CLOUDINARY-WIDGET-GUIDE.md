# Guida all'uso del Widget Cloudinary Unificato

## Panoramica

Il widget unificato (`/shared/js/cloudinary-widget.js`) permette di:
- ✅ **Uploadare nuove immagini** (da computer, URL o camera)
- ✅ **Selezionare immagini esistenti** da Cloudinary con un browser visuale
- ✅ **Evitare duplicati** riutilizzando le immagini già caricate

## Implementazione

### 1. Includi gli script necessari

```html
<!-- Nel <head> o prima del </body> -->
<script src="https://widget.cloudinary.com/v2.0/global/all.js"></script>
<script src="/shared/js/cloudinary-widget.js"></script>
```

### 2. Usa il widget nel tuo codice

```javascript
// Metodo semplice - apre il picker direttamente
openCloudinaryPicker(
  {
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'your_preset_name',
    folder: 'your/folder/path'
  },
  (imageData) => {
    // Callback quando l'immagine è selezionata/caricata
    console.log('Immagine selezionata:', imageData.publicId);
    console.log('URL:', imageData.url);
    console.log('Dimensioni:', imageData.width, 'x', imageData.height);

    // Aggiorna il tuo form/UI
    document.getElementById('image_field').value = imageData.publicId;
    document.getElementById('preview').src = imageData.url;
  },
  {
    // Opzioni aggiuntive (tutte opzionali)
    multiple: false,              // Seleziona una sola immagine
    cropping: false,              // Abilita crop
    croppingAspectRatio: 16/9    // Ratio del crop
  }
);
```

### 3. Dati restituiti

L'oggetto `imageData` contiene:

```javascript
{
  publicId: 'folder/image_id',       // ID pubblico da salvare nel DB
  url: 'https://res.cloudinary...',  // URL completo dell'immagine
  width: 1920,                       // Larghezza in pixel
  height: 1080,                      // Altezza in pixel
  format: 'jpg',                     // Formato (jpg, png, etc.)
  bytes: 524288,                     // Dimensione in bytes
  thumbnail: 'https://...'           // URL thumbnail
}
```

## Esempi pratici

### Esempio 1: Upload poster verticale

```javascript
document.getElementById('uploadBtn').addEventListener('click', () => {
  openCloudinaryPicker(
    {
      cloudName: 'dnwhnz2xy',
      uploadPreset: 'poster_vertical_unsigned',
      folder: 'danielecamiz/posters/vertical'
    },
    (imageData) => {
      // Salva nel database
      document.getElementById('poster_vertical').value = imageData.publicId;

      // Mostra preview
      const img = document.getElementById('posterPreview');
      img.src = imageData.url;
      img.style.display = 'block';

      showNotification('Poster selezionato!', 'success');
    },
    {
      cropping: true,
      croppingAspectRatio: 3/4  // Formato verticale
    }
  );
});
```

### Esempio 2: Upload immagine galleria

```javascript
function selectGalleryImage(galleryId) {
  openCloudinaryPicker(
    {
      cloudName: 'dnwhnz2xy',
      uploadPreset: 'gallery_unsigned',
      folder: 'danielecamiz/gallery'
    },
    async (imageData) => {
      // Salva via API
      const response = await fetch(`/api/gallery/${galleryId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudinary_id: imageData.publicId,
          width: imageData.width,
          height: imageData.height
        })
      });

      if (response.ok) {
        location.reload();
      }
    }
  );
}
```

### Esempio 3: Multiple upload

```javascript
openCloudinaryPicker(
  {
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'news_images',
    folder: 'danielecamiz/news'
  },
  (imageData) => {
    // Aggiungi l'immagine alla lista
    addImageToList(imageData);
  },
  {
    multiple: true  // Permette selezione multipla
  }
);
```

## Vantaggi rispetto al vecchio metodo

### Prima (vecchio metodo):
- ❌ Solo upload, non selezione
- ❌ Creava duplicati ad ogni upload
- ❌ Non permetteva riutilizzo immagini
- ❌ Configurazione ripetuta in ogni pannello

### Ora (nuovo metodo):
- ✅ Upload O selezione da esistenti
- ✅ Browser visuale delle immagini
- ✅ Riduce duplicati
- ✅ Configurazione centralizzata
- ✅ Stesso comportamento in tutti i pannelli

## Applicazione ad altri pannelli

### Gallery Admin

```javascript
// In gallery-admin/views/gallery.ejs o simile
openCloudinaryPicker(
  {
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'gallery_unsigned',
    folder: 'danielecamiz/gallery'
  },
  (imageData) => {
    // Gestisci immagine selezionata
  }
);
```

### News Admin

```javascript
// In news-admin per immagine articolo
openCloudinaryPicker(
  {
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'news_unsigned',
    folder: 'danielecamiz/news'
  },
  (imageData) => {
    // Salva immagine articolo
  }
);
```

### Bio/Press Admin

```javascript
// Per immagini biografia o press kit
openCloudinaryPicker(
  {
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'bio_unsigned',
    folder: 'danielecamiz/bio'
  },
  (imageData) => {
    // Salva immagine bio/press
  }
);
```

## Note Importanti

1. **Upload Preset**: Ogni pannello dovrebbe avere il suo preset configurato su Cloudinary
2. **Folder**: Usa folder separate per organizzare le immagini
3. **Media Library**: Richiede che l'account Cloudinary abbia la Media Library abilitata
4. **Fallback**: Se Media Library non è disponibile, il widget funziona comunque come uploader normale

## Testing

Per testare il widget:
1. Prova a uploadare una nuova immagine
2. Prova a selezionare un'immagine esistente dalla Media Library
3. Verifica che il `publicId` venga salvato correttamente nel database
4. Verifica che non vengano create copie duplicate

## Supporto

Per problemi o domande:
- Verifica la console browser per errori JavaScript
- Controlla che il Cloudinary cloud name e upload preset siano corretti
- Verifica che la Media Library sia abilitata nell'account Cloudinary

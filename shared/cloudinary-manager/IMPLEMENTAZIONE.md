# Implementazione Sistema Cloudinary Unificato

## Stato Attuale

### ✅ COMPLETATO

1. **Backend API Service** (`/shared/cloudinary-manager/api-service.js`)
   - Funzioni per listare immagini da Cloudinary
   - Funzioni per cercare immagini
   - Funzioni per listare folders
   - **TESTATO E FUNZIONANTE** ✅

2. **Express Routes** (`/shared/cloudinary-manager/routes.js`)
   - GET `/api/cloudinary/images` - Lista immagini
   - GET `/api/cloudinary/search` - Cerca immagini
   - GET `/api/cloudinary/folders` - Lista folders
   - GET `/api/cloudinary/subfolders` - Lista sub-folders
   - **TESTATO E FUNZIONANTE** ✅

3. **Integrato in concerts-admin**
   - Route montate su `/api/cloudinary`
   - Test confermano funzionamento:
     ```bash
     curl "http://localhost:3004/api/cloudinary/images?folder=danielecamiz/concerts/posters&maxResults=5"
     # Risultato: success: true, count: 5
     ```

### ❌ DA COMPLETARE

#### 1. Aggiornare Frontend CloudinaryManager

File: `/shared/cloudinary-manager/client.js`

Nella funzione `showImageDialog`, aggiungere logica per il tab "Sfoglia Esistenti":

```javascript
// Dopo aver creato il modal, caricare immagini
async function loadCloudinaryImages(folder = 'danielecamiz') {
  const grid = modal.querySelector('#cloudinary-images-grid');

  try {
    const response = await fetch(`/api/cloudinary/images?folder=${folder}&maxResults=50`);
    const data = await response.json();

    if (data.success && data.images.length > 0) {
      grid.innerHTML = data.images.map(img => `
        <div class="cloudinary-image-item"
             data-public-id="${img.publicId}"
             data-url="${img.url}"
             style="cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.2s;">
          <img src="${img.thumbnail}"
               style="width: 100%; height: 150px; object-fit: cover;"
               alt="${img.publicId}">
          <div style="padding: 8px; font-size: 11px; text-align: center; color: #7f8c8d; background: #f8f9fa;">
            ${img.publicId.split('/').pop()}
          </div>
        </div>
      `).join('');

      // Click handler per selezione immagine
      grid.querySelectorAll('.cloudinary-image-item').forEach(item => {
        item.addEventListener('click', function() {
          // Deseleziona precedenti
          grid.querySelectorAll('.cloudinary-image-item').forEach(i => {
            i.style.border = '2px solid transparent';
          });

          // Seleziona questo
          this.style.border = '2px solid #d4af37';

          // Salva selezione
          modal.dataset.selectedPublicId = this.dataset.publicId;
          modal.dataset.selectedUrl = this.dataset.url;
        });
      });
    } else {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #7f8c8d;">Nessuna immagine trovata</div>';
    }
  } catch (error) {
    console.error('Error loading images:', error);
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c;">Errore caricamento immagini</div>';
  }
}

// Chiamare loadCloudinaryImages() dopo aver creato il modal
loadCloudinaryImages(folder);

// Search functionality
const searchField = modal.querySelector('#cloudinary-search-field');
let searchTimeout;
searchField.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = e.target.value.trim();
    if (query) {
      // Filtra visualmente o ricarica con ricerca
      loadCloudinaryImages(folder);
    }
  }, 300);
});
```

#### 2. Aggiornare il pulsante Conferma

Nel modal, modificare il click handler del pulsante Conferma per gestire anche la selezione browse:

```javascript
modal.querySelector('#cloudinary-confirm-btn').addEventListener('click', () => {
  // Controlla quale metodo è attivo
  const activeMethod = modal.querySelector('.cloudinary-option.active')?.dataset.method;

  if (activeMethod === 'browse') {
    // Selezione da browse
    const publicId = modal.dataset.selectedPublicId;
    const url = modal.dataset.selectedUrl;

    if (!publicId) {
      alert('Seleziona un\'immagine');
      return;
    }

    callback({ url, publicId });
    modal.remove();
  } else if (activeMethod === 'url') {
    // Metodo URL esistente...
    const urlField = modal.querySelector('#cloudinary-url-field');
    let input = urlField.value.trim();
    // ... resto del codice esistente
  }
  // upload è gestito direttamente in handleUpload
});
```

#### 3. Aggiornare Tab Switching

Modificare il toggle tra tab per mostrare/nascondere le viste corrette:

```javascript
modal.querySelectorAll('.cloudinary-option').forEach(btn => {
  btn.addEventListener('click', function() {
    // Deseleziona tutti
    modal.querySelectorAll('.cloudinary-option').forEach(b => {
      b.classList.remove('active');
      b.style.border = '2px solid #e1e8ed';
      b.style.background = 'white';
      b.style.color = '#333';
    });

    // Seleziona questo
    this.classList.add('active');
    this.style.border = '2px solid #d4af37';
    this.style.background = '#d4af37';
    this.style.color = 'white';

    const method = this.dataset.method;

    // Mostra/nascondi viste
    modal.querySelector('#cloudinary-browse-view').style.display =
      method === 'browse' ? 'block' : 'none';
    modal.querySelector('#cloudinary-url-input').style.display =
      method === 'url' ? 'block' : 'none';
    modal.querySelector('#cloudinary-upload-zone').style.display =
      method === 'upload' ? 'block' : 'none';
  });
});
```

#### 4. Applicare a TUTTI gli Admin Panels

Per ogni pannello admin, aggiungere:

**Nel server.js di ogni pannello:**

```javascript
import cloudinaryRoutes from '../shared/cloudinary-manager/routes.js';

// ... dopo le altre route
app.use('/api/cloudinary', cloudinaryRoutes);
```

**Pannelli da aggiornare:**
- ✅ concerts-admin (già fatto)
- ❌ bio-admin
- ❌ gallery-admin
- ❌ news-admin
- ❌ press-admin
- ❌ newsletter-service
- ❌ landing (events-admin)

**Ogni pannello deve includere:**
```html
<script src="/shared/cloudinary-manager/client.js"></script>
```

## Test Finale

Una volta completato, testare in ogni pannello:

1. Aprire un pannello admin
2. Click su "Carica immagine" / "Upload"
3. Verificare che compaiano 3 tab:
   - 🖼️ Sfoglia Esistenti (nuovo!)
   - 🔗 Incolla URL
   - 📤 Carica Nuovo
4. Click su "Sfoglia Esistenti"
5. Verificare griglia di immagini da Cloudinary
6. Click su un'immagine → evidenziata
7. Click "Conferma" → immagine selezionata

## Vantaggi del Sistema

- ✅ **Riuso immagini** - Nessun duplicato
- ✅ **Visual browse** - Vedi le immagini prima di selezionarle
- ✅ **Centralizzato** - Stesso comportamento ovunque
- ✅ **Efficiente** - Carica solo 50 immagini alla volta
- ✅ **Ricerca** - Campo search per filtrare

## Note Tecniche

- Le API Cloudinary richiedono `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` (già configurati in `/cms/.env`)
- Il sistema carica le credenziali automaticamente
- Limite Cloudinary: 500 immagini per richiesta (noi usiamo 50-100)
- Thumbnail generate automaticamente con trasformazioni Cloudinary

// shared/cloudinary-manager/client.js
// Client parametrico per upload su Cloudinary (browser).
// Supporta multi-account tramite CloudinaryManager.init()

(function () {
  // ============================================
  // CONFIGURAZIONE (con valori di default)
  // ============================================
  let CLOUD_NAME = 'dnwhnz2xy';           // Default: account Daniele Camiz
  let DEFAULT_FOLDER = 'danielecamiz';    // Default: cartella root
  let DEFAULT_PRESET = 'gallery_unsigned'; // Default: preset unsigned
  let API_PREFIX = '/api/cloudinary';      // Default: prefix API per backend routes

  /**
   * Inizializza CloudinaryManager con parametri custom
   * @param {Object} config - Configurazione
   * @param {string} config.cloudName - Nome account Cloudinary (obbligatorio)
   * @param {string} config.defaultFolder - Folder di default (opzionale)
   * @param {string} config.defaultPreset - Upload preset di default (opzionale)
   * @param {string} config.apiPrefix - Prefix per API routes backend (default: '/api/cloudinary')
   */
  function init(config = {}) {
    if (config.cloudName) {
      CLOUD_NAME = config.cloudName;
    }
    if (config.defaultFolder) {
      DEFAULT_FOLDER = config.defaultFolder;
    }
    if (config.defaultPreset) {
      DEFAULT_PRESET = config.defaultPreset;
    }
    if (config.apiPrefix) {
      API_PREFIX = config.apiPrefix;
    }
    console.log(`✅ CloudinaryManager initialized: ${CLOUD_NAME} / ${DEFAULT_FOLDER} (API: ${API_PREFIX})`);
  }

  function withYear(base) {
    const y = new Date().getFullYear();
    return base ? (base.endsWith('/') ? base + y : `${base}/${y}`) : '';
  }

  async function upload(fileOrBlob, opts = {}) {
    const formData = new FormData();
    formData.append('file', fileOrBlob);

    if (!opts.preset) throw new Error('Preset Cloudinary mancante');
    formData.append('upload_preset', opts.preset);

    if (opts.folder) formData.append('folder', withYear(opts.folder));
    if (opts.public_id) formData.append('public_id', opts.public_id);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.secure_url) {
      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,  // ✅ CORRETTO (era public_id)
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        format: data.format,
        folder: data.folder
      };
    }
    return { success: false, error: data.error?.message || 'Upload fallito' };
  }

  function buildUrl(publicId, transformation = 'c_limit,w_1200,q_auto') {
    const base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
    return transformation ? `${base}/${transformation}/${publicId}` : `${base}/${publicId}`;
  }

  function getTransformedUrl(publicId, opts = {}) {
    const params = [];
    if (opts.width) params.push(`w_${opts.width}`);
    if (opts.height) params.push(`h_${opts.height}`);
    if (opts.crop) params.push(`c_${opts.crop}`);
    if (opts.quality) params.push(`q_${opts.quality}`);
    if (opts.gravity) params.push(`g_${opts.gravity}`);
    
    const transformation = params.length > 0 ? params.join(',') : 'c_limit,w_1200,q_auto';
    return buildUrl(publicId, transformation);
  }

  function insertIntoEditor(url) {
    if (window.tinymce?.activeEditor) {
      window.tinymce.activeEditor.insertContent(
        `<p style="text-align:center;"><img src="${url}" style="max-width:100%;height:auto;"></p>`
      );
      return true;
    }
    return false;
  }

  // ============================================
  // IMAGE PICKER DIALOG
  // ============================================

  function showImageDialog(callback, options = {}) {
    const folder = options.folder || '';
    const preset = options.preset || DEFAULT_PRESET;

    const modal = document.createElement('div');
    modal.id = 'cloudinary-picker-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; max-width: 900px; width: 90%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
        <div style="padding: 20px; border-bottom: 2px solid #e1e8ed; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 20px;">📸 Scegli o Carica Immagine</h2>
          <button onclick="document.getElementById('cloudinary-picker-modal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999;">&times;</button>
        </div>

        <div style="padding: 20px; overflow-y: auto; flex: 1;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button class="cloudinary-option active" data-method="browse" style="flex: 1; padding: 10px; border: 2px solid #d4af37; background: #d4af37; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">🖼️ Sfoglia Esistenti</button>
            <button class="cloudinary-option" data-method="url" style="flex: 1; padding: 10px; border: 2px solid #e1e8ed; background: white; color: #333; border-radius: 8px; cursor: pointer; font-weight: 600;">🔗 Incolla URL</button>
            <button class="cloudinary-option" data-method="upload" style="flex: 1; padding: 10px; border: 2px solid #e1e8ed; background: white; color: #333; border-radius: 8px; cursor: pointer; font-weight: 600;">📤 Carica Nuovo</button>
          </div>

          <div id="cloudinary-browse-view" style="display: block;">
            <div id="cloudinary-folder-nav" style="margin-bottom: 12px; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; font-size: 13px; color: #7f8c8d; display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 600;">📁</span>
              <span id="folder-breadcrumb" style="flex: 1;">${DEFAULT_FOLDER}</span>
            </div>
            <div style="margin-bottom: 12px;">
              <input type="text" id="cloudinary-search-field" placeholder="🔍 Cerca immagini..." style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px;">
            </div>
            <div id="cloudinary-images-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; max-height: 400px; overflow-y: auto;">
              <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #7f8c8d;">
                Caricamento immagini da Cloudinary...
              </div>
            </div>
          </div>

          <div id="cloudinary-url-input" style="display: none;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">URL Cloudinary o Public ID:</label>
            <input type="text" id="cloudinary-url-field" placeholder="https://res.cloudinary.com/... o ${DEFAULT_FOLDER}/..." style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px;">
            <small style="display: block; margin-top: 8px; color: #7f8c8d;">Incolla l'URL completo o il public_id dell'immagine</small>
          </div>
          
          <div id="cloudinary-upload-zone" style="display: none;">
            <div id="upload-dropzone" style="border: 2px dashed #e1e8ed; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s;">
              <div style="font-size: 48px; margin-bottom: 12px;">📸</div>
              <p style="margin: 0; color: #7f8c8d;">Trascina un'immagine qui o clicca per selezionare</p>
            </div>
            <input type="file" id="cloudinary-file-input" accept="image/*" style="display: none;">
          </div>
        </div>
        
        <div style="padding: 20px; border-top: 2px solid #e1e8ed; display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="document.getElementById('cloudinary-picker-modal').remove()" style="padding: 10px 24px; border: 1px solid #e1e8ed; background: white; color: #333; border-radius: 8px; cursor: pointer; font-weight: 600;">Annulla</button>
          <button id="cloudinary-confirm-btn" style="padding: 10px 24px; border: none; background: #d4af37; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Conferma</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let currentFolder = folder || DEFAULT_FOLDER;
    let selectedImage = null;

    // ============================================
    // LOAD IMAGES FROM CLOUDINARY API
    // ============================================
    async function loadCloudinaryImages(folderPath) {
      const grid = modal.querySelector('#cloudinary-images-grid');
      const breadcrumb = modal.querySelector('#folder-breadcrumb');

      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #7f8c8d;"><div style="font-size: 32px; margin-bottom: 12px;">⏳</div>Caricamento immagini...</div>';

      // Update breadcrumb with clickable path
      const pathParts = folderPath.split('/').filter(p => p);
      breadcrumb.innerHTML = pathParts.map((part, idx) => {
        const partPath = pathParts.slice(0, idx + 1).join('/');
        return `<span class="breadcrumb-part" data-path="${partPath}" style="cursor: pointer; color: #d4af37; text-decoration: underline;">${part}</span>`;
      }).join(' <span style="color: #999;">/</span> ');

      // Breadcrumb click handlers
      breadcrumb.querySelectorAll('.breadcrumb-part').forEach(part => {
        part.addEventListener('click', () => {
          currentFolder = part.dataset.path;
          loadCloudinaryImages(currentFolder);
        });
      });

      try {
        // Load subfolders
        const subfoldersUrl = `${API_PREFIX}/subfolders?path=${encodeURIComponent(folderPath)}`;
        const subfoldersResponse = await fetch(subfoldersUrl);
        const subfoldersData = await subfoldersResponse.json();

        // Load images
        const imagesUrl = `${API_PREFIX}/images?folder=${encodeURIComponent(folderPath)}&maxResults=100`;
        const imagesResponse = await fetch(imagesUrl);
        const imagesData = await imagesResponse.json();

        let content = '';

        // Add subfolders first
        if (subfoldersData.success && subfoldersData.folders && subfoldersData.folders.length > 0) {
          content += subfoldersData.folders.map(subfolder => `
            <div class="cloudinary-folder-item"
                 data-folder-path="${subfolder.path}"
                 style="cursor: pointer; border: 2px solid #e1e8ed; border-radius: 8px; overflow: hidden; transition: all 0.2s; background: #f8f9fa;">
              <div style="display: flex; align-items: center; justify-content: center; height: 150px; font-size: 48px;">
                📁
              </div>
              <div style="padding: 8px; font-size: 11px; text-align: center; color: #333; font-weight: 600; background: #e1e8ed; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${subfolder.name}
              </div>
            </div>
          `).join('');
        }

        // Add images
        if (imagesData.success && imagesData.images && imagesData.images.length > 0) {
          content += imagesData.images.map(img => `
            <div class="cloudinary-image-item"
                 data-public-id="${img.publicId}"
                 data-url="${img.url}"
                 style="cursor: pointer; border: 2px solid transparent; border-radius: 8px; overflow: hidden; transition: all 0.2s; position: relative;">
              <img src="${img.thumbnail}"
                   style="width: 100%; height: 150px; object-fit: cover; display: block;"
                   alt="${img.publicId}"
                   loading="lazy">
              <div style="padding: 6px; font-size: 10px; text-align: center; color: #7f8c8d; background: #f8f9fa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${img.publicId.split('/').pop()}
              </div>
            </div>
          `).join('');
        }

        if (content) {
          grid.innerHTML = content;

          // Folder click handlers
          grid.querySelectorAll('.cloudinary-folder-item').forEach(item => {
            item.addEventListener('click', function() {
              currentFolder = this.dataset.folderPath;
              loadCloudinaryImages(currentFolder);
            });

            // Hover effect
            item.addEventListener('mouseenter', function() {
              this.style.borderColor = '#d4af37';
              this.style.transform = 'scale(1.02)';
            });
            item.addEventListener('mouseleave', function() {
              this.style.borderColor = '#e1e8ed';
              this.style.transform = 'scale(1)';
            });
          });

          // Image click handlers
          grid.querySelectorAll('.cloudinary-image-item').forEach(item => {
            item.addEventListener('click', function() {
              // Deseleziona tutti
              grid.querySelectorAll('.cloudinary-image-item').forEach(i => {
                i.style.border = '2px solid transparent';
                i.style.boxShadow = 'none';
              });

              // Seleziona questo
              this.style.border = '2px solid #d4af37';
              this.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.4)';

              // Salva selezione
              selectedImage = {
                publicId: this.dataset.publicId,
                url: this.dataset.url
              };
            });
          });
        } else {
          grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #7f8c8d;"><div style="font-size: 32px; margin-bottom: 12px;">📂</div>Nessuna immagine o cartella in questo percorso</div>';
        }
      } catch (error) {
        console.error('Error loading images:', error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c;"><div style="font-size: 32px; margin-bottom: 12px;">❌</div>Errore caricamento immagini</div>';
      }
    }

    // Search con debounce
    const searchField = modal.querySelector('#cloudinary-search-field');
    let searchTimeout;
    searchField.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      searchTimeout = setTimeout(() => {
        if (query.length > 0) {
          // Filtra le immagini visualizzate
          const items = modal.querySelectorAll('.cloudinary-image-item');
          items.forEach(item => {
            const publicId = item.dataset.publicId.toLowerCase();
            if (publicId.includes(query.toLowerCase())) {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
          });
        } else {
          // Mostra tutte
          const items = modal.querySelectorAll('.cloudinary-image-item');
          items.forEach(item => {
            item.style.display = 'block';
          });
        }
      }, 300);
    });

    // Carica immagini iniziali
    loadCloudinaryImages(currentFolder);

    // ============================================
    // TOGGLE TRA METODI
    // ============================================
    modal.querySelectorAll('.cloudinary-option').forEach(btn => {
      btn.addEventListener('click', function() {
        modal.querySelectorAll('.cloudinary-option').forEach(b => {
          b.style.border = '2px solid #e1e8ed';
          b.style.background = 'white';
          b.style.color = '#333';
        });
        this.style.border = '2px solid #d4af37';
        this.style.background = '#d4af37';
        this.style.color = 'white';

        const method = this.dataset.method;
        modal.querySelector('#cloudinary-browse-view').style.display = method === 'browse' ? 'block' : 'none';
        modal.querySelector('#cloudinary-url-input').style.display = method === 'url' ? 'block' : 'none';
        modal.querySelector('#cloudinary-upload-zone').style.display = method === 'upload' ? 'block' : 'none';
      });
    });
    
    // Upload zone
    const dropzone = modal.querySelector('#upload-dropzone');
    const fileInput = modal.querySelector('#cloudinary-file-input');
    
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#d4af37';
      dropzone.style.background = '#f8f9fa';
    });
    
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#e1e8ed';
      dropzone.style.background = 'transparent';
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#e1e8ed';
      dropzone.style.background = 'transparent';
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleUpload(file);
    });
    
    async function handleUpload(file) {
      dropzone.innerHTML = '<div style="font-size: 48px;">⏳</div><p style="color: #7f8c8d;">Caricamento in corso...</p>';

      try {
        const result = await upload(file, {
          preset: preset || DEFAULT_PRESET,
          folder: folder || DEFAULT_FOLDER
        });
        
        if (result.success) {
          callback({ url: result.url, publicId: result.publicId });
          modal.remove();
        } else {
          alert('Errore upload: ' + result.error);
          dropzone.innerHTML = '<div style="font-size: 48px;">❌</div><p style="color: #e74c3c;">Errore caricamento</p>';
        }
      } catch (error) {
        alert('Errore: ' + error.message);
        dropzone.innerHTML = '<div style="font-size: 48px;">❌</div><p style="color: #e74c3c;">Errore caricamento</p>';
      }
    }
    
    // Conferma - Gestisce tutti e 3 i metodi
    modal.querySelector('#cloudinary-confirm-btn').addEventListener('click', () => {
      const activeMethod = modal.querySelector('.cloudinary-option.active')?.dataset.method || 'url';

      if (activeMethod === 'browse') {
        // Selezione da browser di immagini
        if (!selectedImage) {
          alert('Seleziona un\'immagine dalla griglia');
          return;
        }

        callback({
          url: selectedImage.url,
          publicId: selectedImage.publicId
        });
        modal.remove();

      } else if (activeMethod === 'url') {
        // Metodo URL (come prima)
        const urlField = modal.querySelector('#cloudinary-url-field');
        let input = urlField.value.trim();

        if (!input) {
          alert('Inserisci un URL o public_id');
          return;
        }

        let url = input;

        // Se è un public_id, costruisci URL
        if (!input.startsWith('http')) {
          url = buildUrl(input, 'c_limit,w_1200,q_auto');
        }

        callback({ url, publicId: input });
        modal.remove();
      }
      // Upload è gestito direttamente in handleUpload
    });
  }

  // ============================================
  // EXPORT COMPLETO
  // ============================================
  window.CloudinaryManager = {
    init: init,                             // ✨ NUOVO: Inizializzazione multi-account
    upload: upload,
    buildUrl: buildUrl,
    getTransformedUrl: getTransformedUrl,
    insertIntoEditor: insertIntoEditor,
    showImageDialog: showImageDialog
  };
})();
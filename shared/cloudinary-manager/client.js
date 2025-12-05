// shared/cloudinary-manager/client.js
// Client parametrico per upload su Cloudinary (browser).
// Supporta multi-account tramite CloudinaryManager.init()
// Richiede: ui-notifications.js, ui-loading.js

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

    // IMPORTANTE: Passa solo 'folder' che andrà nel public_id esattamente come specificato
    // Il preset NON deve avere configurazioni "Folder" che aggiungono /year/ o altro
    // Se il preset ha una config Folder, questa sovrascrive il parametro folder qui passato
    if (opts.folder) {
      formData.append('folder', opts.folder);
    }

    // public_id completo sovrascrive completamente folder+filename
    if (opts.public_id) {
      formData.append('public_id', opts.public_id);
    }

    // Determine resource type (image or raw for documents)
    const resourceType = opts.resourceType || 'image';
    const uploadEndpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const res = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    // Se c'è un errore, loga e ritorna l'errore
    if (data.error) {
      console.error('Cloudinary upload error:', data.error);
      return {
        success: false,
        error: data.error.message || 'Upload failed'
      };
    }

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
    console.log('🎵 showImageDialog chiamato con options:', options);
    console.log('🎵 DEFAULT_FOLDER corrente:', DEFAULT_FOLDER);
    console.log('🎵 DEFAULT_PRESET corrente:', DEFAULT_PRESET);

    const folder = options.folder || '';
    const preset = options.preset || DEFAULT_PRESET;
    const resourceType = options.resourceType || 'image';
    const clientAllowedFormats = options.clientAllowedFormats || [];

    // Multi-select state
    let multiSelectMode = false;
    let selectedImages = new Set(); // Store publicId of selected images

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
              <button id="multiselect-toggle-btn" style="background: #9b59b6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap;">☑️ Multi-Select</button>
              <button id="create-folder-btn" style="background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap;">➕ Nuova Cartella</button>
            </div>
            <div id="batch-actions-bar" style="display: none; margin-bottom: 12px; padding: 10px; background: #e8f5e9; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
              <span id="selected-count" style="flex: 1; font-weight: 600; color: #27ae60;">0 immagini selezionate</span>
              <button id="batch-move-btn" style="background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">↔️ Sposta Tutte</button>
              <button id="batch-delete-btn" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">🗑️ Elimina Tutte</button>
              <button id="deselect-all-btn" style="background: #95a5a6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">✕ Deseleziona</button>
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
              <p style="margin: 0; color: #7f8c8d;">Trascina immagini qui o clicca per selezionare</p>
              <p style="margin: 8px 0 0 0; color: #95a5a6; font-size: 12px;">Supporta caricamento multiplo</p>
            </div>
            <input type="file" id="cloudinary-file-input" multiple style="display: none;">
            <div id="upload-progress-container" style="margin-top: 20px; display: none;">
              <h4 style="margin: 0 0 12px 0; color: #333;">Caricamento in corso...</h4>
              <div id="upload-files-list"></div>
            </div>
          </div>
        </div>
        
        <div style="padding: 20px; border-top: 2px solid #e1e8ed; display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="document.getElementById('cloudinary-picker-modal').remove()" style="padding: 10px 24px; border: 1px solid #e1e8ed; background: white; color: #333; border-radius: 8px; cursor: pointer; font-weight: 600;">Annulla</button>
          <button id="cloudinary-confirm-btn" style="padding: 10px 24px; border: none; background: #d4af37; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Conferma</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set accept attribute dynamically based on clientAllowedFormats
    const fileInput = modal.querySelector('#cloudinary-file-input');
    if (clientAllowedFormats.length > 0) {
      // Convert formats to MIME types
      const acceptTypes = clientAllowedFormats.map(format => {
        if (format === 'pdf') return '.pdf,application/pdf';
        if (format === 'doc') return '.doc,application/msword';
        if (format === 'docx') return '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return `.${format}`;
      }).join(',');
      fileInput.setAttribute('accept', acceptTypes);
    } else if (resourceType === 'image') {
      fileInput.setAttribute('accept', 'image/*');
    }

    // ✅ Usa DEFAULT_FOLDER dinamico configurato da init(), non il fallback hardcoded
    let currentFolder = folder || options.folder || DEFAULT_FOLDER;
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
        // Show loading
        window.CloudinaryLoading?.inline(grid, 'Caricamento immagini...');

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
              <input type="checkbox" class="cloudinary-multiselect-checkbox"
                     data-public-id="${img.publicId}"
                     style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; cursor: pointer; z-index: 11; display: none;">
              <img src="${img.thumbnail}"
                   style="width: 100%; height: 150px; object-fit: cover; display: block;"
                   alt="${img.publicId}"
                   loading="lazy">
              <button class="cloudinary-move-btn"
                      data-public-id="${img.publicId}"
                      style="position: absolute; top: 4px; left: 4px; background: rgba(52, 152, 219, 0.9); color: white; border: none; border-radius: 4px; width: 28px; height: 28px; font-size: 14px; cursor: pointer; display: none; z-index: 10; transition: all 0.2s;"
                      title="Sposta immagine">
                ↔️
              </button>
              <button class="cloudinary-delete-btn"
                      data-public-id="${img.publicId}"
                      style="position: absolute; top: 4px; right: 4px; background: rgba(231, 76, 60, 0.9); color: white; border: none; border-radius: 4px; width: 28px; height: 28px; font-size: 16px; cursor: pointer; display: none; z-index: 10; transition: all 0.2s;"
                      title="Elimina immagine">
                🗑️
              </button>
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
            const checkbox = item.querySelector('.cloudinary-multiselect-checkbox');

            // Checkbox change handler
            if (checkbox) {
              checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                const publicId = this.dataset.publicId;
                if (this.checked) {
                  selectedImages.add(publicId);
                } else {
                  selectedImages.delete(publicId);
                }
                updateSelectedCount();
              });
            }

            // Click su immagine per selezionare
            item.addEventListener('click', function(e) {
              // Se è il bottone delete/move o checkbox, non selezionare
              if (e.target.classList.contains('cloudinary-delete-btn')) return;
              if (e.target.classList.contains('cloudinary-move-btn')) return;
              if (e.target.classList.contains('cloudinary-multiselect-checkbox')) return;

              // In multi-select mode, toggle checkbox
              if (multiSelectMode && checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
                return;
              }

              // Modalità single select normale
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

            // Mostra bottoni action al hover
            const deleteBtn = item.querySelector('.cloudinary-delete-btn');
            const moveBtn = item.querySelector('.cloudinary-move-btn');
            item.addEventListener('mouseenter', function() {
              if (deleteBtn) deleteBtn.style.display = 'block';
              if (moveBtn) moveBtn.style.display = 'block';
            });
            item.addEventListener('mouseleave', function() {
              if (deleteBtn) deleteBtn.style.display = 'none';
              if (moveBtn) moveBtn.style.display = 'none';
            });
          });

          // Move button handlers
          grid.querySelectorAll('.cloudinary-move-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();  // Previeni selezione immagine
              const publicId = this.dataset.publicId;
              const fileName = publicId.split('/').pop();
              const currentPath = publicId.substring(0, publicId.lastIndexOf('/'));

              // Chiedi cartella destinazione
              const toFolder = prompt(`Sposta "${fileName}" in quale cartella?\n\nCartella attuale: ${currentPath}\n\nEsempio: danielecamiz/gallery\ndanielecamiz/news/2025`);
              if (!toFolder) return;

              moveImage(publicId, toFolder, (result) => {
                if (result.success) {
                  window.CloudinaryNotifications?.success(`✅ Immagine spostata!\n\nVecchio ID: ${publicId}\nNuovo ID: ${result.newPublicId}\n\n⚠️ IMPORTANTE: Se questa immagine è usata nel database, aggiorna il suo public_id!`);
                  loadCloudinaryImages(currentFolder); // Reload
                } else {
                  window.CloudinaryNotifications?.error(`Errore spostamento: ${result.error}`);
                }
              });
            });
          });

          // Delete button handlers
          grid.querySelectorAll('.cloudinary-delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();  // Previeni selezione immagine
              const publicId = this.dataset.publicId;
              const fileName = publicId.split('/').pop();

              // Conferma eliminazione
              if (confirm(`Eliminare definitivamente l'immagine "${fileName}"?\n\nQuesta azione non può essere annullata.`)) {
                deleteImage(publicId, (result) => {
                  if (result.success) {
                    // Ricarica la griglia
                    loadCloudinaryImages(currentFolder);
                  }
                });
              }
            });
          });
        } else {
          grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #7f8c8d;"><div style="font-size: 32px; margin-bottom: 12px;">📂</div>Nessuna immagine o cartella in questo percorso</div>';
        }
      } catch (error) {
        console.error('Error loading images:', error);
        window.CloudinaryNotifications?.error('Errore caricamento immagini');
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c;"><div style="font-size: 32px; margin-bottom: 12px;">❌</div>Errore caricamento immagini</div>';
      }
    }

    // Multi-Select Toggle
    const multiselectToggleBtn = modal.querySelector('#multiselect-toggle-btn');
    const batchActionsBar = modal.querySelector('#batch-actions-bar');
    const selectedCountSpan = modal.querySelector('#selected-count');

    function updateSelectedCount() {
      const count = selectedImages.size;
      selectedCountSpan.textContent = `${count} ${count === 1 ? 'immagine selezionata' : 'immagini selezionate'}`;
      batchActionsBar.style.display = count > 0 ? 'flex' : 'none';
    }

    multiselectToggleBtn.addEventListener('click', () => {
      multiSelectMode = !multiSelectMode;
      selectedImages.clear();

      if (multiSelectMode) {
        multiselectToggleBtn.style.background = '#e74c3c';
        multiselectToggleBtn.textContent = '☑️ Esci Multi-Select';
        // Mostra tutte le checkbox
        modal.querySelectorAll('.cloudinary-multiselect-checkbox').forEach(cb => {
          cb.style.display = 'block';
        });
      } else {
        multiselectToggleBtn.style.background = '#9b59b6';
        multiselectToggleBtn.textContent = '☑️ Multi-Select';
        // Nascondi tutte le checkbox
        modal.querySelectorAll('.cloudinary-multiselect-checkbox').forEach(cb => {
          cb.style.display = 'none';
          cb.checked = false;
        });
        batchActionsBar.style.display = 'none';
      }
    });

    // Batch Actions
    modal.querySelector('#deselect-all-btn').addEventListener('click', () => {
      selectedImages.clear();
      modal.querySelectorAll('.cloudinary-multiselect-checkbox').forEach(cb => cb.checked = false);
      updateSelectedCount();
    });

    modal.querySelector('#batch-delete-btn').addEventListener('click', () => {
      if (selectedImages.size === 0) return;
      if (!confirm(`Eliminare definitivamente ${selectedImages.size} immagini?\n\nQuesta azione non può essere annullata.`)) return;

      const imagesToDelete = Array.from(selectedImages);
      let deleted = 0;

      imagesToDelete.forEach(publicId => {
        deleteImage(publicId, (result) => {
          if (result.success) deleted++;
          if (deleted === imagesToDelete.length) {
            window.CloudinaryNotifications?.success(`${deleted} immagini eliminate!`);
            selectedImages.clear();
            loadCloudinaryImages(currentFolder);
          }
        });
      });
    });

    modal.querySelector('#batch-move-btn').addEventListener('click', () => {
      if (selectedImages.size === 0) return;
      const toFolder = prompt(`Sposta ${selectedImages.size} immagini in quale cartella?\n\nEsempio: danielecamiz/gallery`);
      if (!toFolder) return;

      const imagesToMove = Array.from(selectedImages);
      let moved = 0;

      imagesToMove.forEach(publicId => {
        moveImage(publicId, toFolder, (result) => {
          if (result.success) moved++;
          if (moved === imagesToMove.length) {
            window.CloudinaryNotifications?.success(`${moved} immagini spostate in "${toFolder}"!`);
            selectedImages.clear();
            loadCloudinaryImages(currentFolder);
          }
        });
      });
    });

    // Create Folder Button
    const createFolderBtn = modal.querySelector('#create-folder-btn');
    createFolderBtn.addEventListener('click', () => {
      const folderName = prompt('Nome della nuova cartella:\n(solo lettere, numeri, - e _)');
      if (!folderName) return;

      const sanitized = folderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      if (sanitized !== folderName.trim().toLowerCase()) {
        if (!confirm(`Il nome sarà sanitizzato in: "${sanitized}"\n\nContinuare?`)) return;
      }

      const newPath = currentFolder ? `${currentFolder}/${sanitized}` : sanitized;

      createFolder(newPath, (result) => {
        if (result.success) {
          window.CloudinaryNotifications?.success(`Cartella "${sanitized}" creata!`);
          loadCloudinaryImages(currentFolder); // Reload per mostrare nuova cartella
        } else {
          window.CloudinaryNotifications?.error(`Errore: ${result.error}`);
        }
      });
    });

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
    // fileInput already declared above
    
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
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) handleMultipleUpload(files);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) handleMultipleUpload(files);
    });

    // Handle multiple file upload with progress bars
    async function handleMultipleUpload(files) {
      const progressContainer = modal.querySelector('#upload-progress-container');
      const filesList = modal.querySelector('#upload-files-list');

      // Hide dropzone, show progress
      dropzone.style.display = 'none';
      progressContainer.style.display = 'block';
      filesList.innerHTML = '';

      const uploadedResults = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Create progress item
        const progressItem = document.createElement('div');
        progressItem.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;';
        progressItem.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600; color: #333; font-size: 13px;">${file.name}</span>
            <span class="upload-status" style="color: #3498db; font-size: 12px;">Caricamento...</span>
          </div>
          <div class="upload-progress-bar"></div>
        `;
        filesList.appendChild(progressItem);

        const statusSpan = progressItem.querySelector('.upload-status');
        const progressBarContainer = progressItem.querySelector('.upload-progress-bar');

        // Create progress bar
        const progressBar = window.CloudinaryLoading?.progressBar({ height: 6, color: '#3498db' });
        if (progressBar) {
          progressBarContainer.appendChild(progressBar.element);
          progressBar.update(10); // Inizio
        }

        try {
          // Upload file - usa currentFolder (cartella navigata) non folder (parametro iniziale)
          const result = await upload(file, {
            preset: preset || DEFAULT_PRESET,
            folder: currentFolder || folder || DEFAULT_FOLDER,
            resourceType: resourceType
          });

          if (progressBar) progressBar.update(100);

          if (result.success) {
            statusSpan.textContent = '✅ Completato';
            statusSpan.style.color = '#27ae60';
            if (progressBar) progressBar.setColor('#27ae60');
            uploadedResults.push(result);
          } else {
            statusSpan.textContent = '❌ Errore';
            statusSpan.style.color = '#e74c3c';
            if (progressBar) progressBar.setColor('#e74c3c');
          }
        } catch (error) {
          statusSpan.textContent = '❌ Errore';
          statusSpan.style.color = '#e74c3c';
          if (progressBar) progressBar.setColor('#e74c3c');
        }
      }

      // All uploads complete
      setTimeout(() => {
        if (uploadedResults.length > 0) {
          window.CloudinaryNotifications?.success(`${uploadedResults.length} ${uploadedResults.length === 1 ? 'immagine caricata' : 'immagini caricate'}!`);

          // Se single upload, ritorna subito
          if (uploadedResults.length === 1) {
            callback({ url: uploadedResults[0].url, publicId: uploadedResults[0].publicId });
            modal.remove();
          } else {
            // Multiple: mostra messaggio e torna a browse
            window.CloudinaryNotifications?.info('Vai su "Sfoglia Esistenti" per vedere le immagini caricate');
            progressContainer.style.display = 'none';
            dropzone.style.display = 'block';
            fileInput.value = ''; // Reset
          }
        } else {
          window.CloudinaryNotifications?.error('Nessuna immagine caricata correttamente');
          progressContainer.style.display = 'none';
          dropzone.style.display = 'block';
        }
      }, 1000);
    }

    async function handleUpload(file) {
      // Show loading with spinner
      if (window.CloudinaryLoading) {
        window.CloudinaryLoading.inline(dropzone, 'Caricamento in corso...');
      } else {
        dropzone.innerHTML = '<div style="font-size: 48px;">⏳</div><p style="color: #7f8c8d;">Caricamento in corso...</p>';
      }

      try {
        const result = await upload(file, {
          preset: preset || DEFAULT_PRESET,
          folder: currentFolder || folder || DEFAULT_FOLDER
        });
        
        if (result.success) {
          window.CloudinaryNotifications?.success('✅ Upload completato!');
          callback({ url: result.url, publicId: result.publicId });
          modal.remove();
        } else {
          window.CloudinaryNotifications?.error('Errore upload: ' + result.error);
          dropzone.innerHTML = '<div style="font-size: 48px;">❌</div><p style="color: #e74c3c;">Errore caricamento</p>';
        }
      } catch (error) {
        window.CloudinaryNotifications?.error('Errore: ' + error.message);
        dropzone.innerHTML = '<div style="font-size: 48px;">❌</div><p style="color: #e74c3c;">Errore caricamento</p>';
      }
    }
    
    // Conferma - Gestisce tutti e 3 i metodi
    modal.querySelector('#cloudinary-confirm-btn').addEventListener('click', () => {
      const activeMethod = modal.querySelector('.cloudinary-option.active')?.dataset.method || 'url';

      if (activeMethod === 'browse') {
        // Selezione da browser di immagini
        if (!selectedImage) {
          window.CloudinaryNotifications?.warning('Seleziona un\'immagine dalla griglia');
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
          window.CloudinaryNotifications?.warning('Inserisci un URL o public_id');
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
  // GESTIONE CARTELLE
  // ============================================

  /**
   * Crea una nuova cartella su Cloudinary
   * @param {string} folderPath - Path della cartella (es: "cororaro/eventi")
   * @param {Function} callback - Callback(result) chiamato al completamento
   */
  async function createFolder(folderPath, callback) {
    try {
      const response = await fetch(`${API_PREFIX}/create-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      });

      const result = await response.json();

      if (callback) callback(result);
      return result;
    } catch (error) {
      console.error('Error creating folder:', error);
      const errorResult = { success: false, error: error.message };
      if (callback) callback(errorResult);
      return errorResult;
    }
  }

  /**
   * Elimina un'immagine da Cloudinary
   * @param {string} publicId - Public ID dell'immagine (es: "cororaro/foto1")
   * @param {Function} callback - Callback(result) chiamato al completamento
   */
  async function deleteImage(publicId, callback) {
    try {
      const response = await fetch(`${API_PREFIX}/delete-image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId })
      });

      const result = await response.json();

      if (result.success) {
        window.CloudinaryNotifications?.success('Immagine eliminata con successo');
      } else {
        window.CloudinaryNotifications?.error(`Errore eliminazione: ${result.error}`);
      }

      if (callback) callback(result);
      return result;
    } catch (error) {
      console.error('Error deleting image:', error);
      window.CloudinaryNotifications?.error(`Errore: ${error.message}`);
      const errorResult = { success: false, error: error.message };
      if (callback) callback(errorResult);
      return errorResult;
    }
  }

  /**
   * Sposta un'immagine da una cartella all'altra
   * @param {string} publicId - Public ID dell'immagine (es: "cororaro/foto1")
   * @param {string} toFolder - Cartella di destinazione (es: "cororaro/eventi")
   * @param {Function} callback - Callback(result) chiamato al completamento
   */
  async function moveImage(publicId, toFolder, callback) {
    try {
      const response = await fetch(`${API_PREFIX}/move-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, toFolder })
      });

      const result = await response.json();

      if (callback) callback(result);
      return result;
    } catch (error) {
      console.error('Error moving image:', error);
      const errorResult = { success: false, error: error.message };
      if (callback) callback(errorResult);
      return errorResult;
    }
  }

  /**
   * Mostra un prompt per creare una nuova cartella
   * @param {string} currentFolder - Cartella corrente (parent folder)
   * @param {Function} callback - Callback(result) chiamato al completamento
   */
  function promptCreateFolder(currentFolder, callback) {
    const folderName = prompt(`Crea nuova cartella dentro "${currentFolder}":\n\nInserisci il nome della cartella (solo lettere, numeri, - e _):`);

    if (!folderName || folderName.trim() === '') {
      return;
    }

    // Validazione: solo caratteri alfanumerici, trattini e underscore
    const sanitizedName = folderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    if (sanitizedName !== folderName.trim().toLowerCase()) {
      const confirm = window.confirm(`Il nome sarà sanitizzato in: "${sanitizedName}"\n\nContinuare?`);
      if (!confirm) return;
    }

    const newFolderPath = currentFolder ? `${currentFolder}/${sanitizedName}` : sanitizedName;

    createFolder(newFolderPath, (result) => {
      if (result.success) {
        window.CloudinaryNotifications?.success(`Cartella "${sanitizedName}" creata con successo!`);
      } else {
        window.CloudinaryNotifications?.error(`Errore: ${result.error}\n\nPath tentato: ${newFolderPath}`);
      }
      if (callback) callback(result);
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
    showImageDialog: showImageDialog,
    // ✨ NUOVO: Gestione cartelle e immagini
    createFolder: createFolder,
    moveImage: moveImage,
    deleteImage: deleteImage,               // ✨ NUOVO: Elimina immagini
    promptCreateFolder: promptCreateFolder
  };
})();
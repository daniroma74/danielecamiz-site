// shared/cloudinary-manager/client.js
// Client minimale per upload su Cloudinary (browser).

(function () {
  const CLOUD_NAME = 'dnwhnz2xy';

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
      <div style="background: white; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
        <div style="padding: 20px; border-bottom: 2px solid #e1e8ed; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 20px;">📸 Scegli Immagine da Cloudinary</h2>
          <button onclick="document.getElementById('cloudinary-picker-modal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999;">&times;</button>
        </div>
        
        <div style="padding: 20px; overflow-y: auto; flex: 1;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button class="cloudinary-option active" data-method="url" style="flex: 1; padding: 10px; border: 2px solid #d4af37; background: #d4af37; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">Incolla URL</button>
            <button class="cloudinary-option" data-method="upload" style="flex: 1; padding: 10px; border: 2px solid #e1e8ed; background: white; color: #333; border-radius: 8px; cursor: pointer; font-weight: 600;">Carica Nuovo</button>
          </div>
          
          <div id="cloudinary-url-input" style="display: block;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">URL Cloudinary o Public ID:</label>
            <input type="text" id="cloudinary-url-field" placeholder="https://res.cloudinary.com/... o danielecamiz/..." style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px;">
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
    
    // Toggle tra URL e Upload
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
          preset: 'gallery_unsigned',
          folder: folder || 'danielecamiz/newsletter'
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
    
    // Conferma URL
    modal.querySelector('#cloudinary-confirm-btn').addEventListener('click', () => {
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
    });
  }

  // ✅ EXPORT COMPLETO
  window.CloudinaryManager = {
    upload: upload,
    buildUrl: buildUrl,
    getTransformedUrl: getTransformedUrl,
    insertIntoEditor: insertIntoEditor,
    showImageDialog: showImageDialog
  };
})();
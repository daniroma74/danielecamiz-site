console.log('Gallery Admin JS loaded');

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'error' ? '#e53e3e' : '#667eea'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function filterByCategory(category) {
  window.location.href = category ? `/gallery/images?category=${category}` : '/gallery/images';
}

async function uploadNewImage() {
  const modal = document.createElement('div');
  modal.id = 'image-modal';
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
    <div style="background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 85vh; overflow-y: auto; padding: 30px;">
      <h2 style="margin-top: 0;">Carica Nuova Immagine</h2>

      <div id="upload-zone" style="border: 2px dashed #e1e8ed; border-radius: 8px; padding: 60px; text-align: center; cursor: pointer; margin-bottom: 20px;">
        <div style="font-size: 64px; margin-bottom: 12px;">📸</div>
        <p style="margin: 0; color: #7f8c8d; font-size: 16px;">Clicca o trascina qui un'immagine</p>
      </div>

      <input type="file" id="file-input" accept="image/*" style="display: none;">

      <div id="image-details" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Titolo (Italiano):</label>
            <input type="text" id="title-it" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Titolo (English):</label>
            <input type="text" id="title-en" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Descrizione (Italiano):</label>
            <textarea id="desc-it" rows="3" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;"></textarea>
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Descrizione (English):</label>
            <textarea id="desc-en" rows="3" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;"></textarea>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Categoria:</label>
            <select id="category" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;">
              <option value="">Nessuna categoria</option>
              ${window.categories ? window.categories.map(cat => `<option value="${cat.slug}">${cat.name_it}</option>`).join('') : ''}
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Tags (separati da virgola):</label>
            <input type="text" id="tags" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;" placeholder="ritratto, bianco e nero">
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Data scatto:</label>
            <input type="date" id="taken-date" style="width: 100%; padding: 10px; border: 1px solid #e1e8ed; border-radius: 8px;">
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 15px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="is-published" checked style="margin-right: 8px;">
            <span>Pubblica immediatamente</span>
          </label>
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="is-featured" style="margin-right: 8px;">
            <span>In evidenza</span>
          </label>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
        <button onclick="document.getElementById('image-modal').remove()" style="padding: 10px 24px; border: 1px solid #e1e8ed; background: white; color: #333; border-radius: 8px; cursor: pointer; font-weight: 600;">Annulla</button>
        <button id="save-image-btn" style="padding: 10px 24px; border: none; background: #d4af37; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; display: none;">Salva Immagine</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const uploadZone = modal.querySelector('#upload-zone');
  const fileInput = modal.querySelector('#file-input');
  const imageDetails = modal.querySelector('#image-details');
  const saveBtn = modal.querySelector('#save-image-btn');

  let uploadedData = null;

  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '#d4af37';
    uploadZone.style.background = '#f8f9fa';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '#e1e8ed';
    uploadZone.style.background = 'transparent';
  });

  uploadZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '#e1e8ed';
    uploadZone.style.background = 'transparent';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await handleUpload(file);
    }
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await handleUpload(file);
  });

  async function handleUpload(file) {
    uploadZone.innerHTML = '<div style="font-size: 64px;">⏳</div><p style="color: #7f8c8d; font-size: 16px;">Caricamento in corso...</p>';

    try {
      const result = await CloudinaryManager.upload(file, {
        preset: 'gallery_unsigned',
        folder: 'danielecamiz/gallery'
      });

      if (result.success) {
        uploadedData = result;
        uploadZone.innerHTML = '<div style="font-size: 64px;">✅</div><p style="color: #27ae60; font-size: 16px;">Immagine caricata con successo!</p>';
        imageDetails.style.display = 'block';
        saveBtn.style.display = 'block';
      } else {
        uploadZone.innerHTML = '<div style="font-size: 64px;">❌</div><p style="color: #e74c3c;">Errore: ' + result.error + '</p>';
      }
    } catch (error) {
      uploadZone.innerHTML = '<div style="font-size: 64px;">❌</div><p style="color: #e74c3c;">Errore: ' + error.message + '</p>';
    }
  }

  saveBtn.addEventListener('click', async () => {
    if (!uploadedData) return;

    const data = {
      cloudinary_id: uploadedData.publicId,
      cloudinary_folder: uploadedData.folder,
      title_it: modal.querySelector('#title-it').value,
      title_en: modal.querySelector('#title-en').value,
      description_it: modal.querySelector('#desc-it').value,
      description_en: modal.querySelector('#desc-en').value,
      category: modal.querySelector('#category').value,
      tags: modal.querySelector('#tags').value,
      width: uploadedData.width,
      height: uploadedData.height,
      file_size: uploadedData.bytes,
      file_format: uploadedData.format,
      is_published: modal.querySelector('#is-published').checked,
      is_featured: modal.querySelector('#is-featured').checked,
      taken_date: modal.querySelector('#taken-date').value
    };

    try {
      const res = await fetch('/gallery/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showNotification('Immagine salvata con successo!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification('Errore durante il salvataggio', 'error');
      }
    } catch (error) {
      showNotification('Errore di connessione', 'error');
    }
  });
}

async function editImage(id) {
  const image = window.images.find(img => img.id === id);
  if (!image) return;

  // TODO: Implementare modal di modifica simile a uploadNewImage
  alert('Funzionalità di modifica in arrivo! ID: ' + id);
}

async function deleteImage(id) {
  if (!confirm('Sei sicuro di voler eliminare questa immagine?')) return;

  try {
    const res = await fetch(`/gallery/images/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showNotification('Immagine eliminata', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showNotification('Errore durante l\'eliminazione', 'error');
    }
  } catch (error) {
    showNotification('Errore di connessione', 'error');
  }
}

async function addNewCategory() {
  const slug = prompt('Slug della categoria (es: concerti):');
  if (!slug) return;

  const name_it = prompt('Nome in italiano:');
  const name_en = prompt('Nome in inglese:');

  if (!name_it || !name_en) return;

  try {
    const res = await fetch('/gallery/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name_it, name_en, display_order: 0 })
    });

    if (res.ok) {
      showNotification('Categoria creata!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showNotification('Errore durante la creazione', 'error');
    }
  } catch (error) {
    showNotification('Errore di connessione', 'error');
  }
}

async function editCategory(id) {
  alert('Funzionalità di modifica categoria in arrivo! ID: ' + id);
}

async function deleteCategory(id) {
  if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

  try {
    const res = await fetch(`/gallery/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showNotification('Categoria eliminata', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showNotification('Errore durante l\'eliminazione', 'error');
    }
  } catch (error) {
    showNotification('Errore di connessione', 'error');
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

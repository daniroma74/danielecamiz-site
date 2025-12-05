// landing/public/js/admin-editor.js - Editor completo con tutte le funzionalità

document.addEventListener('DOMContentLoaded', function() {
  
  // State
  let galleryImages = [];
  let hasUnsavedChanges = false;
  
  // Elements
  const saveBtn = document.getElementById('saveBtn');
  const form = document.getElementById('editorForm');
  const saveStatus = document.getElementById('saveStatus');
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.editor-section');
  const progressBar = document.querySelector('.progress-bar');

  // Initialize
  init();

  function init() {
    setupScrollSpy();
    setupNavigation();
    setupCloudinaryUploads();
    setupGallery();
    setupPerformersPhotos();
    setupFAQ();
    setupMetaCounter();
    setupPreview();
    setupTinyMCE();
    setupAutoSave();
    trackChanges();
    setupKeyboardShortcuts();
  }

  // Scroll-Spy Navigation
  function setupScrollSpy() {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const sectionName = id.replace('section-', '');

          // Update active nav item
          navItems.forEach(item => {
            if (item.dataset.section === sectionName) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });

          // Update progress bar
          updateProgressBar(entry.target);
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  }

  // Navigation Click Handler
  function setupNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', function() {
        const sectionName = this.dataset.section;
        const targetSection = document.getElementById(`section-${sectionName}`);

        if (targetSection) {
          const headerOffset = 100;
          const elementPosition = targetSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Update Progress Bar
  function updateProgressBar(currentSection) {
    if (!progressBar) return;

    const sectionIndex = Array.from(sections).indexOf(currentSection);
    const progress = ((sectionIndex + 1) / sections.length) * 100;
    progressBar.style.width = `${progress}%`;
  }

  // Keyboard Shortcuts
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveBtn) saveBtn.click();
      }
    });
  }
  
  // Cloudinary Uploads
  function setupCloudinaryUploads() {
    if (!window.CloudinaryManager) {
      console.error('CloudinaryManager non disponibile');
      return;
    }
    
    // Hero Image Upload
    const heroArea = document.getElementById('heroImageArea');
    if (heroArea) {
      heroArea.addEventListener('click', function(e) {
        if (!e.target.closest('button')) {
          uploadHeroImage();
        }
      });
    }
    
    const changeHeroBtn = document.getElementById('changeHeroBtn');
    const removeHeroBtn = document.getElementById('removeHeroBtn');
    
    if (changeHeroBtn) {
      changeHeroBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadHeroImage();
      });
    }
    
    if (removeHeroBtn) {
      removeHeroBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeHeroImage();
      });
    }
    
    // Social Image Upload
    const socialArea = document.getElementById('socialImageArea');
    if (socialArea) {
      socialArea.addEventListener('click', function(e) {
        if (!e.target.closest('button')) {
          uploadSocialImage();
        }
      });
    }
    
    const changeSocialBtn = document.getElementById('changeSocialBtn');
    const removeSocialBtn = document.getElementById('removeSocialBtn');
    
    if (changeSocialBtn) {
      changeSocialBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadSocialImage();
      });
    }
    
    if (removeSocialBtn) {
      removeSocialBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSocialImage();
      });
    }
    
    // Gallery Add Button
    const addGalleryBtn = document.getElementById('addGalleryBtn');
    if (addGalleryBtn) {
      addGalleryBtn.addEventListener('click', uploadGalleryImage);
    }
  }
  
  async function uploadHeroImage() {
    if (!window.CloudinaryManager || !window.CloudinaryManager.showImageDialog) {
      showNotification('CloudinaryManager non disponibile', 'error');
      return;
    }

    window.CloudinaryManager.showImageDialog((result) => {
      setHeroImage(result.url);
      showNotification('Hero image caricata!', 'success');
    }, {
      preset: 'poster_horizontal_unsigned',
      folder: 'danielecamiz/posters/horizontal'
    });
  }
  
  function setHeroImage(url) {
    document.getElementById('hero_image_override').value = url;
    
    const heroArea = document.getElementById('heroImageArea');
    heroArea.innerHTML = `
      <img src="${url}" alt="Hero" class="preview-image">
      <div class="image-overlay">
        <button type="button" class="btn btn-secondary btn-sm" id="changeHeroBtn">
          <i class="fas fa-sync"></i> Cambia
        </button>
        <button type="button" class="btn btn-danger btn-sm" id="removeHeroBtn">
          <i class="fas fa-trash"></i> Rimuovi
        </button>
      </div>
    `;
    
    setupCloudinaryUploads();
    hasUnsavedChanges = true;
    updateSaveButton();
  }
  
  function removeHeroImage() {
    if (!confirm('Rimuovere hero image?')) return;
    
    document.getElementById('hero_image_override').value = '';
    
    const heroArea = document.getElementById('heroImageArea');
    heroArea.innerHTML = `
      <div class="upload-placeholder">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Clicca per caricare hero image</p>
        <small>Consigliato: 1920x1080px</small>
      </div>
    `;
    
    hasUnsavedChanges = true;
    updateSaveButton();
    showNotification('Hero image rimossa', 'info');
  }
  
  async function uploadSocialImage() {
    if (!window.CloudinaryManager || !window.CloudinaryManager.showImageDialog) {
      showNotification('CloudinaryManager non disponibile', 'error');
      return;
    }

    window.CloudinaryManager.showImageDialog((result) => {
      setSocialImage(result.url);
      showNotification('Immagine social caricata!', 'success');
    }, {
      preset: 'gallery_unsigned',
      folder: 'danielecamiz/gallery'
    });
  }
  
  function setSocialImage(url) {
    document.getElementById('social_image_override').value = url;
    
    const socialArea = document.getElementById('socialImageArea');
    socialArea.innerHTML = `
      <img src="${url}" alt="Social" class="preview-image" style="max-height:200px;">
      <div class="image-overlay">
        <button type="button" class="btn btn-secondary btn-sm" id="changeSocialBtn">
          <i class="fas fa-sync"></i> Cambia
        </button>
        <button type="button" class="btn btn-danger btn-sm" id="removeSocialBtn">
          <i class="fas fa-trash"></i> Rimuovi
        </button>
      </div>
    `;
    
    setupCloudinaryUploads();
    hasUnsavedChanges = true;
    updateSaveButton();
  }
  
  function removeSocialImage() {
    if (!confirm('Rimuovere immagine social?')) return;
    
    document.getElementById('social_image_override').value = '';
    
    const socialArea = document.getElementById('socialImageArea');
    socialArea.innerHTML = `
      <div class="upload-placeholder">
        <i class="fas fa-share-alt"></i>
        <p>Clicca per caricare immagine social</p>
        <small>Usa hero o poster se vuoto</small>
      </div>
    `;
    
    hasUnsavedChanges = true;
    updateSaveButton();
    showNotification('Immagine social rimossa', 'info');
  }
  
  // Gallery Management
  function setupGallery() {
    try {
      const galleryInput = document.getElementById('gallery_images');
      const galleryData = galleryInput.value;
      galleryImages = galleryData ? JSON.parse(galleryData) : [];
      renderGallery();
    } catch (e) {
      console.error('Error loading gallery:', e);
      galleryImages = [];
    }
  }
  
  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    
    if (galleryImages.length === 0) {
      grid.innerHTML = '<p class="text-muted text-center" style="padding:2rem;">Nessuna foto in galleria</p>';
      return;
    }
    
    grid.innerHTML = galleryImages.map((url, index) => `
      <div class="gallery-item" data-index="${index}">
        <img src="${url}" alt="Gallery ${index + 1}">
        <button type="button" class="gallery-item-remove" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
    
    grid.querySelectorAll('.gallery-item-remove').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        removeGalleryImage(index);
      });
    });
    
    updateGalleryInput();
  }
  
  async function uploadGalleryImage() {
    if (!window.CloudinaryManager || !window.CloudinaryManager.showImageDialog) {
      showNotification('CloudinaryManager non disponibile', 'error');
      return;
    }

    window.CloudinaryManager.showImageDialog((result) => {
      galleryImages.push(result.url);
      renderGallery();
      hasUnsavedChanges = true;
      updateSaveButton();
      showNotification('Foto aggiunta alla galleria!', 'success');
    }, {
      preset: 'gallery_unsigned',
      folder: 'danielecamiz/gallery'
    });
  }
  
  function removeGalleryImage(index) {
    if (!confirm('Rimuovere questa foto?')) return;
    
    galleryImages.splice(index, 1);
    renderGallery();
    hasUnsavedChanges = true;
    updateSaveButton();
    showNotification('Foto rimossa', 'info');
  }
  
  function updateGalleryInput() {
    document.getElementById('gallery_images').value = JSON.stringify(galleryImages);
  }
  
  // Performers Photos Management
  function setupPerformersPhotos() {
    const container = document.getElementById('performersPhotosManager');
    if (!container) return;
    
    let photos = {};
    try {
      const input = document.getElementById('performers_photos');
      photos = input.value ? JSON.parse(input.value) : {};
    } catch (e) {
      photos = {};
    }
    
    renderPerformersPhotos(photos);
  }
  
  function renderPerformersPhotos(photos) {
    const container = document.getElementById('performersPhotosManager');
    if (!container) return;
    
    const performers = window.EVENT_DATA.performers;
    let html = '<div class="performers-photos-grid">';
    
    // Direttore
    if (performers.conductor) {
      html += renderPhotoSlot('conductor', `Direttore: ${performers.conductor}`, photos['conductor']);
    }
    
    // Orchestra
    if (performers.orchestra) {
      html += renderPhotoSlot('orchestra', `Orchestra: ${performers.orchestra}`, photos['orchestra']);
    }
    
    // Solisti
    if (performers.soloists && performers.soloists.length > 0) {
      performers.soloists.forEach((soloist, idx) => {
        const key = `soloist_${idx}`;
        html += renderPhotoSlot(key, `Solista: ${soloist.name}`, photos[key]);
      });
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Attach event listeners
    container.querySelectorAll('.photo-upload-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        uploadPerformerPhoto(this.dataset.role);
      });
    });
    
    container.querySelectorAll('.photo-remove-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        removePerformerPhoto(this.dataset.role);
      });
    });
  }
  
  function renderPhotoSlot(role, label, photoUrl) {
    return `
      <div class="performer-photo-slot">
        <div class="photo-slot-label">${label}</div>
        ${photoUrl ? `
          <div class="photo-preview">
            <img src="${photoUrl}" alt="${label}">
            <button type="button" class="photo-remove-btn" data-role="${role}">
              <i class="fas fa-times"></i>
            </button>
          </div>
        ` : `
          <div class="photo-placeholder">
            <i class="fas fa-user"></i>
            <button type="button" class="photo-upload-btn btn btn-sm btn-primary" data-role="${role}">
              <i class="fas fa-upload"></i> Carica
            </button>
          </div>
        `}
      </div>
    `;
  }
  
  async function uploadPerformerPhoto(role) {
    if (!window.CloudinaryManager || !window.CloudinaryManager.showImageDialog) {
      showNotification('CloudinaryManager non disponibile', 'error');
      return;
    }

    window.CloudinaryManager.showImageDialog((result) => {
      const photosInput = document.getElementById('performers_photos');
      const photos = JSON.parse(photosInput.value || '{}');
      photos[role] = result.url;
      photosInput.value = JSON.stringify(photos);

      renderPerformersPhotos(photos);
      hasUnsavedChanges = true;
      updateSaveButton();
      showNotification('Foto caricata!', 'success');
    }, {
      preset: 'performers_unsigned',
      folder: 'danielecamiz/performers'
    });
  }
  
  function removePerformerPhoto(role) {
    if (!confirm('Rimuovere questa foto?')) return;
    
    const photosInput = document.getElementById('performers_photos');
    const photos = JSON.parse(photosInput.value || '{}');
    delete photos[role];
    photosInput.value = JSON.stringify(photos);
    
    renderPerformersPhotos(photos);
    hasUnsavedChanges = true;
    updateSaveButton();
    showNotification('Foto rimossa', 'info');
  }
  
  // FAQ Management
  function setupFAQ() {
    const addBtn = document.getElementById('addFaqBtn');
    if (!addBtn) return;
    
    let faqs = [];
    try {
      const input = document.getElementById('faqs');
      faqs = JSON.parse(input.value || '[]');
    } catch(e) {
      faqs = [];
    }
    
    renderFAQ(faqs);
    
    addBtn.addEventListener('click', () => {
      faqs.push({ question: '', answer: '' });
      renderFAQ(faqs);
      hasUnsavedChanges = true;
      updateSaveButton();
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function renderFAQ(faqs) {
    const list = document.getElementById('faqList');

    if (faqs.length === 0) {
      list.innerHTML = '<p class="text-muted">Nessuna FAQ aggiunta</p>';
      updateFAQInput([]);
      return;
    }

    list.innerHTML = faqs.map((faq, index) => `
      <div class="faq-editor-item">
        <div class="faq-editor-header">
          <strong>Domanda ${index + 1}</strong>
          <button type="button" class="btn btn-danger btn-sm" onclick="window.removeFAQ(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="faq-editor-body">
          <div class="form-group">
            <label>Domanda</label>
            <input type="text"
                   class="form-control"
                   value="${escapeHtml(faq.question)}"
                   onchange="window.updateFAQItem(${index}, 'question', this.value)"
                   placeholder="Es: È obbligatorio prenotare?">
          </div>
          <div class="form-group">
            <label>Risposta</label>
            <textarea class="form-control"
                      rows="3"
                      onchange="window.updateFAQItem(${index}, 'answer', this.value)"
                      placeholder="Es: No, è consigliato...">${escapeHtml(faq.answer)}</textarea>
          </div>
        </div>
      </div>
    `).join('');

    updateFAQInput(faqs);
  }
  
  window.updateFAQItem = function(index, field, value) {
    const input = document.getElementById('faqs');
    const faqs = JSON.parse(input.value || '[]');
    faqs[index][field] = value;
    updateFAQInput(faqs);
    hasUnsavedChanges = true;
    updateSaveButton();
  };
  
  window.removeFAQ = function(index) {
    if (!confirm('Rimuovere questa FAQ?')) return;
    
    const input = document.getElementById('faqs');
    const faqs = JSON.parse(input.value || '[]');
    faqs.splice(index, 1);
    renderFAQ(faqs);
    hasUnsavedChanges = true;
    updateSaveButton();
  };
  
  function updateFAQInput(faqs) {
    document.getElementById('faqs').value = JSON.stringify(faqs);
  }
  
  // Meta Description Counter
  function setupMetaCounter() {
    const metaTextarea = document.getElementById('meta_description');
    const counter = document.getElementById('metaCharCount');
    
    if (metaTextarea && counter) {
      function updateCount() {
        const length = metaTextarea.value.length;
        counter.textContent = length;
        counter.style.color = length > 160 ? 'var(--danger)' : '#666';
      }
      
      metaTextarea.addEventListener('input', updateCount);
      updateCount();
    }
  }
  
  // Preview Device Switcher
  function setupPreview() {
    const deviceBtns = document.querySelectorAll('.device-btn');
    const iframe = document.getElementById('previewFrame');
    
    if (!iframe) return;
    
    deviceBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const device = this.dataset.device;
        
        deviceBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        iframe.className = `preview-iframe ${device}`;
      });
    });
  }
  
  // TinyMCE Setup
  function setupTinyMCE() {
    // Verifica che l'elemento esista prima di inizializzare
    const descriptionField = document.getElementById('event_description');
    if (!descriptionField) {
      console.error('TinyMCE: elemento #event_description non trovato');
      return;
    }

    // Usa setTimeout per assicurarsi che il DOM sia completamente pronto
    setTimeout(() => {
      if (typeof window.SharedEditor === 'undefined') {
        console.warn('SharedEditor non disponibile, uso TinyMCE base');

        if (typeof tinymce !== 'undefined') {
          tinymce.init({
            selector: '#event_description',
            height: 400,
            menubar: false,
            plugins: 'lists link code',
            toolbar: 'undo redo | formatselect | bold italic | bullist numlist | link | code',
            license_key: 'gpl',
            content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; }',
            setup: function(editor) {
              editor.on('change', function() {
                hasUnsavedChanges = true;
                updateSaveButton();
              });
            }
          });
        }
        return;
      }

      window.SharedEditor.init('#event_description', 'blog', {
        height: 400,
        getUploadOptions: () => ({
          preset: 'gallery_unsigned',
          folder: 'danielecamiz/gallery'
        }),
        setup: function(editor) {
          editor.on('change', function() {
            hasUnsavedChanges = true;
            updateSaveButton();
          });
        }
      });
    }, 100);
  }
  
  // Auto-save every 2 minutes
  function setupAutoSave() {
    setInterval(() => {
      if (hasUnsavedChanges) {
        saveForm(true);
      }
    }, 120000);
  }
  
  // Track Changes
  function trackChanges() {
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        hasUnsavedChanges = true;
        updateSaveButton();
      });
    });
  }
  
  function updateSaveButton() {
    if (!saveBtn) return;

    if (hasUnsavedChanges) {
      saveBtn.classList.add('has-changes');
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva';

      // Update status badge
      if (saveStatus) {
        saveStatus.textContent = 'Non salvato';
        saveStatus.className = 'status-badge unsaved';
      }
    } else {
      saveBtn.classList.remove('has-changes');
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvato';

      // Update status badge
      if (saveStatus) {
        saveStatus.textContent = 'Salvato';
        saveStatus.className = 'status-badge saved';
      }
    }
  }
  
  // Save Form
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveForm(false));
  }
  
  async function saveForm(isAutoSave = false) {
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    
    // Converti FormData in oggetto
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    // Recupera contenuto da TinyMCE
    if (window.tinymce && window.tinymce.get('event_description')) {
      data.event_description = window.tinymce.get('event_description').getContent();
    }
    
    // Gestisci checkbox
    data.show_hero_title = document.getElementById('show_hero_title')?.checked ? 1 : 0;
    data.show_counter = document.getElementById('show_counter')?.checked ? 1 : 0;
    data.show_share_buttons = document.getElementById('show_share_buttons')?.checked ? 1 : 0;
    data.booking_enabled = document.getElementById('booking_enabled')?.checked ? 1 : 0;
    
    const slug = window.EVENT_DATA?.slug;
    if (!slug) {
      showNotification('Errore: slug mancante', 'error');
      return;
    }
    
    // Update UI for saving state
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    }

    if (saveStatus) {
      saveStatus.textContent = 'Salvataggio...';
      saveStatus.className = 'status-badge saving';
    }

    try {
      const response = await fetch(`/save/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        hasUnsavedChanges = false;
        updateSaveButton();

        if (!isAutoSave) {
          showNotification('Modifiche salvate con successo', 'success');

          // Reload preview
          const iframe = document.getElementById('previewFrame');
          if (iframe) {
            setTimeout(() => {
              iframe.src = iframe.src;
            }, 500);
          }
        }
      } else {
        showNotification('Errore: ' + result.message, 'error');

        if (saveStatus) {
          saveStatus.textContent = 'Errore';
          saveStatus.className = 'status-badge error';
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Errore di connessione', 'error');

      if (saveStatus) {
        saveStatus.textContent = 'Errore';
        saveStatus.className = 'status-badge error';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        updateSaveButton();
      }
    }
  }
  
  // Notifications
  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // Prevent navigation with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Hai modifiche non salvate. Vuoi davvero uscire?';
    }
  });
  
});
// news-admin/public/js/news-editor.js

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
  });
});

// Auto-generate slug from title
document.getElementById('title_it')?.addEventListener('input', function(e) {
  const slugField = document.getElementById('slug');
  if (!slugField.value || slugField.dataset.manuallyEdited !== 'true') {
    const slug = generateSlug(e.target.value);
    slugField.value = slug;
    document.getElementById('slugPreview').textContent = slug;
  }
});

document.getElementById('slug')?.addEventListener('input', function(e) {
  e.target.dataset.manuallyEdited = 'true';
  document.getElementById('slugPreview').textContent = e.target.value;
});

// SEO preview update
['title_it', 'excerpt_it', 'meta_title_it', 'meta_description_it'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateSEOPreview);
});

function updateSEOPreview() {
  const title = document.getElementById('meta_title_it')?.value || 
                document.getElementById('title_it')?.value || 
                'Titolo dell\'articolo';
  
  const description = document.getElementById('meta_description_it')?.value || 
                      document.getElementById('excerpt_it')?.value || 
                      'Descrizione dell\'articolo...';
  
  document.getElementById('previewTitle').textContent = title;
  document.getElementById('previewDescription').textContent = description;
}

// Form submission
document.getElementById('newsForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  await savePost('published');
});

async function saveDraft() {
  await savePost('draft');
}

async function savePost(status) {
  const postId = document.getElementById('postId')?.value;
  const isNew = !postId;
  
  const formData = collectFormData();
  formData.status = status || formData.status;
  
  try {
    const url = isNew ? '/news' : `/news/${postId}`;
    const method = isNew ? 'POST' : 'PUT';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      const result = await response.json();
      alert(status === 'draft' ? '💾 Bozza salvata' : '✅ Articolo salvato');
      
      if (isNew && result.id) {
        window.location.href = `/news/${result.id}/edit`;
      } else {
        window.location.reload();
      }
    } else {
      const error = await response.json();
      alert(`❌ Errore: ${error.error || 'Errore sconosciuto'}`);
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('❌ Errore di connessione');
  }
}

function collectFormData() {
  const tags = document.getElementById('tags')?.value || '';
  const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
  
  const providers = {};
  document.querySelectorAll('[data-provider]').forEach(cb => {
    if (cb.checked) providers[cb.dataset.provider] = true;
  });
  
  const messages = {};
  ['linkedin', 'facebook', 'threads'].forEach(p => {
    const val = document.getElementById(`msg_${p}`)?.value || '';
    if (val.trim()) messages[p] = val.trim();
  });
  
  const galleryInput = document.getElementById('gallery_images')?.value || '[]';
  const gallery = JSON.parse(galleryInput);
  
  return {
    slug: document.getElementById('slug')?.value,
    status: document.getElementById('status')?.value,
    title_it: document.getElementById('title_it')?.value,
    title_en: document.getElementById('title_en')?.value || null,
    excerpt_it: document.getElementById('excerpt_it')?.value || null,
    excerpt_en: document.getElementById('excerpt_en')?.value || null,
    content_it: document.getElementById('content_it')?.value,
    content_en: document.getElementById('content_en')?.value || null,
    cover_image: document.getElementById('cover_image')?.value || null,
    gallery_images: gallery,
    category: document.getElementById('category')?.value,
    tags: tagsArray,
    author: document.getElementById('author')?.value,
    publish_date: document.getElementById('publish_date')?.value || null,
    meta_title_it: document.getElementById('meta_title_it')?.value || null,
    meta_title_en: document.getElementById('meta_title_en')?.value || null,
    meta_description_it: document.getElementById('meta_description_it')?.value || null,
    meta_description_en: document.getElementById('meta_description_en')?.value || null,
    social_share_on_publish: document.getElementById('social_share_on_publish')?.checked || false,
    social_providers: providers,
    social_messages: messages
  };
}

// Cloudinary upload
async function uploadCover() {
  const file = await selectFile('image/*');
  if (!file) return;
  
  const url = await uploadToCloudinary(file, 'news/covers');
  if (url) {
    document.getElementById('cover_image').value = url;
    displayCoverPreview(url);
  }
}

async function uploadGallery() {
  const files = await selectFiles('image/*');
  if (!files || files.length === 0) return;
  
  const urls = [];
  for (const file of files) {
    const url = await uploadToCloudinary(file, 'news/galleries');
    if (url) urls.push(url);
  }
  
  if (urls.length > 0) {
    const currentGallery = JSON.parse(document.getElementById('gallery_images')?.value || '[]');
    const updatedGallery = [...currentGallery, ...urls];
    document.getElementById('gallery_images').value = JSON.stringify(updatedGallery);
    updateGalleryPreview(updatedGallery);
  }
}

async function uploadToCloudinary(file, folder) {
  if (!window.CloudinaryManager) {
    alert('❌ Cloudinary Manager non disponibile');
    return null;
  }
  
  try {
    const result = await window.CloudinaryManager.upload(file, {
      preset: 'news_uploads',
      folder: folder
    });
    
    if (result.success) {
      return result.url;
    } else {
      alert('❌ Errore upload: ' + (result.error || 'Errore sconosciuto'));
      return null;
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('❌ Errore di connessione');
    return null;
  }
}

function selectFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files[0]);
    input.click();
  });
}

function selectFiles(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files));
    input.click();
  });
}

function displayCoverPreview(url) {
  const preview = document.getElementById('coverPreview');
  preview.innerHTML = `
    <img src="${url}" alt="Cover">
    <button type="button" class="btn-remove" onclick="removeCover()">✕</button>
  `;
}

function removeCover() {
  document.getElementById('cover_image').value = '';
  document.getElementById('coverPreview').innerHTML = `
    <div class="placeholder">
      <p>📷 Nessuna immagine</p>
      <p class="help-text">Clicca per caricare</p>
    </div>
  `;
}

function updateGalleryPreview(images) {
  const container = document.getElementById('galleryPreview');
  container.innerHTML = images.map((img, index) => `
    <div class="gallery-item" data-index="${index}">
      <img src="${img}" alt="">
      <button type="button" class="btn-remove" onclick="removeGalleryImage(${index})">✕</button>
    </div>
  `).join('');
}

function removeGalleryImage(index) {
  const gallery = JSON.parse(document.getElementById('gallery_images')?.value || '[]');
  gallery.splice(index, 1);
  document.getElementById('gallery_images').value = JSON.stringify(gallery);
  updateGalleryPreview(gallery);
}

// Publish to social media
async function publishToSocial() {
  const postId = document.getElementById('postId')?.value;
  if (!postId) {
    alert('Salva prima l\'articolo');
    return;
  }
  
  const providers = [];
  document.querySelectorAll('[data-provider]:checked').forEach(cb => {
    providers.push(cb.dataset.provider);
  });
  
  if (providers.length === 0) {
    alert('Seleziona almeno una piattaforma');
    return;
  }
  
  const messages = {};
  providers.forEach(p => {
    const val = document.getElementById(`msg_${p}`)?.value || '';
    if (val.trim()) messages[p] = val.trim();
  });
  
  if (!confirm(`Pubblicare su ${providers.join(', ')}?`)) return;
  
  try {
    const response = await fetch(`/news/${postId}/publish-social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers, messages })
    });
    
    if (response.ok) {
      const result = await response.json();
      alert('✅ Pubblicazione completata!\n\n' + JSON.stringify(result.results, null, 2));
      window.location.reload();
    } else {
      const error = await response.json();
      alert(`❌ Errore: ${error.error || 'Errore sconosciuto'}`);
    }
  } catch (error) {
    console.error('Publish error:', error);
    alert('❌ Errore di connessione');
  }
}

// Pubblica post
async function publishPost() {
  const postId = document.getElementById('postId')?.value;
  if (!postId) {
    alert('Impossibile pubblicare: post non trovato');
    return;
  }
  
  if (!confirm('Pubblicare questo articolo?')) return;
  
  try {
    const response = await fetch(`/news/${postId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      alert('✅ Articolo pubblicato!');
      window.location.reload();
    } else {
      const error = await response.json();
      alert(`❌ Errore: ${error.error || 'Errore sconosciuto'}`);
    }
  } catch (error) {
    console.error('Publish error:', error);
    alert('❌ Errore di connessione');
  }
}

// Depubblica post
async function unpublishPost() {
  const postId = document.getElementById('postId')?.value;
  if (!postId) {
    alert('Impossibile depubblicare: post non trovato');
    return;
  }
  
  if (!confirm('Depubblicare questo articolo? Diventerà una bozza.')) return;
  
  try {
    const response = await fetch(`/news/${postId}/unpublish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      alert('✅ Articolo depubblicato (ora è una bozza)');
      window.location.reload();
    } else {
      const error = await response.json();
      alert(`❌ Errore: ${error.error || 'Errore sconosciuto'}`);
    }
  } catch (error) {
    console.error('Unpublish error:', error);
    alert('❌ Errore di connessione');
  }
}

// Utility functions
function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Character counters
document.querySelectorAll('textarea[maxlength], input[maxlength]').forEach(el => {
  const max = el.maxLength;
  if (max > 0) {
    const counter = document.createElement('small');
    counter.className = 'char-counter';
    counter.textContent = `${el.value.length}/${max}`;
    el.parentElement.appendChild(counter);
    
    el.addEventListener('input', () => {
      counter.textContent = `${el.value.length}/${max}`;
      if (el.value.length > max * 0.9) {
        counter.style.color = 'orange';
      }
      if (el.value.length >= max) {
        counter.style.color = 'red';
      }
    });
  }
});

// Auto-save draft every 2 minutes
let autoSaveTimer = null;
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  
  autoSaveTimer = setInterval(() => {
    const postId = document.getElementById('postId')?.value;
    if (postId) {
      console.log('Auto-saving draft...');
      saveDraft().catch(err => console.error('Auto-save failed:', err));
    }
  }, 120000); // 2 minuti
}

// Start auto-save if editing existing post
if (document.getElementById('postId')?.value) {
  startAutoSave();
}

// Warn before leaving with unsaved changes
let formChanged = false;
document.getElementById('newsForm')?.addEventListener('input', () => {
  formChanged = true;
});

window.addEventListener('beforeunload', (e) => {
  if (formChanged) {
    e.preventDefault();
    e.returnValue = 'Hai modifiche non salvate. Sei sicuro di voler uscire?';
  }
});

// Reset flag on successful save
const originalSavePost = savePost;
savePost = async function(...args) {
  const result = await originalSavePost(...args);
  formChanged = false;
  return result;
};
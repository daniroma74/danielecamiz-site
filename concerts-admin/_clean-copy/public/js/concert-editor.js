// concerts-admin/public/js/concert-editor.js

document.addEventListener('DOMContentLoaded', function() {
  
  let soloists = [];
  let cloudinaryWidget = null;
  
  init();
  
  function init() {
    loadExistingPerformers();
    setupEventListeners();
    setupCloudinaryWidget();
    setupWorkSearch();
    setupQuickAddWork();
    setupFutureAutoDetect();
    initTinyMCE();
  }
  
  // CERCA questa funzione in concert-editor.js e SOSTITUISCI

function initTinyMCE() {
  if (typeof window.SharedEditor === 'undefined') {
    console.error('SharedEditor non disponibile');
    return;
  }

  // Editor semplice per descrizione breve (senza upload immagini)
  window.SharedEditor.init('#description_short', 'simple', {
    height: 200,
    toolbar: 'bold italic | bullist numlist'
  });

  // Editor completo per note di programma (CON upload immagini in gallery)
  window.SharedEditor.init('#program_notes', 'default', {
    height: 350,
    getUploadOptions: () => ({
      preset: 'gallery_unsigned',           // ✅ PRESET ESISTENTE
      folder: 'danielecamiz/gallery'        // ✅ FOLDER GIÀ CONFIGURATO
    })
  });

  // Editor completo per dettagli di programma (CON upload immagini in gallery)
  window.SharedEditor.init('#program_details', 'default', {
    height: 350,
    getUploadOptions: () => ({
      preset: 'gallery_unsigned',           // ✅ PRESET ESISTENTE
      folder: 'danielecamiz/gallery'        // ✅ FOLDER GIÀ CONFIGURATO
    })
  });
}
  
  function loadExistingPerformers() {
    const concertId = window.CONCERT_ID;
    if (!concertId) return;
    
    console.log('Loading performers for concert:', concertId);
    
    fetch(`/api/concerts/${concertId}/performers`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load performers');
        return r.json();
      })
      .then(data => {
        console.log('Performers loaded:', data);
        
        if (data.success && data.performers) {
          const conductorInput = document.getElementById('conductor_name');
          const orchestraInput = document.getElementById('orchestra_name');
          
          if (data.performers.conductor && conductorInput) {
            conductorInput.value = data.performers.conductor;
          }
          if (data.performers.orchestra && orchestraInput) {
            orchestraInput.value = data.performers.orchestra;
          }
          
          soloists = data.performers.soloists || [];
          renderSoloists();
        }
      })
      .catch(err => {
        console.error('Errore caricamento performers:', err);
        if (window.PERFORMERS_DATA) {
          const performersData = window.PERFORMERS_DATA;
          if (performersData.conductor) {
            document.getElementById('conductor_name').value = performersData.conductor;
          }
          if (performersData.orchestra) {
            document.getElementById('orchestra_name').value = performersData.orchestra;
          }
          if (performersData.soloists) {
            soloists = performersData.soloists;
            renderSoloists();
          }
        }
      });
  }
  
  function setupEventListeners() {
    document.getElementById('concertForm').addEventListener('submit', handleSubmit);
    document.getElementById('addSoloistBtn').addEventListener('click', addSoloist);
    
    const uploadBtn = document.getElementById('uploadPosterBtn');
    const removeBtn = document.getElementById('removePosterBtn');
    
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        if (cloudinaryWidget) cloudinaryWidget.open();
      });
    }
    
    if (removeBtn) {
      removeBtn.addEventListener('click', removePoster);
    }
    
    const posterInput = document.getElementById('poster_cloudinary_id');
    if (posterInput && posterInput.value) {
      document.getElementById('removePosterBtn').style.display = 'inline-block';
    }
  }
  
  function setupFutureAutoDetect() {
    const dateInput = document.getElementById('date');
    const slugGroup = document.querySelector('#slug')?.closest('.form-group');
    const indicator = document.getElementById('concertTypeIndicator');
    const indicatorText = document.getElementById('concertTypeText');
    
    if (!dateInput) return;
    
    function updateFutureStatus() {
      const selectedDate = new Date(dateInput.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isFuture = selectedDate >= today;
      
      if (indicator && indicatorText) {
        indicator.className = 'concert-type-indicator ' + (isFuture ? 'future' : 'past');
        indicatorText.textContent = isFuture 
          ? 'Concerto Futuro (con Landing)' 
          : 'Concerto Passato (solo Archivio)';
      }
      
      if (slugGroup) {
        slugGroup.style.display = isFuture ? 'block' : 'none';
      }
    }
    
    dateInput.addEventListener('change', updateFutureStatus);
    updateFutureStatus();
  }
  
  // CERCA questa sezione in concert-editor.js e SOSTITUISCI

function setupCloudinaryWidget() {
  if (typeof cloudinary === 'undefined') {
    console.error('Cloudinary widget non disponibile');
    return;
  }

  cloudinaryWidget = cloudinary.createUploadWidget({
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'poster_vertical_unsigned',  // ✅ PRESET ESISTENTE
    folder: 'danielecamiz/posters/vertical',    // ✅ FOLDER GIÀ CONFIGURATO
    sources: ['local', 'url'],
    multiple: false,
    resourceType: 'image',
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10000000,
    cropping: false,
    styles: {
      palette: {
        window: "#ffffff",
        windowBorder: "#90A0B3",
        tabIcon: "#0078FF",
        menuIcons: "#5A616A",
        textDark: "#000000",
        textLight: "#FFFFFF",
        link: "#0078FF",
        action: "#FF620C",
        inactiveTabIcon: "#0E2F5A",
        error: "#F44235",
        inProgress: "#0078FF",
        complete: "#20B832",
        sourceBg: "#E4EBF1"
      }
    }
  }, (error, result) => {
    if (!error && result && result.event === "success") {
      const publicId = result.info.public_id;
      const secureUrl = result.info.secure_url;
      
      document.getElementById('poster_cloudinary_id').value = publicId;
      document.getElementById('poster_local_filename').value = '';
      
      const preview = document.getElementById('posterPreview');
      preview.innerHTML = `<img src="${secureUrl}" alt="Poster">`;
      
      document.getElementById('removePosterBtn').style.display = 'inline-block';
      
      showNotification('Poster caricato con successo!', 'success');
    }
  });
}
  
  function removePoster() {
    if (!confirm('Rimuovere il poster?')) return;
    
    document.getElementById('poster_cloudinary_id').value = '';
    document.getElementById('poster_local_filename').value = '';
    document.getElementById('posterPreview').innerHTML = `
      <div class="poster-placeholder">
        <i class="fas fa-image"></i>
        <p>Nessun poster caricato</p>
      </div>
    `;
    document.getElementById('removePosterBtn').style.display = 'none';
    
    showNotification('Poster rimosso', 'success');
  }
  
  function setupWorkSearch() {
    const searchInput = document.getElementById('worksSearch');
    const worksList = document.getElementById('worksList');
    
    if (!searchInput || !worksList) return;
    
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const items = worksList.querySelectorAll('.work-item');
      
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
      });
    });
  }
  
  function setupQuickAddWork() {
    const btn = document.getElementById('quickAddWorkBtn');
    const modal = document.getElementById('quickAddWorkModal');
    const form = document.getElementById('quickAddWorkForm');
    const typeRadios = document.querySelectorAll('input[name="work_type"]');
    const completeFields = document.getElementById('completeWorkFields');
    const movementFields = document.getElementById('movementFields');
    const movementSearch = document.getElementById('movement_work_search');
    const movementResults = document.getElementById('movementWorksResults');
    const movementDetails = document.getElementById('movementDetailsFields');
    
    const composerInput = document.getElementById('quick_composer');
    const composerSuggestions = document.getElementById('composerSuggestions');
    const composerIdInput = document.getElementById('selected_composer_id');
    
    if (!btn || !modal || !form) return;
    
    btn.addEventListener('click', () => {
      modal.classList.add('active');
    });
    
    modal.querySelectorAll('.modal-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
        completeFields.style.display = 'block';
        movementFields.style.display = 'none';
        movementDetails.style.display = 'none';
        movementResults.innerHTML = '';
        composerSuggestions.innerHTML = '';
        composerIdInput.value = '';
      });
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        form.reset();
      }
    });
    
    let composerTimeout;
    composerInput?.addEventListener('input', (e) => {
      clearTimeout(composerTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        composerSuggestions.innerHTML = '';
        composerIdInput.value = '';
        return;
      }
      
      composerTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/composers/search?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          if (data.success && data.composers.length > 0) {
            composerSuggestions.innerHTML = data.composers.map(c => `
              <div class="autocomplete-item" data-composer-id="${c.id}" data-composer-name="${c.full_name}">
                <strong>${c.full_name}</strong>
                ${c.short_name !== c.full_name ? `<small>${c.short_name}</small>` : ''}
              </div>
            `).join('');
            
            composerSuggestions.querySelectorAll('.autocomplete-item').forEach(item => {
              item.addEventListener('click', () => {
                composerIdInput.value = item.dataset.composerId;
                composerInput.value = item.dataset.composerName;
                composerSuggestions.innerHTML = '';
              });
            });
          } else {
            composerSuggestions.innerHTML = '<div class="autocomplete-item text-muted">Nessun compositore trovato - Verrà creato nuovo</div>';
          }
        } catch (error) {
          console.error('Errore ricerca compositori:', error);
        }
      }, 300);
    });
    
    document.addEventListener('click', (e) => {
      if (!composerInput?.contains(e.target) && !composerSuggestions?.contains(e.target)) {
        composerSuggestions.innerHTML = '';
      }
    });
    
    typeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'complete') {
          completeFields.style.display = 'block';
          movementFields.style.display = 'none';
          movementDetails.style.display = 'none';
        } else {
          completeFields.style.display = 'none';
          movementFields.style.display = 'block';
        }
      });
    });
    
    let searchTimeout;
    movementSearch?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        movementResults.innerHTML = '';
        movementDetails.style.display = 'none';
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/repertoire/search?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          if (data.success && data.works.length > 0) {
            movementResults.innerHTML = data.works.map(work => `
              <div class="search-result-item" data-work-id="${work.id}">
                <strong>${work.title}</strong>
                <small>${work.composer_name}</small>
              </div>
            `).join('');
            
            movementResults.querySelectorAll('.search-result-item').forEach(item => {
              item.addEventListener('click', () => {
                const workId = item.dataset.workId;
                const workTitle = item.querySelector('strong').textContent;
                
                document.getElementById('selected_work_id').value = workId;
                movementSearch.value = workTitle;
                movementResults.innerHTML = '';
                movementDetails.style.display = 'block';
              });
            });
          } else {
            movementResults.innerHTML = '<p class="text-muted">Nessun brano trovato</p>';
          }
        } catch (error) {
          console.error('Errore ricerca:', error);
        }
      }, 300);
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creazione...';
      
      try {
        const workType = form.querySelector('input[name="work_type"]:checked').value;
        
        if (workType === 'complete') {
          await handleAddCompleteWork();
        } else {
          await handleAddMovement();
        }
        
        modal.classList.remove('active');
        form.reset();
        showNotification('Aggiunto con successo!', 'success');
        
        setTimeout(() => window.location.reload(), 1000);
        
      } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore durante il salvataggio', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Aggiungi';
      }
    });
  }
  
  async function handleAddCompleteWork() {
    const composerIdInput = document.getElementById('selected_composer_id').value;
    const composerNameInput = document.getElementById('quick_composer').value.trim();
    const title = document.getElementById('quick_title').value.trim();
    const catalogue = document.getElementById('quick_catalogue').value.trim();
    const key = document.getElementById('quick_key').value.trim();
    const category = document.getElementById('quick_category').value;
    
    if (!composerNameInput || !title) {
      throw new Error('Compositore e titolo obbligatori');
    }
    
    const composerId = composerIdInput 
      ? parseInt(composerIdInput) 
      : await findOrCreateComposer(composerNameInput);
    
    const response = await fetch('/api/repertoire/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        composer_id: composerId,
        category_id: parseInt(category),
        title: title,
        catalogue: catalogue || null,
        work_key: key || null
      })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Errore salvataggio');
    }
    
    return result.work_id;
  }
  
  async function handleAddMovement() {
    const workId = document.getElementById('selected_work_id').value;
    const movementNumber = document.getElementById('movement_number').value;
    const movementTitle = document.getElementById('movement_title').value.trim();
    const movementTempo = document.getElementById('movement_tempo').value.trim();
    const movementDuration = document.getElementById('movement_duration').value;
    
    if (!workId || !movementNumber) {
      throw new Error('Brano e numero movimento obbligatori');
    }
    
    const response = await fetch('/api/repertoire/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_id: parseInt(workId),
        movement_number: parseInt(movementNumber),
        title: movementTitle || null,
        tempo: movementTempo || null,
        duration_minutes: movementDuration ? parseInt(movementDuration) : null
      })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Errore salvataggio movimento');
    }
    
    return result.movement_id;
  }
  
  async function findOrCreateComposer(composerName) {
    const searchResponse = await fetch(`/api/composers/search?q=${encodeURIComponent(composerName)}`);
    const searchData = await searchResponse.json();
    
    if (searchData.success && searchData.composers.length > 0) {
      const exact = searchData.composers.find(c => 
        c.full_name.toLowerCase() === composerName.toLowerCase()
      );
      if (exact) return exact.id;
      
      if (searchData.composers.length === 1) {
        return searchData.composers[0].id;
      }
    }
    
    const createResponse = await fetch('/api/composers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: composerName,
        short_name: composerName.split(' ').pop()
      })
    });
    
    const createData = await createResponse.json();
    if (!createData.success) {
      throw new Error('Errore creazione compositore');
    }
    
    return createData.composer_id;
  }
  
  function addSoloist() {
    const container = document.getElementById('soloists_container');
    const index = soloists.length;
    
    soloists.push({ name: '', instrument: '' });
    
    const soloistDiv = document.createElement('div');
    soloistDiv.className = 'soloist-row';
    soloistDiv.dataset.index = index;
    soloistDiv.innerHTML = `
      <input type="text" 
             class="soloist-name" 
             placeholder="Nome solista"
             data-index="${index}">
      <input type="text" 
             class="soloist-instrument" 
             placeholder="Strumento"
             data-index="${index}">
      <button type="button" class="btn btn-sm btn-danger remove-soloist" data-index="${index}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    container.appendChild(soloistDiv);
    
    soloistDiv.querySelector('.remove-soloist').addEventListener('click', (e) => {
      const idx = parseInt(e.target.closest('.remove-soloist').dataset.index);
      soloists.splice(idx, 1);
      renderSoloists();
    });
    
    soloistDiv.querySelector('.soloist-name').addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      soloists[idx].name = e.target.value;
    });
    
    soloistDiv.querySelector('.soloist-instrument').addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      soloists[idx].instrument = e.target.value;
    });
  }
  
  function renderSoloists() {
    const container = document.getElementById('soloists_container');
    container.innerHTML = '';
    
    soloists.forEach((soloist, index) => {
      const soloistDiv = document.createElement('div');
      soloistDiv.className = 'soloist-row';
      soloistDiv.dataset.index = index;
      soloistDiv.innerHTML = `
        <input type="text" 
               class="soloist-name" 
               placeholder="Nome solista"
               value="${soloist.name || ''}"
               data-index="${index}">
        <input type="text" 
               class="soloist-instrument" 
               placeholder="Strumento"
               value="${soloist.instrument || ''}"
               data-index="${index}">
        <button type="button" class="btn btn-sm btn-danger remove-soloist" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      `;
      
      container.appendChild(soloistDiv);
      
      soloistDiv.querySelector('.remove-soloist').addEventListener('click', () => {
        soloists.splice(index, 1);
        renderSoloists();
      });
      
      soloistDiv.querySelector('.soloist-name').addEventListener('input', (e) => {
        soloists[index].name = e.target.value;
      });
      
      soloistDiv.querySelector('.soloist-instrument').addEventListener('input', (e) => {
        soloists[index].instrument = e.target.value;
      });
    });
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    data.conductor_name = document.getElementById('conductor_name')?.value || '';
    data.orchestra_name = document.getElementById('orchestra_name')?.value || '';
    
    data.soloists = JSON.stringify(soloists);
    
    const selectedWorks = Array.from(
      document.querySelectorAll('input[name="selected_works"]:checked')
    ).map(cb => cb.value);
    data.selected_works = JSON.stringify(selectedWorks);
    
    if (typeof tinymce !== 'undefined') {
      const shortEditor = tinymce.get('description_short');
      const notesEditor = tinymce.get('program_notes');
      const detailsEditor = tinymce.get('program_details');
      
      data.description_short = shortEditor ? shortEditor.getContent() : '';
      data.program_notes = notesEditor ? notesEditor.getContent() : '';
      data.program_details = detailsEditor ? detailsEditor.getContent() : '';
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    
    console.log('Submitting concert data:', data);
    
    try {
      const url = data.id ? `/api/concerts/${data.id}` : '/api/concerts';
      const method = data.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showNotification('Concerto salvato con successo!', 'success');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else {
        throw new Error(result.error || result.message || 'Errore salvataggio');
      }
      
    } catch (error) {
      console.error('Errore salvataggio:', error);
      showNotification(`Errore: ${error.message}`, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Salva Concerto';
    }
  }
  
  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
});
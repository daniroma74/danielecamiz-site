// concerts-admin/public/js/concert-editor.js

class ConcertEditor {
  constructor() {
    this.selectedWorks = [];
    this.soloists = [];
    this.composers = [];
    this.allWorks = [];
    this.currentWorkId = null;
    this.currentComposerId = null;
    this.posterVerticalWidget = null;
    this.posterHorizontalWidget = null;
  }
  
  async init() {
    console.log('🎵 Inizializzazione ConcertEditor...');
    
    await this.loadInitialData();
    this.attachEventListeners();
    this.updateSlugPreview();
    
    setTimeout(() => {
      if (typeof cloudinary !== 'undefined') {
        this.initCloudinaryWidgets();
      } else {
        console.error('❌ Cloudinary non caricato!');
      }
      
      if (typeof tinymce !== 'undefined') {
        this.initTinyMCE();
      } else {
        console.error('❌ TinyMCE non caricato!');
      }
    }, 500);
    
    console.log('✅ ConcertEditor inizializzato');
  }
  
  async loadInitialData() {
  try {
    console.log('📡 Carico composers...');
    const composersRes = await fetch('/api/composers');
    const composersData = await composersRes.json();
    console.log('📡 Risposta API composers:', composersData);
    if (composersData.success) {
      this.composers = composersData.composers;
      console.log('✅ Compositori caricati:', this.composers.length);
      console.log('📝 Primi 3 compositori:', this.composers.slice(0, 3).map(c => c.full_name));

      // Aggiorna placeholder per indicare che i dati sono pronti
      const searchInput = document.getElementById('composerSearchQuick');
      if (searchInput) {
        searchInput.placeholder = `Cerca tra ${this.composers.length} compositori...`;
      }
    } else {
      console.error('❌ Errore caricamento compositori:', composersData);
    }

    console.log('📡 Carico works...');
    const worksRes = await fetch('/api/repertoire/search?limit=1000');
    const worksData = await worksRes.json();
    if (worksData.success) {
      this.allWorks = worksData.works;
      console.log('✅ Opere caricate:', this.allWorks.length);
    } else {
      console.error('❌ Errore caricamento opere:', worksData);
    }
    
    // ✅ PRIMA: Carica solisti
    const soloistsData = document.getElementById('soloistsData');
    if (soloistsData && soloistsData.value) {
      this.soloists = JSON.parse(soloistsData.value);
      console.log('✅ Solisti caricati:', this.soloists);
      this.renderSoloists();
    }
    
    // ✅ POI: Carica selected works (che usa i solisti)
    const selectedWorksData = document.getElementById('selectedWorksData');
    if (selectedWorksData && selectedWorksData.value) {
      this.selectedWorks = JSON.parse(selectedWorksData.value);
      this.selectedWorks.forEach(w => {
        if (!w.soloist_ids) {
          w.soloist_ids = w.soloist_id ? [w.soloist_id] : [];
        }
      });
      console.log('✅ Selected works caricati:', this.selectedWorks.length);
      this.renderSelectedWorks();
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}
  
  attachEventListeners() {
    const form = document.getElementById('concertForm');
    if (form) {
      form.addEventListener('submit', (e) => this.saveConcert(e));
    }
    
    const titleInput = document.getElementById('title');
    const slugInput = document.getElementById('slug');
    if (titleInput && slugInput) {
      titleInput.addEventListener('input', () => this.updateSlugPreview());
      slugInput.addEventListener('input', () => this.updateSlugPreview());
    }
    
    const dateInput = document.getElementById('date');
    if (dateInput) {
      dateInput.addEventListener('change', () => this.updateConcertType());
      this.updateConcertType();
    }
    
    const addSoloistBtn = document.getElementById('addSoloist');
    if (addSoloistBtn) {
      addSoloistBtn.addEventListener('click', () => this.addSoloist());
    }
  }
  
  initCloudinaryWidgets() {
    console.log('☁️ Init CloudinaryManager...');

    // Widget VERTICALE
    const btnV = document.getElementById('uploadPosterVertical');
    if (btnV) {
      btnV.addEventListener('click', (e) => {
        e.preventDefault();
        CloudinaryManager.showImageDialog((result) => {
          document.getElementById('poster_vertical_cloudinary').value = result.publicId;
          const img = document.getElementById('posterVerticalPreview');
          if (img) {
            img.src = result.url;
            img.style.display = 'block';
          }
          this.showToast('Poster verticale selezionato!', 'success');
        }, {
          folder: 'danielecamiz/concerts/posters',
          preset: 'poster_unsigned'
        });
      });
    }

    // Widget ORIZZONTALE
    const btnH = document.getElementById('uploadPosterHorizontal');
    if (btnH) {
      btnH.addEventListener('click', (e) => {
        e.preventDefault();
        CloudinaryManager.showImageDialog((result) => {
          document.getElementById('poster_horizontal_cloudinary').value = result.publicId;
          const img = document.getElementById('posterHorizontalPreview');
          if (img) {
            img.src = result.url;
            img.style.display = 'block';
          }
          this.showToast('Poster orizzontale selezionato!', 'success');
        }, {
          folder: 'danielecamiz/concerts/posters',
          preset: 'poster_horizontal_unsigned'
        });
      });
    }

    console.log('✅ CloudinaryManager widgets pronti');
  }
  
  initTinyMCE() {
    console.log('📝 Init TinyMCE...');
    
    tinymce.init({
      selector: '#description_short',
      license_key: 'gpl',
      height: 150,
      menubar: false,
      plugins: 'lists link',
      toolbar: 'undo redo | bold italic | bullist numlist'
    });
    
    tinymce.init({
      selector: '#description_html',
      license_key: 'gpl',
      height: 400,
      menubar: false,
      plugins: 'lists link code table',
      toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link | code'
    });
    
    tinymce.init({
      selector: '#program_notes',
      license_key: 'gpl',
      height: 300,
      menubar: false,
      plugins: 'lists link code',
      toolbar: 'undo redo | bold italic | bullist numlist | link | code'
    });
  }
  
  updateSlugPreview() {
    const title = document.getElementById('title');
    const slug = document.getElementById('slug');
    const preview = document.getElementById('slugPreview');
    const date = document.getElementById('date');
    
    if (!title || !slug || !preview || !date) return;
    
    const selectedDate = new Date(date.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate >= today) {
      const slugVal = slug.value || this.generateSlug(title.value);
      preview.textContent = slugVal ? `${slugVal}.danielecamiz.com` : 'slug.danielecamiz.com';
      slug.disabled = false;
    } else {
      preview.textContent = 'Non disponibile per concerti passati';
      slug.disabled = true;
    }
  }
  
  generateSlug(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  updateConcertType() {
    const date = document.getElementById('date');
    const indicator = document.getElementById('concertTypeIndicator');
    
    if (!date || !indicator) return;
    
    const selectedDate = new Date(date.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate >= today) {
      indicator.className = 'concert-type-indicator future';
      indicator.innerHTML = '<i class="fas fa-calendar-plus"></i> Concerto Futuro (con Landing Page)';
    } else {
      indicator.className = 'concert-type-indicator past';
      indicator.innerHTML = '<i class="fas fa-calendar-check"></i> Concerto Passato (solo archivio)';
    }
    
    this.updateSlugPreview();
  }
  
  addSoloist() {
    const tempId = `temp_${Date.now()}`;
    this.soloists.push({ id: tempId, name: '', instrument: '' });
    this.renderSoloists();
    this.renderSelectedWorks();
  }
  
  removeSoloist(index) {
    this.soloists.splice(index, 1);
    this.renderSoloists();
    this.renderSelectedWorks();
  }
  
  renderSoloists() {
    const container = document.getElementById('soloistsContainer');
    if (!container) return;
    
    container.innerHTML = this.soloists.map((s, i) => `
      <div class="soloist-row">
        <input type="text" class="soloist-name form-control" placeholder="Nome" value="${s.name}" onchange="concertEditor.updateSoloist(${i}, 'name', this.value)">
        <input type="text" class="soloist-instrument form-control" placeholder="Strumento" value="${s.instrument}" onchange="concertEditor.updateSoloist(${i}, 'instrument', this.value)">
        <button type="button" class="btn btn-danger btn-sm" onclick="concertEditor.removeSoloist(${i})"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');
  }
  
  updateSoloist(index, field, value) {
    this.soloists[index][field] = value;
    this.renderSelectedWorks();
  }
  
  showQuickAddWork() {
    console.log('🎵 Apro modal...');
    const modal = document.getElementById('quickAddModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
    
    document.getElementById('workTypeWhole').checked = true;
    document.getElementById('composerSearchQuick').value = '';
    document.getElementById('workSearchQuick').value = '';
    document.getElementById('movementSelectContainer').style.display = 'none';
    document.getElementById('composerResultsQuick').innerHTML = '';
    document.getElementById('workResultsQuick').innerHTML = '';
    
    this.currentWorkId = null;
    this.currentComposerId = null;
  }
  
  closeQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
  }
  
  searchComposerQuick() {
    const input = document.getElementById('composerSearchQuick');
    if (!input) {
      console.error('❌ Campo composerSearchQuick non trovato!');
      return;
    }

    const query = input.value;
    console.log('🔍 Ricerca compositore:', query);
    console.log('📊 Compositori disponibili:', this.composers ? this.composers.length : 'NESSUNO');

    const div = document.getElementById('composerResultsQuick');
    if (!div) {
      console.error('❌ Div composerResultsQuick non trovato!');
      return;
    }

    if (query.length < 2) {
      div.innerHTML = '';
      return;
    }

    if (!this.composers || this.composers.length === 0) {
      div.innerHTML = '<div class="autocomplete-item text-muted">Caricamento compositori...</div>';
      return;
    }

    const filtered = this.composers.filter(c => {
      const match = c.full_name.toLowerCase().includes(query.toLowerCase());
      if (match) console.log('✓ Match:', c.full_name);
      return match;
    });

    console.log('✅ Risultati trovati:', filtered.length);

    if (filtered.length === 0) {
      div.innerHTML = '<div class="autocomplete-item text-muted">Nessun compositore trovato</div>';
      return;
    }

    div.innerHTML = filtered.map(c => `
      <div class="autocomplete-item" onclick="concertEditor.selectComposerQuick(${c.id}, '${c.full_name.replace(/'/g, "\\'")}')">
        <strong>${c.full_name}</strong>
      </div>
    `).join('');
  }
  
  selectComposerQuick(id, name) {
    console.log('✅ Selezionato:', name);
    document.getElementById('composerSearchQuick').value = name;
    document.getElementById('composerResultsQuick').innerHTML = '';
    document.getElementById('workSearchQuick').focus();
    
    this.currentComposerId = id;
    this.filterWorksByComposer(id);
  }
  
  filterWorksByComposer(id) {
    const composerId = parseInt(id);
    const filtered = this.allWorks.filter(w => parseInt(w.composer_id) === composerId);
    console.log('🎵 Compositore ID:', composerId, 'Opere trovate:', filtered.length);
    console.log('📊 Total works:', this.allWorks.length);

    const div = document.getElementById('workResultsQuick');

    if (filtered.length === 0) {
      div.innerHTML = '<div class="text-muted" style="padding:10px">Nessuna opera trovata per questo compositore</div>';
      return;
    }

    div.innerHTML = filtered.map(w => `
      <div class="search-result-item" onclick="concertEditor.selectWorkQuick(${w.id})">
        <strong>${w.title}</strong>
        ${w.catalogue ? `<small>${w.catalogue}</small>` : ''}
      </div>
    `).join('');
  }
  
  searchWorkQuick() {
    const query = document.getElementById('workSearchQuick').value;
    
    if (query.length < 2) {
      if (!this.currentComposerId) {
        document.getElementById('workResultsQuick').innerHTML = '';
      }
      return;
    }
    
    let filtered = this.allWorks;
    
    if (this.currentComposerId) {
      filtered = filtered.filter(w => w.composer_id === this.currentComposerId);
    }
    
    filtered = filtered.filter(w =>
      w.title.toLowerCase().includes(query.toLowerCase()) ||
      (w.catalogue && w.catalogue.toLowerCase().includes(query.toLowerCase()))
    );
    
    const div = document.getElementById('workResultsQuick');
    
    if (filtered.length === 0) {
      div.innerHTML = '<div class="text-muted" style="padding:10px">Nessuna opera</div>';
      return;
    }
    
    div.innerHTML = filtered.map(w => `
      <div class="search-result-item" onclick="concertEditor.selectWorkQuick(${w.id})">
        <strong>${w.title}</strong>
        ${w.catalogue ? `<small>${w.catalogue}</small>` : ''}
      </div>
    `).join('');
  }
  
  async selectWorkQuick(id) {
    this.currentWorkId = id;
    
    const work = this.allWorks.find(w => w.id === id);
    if (!work) return;
    
    document.getElementById('workSearchQuick').value = work.title;
    document.getElementById('workResultsQuick').innerHTML = '';
    
    const isMovement = document.getElementById('workTypeMovement').checked;
    
    if (isMovement) {
      await this.loadMovements(id);
    } else {
      document.getElementById('movementSelectContainer').style.display = 'none';
    }
  }
  
  async loadMovements(workId) {
    try {
      const res = await fetch(`/api/repertoire/works/${workId}/movements`);
      const data = await res.json();
      
      if (data.success && data.movements.length > 0) {
        const container = document.getElementById('movementSelectContainer');
        const select = document.getElementById('movementSelect');
        
        select.innerHTML = '<option value="">Seleziona</option>' +
          data.movements.map(m => `
            <option value="${m.id}">${m.movement_number}. ${m.title || 'Senza titolo'}${m.tempo ? ' (' + m.tempo + ')' : ''}</option>
          `).join('');
        
        container.style.display = 'block';
      } else {
        alert('Nessun movimento. Aggiungili in Repertorio.');
        document.getElementById('workTypeWhole').checked = true;
        document.getElementById('movementSelectContainer').style.display = 'none';
      }
    } catch (error) {
      console.error(error);
      alert('Errore caricamento movimenti');
    }
  }
  
  toggleWorkType() {
    const isMovement = document.getElementById('workTypeMovement').checked;
    
    if (isMovement && this.currentWorkId) {
      this.loadMovements(this.currentWorkId);
    } else {
      document.getElementById('movementSelectContainer').style.display = 'none';
    }
  }
  
  async addWorkToProgram() {
    if (!this.currentWorkId) {
      alert('Seleziona un brano');
      return;
    }
    
    const work = this.allWorks.find(w => w.id === this.currentWorkId);
    if (!work) return;
    
    const isMovement = document.getElementById('workTypeMovement').checked;
    let movementId = null;
    let movementTitle = null;
    
    if (isMovement) {
      movementId = document.getElementById('movementSelect').value;
      if (!movementId) {
        alert('Seleziona un movimento');
        return;
      }
      
      movementTitle = document.getElementById('movementSelect').selectedOptions[0].textContent;
    }
    
    const exists = this.selectedWorks.find(w => 
      w.id === this.currentWorkId && (w.movement_id || null) === (movementId || null)
    );
    
    if (exists) {
      alert('Già nel programma');
      return;
    }
    
    this.selectedWorks.push({
      id: this.currentWorkId,
      movement_id: movementId,
      movement_title: movementTitle,
      title: work.title,
      composer_name: work.composer_name,
      catalogue: work.catalogue,
      soloist_ids: []
    });
    
    this.renderSelectedWorks();
    this.closeQuickAddModal();
    this.showToast('Aggiunto!', 'success');
  }
  
  removeWork(index) {
    this.selectedWorks.splice(index, 1);
    this.renderSelectedWorks();
  }
  
  moveWork(index, dir) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= this.selectedWorks.length) return;
    
    [this.selectedWorks[index], this.selectedWorks[newIndex]] = 
    [this.selectedWorks[newIndex], this.selectedWorks[index]];
    
    this.renderSelectedWorks();
  }
  
  toggleWorkSoloist(workIndex, soloistId) {
    if (!this.selectedWorks[workIndex]) return;

    console.log(`🔧 Toggle solista ${soloistId} per brano ${workIndex}`);

    if (!this.selectedWorks[workIndex].soloist_ids) {
      this.selectedWorks[workIndex].soloist_ids = [];
    }

    const currentIds = this.selectedWorks[workIndex].soloist_ids;
    const index = currentIds.indexOf(soloistId);

    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(soloistId);
    }

    console.log(`✅ Solisti assegnati al brano ${workIndex}:`, currentIds);
  }
  
  renderSelectedWorks() {
    const container = document.getElementById('selectedWorksList');
    if (!container) return;
    
    console.log('🎵 Rendering works:', this.selectedWorks.length);
    console.log('👥 Solisti disponibili:', this.soloists);
    
    if (this.selectedWorks.length === 0) {
      container.innerHTML = '<p class="no-data">Nessun brano</p>';
      return;
    }
    
    container.innerHTML = this.selectedWorks.map((w, i) => `
      <div class="selected-work-item">
        <div class="work-number">${i + 1}</div>
        <div class="work-info-detail">
          <strong>${w.title}</strong>
          ${w.subtitle ? `<div style="color:var(--text-muted);font-size:13px;margin-top:2px;font-style:italic">${w.subtitle}</div>` : ''}
          ${w.movement_title ? `<span style="color:var(--gold);font-style:italic;display:block;margin-top:4px">${w.movement_title}</span>` : ''}
          <span style="color:var(--text-secondary);font-size:13px">${w.composer_name}${w.catalogue ? ' - ' + w.catalogue : ''}</span>

          <!-- ✅ CHECKBOX SOLISTI MULTIPLI -->
          <div style="margin-top:8px">
            <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">
              <i class="fas fa-users"></i> Solisti per questo brano:
            </label>
            ${this.soloists.length > 0 ? `
              <div style="display:flex;flex-direction:column;gap:4px;max-width:300px">
                ${this.soloists.map((s, idx) => {
                  const soloistKey = s.id || `idx_${idx}`;
                  const isChecked = w.soloist_ids && w.soloist_ids.includes(soloistKey);
                  return `
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px;border-radius:4px;transition:background 0.2s"
                           onmouseover="this.style.background='var(--bg)'"
                           onmouseout="this.style.background='transparent'">
                      <input type="checkbox"
                             ${isChecked ? 'checked' : ''}
                             onchange="concertEditor.toggleWorkSoloist(${i}, '${soloistKey}')"
                             style="cursor:pointer">
                      <span style="font-size:13px">${s.name || 'Nuovo solista'}${s.instrument ? ` (${s.instrument})` : ''}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            ` : '<span style="color:#999;font-size:12px">Nessun solista disponibile</span>'}
          </div>
        </div>
        <div class="work-controls">
          <button type="button" class="btn-move" onclick="concertEditor.moveWork(${i},-1)" ${i===0?'disabled':''}>↑</button>
          <button type="button" class="btn-move" onclick="concertEditor.moveWork(${i},1)" ${i===this.selectedWorks.length-1?'disabled':''}>↓</button>
          <button type="button" class="btn-remove" onclick="concertEditor.removeWork(${i})">×</button>
        </div>
      </div>
    `).join('');
  }
  
 async saveConcert(e) {
  e.preventDefault();

  if (typeof tinymce !== 'undefined') {
    tinymce.triggerSave();
  }

  const formData = new FormData(e.target);

  const soloistIndexMap = new Map();
  this.soloists.forEach((s, idx) => {
    const key = s.id || `idx_${idx}`;
    soloistIndexMap.set(key, idx);
    console.log(`🗺️ Mapping: key="${key}" -> indice=${idx}, soloist={id:${s.id}, name:"${s.name}"}`);
  });
  console.log('🗺️ Mappa completa solisti:', soloistIndexMap);

  const data = {
    id: formData.get('id') || null,
    title: formData.get('title'),
    subtitle: formData.get('subtitle'),
    date: formData.get('date'),
    starts_at: formData.get('starts_at'),
    location: formData.get('location'),
    slug: formData.get('slug'),
    description_short: formData.get('description_short'),
    description_html: formData.get('description_html'),
    program_notes: formData.get('program_notes'),
    conductor_name: formData.get('conductor_name'),
    orchestra_name: formData.get('orchestra_name'),
    poster_vertical_cloudinary: formData.get('poster_vertical_cloudinary'),
    poster_horizontal_cloudinary: formData.get('poster_horizontal_cloudinary'),
    soloists: JSON.stringify(this.soloists.map(s => ({
      name: s.name,
      instrument: s.instrument
    }))),
    selected_works: JSON.stringify(this.selectedWorks.map((w, i) => {
      console.log(`📖 Brano ${i}: work_id=${w.id}, soloist_ids=${JSON.stringify(w.soloist_ids)}`);
      const indices = (w.soloist_ids || []).map(key => {
        const idx = soloistIndexMap.get(key);
        console.log(`  → Chiave "${key}" -> indice ${idx}`);
        return idx;
      }).filter(idx => idx !== undefined);
      console.log(`  → Indici finali: ${JSON.stringify(indices)}`);
      return {
        work_id: w.id,
        movement_id: w.movement_id,
        soloist_indices: indices
      };
    }))
  };

  console.log('💾 Dati da salvare:', data);
  console.log('📋 Selected works originali:', this.selectedWorks);
  
  if (!data.title || !data.date || !data.location) {
    this.showToast('Compila campi obbligatori', 'error');
    return;
  }
  
  try {
    this.showToast('Salvataggio...', 'info');
    
    // ✅ CORRETTO: Con /api/
    const url = data.id ? `/api/concerts/${data.id}` : '/api/concerts';
    const method = data.id ? 'PUT' : 'POST';
    
    console.log(`🔵 ${method} ${url}`);
    
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const result = await res.json();
    
    if (result.success) {
      this.showToast('Salvato!', 'success');
      
      if (!data.id && result.concert_id) {
        setTimeout(() => window.location.href = `/admin/concert/${result.concert_id}/edit`, 1500);
      } else {
        setTimeout(() => window.location.reload(), 1500);
      }
    } else {
      this.showToast('Errore: ' + (result.error || 'Fallito'), 'error');
    }
  } catch (error) {
    console.error('❌ Errore save:', error);
    this.showToast('Errore salvataggio: ' + error.message, 'error');
  }
}
  
  showToast(msg, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `notification notification-${type} show`;
    toast.innerHTML = `
      <i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i>
      <span>${msg}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

let concertEditor;
document.addEventListener('DOMContentLoaded', () => {
  concertEditor = new ConcertEditor();
  concertEditor.init();
  window.concertEditor = concertEditor;
});
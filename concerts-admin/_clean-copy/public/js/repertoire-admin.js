// concerts-admin/public/js/repertoire-admin.js

class RepertoireManager {
  constructor() {
    this.currentWorkId = null;
    this.works = [];
    this.composers = [];
    this.categories = [];
    this.init();
  }
  
  init() {
    this.attachEventListeners();
    this.loadData();
  }
  
  attachEventListeners() {
    // Form brano
    const workForm = document.getElementById('workForm');
    if (workForm) {
      workForm.addEventListener('submit', (e) => this.saveWork(e));
    }
    
    // Filtri
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.applyFilters();
        }, 300);
      });
    }
    
    const composerFilter = document.getElementById('composerFilter');
    if (composerFilter) {
      composerFilter.addEventListener('change', () => this.applyFilters());
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.applyFilters());
    }
    
    // Bottoni azioni
    document.querySelectorAll('.btn-edit-work').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const workId = e.target.closest('[data-work-id]').dataset.workId;
        this.editWork(workId);
      });
    });
    
    document.querySelectorAll('.btn-delete-work').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const workId = e.target.closest('[data-work-id]').dataset.workId;
        const workTitle = e.target.closest('[data-work-id]').dataset.workTitle;
        this.confirmDelete(workId, workTitle);
      });
    });
  }
  
  async loadData() {
    try {
      // Carica compositori
      const composersRes = await fetch('/api/composers');
      const composersData = await composersRes.json();
      if (composersData.success) {
        this.composers = composersData.composers;
      }
      
      // Carica categorie
      const categoriesRes = await fetch('/api/categories');
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
        this.categories = categoriesData.categories;
      }
      
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    }
  }
  
  applyFilters() {
    const search = document.getElementById('searchInput')?.value || '';
    const composer = document.getElementById('composerFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (composer) params.append('composer', composer);
    if (category) params.append('category', category);
    
    window.location.href = `/admin/repertoire?${params.toString()}`;
  }
  
  showAddWork() {
    this.currentWorkId = null;
    document.getElementById('workModalTitle').textContent = 'Nuovo Brano';
    document.getElementById('workForm').reset();
    document.getElementById('workId').value = '';
    this.showModal('workModal');
  }
  
  async editWork(workId) {
    try {
      const response = await fetch(`/api/repertoire/${workId}`);
      const result = await response.json();
      
      if (!result.success) {
        this.showToast('Errore caricamento brano', 'error');
        return;
      }
      
      const work = result.work;
      this.currentWorkId = work.id;
      
      // Popola form
      document.getElementById('workModalTitle').textContent = 'Modifica Brano';
      document.getElementById('workId').value = work.id;
      document.getElementById('composer_id').value = work.composer_id;
      document.getElementById('category_id').value = work.category_id || '';
      document.getElementById('title').value = work.title;
      document.getElementById('subtitle').value = work.subtitle || '';
      document.getElementById('catalogue').value = work.catalogue || '';
      document.getElementById('work_key').value = work.work_key || '';
      document.getElementById('year').value = work.year || '';
      document.getElementById('duration_minutes').value = work.duration_minutes || '';
      document.getElementById('notes_it').value = work.notes_it || '';
      document.getElementById('notes_en').value = work.notes_en || '';
      document.getElementById('media_video').value = work.media_video || '';
      document.getElementById('media_audio').value = work.media_audio || '';
      
      this.showModal('workModal');
      
    } catch (error) {
      console.error('Errore caricamento brano:', error);
      this.showToast('Errore durante il caricamento', 'error');
    }
  }
  
  // CERCA questa funzione in repertoire-admin.js e SOSTITUISCILA

async saveWork(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  if (!data.composer_id || !data.title) {
    this.showToast('Compositore e titolo sono obbligatori', 'error');
    return;
  }
  
  try {
    this.showToast('Salvataggio in corso...', 'info');
    
    // ENDPOINT CORRETTO
    const url = data.id 
      ? `/api/repertoire/works/${data.id}` 
      : '/api/repertoire/works';
    
    const method = data.id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      this.showToast(result.message || 'Brano salvato con successo', 'success');
      this.closeModal('workModal');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      this.showToast('Errore: ' + (result.error || result.message), 'error');
    }
    
  } catch (error) {
    console.error('Errore salvataggio brano:', error);
    this.showToast('Errore durante il salvataggio', 'error');
  }
}
  
  async confirmDelete(workId, workTitle) {
    if (!confirm(`Sei sicuro di voler eliminare "${workTitle}"?\n\nQuesta azione è irreversibile.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/repertoire/${workId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showToast('Brano eliminato', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showToast('Errore: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      this.showToast('Errore durante l\'eliminazione', 'error');
    }
  }
  
  async showWorkDetails(workId) {
    try {
      const response = await fetch(`/api/repertoire/${workId}`);
      const result = await response.json();
      
      if (!result.success) {
        this.showToast('Errore caricamento dettagli', 'error');
        return;
      }
      
      const work = result.work;
      const performances = result.performances || [];
      
      // Crea modal dettagli
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'workDetailsModal';
      modal.innerHTML = `
        <div class="modal-content work-details-modal">
          <div class="modal-header">
            <h2>${work.composer_name}: ${work.title}</h2>
            <button onclick="closeModal('workDetailsModal')" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <div class="work-info">
              ${work.subtitle ? `<p><strong>Sottotitolo:</strong> ${work.subtitle}</p>` : ''}
              ${work.catalogue ? `<p><strong>Catalogo:</strong> ${work.catalogue}</p>` : ''}
              ${work.work_key ? `<p><strong>Tonalità:</strong> ${work.work_key}</p>` : ''}
              ${work.year ? `<p><strong>Anno:</strong> ${work.year}</p>` : ''}
              ${work.duration_minutes ? `<p><strong>Durata:</strong> ${work.duration_minutes} minuti</p>` : ''}
              ${work.category_name ? `<p><strong>Categoria:</strong> ${work.category_name}</p>` : ''}
            </div>
            
            <div class="work-notes">
              ${work.notes_it ? `
                <div>
                  <h4>Note (IT)</h4>
                  <p>${work.notes_it}</p>
                </div>
              ` : ''}
              ${work.notes_en ? `
                <div>
                  <h4>Note (EN)</h4>
                  <p>${work.notes_en}</p>
                </div>
              ` : ''}
            </div>
            
            <div class="work-performances">
              <h3>Esecuzioni (${performances.length})</h3>
              ${performances.length > 0 ? `
                <div class="performances-list">
                  ${performances.map(p => `
                    <div class="performance-item">
                      <div class="performance-date">
                        ${new Date(p.date).toLocaleDateString('it-IT')}
                      </div>
                      <div class="performance-info">
                        <strong>${p.title}</strong><br>
                        ${p.location}
                        ${p.first_time ? '<span class="badge-premiere">Prima esecuzione</span>' : ''}
                      </div>
                      ${p.notes ? `<div class="performance-notes">${p.notes}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : '<p class="text-muted">Nessuna esecuzione registrata</p>'}
            </div>
            
            ${work.media_video || work.media_audio ? `
              <div class="work-media">
                <h3>Media</h3>
                ${work.media_video ? `<p><strong>Video:</strong> <a href="${work.media_video}" target="_blank">Guarda</a></p>` : ''}
                ${work.media_audio ? `<p><strong>Audio:</strong> <a href="${work.media_audio}" target="_blank">Ascolta</a></p>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button onclick="closeModal('workDetailsModal')" class="btn btn-secondary">Chiudi</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('active'), 10);
      
    } catch (error) {
      console.error('Errore caricamento dettagli:', error);
      this.showToast('Errore durante il caricamento', 'error');
    }
  }
  
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('active'), 10);
    }
  }
  
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        if (modalId === 'workDetailsModal') {
          modal.remove();
        }
      }, 300);
    }
  }
  
  showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
      background: ${
        type === 'success' ? '#52d273' : 
        type === 'error' ? '#ff6b6b' : 
        '#7aa2ff'
      };
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Funzioni globali per onclick
function showAddWork() {
  if (window.repertoireManager) {
    window.repertoireManager.showAddWork();
  }
}

function editWork(workId) {
  if (window.repertoireManager) {
    window.repertoireManager.editWork(workId);
  }
}

function deleteWork(workId, workTitle) {
  if (window.repertoireManager) {
    window.repertoireManager.confirmDelete(workId, workTitle);
  }
}

function showWorkDetails(workId) {
  if (window.repertoireManager) {
    window.repertoireManager.showWorkDetails(workId);
  }
}

function closeModal(modalId) {
  if (window.repertoireManager) {
    window.repertoireManager.closeModal(modalId);
  }
}

function closeWorkModal() {
  closeModal('workModal');
}

// Inizializza
document.addEventListener('DOMContentLoaded', () => {
  window.repertoireManager = new RepertoireManager();
});

// Stili inline
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideDown {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(100px); opacity: 0; }
  }
  
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .modal-overlay.active {
    opacity: 1;
  }
  
  .work-details-modal {
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .performances-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-top: 15px;
  }
  
  .performance-item {
    padding: 15px;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    border-left: 3px solid #d6b25e;
  }
  
  .performance-date {
    font-size: 12px;
    color: #d6b25e;
    margin-bottom: 5px;
  }
  
  .badge-premiere {
    display: inline-block;
    padding: 2px 8px;
    background: #d6b25e;
    color: #1a1a1a;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 10px;
  }
  
  .text-muted {
    color: #888;
    font-style: italic;
  }
`;
document.head.appendChild(style);
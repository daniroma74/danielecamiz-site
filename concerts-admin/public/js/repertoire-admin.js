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
    const workForm = document.getElementById('workForm');
    if (workForm) {
      workForm.addEventListener('submit', (e) => this.saveWork(e));
    }
  }
  
  async loadData() {
    try {
      const composersRes = await fetch('/api/composers');
      const composersData = await composersRes.json();
      if (composersData.success) {
        this.composers = composersData.composers;
      }
      
      const categoriesRes = await fetch('/api/categories');
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
        this.categories = categoriesData.categories;
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    }
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
      
      document.getElementById('workModalTitle').textContent = 'Modifica Brano';
      document.getElementById('workId').value = work.id;
      document.getElementById('composer_id').value = work.composer_id;
      document.getElementById('category_id').value = work.category_id || '';
      document.getElementById('title').value = work.title;
      document.getElementById('subtitle').value = work.subtitle || '';
      document.getElementById('catalogue').value = work.catalogue || '';
      document.getElementById('work_key').value = work.work_key || '';
      
      const yearField = document.getElementById('year');
      if (yearField) yearField.value = work.year || '';
      
      const notesItField = document.getElementById('notes_it');
      if (notesItField) notesItField.value = work.notes_it || '';
      
      const notesEnField = document.getElementById('notes_en');
      if (notesEnField) notesEnField.value = work.notes_en || '';
      
      const videoField = document.getElementById('media_video');
      if (videoField) videoField.value = work.media_video || '';
      
      const audioField = document.getElementById('media_audio');
      if (audioField) audioField.value = work.media_audio || '';
      
      this.showModal('workModal');
      
    } catch (error) {
      console.error('Errore caricamento brano:', error);
      this.showToast('Errore durante il caricamento', 'error');
    }
  }
  
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
        
        if (!data.id && result.work_id) {
          setTimeout(() => {
            if (confirm('Brano salvato! Vuoi aggiungere i movimenti ora?')) {
              this.editMovements(result.work_id);
            } else {
              window.location.reload();
            }
          }, 1000);
        } else {
          setTimeout(() => window.location.reload(), 1000);
        }
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
      const response = await fetch(`/api/repertoire/works/${workId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showToast('Brano eliminato', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showToast('Errore: ' + (result.error || result.message), 'error');
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
      
      const movementsRes = await fetch(`/api/repertoire/works/${workId}/movements`);
      const movementsData = await movementsRes.json();
      const movements = movementsData.success ? movementsData.movements : [];
      
      const modal = document.createElement('div');
      modal.className = 'modal active';
      modal.id = 'workDetailsModal';
      modal.innerHTML = `
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2>${work.composer_name}: ${work.title}</h2>
            <button onclick="closeModal('workDetailsModal')" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
              <div>
                <strong style="color: var(--text-secondary); font-size: 13px;">Compositore</strong>
                <div style="margin-top: 4px;">${work.composer_name || '-'}</div>
              </div>
              ${work.catalogue ? `
                <div>
                  <strong style="color: var(--text-secondary); font-size: 13px;">Catalogo</strong>
                  <div style="margin-top: 4px; font-family: monospace;">${work.catalogue}</div>
                </div>
              ` : ''}
              ${work.work_key ? `
                <div>
                  <strong style="color: var(--text-secondary); font-size: 13px;">Tonalità</strong>
                  <div style="margin-top: 4px;">${work.work_key}</div>
                </div>
              ` : ''}
              ${work.year ? `
                <div>
                  <strong style="color: var(--text-secondary); font-size: 13px;">Anno</strong>
                  <div style="margin-top: 4px;">${work.year}</div>
                </div>
              ` : ''}
              ${work.category_name ? `
                <div>
                  <strong style="color: var(--text-secondary); font-size: 13px;">Categoria</strong>
                  <div style="margin-top: 4px;">${work.category_name}</div>
                </div>
              ` : ''}
            </div>
            
            <hr style="margin: 20px 0; border: none; border-top: 2px solid var(--border);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-list"></i> Movimenti
                <span class="badge-count">${movements.length}</span>
              </h3>
              <button onclick="editMovements(${workId})" class="btn btn-sm btn-primary">
                <i class="fas fa-edit"></i> Gestisci
              </button>
            </div>
            
            ${movements.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${movements.map(m => `
                  <div style="padding: 12px; background: var(--bg); border-radius: 8px; border-left: 3px solid var(--gold);">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <strong>${m.movement_number}. ${m.title || 'Senza titolo'}</strong>
                        ${m.tempo ? `<div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${m.tempo}</div>` : ''}
                      </div>
                      ${m.duration_minutes ? `<span style="color: var(--text-muted); font-size: 12px;">${m.duration_minutes} min</span>` : ''}
                    </div>
                    ${m.notes_it ? `<div style="color: var(--text-muted); font-size: 13px; margin-top: 8px; font-style: italic;">${m.notes_it}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-state" style="padding: 30px;">
                <i class="fas fa-list fa-2x" style="opacity: 0.3; margin-bottom: 10px;"></i>
                <p style="color: var(--text-muted); margin: 0;">Nessun movimento inserito</p>
              </div>
            `}
          </div>
          <div class="modal-footer">
            <button onclick="closeModal('workDetailsModal')" class="btn btn-secondary">
              <i class="fas fa-times"></i> Chiudi
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Errore caricamento dettagli:', error);
      this.showToast('Errore durante il caricamento', 'error');
    }
  }
  
  async editMovements(workId) {
    this.closeModal('workDetailsModal');
    
    try {
      const workRes = await fetch(`/api/repertoire/${workId}`);
      const workData = await workRes.json();
      
      const movementsRes = await fetch(`/api/repertoire/works/${workId}/movements`);
      const movementsData = await movementsRes.json();
      
      const work = workData.work;
      const movements = movementsData.movements || [];
      
      const modal = document.createElement('div');
      modal.className = 'modal active';
      modal.id = 'movementsEditorModal';
      modal.innerHTML = `
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2><i class="fas fa-list"></i> Movimenti: ${work.title}</h2>
            <button onclick="closeModal('movementsEditorModal')" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div id="movementsListEditor" style="display: flex; flex-direction: column; gap: 15px;">
              ${movements.length > 0 ? movements.map(m => `
                <div class="movement-item" data-movement-id="${m.id}">
                  <div class="movement-number">${m.movement_number}</div>
                  <div class="movement-content">
                    <div class="movement-header">
                      <input type="text" class="movement-title form-control" value="${m.title || ''}" placeholder="Titolo movimento (es: Allegro molto)">
                      <input type="text" class="movement-tempo form-control" value="${m.tempo || ''}" placeholder="Tempo (es: ♩ = 120)">
                      <input type="number" class="movement-duration form-control" value="${m.duration_minutes || ''}" placeholder="min" min="0" step="0.5">
                    </div>
                    <textarea class="movement-notes form-control" placeholder="Note...">${m.notes_it || ''}</textarea>
                  </div>
                  <div class="movement-actions">
                    <button class="btn-save-movement" onclick="saveMovement(${m.id}, ${workId})" title="Salva">
                      <i class="fas fa-save"></i>
                    </button>
                    <button class="btn-delete-movement" onclick="deleteMovement(${m.id}, ${workId})" title="Elimina">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `).join('') : '<p class="text-muted" style="text-align: center; padding: 30px;">Nessun movimento. Aggiungine uno!</p>'}
            </div>
            
            <button onclick="addNewMovement(${workId})" class="btn btn-primary" style="margin-top: 20px; width: 100%;">
              <i class="fas fa-plus"></i> Aggiungi Movimento
            </button>
          </div>
          <div class="modal-footer">
            <button onclick="closeModal('movementsEditorModal'); showWorkDetails(${workId});" class="btn btn-secondary">
              <i class="fas fa-arrow-left"></i> Torna ai Dettagli
            </button>
            <button onclick="closeModal('movementsEditorModal')" class="btn btn-primary">
              <i class="fas fa-check"></i> Fatto
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Errore caricamento movimenti:', error);
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
        if (modalId === 'workDetailsModal' || modalId === 'movementsEditorModal') {
          modal.remove();
        }
      }, 300);
    }
  }
  
  showToast(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `notification notification-${type} show`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Funzioni globali
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

function editMovements(workId) {
  if (window.repertoireManager) {
    window.repertoireManager.editMovements(workId);
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

async function saveMovement(movementId, workId) {
  const item = document.querySelector(`[data-movement-id="${movementId}"]`);
  const data = {
    title: item.querySelector('.movement-title').value,
    tempo: item.querySelector('.movement-tempo').value,
    duration: item.querySelector('.movement-duration').value || null,
    notes: item.querySelector('.movement-notes').value
  };
  
  try {
    const response = await fetch(`/api/repertoire/movements/${movementId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('Movimento salvato', 'success');
    } else {
      showToast('Errore salvataggio', 'error');
    }
  } catch (error) {
    console.error('Errore:', error);
    showToast('Errore durante il salvataggio', 'error');
  }
}

async function deleteMovement(movementId, workId) {
  if (!confirm('Eliminare questo movimento?')) return;
  
  try {
    const response = await fetch(`/api/repertoire/movements/${movementId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('Movimento eliminato', 'success');
      setTimeout(() => editMovements(workId), 500);
    } else {
      showToast('Errore eliminazione', 'error');
    }
  } catch (error) {
    console.error('Errore:', error);
    showToast('Errore durante l\'eliminazione', 'error');
  }
}

async function addNewMovement(workId) {
  const currentMovements = document.querySelectorAll('.movement-item').length;
  const movementNumber = prompt(
    `Numero del movimento (hai già ${currentMovements} movimento/i).\nInserisci il numero:`, 
    currentMovements + 1
  );
  
  if (!movementNumber || isNaN(movementNumber) || movementNumber < 1) {
    showToast('Numero non valido', 'error');
    return;
  }
  
  const title = prompt('Titolo del movimento (opzionale):');
  const tempo = prompt('Tempo/Carattere (es: Allegro, Andante):');
  
  try {
    const response = await fetch('/api/repertoire/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_id: workId,
        position: parseInt(movementNumber),
        title: title || null,
        tempo: tempo || null
      })
    });
    
    const result = await response.json();
    
    console.log('Response:', result); // ✅ DEBUG
    
    if (result.success) {
      showToast('Movimento aggiunto con successo!', 'success');
      await loadMovements(workId);
    } else {
      showToast('Errore: ' + (result.error || 'Salvataggio fallito'), 'error');
    }
  } catch (error) {
    console.error('Errore:', error);
    showToast('Errore di rete durante il salvataggio', 'error');
  }
}
function showToast(message, type = 'info') {
  if (window.repertoireManager) {
    window.repertoireManager.showToast(message, type);
  }
}

// Inizializza
document.addEventListener('DOMContentLoaded', () => {
  window.repertoireManager = new RepertoireManager();
});
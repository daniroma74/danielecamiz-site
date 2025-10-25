// newsletter-service/public/js/subscribers-manager.js
// Gestione completa iscritti

// Filter subscribers
function filterSubscribers() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const rows = document.querySelectorAll('#subscribers-table tbody tr');
    
    rows.forEach(row => {
        if (!row.dataset.id) return; // Skip no-data row
        
        const email = row.cells[1].textContent.toLowerCase();
        const name = row.cells[2].textContent.toLowerCase();
        const status = row.cells[3].textContent.trim().toLowerCase();
        
        const matchesSearch = !searchTerm || 
            email.includes(searchTerm) || 
            name.includes(searchTerm);
            
        const matchesStatus = !statusFilter || 
            status.includes(statusFilter);
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

// Reset filters
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = '';
    filterSubscribers();
}

// Select all
function toggleSelectAll() {
    const selectAll = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.subscriber-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

// Show add modal
function showAddModal() {
    document.getElementById('modal-title').textContent = 'Aggiungi Iscritto';
    document.getElementById('subscriber-form').reset();
    document.getElementById('subscriber-id').value = '';
    document.getElementById('subscriber-modal').classList.add('active');
}

// Edit subscriber
async function editSubscriber(id) {
    try {
        const response = await fetch(`/admin/subscriber/${id}/data`);
        const data = await response.json();
        
        document.getElementById('modal-title').textContent = 'Modifica Iscritto';
        document.getElementById('subscriber-id').value = data.id;
        document.getElementById('subscriber-email').value = data.email;
        document.getElementById('subscriber-name').value = data.name || '';
        document.getElementById('subscriber-status').value = data.status;
        document.getElementById('subscriber-tags').value = data.tags || '';
        
        document.getElementById('subscriber-modal').classList.add('active');
    } catch (error) {
        showNotification('Errore nel caricamento', 'error');
    }
}

// Close modal
function closeModal() {
    document.getElementById('subscriber-modal').classList.remove('active');
}

// Save subscriber
document.getElementById('subscriber-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('subscriber-id').value;
    const data = {
        email: document.getElementById('subscriber-email').value,
        name: document.getElementById('subscriber-name').value,
        status: document.getElementById('subscriber-status').value,
        tags: document.getElementById('subscriber-tags').value
    };
    
    const url = id ? `/admin/subscriber/${id}/update` : '/admin/subscriber/add';
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(id ? 'Iscritto aggiornato' : 'Iscritto aggiunto', 'success');
            closeModal();
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification(result.error || 'Errore', 'error');
        }
    } catch (error) {
        showNotification('Errore di connessione', 'error');
    }
});

// Toggle status
async function toggleStatus(id) {
    try {
        const response = await fetch(`/admin/subscriber/${id}/toggle`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Stato aggiornato', 'success');
            setTimeout(() => location.reload(), 500);
        }
    } catch (error) {
        showNotification('Errore', 'error');
    }
}

// Delete subscriber
async function deleteSubscriber(id) {
    if (!confirm('Eliminare definitivamente questo iscritto?')) return;
    
    try {
        const response = await fetch(`/admin/subscriber/${id}/delete`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Iscritto eliminato', 'success');
            setTimeout(() => location.reload(), 500);
        }
    } catch (error) {
        showNotification('Errore', 'error');
    }
}

// Bulk operations
function getSelectedIds() {
    const checkboxes = document.querySelectorAll('.subscriber-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

async function bulkUpdateStatus(status) {
    const ids = getSelectedIds();
    if (ids.length === 0) {
        alert('Seleziona almeno un iscritto');
        return;
    }
    
    try {
        const response = await fetch('/admin/subscribers/bulk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`${result.updated} iscritti aggiornati`, 'success');
            setTimeout(() => location.reload(), 1000);
        }
    } catch (error) {
        showNotification('Errore', 'error');
    }
}

async function bulkAddTag() {
    const ids = getSelectedIds();
    if (ids.length === 0) {
        alert('Seleziona almeno un iscritto');
        return;
    }
    
    const tag = prompt('Inserisci il tag da aggiungere:');
    if (!tag) return;
    
    try {
        const response = await fetch('/admin/subscribers/bulk-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, tag })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Tag aggiunto a ${result.updated} iscritti`, 'success');
            setTimeout(() => location.reload(), 1000);
        }
    } catch (error) {
        showNotification('Errore', 'error');
    }
}

async function bulkDelete() {
    const ids = getSelectedIds();
    if (ids.length === 0) {
        alert('Seleziona almeno un iscritto');
        return;
    }
    
    if (!confirm(`Eliminare ${ids.length} iscritti selezionati?`)) return;
    
    try {
        const response = await fetch('/admin/subscribers/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`${result.deleted} iscritti eliminati`, 'success');
            setTimeout(() => location.reload(), 1000);
        }
    } catch (error) {
        showNotification('Errore', 'error');
    }
}

// Import modal
function showImportModal() {
    document.getElementById('import-modal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('import-modal').classList.remove('active');
}

async function importCSV() {
    const csvData = document.getElementById('csv-data').value;
    
    if (!csvData.trim()) {
        alert('Inserisci dei dati CSV');
        return;
    }
    
    try {
        const response = await fetch('/admin/subscribers/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csvData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeImportModal();
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        showNotification('Errore importazione', 'error');
    }
}

// Notification helper
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${
            type === 'success' ? '#52d273' : 
            type === 'error' ? '#ff6b6b' : 
            '#7aa2ff'
        };
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

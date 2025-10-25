// Admin HUB - JavaScript principale

// Configurazione globale
const APP_CONFIG = {
    name: 'Admin HUB',
    version: '1.0.0',
    api: {
        baseUrl: '/api',
        timeout: 30000
    },
    session: {
        warningTime: 5 * 60 * 1000, // Avviso 5 minuti prima
        checkInterval: 60 * 1000 // Controlla ogni minuto
    }
};

// Stato applicazione
const AppState = {
    user: null,
    modules: [],
    notifications: [],
    sessionTimer: null,
    activityTimer: null
};

// Inizializzazione app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin HUB v' + APP_CONFIG.version + ' inizializzato');
    
    // Inizializza componenti base
    initializeApp();
    setupGlobalEventListeners();
    loadUserData();
});

// Inizializza applicazione
function initializeApp() {
    // Previeni click accidentali su link disabilitati
    document.querySelectorAll('a[disabled], button[disabled]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    // Setup CSRF token per tutte le richieste
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) {
        window.csrfToken = csrfToken;
    }
    
    // Gestione errori globale
    window.addEventListener('error', function(e) {
        console.error('Errore globale:', e);
        if (APP_CONFIG.environment === 'production') {
            logError(e.message, e.filename, e.lineno);
        }
    });
}

// Setup listener globali
function setupGlobalEventListeners() {
    // Toggle sidebar mobile
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Gestione dropdown
    document.addEventListener('click', function(e) {
        // Chiudi dropdown aperti se click fuori
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + H = Home/Dashboard
        if (e.altKey && e.key === 'h') {
            e.preventDefault();
            window.location.href = '/dashboard';
        }
        
        // Alt + L = Logout
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            if (confirm('Vuoi davvero uscire?')) {
                window.location.href = '/auth/logout';
            }
        }
        
        // Esc = Chiudi modal/dropdown
        if (e.key === 'Escape') {
            closeAllModals();
            closeAllDropdowns();
        }
    });
}

// Carica dati utente
function loadUserData() {
    const userElement = document.querySelector('[data-user]');
    if (userElement) {
        try {
            AppState.user = JSON.parse(userElement.dataset.user);
        } catch (e) {
            console.error('Errore parsing dati utente:', e);
        }
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('active');
        
        // Salva stato in localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }
}

// Ripristina stato sidebar
function restoreSidebarState() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
    }
}

// Toggle notifiche dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        
        // Se aperto, carica notifiche
        if (dropdown.classList.contains('show')) {
            loadNotifications();
        }
    }
}

// Toggle menu utente
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Carica notifiche
async function loadNotifications() {
    try {
        const response = await fetchAPI('/notifications');
        const notifications = await response.json();
        
        AppState.notifications = notifications;
        renderNotifications(notifications);
        
    } catch (error) {
        console.error('Errore caricamento notifiche:', error);
    }
}

// Renderizza notifiche
function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    const badge = document.getElementById('notificationBadge');
    
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">Nessuna nuova notifica</p>';
        if (badge) badge.style.display = 'none';
    } else {
        if (badge) {
            badge.textContent = notifications.length;
            badge.style.display = 'block';
        }
        
        container.innerHTML = notifications.map(notification => `
            <div class="notification-item" data-id="${notification.id}">
                <div class="notification-content">
                    <h4>${escapeHtml(notification.title)}</h4>
                    <p>${escapeHtml(notification.message)}</p>
                    <span class="notification-time">${formatTime(notification.createdAt)}</span>
                </div>
                <button class="notification-dismiss" onclick="dismissNotification(${notification.id})">✕</button>
            </div>
        `).join('');
    }
}

// Dismetti notifica
async function dismissNotification(id) {
    try {
        await fetchAPI(`/notifications/${id}/read`, {
            method: 'PUT'
        });
        
        // Rimuovi da stato e DOM
        AppState.notifications = AppState.notifications.filter(n => n.id !== id);
        renderNotifications(AppState.notifications);
        
    } catch (error) {
        console.error('Errore dismissione notifica:', error);
    }
}

// Chiudi tutti i dropdown
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Chiudi tutti i modal
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Chiudi modal specifico
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Mostra modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Mostra loading overlay
function showLoading(message = 'Caricamento...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const messageElement = overlay.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
        overlay.style.display = 'flex';
    }
}

// Nascondi loading
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Fetch API con gestione errori
async function fetchAPI(endpoint, options = {}) {
    const defaultOptions = {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    
    // Aggiungi CSRF token se presente
    if (window.csrfToken && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
        defaultOptions.headers['X-CSRF-Token'] = window.csrfToken;
    }
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(APP_CONFIG.api.baseUrl + endpoint, finalOptions);
    
    if (response.status === 401) {
        // Sessione scaduta
        window.location.href = '/auth/login?expired=true';
        throw new Error('Sessione scaduta');
    }
    
    if (!response.ok) {
        throw new Error(`Errore API: ${response.status}`);
    }
    
    return response;
}

// Formatta tempo relativo
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Adesso';
    if (diff < 3600) return `${Math.floor(diff / 60)} minuti fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ore fa`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} giorni fa`;
    
    return date.toLocaleDateString('it-IT');
}

// Escape HTML per sicurezza
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Log errore (per production)
async function logError(message, file, line) {
    try {
        await fetchAPI('/log/error', {
            method: 'POST',
            body: JSON.stringify({
                message,
                file,
                line,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            })
        });
    } catch (e) {
        console.error('Impossibile loggare errore:', e);
    }
}

// Toast notification
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animazione entrata
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Rimozione
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Conferma azione
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Export funzioni per uso globale
window.HubApp = {
    showLoading,
    hideLoading,
    showModal,
    closeModal,
    showToast,
    confirmAction,
    fetchAPI,
    formatTime,
    escapeHtml
};

// Ripristina stato salvato
restoreSidebarState();
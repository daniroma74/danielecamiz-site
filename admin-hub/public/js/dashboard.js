// Admin HUB - Dashboard JavaScript

// Stato dashboard
const DashboardState = {
    modules: [],
    activities: [],
    stats: {},
    refreshInterval: null,
    sessionCheckInterval: null
};

// Inizializza dashboard
function initDashboard() {
    console.log('Dashboard inizializzata');
    
    // Carica moduli
    loadModules();
    
    // Setup refresh automatico
    setupAutoRefresh();
    
    // Animazioni iniziali
    animateElements();
}

// Carica moduli
function loadModules() {
    const moduleCards = document.querySelectorAll('.module-card');
    DashboardState.modules = Array.from(moduleCards).map(card => ({
        id: card.dataset.moduleId,
        status: card.classList.contains('active') ? 'active' : 'inactive',
        element: card
    }));
}

// Accesso a modulo
async function accessModule(moduleId, moduleUrl) {
    try {
        // Mostra loading
        HubApp.showLoading('Connessione al modulo...');
        
        // Richiedi token sicuro
        const response = await HubApp.fetchAPI('/module-token', {
            method: 'POST',
            body: JSON.stringify({ moduleId })
        });
        
        const data = await response.json();
        
        if (!data.success || !data.token) {
            throw new Error('Impossibile ottenere token di accesso');
        }
        
        // Log attività
        await logModuleAccess(moduleId);
        
        // Costruisci URL con token
        const separator = moduleUrl.includes('?') ? '&' : '?';
        const secureUrl = `${moduleUrl}${separator}token=${data.token}&hub=true`;
        
        // Apri in nuova tab
        window.open(secureUrl, '_blank');
        
        HubApp.hideLoading();
        HubApp.showToast('Accesso al modulo autorizzato', 'success');
        
    } catch (error) {
        console.error('Errore accesso modulo:', error);
        HubApp.hideLoading();
        HubApp.showToast('Errore nell\'accesso al modulo', 'error');
    }
}

// Log accesso modulo
async function logModuleAccess(moduleId) {
    try {
        await HubApp.fetchAPI('/activity', {
            method: 'POST',
            body: JSON.stringify({
                type: 'module_access',
                moduleId: moduleId,
                timestamp: Date.now()
            })
        });
    } catch (error) {
        console.error('Errore log attività:', error);
    }
}

// Aggiorna moduli
async function refreshModules() {
    const btn = document.querySelector('.btn-refresh');
    if (btn) {
        btn.classList.add('loading');
    }
    
    try {
        const response = await HubApp.fetchAPI('/dashboard/refresh');
        const data = await response.json();
        
        if (data.success) {
            updateDashboardData(data.data);
        }
    } catch (error) {
        console.error('Errore refresh:', error);
    } finally {
        if (btn) {
            btn.classList.remove('loading');
        }
    }
}

// Aggiorna dati dashboard
function updateDashboardData(data) {
    // Aggiorna contatore utenti online
    const onlineUsersElement = document.getElementById('onlineUsersCount');
    if (onlineUsersElement && data.onlineUsers !== undefined) {
        onlineUsersElement.textContent = data.onlineUsers;
    }
    
    // Aggiorna attività se presenti
    if (data.activities) {
        updateActivityList(data.activities);
    }
}

// Aggiorna lista attività
function updateActivityList(activities) {
    const container = document.getElementById('activitiesTimeline');
    if (!container) return;
    
    const html = activities.map(activity => `
        <div class="activity-item fade-in">
            <div class="activity-icon ${activity.type || ''}">
                ${getActivityIcon(activity.action)}
            </div>
            <div class="activity-content">
                <p class="activity-description">${activity.username} - ${activity.action}</p>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html || '<div class="no-activities"><p>Nessuna attività recente</p></div>';
}

// Ottieni icona attività
function getActivityIcon(action) {
    const icons = {
        'login_success': '🔑',
        'logout': '🚪',
        'module_access': '🚀',
        'update': '✏️',
        'create': '➕',
        'delete': '🗑️',
        'security': '🔒',
        'default': '📌'
    };
    
    return icons[action] || icons.default;
}

// Setup refresh automatico
function setupAutoRefresh() {
    // Refresh dati ogni 60 secondi
    DashboardState.refreshInterval = setInterval(() => {
        refreshModules();
    }, 60000);
}

// Avvia monitoraggio sessione
function startSessionMonitor() {
    checkSession();
    
    // Controlla ogni minuto
    DashboardState.sessionCheckInterval = setInterval(() => {
        checkSession();
    }, 60000);
}

// Controlla stato sessione
async function checkSession() {
    try {
        const response = await HubApp.fetchAPI('/session/check');
        const data = await response.json();
        
        if (data.success && data.remainingTime) {
            // Se meno di 5 minuti, mostra avviso
            if (data.remainingTime < 300000) {
                showSessionWarning(data.remainingTime);
            }
        }
    } catch (error) {
        console.error('Errore controllo sessione:', error);
    }
}

// Mostra avviso sessione
function showSessionWarning(remainingTime) {
    const minutes = Math.floor(remainingTime / 60000);
    const modal = document.getElementById('sessionWarningModal');
    
    if (modal) {
        document.getElementById('sessionTimeRemaining').textContent = minutes;
        HubApp.showModal('sessionWarningModal');
    }
}

// Estendi sessione
async function extendSession() {
    try {
        const response = await HubApp.fetchAPI('/session/extend', {
            method: 'POST'
        });
        
        if (response.ok) {
            HubApp.closeModal('sessionWarningModal');
            HubApp.showToast('Sessione estesa', 'success');
        }
    } catch (error) {
        console.error('Errore estensione sessione:', error);
        HubApp.showToast('Errore nell\'estensione della sessione', 'error');
    }
}

// Controlla notifiche
async function checkNotifications() {
    try {
        const response = await HubApp.fetchAPI('/notifications');
        const notifications = await response.json();
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (notifications.length > 0) {
                badge.textContent = notifications.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Errore controllo notifiche:', error);
    }
}

// Avvia refresh attività
function startActivityRefresh() {
    // Refresh ogni 30 secondi
    setInterval(() => {
        refreshActivities();
    }, 30000);
}

// Refresh attività
async function refreshActivities() {
    try {
        const response = await HubApp.fetchAPI('/activities/recent?limit=10');
        const activities = await response.json();
        updateActivityList(activities);
    } catch (error) {
        console.error('Errore refresh attività:', error);
    }
}

// Animazioni elementi
function animateElements() {
    // Osservatore per animazioni on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Osserva card
    document.querySelectorAll('.module-card, .stat-card').forEach(card => {
        observer.observe(card);
    });
}

// Cleanup su uscita
window.addEventListener('beforeunload', () => {
    if (DashboardState.refreshInterval) {
        clearInterval(DashboardState.refreshInterval);
    }
    if (DashboardState.sessionCheckInterval) {
        clearInterval(DashboardState.sessionCheckInterval);
    }
});
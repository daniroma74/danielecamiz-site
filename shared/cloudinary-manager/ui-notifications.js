// shared/cloudinary-manager/ui-notifications.js
// Sistema di notifiche toast elegante e riutilizzabile

(function() {
  'use strict';

  // Container per le notifiche
  let notificationContainer = null;

  // Contatore per ID univoci
  let notificationId = 0;

  /**
   * Inizializza il container delle notifiche
   */
  function initContainer() {
    if (notificationContainer) return;

    notificationContainer = document.createElement('div');
    notificationContainer.id = 'cloudinary-notifications';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(notificationContainer);
  }

  /**
   * Mostra una notifica toast
   * @param {string} message - Messaggio da mostrare
   * @param {string} type - Tipo: 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Durata in ms (default: 4000, 0 = permanente)
   * @returns {number} ID della notifica
   */
  function showNotification(message, type = 'info', duration = 4000) {
    initContainer();

    const id = ++notificationId;
    const toast = document.createElement('div');
    toast.id = `cloudinary-toast-${id}`;
    toast.className = 'cloudinary-toast';

    // Colori per tipo
    const colors = {
      success: { bg: '#27ae60', icon: '✅' },
      error: { bg: '#e74c3c', icon: '❌' },
      warning: { bg: '#f39c12', icon: '⚠️' },
      info: { bg: '#3498db', icon: 'ℹ️' },
      loading: { bg: '#667eea', icon: '⏳' }
    };

    const config = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${config.bg};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 300px;
      max-width: 500px;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    `;

    toast.innerHTML = `
      <span style="font-size: 20px; flex-shrink: 0;">${config.icon}</span>
      <span style="flex: 1;">${message}</span>
      ${duration > 0 ? '<span style="font-size: 20px; opacity: 0.7; flex-shrink: 0;">×</span>' : ''}
    `;

    // Hover effect
    toast.addEventListener('mouseenter', () => {
      toast.style.transform = 'translateX(-5px)';
    });
    toast.addEventListener('mouseleave', () => {
      toast.style.transform = 'translateX(0)';
    });

    // Click per chiudere
    toast.addEventListener('click', () => {
      hideNotification(id);
    });

    notificationContainer.appendChild(toast);

    // Auto-hide se duration > 0
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }

    return id;
  }

  /**
   * Nasconde una notifica specifica
   * @param {number} id - ID della notifica
   */
  function hideNotification(id) {
    const toast = document.getElementById(`cloudinary-toast-${id}`);
    if (!toast) return;

    toast.style.animation = 'slideOut 0.3s ease-in';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Nascon de tutte le notifiche
   */
  function clearAll() {
    if (!notificationContainer) return;
    notificationContainer.innerHTML = '';
  }

  /**
   * Mostra notifica di successo
   */
  function success(message, duration = 4000) {
    return showNotification(message, 'success', duration);
  }

  /**
   * Mostra notifica di errore
   */
  function error(message, duration = 6000) {
    return showNotification(message, 'error', duration);
  }

  /**
   * Mostra notifica di warning
   */
  function warning(message, duration = 5000) {
    return showNotification(message, 'warning', duration);
  }

  /**
   * Mostra notifica di info
   */
  function info(message, duration = 4000) {
    return showNotification(message, 'info', duration);
  }

  /**
   * Mostra notifica di loading (permanente fino a hide)
   */
  function loading(message) {
    return showNotification(message, 'loading', 0);
  }

  // Aggiungi stili CSS per animazioni
  if (!document.getElementById('cloudinary-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'cloudinary-toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(20px);
        }
      }

      .cloudinary-toast:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  // Export API
  window.CloudinaryNotifications = {
    show: showNotification,
    hide: hideNotification,
    clear: clearAll,
    success: success,
    error: error,
    warning: warning,
    info: info,
    loading: loading
  };
})();

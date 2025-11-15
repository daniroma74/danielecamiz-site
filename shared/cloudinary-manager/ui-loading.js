// shared/cloudinary-manager/ui-loading.js
// Componenti loading: spinner, progress bar, skeleton

(function() {
  'use strict';

  /**
   * Crea uno spinner inline
   * @param {Object} options - Opzioni { size: 32, color: '#d4af37' }
   * @returns {HTMLElement} Elemento spinner
   */
  function createSpinner(options = {}) {
    const size = options.size || 32;
    const color = options.color || '#d4af37';
    const borderWidth = options.borderWidth || 3;

    const spinner = document.createElement('div');
    spinner.className = 'cloudinary-spinner';
    spinner.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border: ${borderWidth}px solid rgba(0, 0, 0, 0.1);
      border-top-color: ${color};
      border-radius: 50%;
      animation: cloudinary-spin 0.8s linear infinite;
      display: inline-block;
    `;

    return spinner;
  }

  /**
   * Mostra overlay loading fullscreen
   * @param {string} message - Messaggio da mostrare
   * @returns {HTMLElement} Overlay element
   */
  function showOverlay(message = 'Caricamento...') {
    const overlay = document.createElement('div');
    overlay.id = 'cloudinary-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 20px;
      animation: fadeIn 0.2s ease-out;
    `;

    const spinner = createSpinner({ size: 48, color: '#fff' });

    const text = document.createElement('div');
    text.style.cssText = `
      color: white;
      font-size: 16px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    text.textContent = message;

    overlay.appendChild(spinner);
    overlay.appendChild(text);
    document.body.appendChild(overlay);

    return overlay;
  }

  /**
   * Nasconde overlay loading
   */
  function hideOverlay() {
    const overlay = document.getElementById('cloudinary-loading-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.2s ease-in';
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 200);
    }
  }

  /**
   * Crea una progress bar
   * @param {Object} options - { percent: 0, height: 4, color: '#d4af37' }
   * @returns {Object} { element, update(percent) }
   */
  function createProgressBar(options = {}) {
    const height = options.height || 4;
    const color = options.color || '#d4af37';
    const bgColor = options.bgColor || '#e0e0e0';

    const container = document.createElement('div');
    container.className = 'cloudinary-progress-bar';
    container.style.cssText = `
      width: 100%;
      height: ${height}px;
      background: ${bgColor};
      border-radius: ${height / 2}px;
      overflow: hidden;
      position: relative;
    `;

    const bar = document.createElement('div');
    bar.style.cssText = `
      height: 100%;
      width: 0%;
      background: ${color};
      transition: width 0.3s ease-out;
      border-radius: ${height / 2}px;
    `;

    container.appendChild(bar);

    return {
      element: container,
      update: (percent) => {
        const clampedPercent = Math.max(0, Math.min(100, percent));
        bar.style.width = `${clampedPercent}%`;
      },
      setColor: (newColor) => {
        bar.style.background = newColor;
      }
    };
  }

  /**
   * Mostra inline loading in un elemento
   * @param {HTMLElement} target - Elemento target
   * @param {string} message - Messaggio
   */
  function showInline(target, message = 'Caricamento...') {
    const container = document.createElement('div');
    container.className = 'cloudinary-inline-loading';
    container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      padding: 40px 20px;
      color: #7f8c8d;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const spinner = createSpinner({ size: 32, color: '#d4af37' });
    const text = document.createElement('div');
    text.textContent = message;
    text.style.fontSize = '14px';

    container.appendChild(spinner);
    container.appendChild(text);

    target.innerHTML = '';
    target.appendChild(container);
  }

  /**
   * Crea skeleton loader (per immagini in caricamento)
   * @param {Object} options - { width, height }
   * @returns {HTMLElement}
   */
  function createSkeleton(options = {}) {
    const width = options.width || '100%';
    const height = options.height || '150px';

    const skeleton = document.createElement('div');
    skeleton.className = 'cloudinary-skeleton';
    skeleton.style.cssText = `
      width: ${width};
      height: ${height};
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: cloudinary-skeleton-wave 1.5s ease-in-out infinite;
      border-radius: 8px;
    `;

    return skeleton;
  }

  // Aggiungi stili CSS per animazioni
  if (!document.getElementById('cloudinary-loading-styles')) {
    const style = document.createElement('style');
    style.id = 'cloudinary-loading-styles';
    style.textContent = `
      @keyframes cloudinary-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes cloudinary-skeleton-wave {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Export API
  window.CloudinaryLoading = {
    spinner: createSpinner,
    overlay: {
      show: showOverlay,
      hide: hideOverlay
    },
    progressBar: createProgressBar,
    inline: showInline,
    skeleton: createSkeleton
  };
})();

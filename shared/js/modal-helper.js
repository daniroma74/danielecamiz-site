/**
 * Shared Modal Helper Functions
 * Use these functions to show/hide modals consistently across all admin panels
 */

/**
 * Show a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }
}

/**
 * Hide a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }, 200); // Wait for fade animation
  }
}

/**
 * Update modal title
 * @param {string} modalId - The ID of the modal element
 * @param {string} newTitle - The new title text
 */
function updateModalTitle(modalId, newTitle) {
  const titleElement = document.getElementById(`${modalId}-title`);
  if (titleElement) {
    titleElement.textContent = newTitle;
  }
}

/**
 * Reset a form inside a modal
 * @param {string} formId - The ID of the form element
 */
function resetModalForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();
    // Reset any custom elements or states if needed
  }
}

/**
 * Show loading state in modal
 * @param {string} modalId - The ID of the modal element
 * @param {boolean} isLoading - Whether to show loading state
 */
function setModalLoading(modalId, isLoading) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const footer = document.getElementById(`${modalId}-footer`);
  if (footer) {
    const buttons = footer.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.disabled = isLoading;
      if (btn.type === 'submit') {
        btn.innerHTML = isLoading
          ? '<i class="fas fa-spinner fa-spin"></i> Salvataggio...'
          : btn.dataset.originalText || 'Salva';
        if (!btn.dataset.originalText) {
          btn.dataset.originalText = 'Salva';
        }
      }
    });
  }
}

/**
 * Display error message in modal
 * @param {string} modalId - The ID of the modal element
 * @param {string} message - Error message to display
 */
function showModalError(modalId, message) {
  const body = document.getElementById(`${modalId}-body`);
  if (!body) return;

  // Remove existing error
  const existingError = body.querySelector('.modal-error');
  if (existingError) existingError.remove();

  // Add new error
  const errorDiv = document.createElement('div');
  errorDiv.className = 'modal-error';
  errorDiv.style.cssText = `
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  body.insertBefore(errorDiv, body.firstChild);
}

/**
 * Clear error message in modal
 * @param {string} modalId - The ID of the modal element
 */
function clearModalError(modalId) {
  const body = document.getElementById(`${modalId}-body`);
  if (!body) return;

  const errorDiv = body.querySelector('.modal-error');
  if (errorDiv) errorDiv.remove();
}

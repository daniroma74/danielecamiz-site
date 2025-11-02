// navbar-dropdown.js - Dropdown navigation support

(function() {
  'use strict';

  function initDropdowns() {
    const dropdownItems = document.querySelectorAll('.nav-item-dropdown');

    dropdownItems.forEach(item => {
      const toggle = item.querySelector('.nav-dropdown-toggle');
      if (!toggle) return;

      // Click toggle for mobile
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isMobile = window.innerWidth <= 1024;

        if (isMobile) {
          // Toggle current dropdown
          item.classList.toggle('dropdown-open');

          // Close other dropdowns
          dropdownItems.forEach(otherItem => {
            if (otherItem !== item) {
              otherItem.classList.remove('dropdown-open');
            }
          });
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!item.contains(e.target)) {
          item.classList.remove('dropdown-open');
        }
      });

      // Close dropdown on ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          item.classList.remove('dropdown-open');
        }
      });
    });

    console.log('[Navbar] Dropdown navigation initialized');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdowns);
  } else {
    initDropdowns();
  }

})();

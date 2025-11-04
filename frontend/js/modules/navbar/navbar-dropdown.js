// navbar-dropdown.js - Dropdown navigation support

(function() {
  'use strict';

  function initDropdowns() {
    const dropdownItems = document.querySelectorAll('.nav-item-dropdown');
    console.log('[Navbar] Found dropdown items:', dropdownItems.length);

    dropdownItems.forEach((item, index) => {
      const toggle = item.querySelector('.nav-dropdown-toggle');
      const menu = item.querySelector('.nav-dropdown-menu');

      if (!toggle || !menu) {
        console.warn('[Navbar] Dropdown', index, 'missing toggle or menu');
        return;
      }

      console.log('[Navbar] Initializing dropdown', index);

      // DESKTOP: Hover events
      item.addEventListener('mouseenter', () => {
        if (window.innerWidth > 1024) {
          item.classList.add('dropdown-open');
          toggle.setAttribute('aria-expanded', 'true');
          console.log('[Navbar] Desktop hover open');
        }
      });

      item.addEventListener('mouseleave', () => {
        if (window.innerWidth > 1024) {
          item.classList.remove('dropdown-open');
          toggle.setAttribute('aria-expanded', 'false');
          console.log('[Navbar] Desktop hover close');
        }
      });

      // MOBILE & DESKTOP: Click toggle
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = item.classList.contains('dropdown-open');

        // Close all other dropdowns
        dropdownItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('dropdown-open');
            const otherToggle = otherItem.querySelector('.nav-dropdown-toggle');
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current dropdown
        if (isOpen) {
          item.classList.remove('dropdown-open');
          toggle.setAttribute('aria-expanded', 'false');
          console.log('[Navbar] Click close');
        } else {
          item.classList.add('dropdown-open');
          toggle.setAttribute('aria-expanded', 'true');
          console.log('[Navbar] Click open');
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!item.contains(e.target)) {
          item.classList.remove('dropdown-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });

      // Close dropdown on ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && item.classList.contains('dropdown-open')) {
          item.classList.remove('dropdown-open');
          toggle.setAttribute('aria-expanded', 'false');
          console.log('[Navbar] ESC close');
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

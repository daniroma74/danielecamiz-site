// repertoire.js - Modern repertoire page interactions

(function() {
  'use strict';

  // View Mode Switching
  function initViewModeSwitcher() {
    const switcher = document.querySelector('.view-mode-switcher');
    if (!switcher) return;

    const buttons = switcher.querySelectorAll('.view-mode-btn');
    const grids = document.querySelectorAll('.works-grid');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewMode = btn.dataset.view;

        // Update button states
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update grid classes
        grids.forEach(grid => {
          grid.classList.remove('view-grid', 'view-list', 'view-timeline');
          grid.classList.add(`view-${viewMode}`);
        });

        // Save preference
        try {
          localStorage.setItem('repertoire-view-mode', viewMode);
        } catch (e) {
          console.warn('Could not save view mode preference');
        }
      });
    });

    // Restore saved preference
    try {
      const savedView = localStorage.getItem('repertoire-view-mode');
      if (savedView) {
        const targetBtn = switcher.querySelector(`[data-view="${savedView}"]`);
        if (targetBtn) targetBtn.click();
      }
    } catch (e) {
      console.warn('Could not restore view mode preference');
    }
  }

  // Filter Tabs
  function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    const sections = document.querySelectorAll('.repertoire-section');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter;

        // Update tab states
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show corresponding section
        sections.forEach(section => {
          if (section.id === `${filter}View`) {
            section.classList.add('active');
          } else {
            section.classList.remove('active');
          }
        });
      });
    });
  }

  // Composer/Genre Expand
  function initExpandableCards() {
    const expandButtons = document.querySelectorAll('.composer-expand-btn, .genre-expand-btn');

    expandButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.composer-card, .genre-card');
        if (!card) return;

        const worksContainer = card.querySelector('.composer-works, .genre-works');
        if (!worksContainer) return;

        const isExpanded = worksContainer.style.display !== 'none';
        worksContainer.style.display = isExpanded ? 'none' : 'block';

        // Update icon
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-chevron-down');
          icon.classList.toggle('fa-chevron-up');
        }

        // Update text
        const span = this.querySelector('span');
        if (span) {
          span.textContent = isExpanded
            ? (document.documentElement.lang === 'en' ? 'View works' : 'Visualizza brani')
            : (document.documentElement.lang === 'en' ? 'Hide works' : 'Nascondi brani');
        }
      });
    });
  }

  // Search functionality
  function initSearch() {
    const searchInputs = [
      document.getElementById('repertoireSearch'),
      document.getElementById('repertoireQuickSearch')
    ];

    searchInputs.forEach(input => {
      if (!input) return;

      input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();

        // Share search value between inputs
        searchInputs.forEach(i => {
          if (i && i !== this) i.value = this.value;
        });

        // Filter work cards
        const workCards = document.querySelectorAll('.work-card');

        workCards.forEach(card => {
          const title = (card.querySelector('.work-card__title')?.textContent || '').toLowerCase();
          const composer = (card.dataset.composer || '').toLowerCase();
          const category = (card.dataset.category || '').toLowerCase();

          const matches = !query || title.includes(query) || composer.includes(query) || category.includes(query);

          card.style.display = matches ? '' : 'none';
        });

        // Update counts
        updateVisibleCounts();
      });
    });
  }

  // Update section counts based on visible items
  function updateVisibleCounts() {
    const sections = document.querySelectorAll('.repertoire-section');

    sections.forEach(section => {
      const visibleCards = section.querySelectorAll('.work-card:not([style*="display: none"])');
      const subtitle = section.querySelector('.section-subtitle');

      if (subtitle) {
        const count = visibleCards.length;
        const lang = document.documentElement.lang || 'it';
        const text = lang === 'en'
          ? `${count} work${count !== 1 ? 's' : ''} shown`
          : `${count} bran${count !== 1 ? 'i' : 'o'} mostrat${count !== 1 ? 'i' : 'o'}`;
        subtitle.textContent = text;
      }
    });
  }

  // Initialize all features
  function init() {
    initViewModeSwitcher();
    initFilterTabs();
    initExpandableCards();
    initSearch();

    console.log('[Repertoire] Initialized modern repertoire page');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

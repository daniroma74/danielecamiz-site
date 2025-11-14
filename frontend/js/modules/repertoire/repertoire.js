// repertoire.js - Modern repertoire page interactions

(function() {
  'use strict';

  // View Mode Switching
  function initViewModeSwitcher() {
    const switcher = document.querySelector('.view-mode-switcher');
    const timelineSortOptions = document.querySelector('.timeline-sort-options');
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

        // Show/hide timeline sort options
        if (timelineSortOptions) {
          timelineSortOptions.style.display = viewMode === 'timeline' ? 'flex' : 'none';
        }

        // Save preference
        try {
          localStorage.setItem('repertoire-view-mode', viewMode);
        } catch (e) {
          console.warn('Could not save view mode preference');
        }

        // Apply sort if timeline view
        if (viewMode === 'timeline') {
          const activeSort = document.querySelector('.timeline-sort-btn.active');
          if (activeSort) {
            sortTimeline(activeSort.dataset.sort);
          }
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

  // Sort timeline by different criteria
  function sortTimeline(sortBy) {
    const grids = document.querySelectorAll('.works-grid.view-timeline');

    grids.forEach(grid => {
      const cards = Array.from(grid.querySelectorAll('.work-card'));

      cards.sort((a, b) => {
        let aValue, bValue;

        if (sortBy === 'composition') {
          aValue = parseInt(a.dataset.compositionYear) || 0;
          bValue = parseInt(b.dataset.compositionYear) || 0;
        } else if (sortBy === 'first') {
          aValue = a.dataset.firstPerformance || '';
          bValue = b.dataset.firstPerformance || '';
        } else if (sortBy === 'last') {
          aValue = a.dataset.lastPerformance || '';
          bValue = b.dataset.lastPerformance || '';
        }

        // Sort ascending (oldest first for timeline)
        if (sortBy === 'composition') {
          return aValue - bValue;
        } else {
          // For dates, compare as strings (ISO format)
          if (!aValue) return 1;  // Put empty dates at end
          if (!bValue) return -1;
          return aValue.localeCompare(bValue);
        }
      });

      // Re-append cards in sorted order
      cards.forEach(card => grid.appendChild(card));
    });
  }

  // Timeline sort buttons
  function initTimelineSortButtons() {
    const sortButtons = document.querySelectorAll('.timeline-sort-btn');

    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sortBy = btn.dataset.sort;

        // Update button states
        sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Apply sort
        sortTimeline(sortBy);

        // Save preference
        try {
          localStorage.setItem('repertoire-timeline-sort', sortBy);
        } catch (e) {
          console.warn('Could not save timeline sort preference');
        }
      });
    });

    // Restore saved preference
    try {
      const savedSort = localStorage.getItem('repertoire-timeline-sort');
      if (savedSort) {
        const targetBtn = document.querySelector(`.timeline-sort-btn[data-sort="${savedSort}"]`);
        if (targetBtn) targetBtn.click();
      }
    } catch (e) {
      console.warn('Could not restore timeline sort preference');
    }
  }

  // Initialize all features
  function init() {
    initViewModeSwitcher();
    initFilterTabs();
    initExpandableCards();
    initSearch();
    initTimelineSortButtons();

    console.log('[Repertoire] Initialized modern repertoire page');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

  // Count-up animation for stats
  function animateCountUp(element, target, duration = 1500) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }

  // Initialize count-up when stats come into view
  function initStatsAnimation() {
    const statNumbers = document.querySelectorAll('.rep-stat-number');
    if (!statNumbers.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          const target = parseInt(entry.target.textContent, 10);
          entry.target.dataset.animated = 'true';
          animateCountUp(entry.target, target, 2000);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => observer.observe(stat));
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatsAnimation);
  } else {
    initStatsAnimation();
  }

})();

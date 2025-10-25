// frontend/js/modules/repertoire/repertoire.js

(function() {
  'use strict';

  // State
  let currentCategory = null;
  let currentComposer = null;
  let allWorks = [];
  let categories = [];
  let composers = [];

  // Inizializzazione
  function init() {
    console.log('[Repertoire] Initializing...');
    
    collectData();
    setupTabs();
    setupComposerPills();
    setupMovementsToggles();
    
    // Attiva prima categoria
    const firstTab = document.querySelector('.repertoire-tabs .tab');
    if (firstTab) {
      firstTab.click();
    }
    
    console.log('[Repertoire] Initialized');
  }

  // Raccoglie dati dalla pagina
  function collectData() {
    // Raccogli tutte le works cards
    const workCards = document.querySelectorAll('.work-card');
    workCards.forEach(card => {
      const composer = card.dataset.composer;
      const category = card.dataset.category;
      
      if (composer && !composers.includes(composer)) {
        composers.push(composer);
      }
      
      if (category && !categories.includes(category)) {
        categories.push(category);
      }
      
      allWorks.push({
        element: card,
        composer,
        category
      });
    });
    
    console.log(`[Repertoire] Found ${allWorks.length} works, ${composers.length} composers, ${categories.length} categories`);
  }

  // Setup tabs categorie
  function setupTabs() {
    const tabs = document.querySelectorAll('.repertoire-tabs .tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const category = this.dataset.category;
        activateTab(category);
      });
    });
  }

  // Attiva tab
  function activateTab(category) {
    currentCategory = category;
    currentComposer = null; // Reset compositore
    
    // Aggiorna UI tabs
    document.querySelectorAll('.repertoire-tabs .tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.category === category);
      tab.setAttribute('aria-selected', tab.dataset.category === category ? 'true' : 'false');
    });
    
    // Mostra/nascondi pannelli
    document.querySelectorAll('.repertoire-category').forEach(panel => {
      const isActive = panel.dataset.category === category;
      panel.setAttribute('aria-hidden', !isActive);
      panel.style.display = isActive ? 'block' : 'none';
    });
    
    // Aggiorna composer pills per questa categoria
    updateComposerPills();
    
    // Filtra works
    filterWorks();
    
    console.log(`[Repertoire] Activated category: ${category}`);
  }

  // Setup composer pills
  function setupComposerPills() {
    const pillsContainer = document.getElementById('composer_pills');
    if (!pillsContainer) return;
    
    // Pills saranno popolate quando si cambia categoria
  }

  // Aggiorna composer pills per categoria corrente
  function updateComposerPills() {
    const pillsContainer = document.getElementById('composer_pills');
    if (!pillsContainer) return;
    
    // Trova compositori per categoria corrente
    const categoryComposers = new Set();
    allWorks.forEach(work => {
      if (work.category === currentCategory && work.composer) {
        categoryComposers.add(work.composer);
      }
    });
    
    if (categoryComposers.size === 0) {
      pillsContainer.style.display = 'none';
      return;
    }
    
    pillsContainer.style.display = 'flex';
    pillsContainer.innerHTML = '';
    
    // Pill "Tutti"
    const allPill = document.createElement('button');
    allPill.className = 'composer-pill is-active';
    allPill.textContent = 'Tutti i compositori';
    allPill.addEventListener('click', () => selectComposer(null));
    pillsContainer.appendChild(allPill);
    
    // Pills compositori
    Array.from(categoryComposers).sort().forEach(composer => {
      const pill = document.createElement('button');
      pill.className = 'composer-pill';
      pill.textContent = composer;
      pill.addEventListener('click', () => selectComposer(composer));
      pillsContainer.appendChild(pill);
    });
  }

  // Seleziona compositore
  function selectComposer(composer) {
    currentComposer = composer;
    
    // Aggiorna UI pills
    document.querySelectorAll('.composer-pill').forEach(pill => {
      const isAll = pill.textContent === 'Tutti i compositori';
      const isActive = (composer === null && isAll) || pill.textContent === composer;
      pill.classList.toggle('is-active', isActive);
    });
    
    // Filtra works
    filterWorks();
    
    console.log(`[Repertoire] Selected composer: ${composer || 'all'}`);
  }

  // Filtra works
  function filterWorks() {
    allWorks.forEach(work => {
      const matchCategory = work.category === currentCategory;
      const matchComposer = currentComposer === null || work.composer === currentComposer;
      
      const shouldShow = matchCategory && matchComposer;
      work.element.style.display = shouldShow ? '' : 'none';
    });
  }

  // Setup toggles movimenti
  function setupMovementsToggles() {
    const toggles = document.querySelectorAll('.movements-toggle');
    
    toggles.forEach(toggle => {
      toggle.addEventListener('click', function() {
        const list = this.nextElementSibling;
        if (!list || !list.classList.contains('movements-list')) return;
        
        const isVisible = list.classList.contains('is-visible');
        
        if (isVisible) {
          list.classList.remove('is-visible');
          this.classList.remove('active');
        } else {
          list.classList.add('is-visible');
          this.classList.add('active');
        }
      });
    });
  }

  // Espandi tutti i movimenti (utility pubblica)
  window.expandAllMovements = function() {
    document.querySelectorAll('.movements-toggle').forEach(toggle => {
      const list = toggle.nextElementSibling;
      if (list) {
        list.classList.add('is-visible');
        toggle.classList.add('active');
      }
    });
  };

  // Collassa tutti i movimenti (utility pubblica)
  window.collapseAllMovements = function() {
    document.querySelectorAll('.movements-toggle').forEach(toggle => {
      const list = toggle.nextElementSibling;
      if (list) {
        list.classList.remove('is-visible');
        toggle.classList.remove('active');
      }
    });
  };

  // Avvio
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
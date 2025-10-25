// admin-dashboard.js - Dashboard Interattiva

document.addEventListener('DOMContentLoaded', function() {
  
  const searchInput = document.getElementById('searchEvents');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const eventsGrid = document.getElementById('eventsGrid');
  const eventCards = document.querySelectorAll('.event-card');
  
  let currentFilter = 'all';
  let searchTerm = '';
  
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchTerm = this.value.toLowerCase();
      filterEvents();
    });
  }
  
  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      filterEvents();
    });
  });
  
  function filterEvents() {
    let visibleCount = 0;
    
    eventCards.forEach(card => {
      const title = card.querySelector('.event-title')?.textContent.toLowerCase() || '';
      const subtitle = card.querySelector('.event-subtitle')?.textContent.toLowerCase() || '';
      const location = card.querySelector('.event-location')?.textContent.toLowerCase() || '';
      
      const matchesSearch = !searchTerm || 
        title.includes(searchTerm) || 
        subtitle.includes(searchTerm) || 
        location.includes(searchTerm);
      
      let matchesFilter = true;
      
      if (currentFilter === 'with-bookings') {
        matchesFilter = card.dataset.hasBookings === 'true';
      } else if (currentFilter === 'upcoming') {
        const daysUntil = parseInt(card.dataset.daysUntil);
        matchesFilter = daysUntil <= 30;
      }
      
      const isVisible = matchesSearch && matchesFilter;
      
      if (isVisible) {
        card.style.display = '';
        card.style.animation = 'fadeInUp 0.5s ease';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    
    // Show empty state if no results
    const existingEmpty = eventsGrid.querySelector('.no-results');
    if (existingEmpty) existingEmpty.remove();
    
    if (visibleCount === 0 && eventCards.length > 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state no-results';
      emptyDiv.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>Nessun evento trovato</h3>
        <p>Prova a modificare i filtri o la ricerca</p>
      `;
      eventsGrid.appendChild(emptyDiv);
    }
  }
  
  // Smooth scroll to top when clicking nav brand
  const navBrand = document.querySelector('.nav-brand');
  if (navBrand) {
    navBrand.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
});
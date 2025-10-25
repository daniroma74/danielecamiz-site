/**
 * ICNT STAGIONE 2026
 * Modern Interactive JavaScript
 */

// === Constants ===
const ANIMATION_DURATION = 300;
const INTERSECTION_THRESHOLD = 0.1;
const STORAGE_KEY = 'icnt_preferences';

// === DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

/**
 * Initialize all app features
 */
function initializeApp() {
  // Core features
  initFilters();
  initLazyLoading();
  initAnimations();
  initEventCards();
  initPosterInteraction();
  
  // Enhancement features
  initThemeToggle();
  initSmoothScroll();
  initKeyboardNavigation();
  initLiveCounter();
  
  // Mobile features
  initMobileMenu();
  initTouchInteractions();
  
  // Performance
  initPrefetch();
  
  // Analytics
  trackPageView();
}

// === Filters ===
function initFilters() {
  const filters = document.querySelectorAll('.chip');
  const eventCards = document.querySelectorAll('.event-card');
  
  // Get current filter from URL
  const params = new URLSearchParams(window.location.search);
  const currentFilter = params.get('f') || 'all';
  
  // Set active filter
  filters.forEach(filter => {
    const href = filter.getAttribute('href');
    if (href && href.includes(`f=${currentFilter}`)) {
      filter.classList.add('active');
      filter.setAttribute('aria-current', 'page');
    }
    
    // Add smooth transition
    filter.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(filter.href);
      const newFilter = url.searchParams.get('f') || 'all';
      
      // Animate filter change
      animateFilterChange(currentFilter, newFilter);
      
      // Update URL without reload
      history.pushState({ filter: newFilter }, '', url);
      
      // Update active state
      filters.forEach(f => f.classList.remove('active'));
      filter.classList.add('active');
      
      // Filter events
      filterEvents(newFilter);
    });
  });
}

/**
 * Animate filter transitions
 */
function animateFilterChange(from, to) {
  const eventList = document.querySelector('.event-ul');
  if (!eventList) return;
  
  eventList.style.opacity = '0';
  eventList.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
    eventList.style.transition = `all ${ANIMATION_DURATION}ms ease-out`;
    eventList.style.opacity = '1';
    eventList.style.transform = 'translateY(0)';
  }, 50);
}

/**
 * Filter events based on type
 */
function filterEvents(filterType) {
  const events = document.querySelectorAll('.event-card');
  let visibleCount = 0;
  
  events.forEach((event, index) => {
    const type = event.dataset.type || 'icnt';
    const shouldShow = filterType === 'all' || type === filterType;
    
    if (shouldShow) {
      event.style.display = '';
      event.style.animation = `slideInLeft 0.5s ease-out ${index * 0.05}s both`;
      visibleCount++;
    } else {
      event.style.display = 'none';
    }
  });
  
  // Show empty state if no events
  showEmptyState(visibleCount === 0);
}

/**
 * Show empty state message
 */
function showEmptyState(show) {
  let emptyState = document.querySelector('.empty-state');
  
  if (show) {
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <p class="empty">Nessun evento trovato per questa categoria.</p>
      `;
      document.querySelector('.event-ul')?.appendChild(emptyState);
    }
    emptyState.style.display = 'block';
  } else if (emptyState) {
    emptyState.style.display = 'none';
  }
}

// === Lazy Loading ===
function initLazyLoading() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.classList.add('loading');
          
          img.addEventListener('load', () => {
            img.classList.remove('loading');
            img.classList.add('loaded');
          });
          
          imageObserver.unobserve(img);
        }
      });
    }, {
      threshold: INTERSECTION_THRESHOLD,
      rootMargin: '50px'
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
}

// === Animations ===
function initAnimations() {
  const observerOptions = {
    threshold: INTERSECTION_THRESHOLD,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const animationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        animationObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe cards and sections
  document.querySelectorAll('.card, .event-card').forEach(el => {
    animationObserver.observe(el);
  });
}

// === Event Cards ===
function initEventCards() {
  const eventCards = document.querySelectorAll('.event-card');
  
  eventCards.forEach(card => {
    // Add hover effects
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateX(8px)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateX(0)';
    });
    
    // Add data attributes for filtering
    const title = card.querySelector('.event-title h3')?.textContent || '';
    const mscBadge = card.querySelector('.msc-badge');
    card.dataset.type = mscBadge ? 'msc' : 'icnt';
    
    // Progressive enhancement for buttons
    const buttons = card.querySelectorAll('.btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Add ripple effect
        createRipple(e, btn);
      });
    });
  });
}

/**
 * Create ripple effect on click
 */
function createRipple(event, element) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    left: ${x}px;
    top: ${y}px;
    pointer-events: none;
    transform: scale(0);
    animation: ripple 0.6s ease-out;
  `;
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

// === Poster Interaction ===
function initPosterInteraction() {
  const posterLink = document.querySelector('.poster-link');
  const posterImg = posterLink?.querySelector('img');
  
  if (!posterLink || !posterImg) return;
  
  // Enhanced lightbox
  posterLink.addEventListener('click', (e) => {
    e.preventDefault();
    openLightbox(posterImg.src, posterImg.alt);
  });
  
  // Parallax effect on scroll (desktop only)
  if (window.innerWidth > 1024) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.1;
      posterImg.style.transform = `translateY(${rate}px) scale(1.05)`;
    });
  }
}

/**
 * Open lightbox for images
 */
function openLightbox(src, alt) {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <div class="lightbox-backdrop"></div>
    <div class="lightbox-content">
      <button class="lightbox-close" aria-label="Chiudi">&times;</button>
      <img src="${src}" alt="${alt}">
    </div>
  `;
  
  document.body.appendChild(lightbox);
  document.body.style.overflow = 'hidden';
  
  // Animate in
  requestAnimationFrame(() => {
    lightbox.classList.add('active');
  });
  
  // Close handlers
  const close = () => {
    lightbox.classList.remove('active');
    setTimeout(() => {
      lightbox.remove();
      document.body.style.overflow = '';
    }, 300);
  };
  
  lightbox.querySelector('.lightbox-close').addEventListener('click', close);
  lightbox.querySelector('.lightbox-backdrop').addEventListener('click', close);
  
  // ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// === Theme Toggle ===
function initThemeToggle() {
  const stored = localStorage.getItem('theme') || 'dark';
  document.body.className = `theme-${stored}`;
  
  // Create toggle button
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.innerHTML = stored === 'dark' ? '☀️' : '🌙';
  toggle.setAttribute('aria-label', 'Cambia tema');
  
  toggle.addEventListener('click', () => {
    const current = document.body.className.includes('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.body.className = `theme-${next}`;
    localStorage.setItem('theme', next);
    toggle.innerHTML = next === 'dark' ? '☀️' : '🌙';
  });
  
  // Append to header
  document.querySelector('.site-header .container')?.appendChild(toggle);
}

// === Smooth Scroll ===
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// === Keyboard Navigation ===
function initKeyboardNavigation() {
  let focusableElements = [];
  let currentIndex = -1;
  
  const updateFocusableElements = () => {
    focusableElements = Array.from(
      document.querySelectorAll('a, button, input, [tabindex="0"]')
    ).filter(el => !el.disabled && el.offsetParent !== null);
  };
  
  updateFocusableElements();
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') return; // Let browser handle tab
    
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % focusableElements.length;
      focusableElements[currentIndex]?.focus();
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      currentIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      focusableElements[currentIndex]?.focus();
    }
  });
}

// === Live Counter ===
function initLiveCounter() {
  const counter = document.querySelector('.live-counter');
  if (!counter) return;
  
  // Simulate live updates
  let count = parseInt(counter.textContent) || 0;
  
  setInterval(() => {
    if (Math.random() > 0.7) {
      count += Math.floor(Math.random() * 3) + 1;
      animateCounter(counter, count);
    }
  }, 10000);
}

/**
 * Animate counter number
 */
function animateCounter(element, target) {
  const current = parseInt(element.textContent) || 0;
  const increment = (target - current) / 20;
  let value = current;
  
  const timer = setInterval(() => {
    value += increment;
    if ((increment > 0 && value >= target) || (increment < 0 && value <= target)) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(value);
    }
  }, 50);
}

// === Mobile Menu ===
function initMobileMenu() {
  if (window.innerWidth > 768) return;
  
  const header = document.querySelector('.site-header');
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
  }, { passive: true });
}

// === Touch Interactions ===
function initTouchInteractions() {
  if (!('ontouchstart' in window)) return;
  
  let touchStartX = 0;
  let touchEndX = 0;
  
  const eventList = document.querySelector('.event-ul');
  if (!eventList) return;
  
  eventList.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  
  eventList.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
  
  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) {
        // Swipe right - previous filter
        navigateFilter('prev');
      } else {
        // Swipe left - next filter
        navigateFilter('next');
      }
    }
  }
}

/**
 * Navigate between filters
 */
function navigateFilter(direction) {
  const filters = Array.from(document.querySelectorAll('.chip'));
  const activeIndex = filters.findIndex(f => f.classList.contains('active'));
  
  let newIndex;
  if (direction === 'next') {
    newIndex = (activeIndex + 1) % filters.length;
  } else {
    newIndex = activeIndex <= 0 ? filters.length - 1 : activeIndex - 1;
  }
  
  filters[newIndex]?.click();
}

// === Prefetch ===
function initPrefetch() {
  const links = document.querySelectorAll('a[href^="http"]');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      const prefetch = document.createElement('link');
      prefetch.rel = 'prefetch';
      prefetch.href = link.href;
      document.head.appendChild(prefetch);
    }, { once: true });
  });
}

// === Analytics ===
function trackPageView() {
  // Track page view
  if (window.gtag) {
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }
}

// === Utilities ===
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// === Export for external use ===
window.ICNT = {
  filterEvents,
  openLightbox,
  animateCounter,
  navigateFilter
};
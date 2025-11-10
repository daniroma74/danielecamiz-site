/**
 * Coro Raro - Main JavaScript
 * Gestisce navigazione, interazioni e UX
 */

// ============================================
// NAVBAR
// ============================================

class Navbar {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.navToggle = document.getElementById('navToggle');
    this.navMenu = document.getElementById('navMenu');
    this.navLinks = document.querySelectorAll('.nav-link');

    this.init();
  }

  init() {
    // Mobile menu toggle
    if (this.navToggle) {
      this.navToggle.addEventListener('click', () => this.toggleMobileMenu());
    }

    // Smooth scroll
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => this.handleNavClick(e));
    });

    // Scroll spy
    window.addEventListener('scroll', () => this.handleScroll());
  }

  toggleMobileMenu() {
    this.navMenu.classList.toggle('active');
  }

  closeMobileMenu() {
    this.navMenu.classList.remove('active');
  }

  handleNavClick(e) {
    const href = e.currentTarget.getAttribute('href');

    if (!href || !href.startsWith('#')) return;

    e.preventDefault();

    this.closeMobileMenu();

    const target = document.querySelector(href);
    if (!target) return;

    const navbarHeight = this.navbar.offsetHeight;
    const targetPosition = target.offsetTop - navbarHeight;

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });

    // Update active state
    this.navLinks.forEach(link => link.classList.remove('active'));
    e.currentTarget.classList.add('active');
  }

  handleScroll() {
    this.updateActiveLink();
  }

  updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        this.navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
}

// ============================================
// BACK TO TOP BUTTON
// ============================================

class BackToTop {
  constructor() {
    this.button = document.getElementById('backToTop');
    if (!this.button) return;

    this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.handleScroll());
    this.button.addEventListener('click', () => this.scrollToTop());
  }

  handleScroll() {
    if (window.pageYOffset > 400) {
      this.button.classList.add('visible');
    } else {
      this.button.classList.remove('visible');
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

// ============================================
// FORM HANDLING
// ============================================

class ContactForm {
  constructor() {
    this.form = document.getElementById('joinForm');
    if (!this.form) return;

    this.init();
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);

    // Validazione
    if (!this.validate(data)) {
      return;
    }

    // Loading state
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Invio in corso...';
    submitBtn.disabled = true;

    try {
      // TODO: Implementare invio al server
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success
      this.showMessage('Grazie! Ti contatteremo presto.', 'success');
      this.form.reset();

    } catch (error) {
      // Error
      this.showMessage('Errore nell\'invio. Riprova più tardi.', 'error');
      console.error('Form error:', error);

    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  validate(data) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      this.showMessage('Inserisci un indirizzo email valido.', 'error');
      return false;
    }

    if (!data.name || !data.message) {
      this.showMessage('Compila tutti i campi richiesti.', 'error');
      return false;
    }

    return true;
  }

  showMessage(message, type) {
    const existing = this.form.querySelector('.form-message');
    if (existing) existing.remove();

    const messageEl = document.createElement('div');
    messageEl.className = `form-message form-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      padding: 1rem;
      margin-top: 1rem;
      border-radius: 10px;
      font-weight: 600;
      text-align: center;
      background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
      color: ${type === 'success' ? '#155724' : '#721c24'};
      border: 2px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
    `;

    this.form.appendChild(messageEl);

    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transition = 'opacity 0.3s';
      setTimeout(() => messageEl.remove(), 300);
    }, 5000);
  }
}

// ============================================
// LAZY LOADING IMAGES
// ============================================

class LazyLoader {
  constructor() {
    this.images = document.querySelectorAll('img[loading="lazy"]');
    if (!this.images.length) return;

    this.init();
  }

  init() {
    // Modern browsers support native lazy loading
    if ('loading' in HTMLImageElement.prototype) {
      return;
    }

    // Fallback for older browsers
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    this.images.forEach(img => imageObserver.observe(img));
  }
}

// ============================================
// WORLD MAP INTERACTIVE
// ============================================

class WorldMap {
  constructor() {
    this.tooltip = document.getElementById('mapTooltip');
    this.markers = document.querySelectorAll('.repertoire-marker');

    if (!this.tooltip || !this.markers.length) return;

    // Dati delle regioni
    this.regionsData = {
      africa: {
        title: 'Africa',
        description: 'Canti tradizionali, polifonie tribali, ritmi ancestrali',
        examples: [
          'Zulu, Swahili, Yoruba',
          'Canti di lavoro e celebrazione',
          'Ritmi e polifonie tradizionali'
        ]
      },
      europe: {
        title: 'Europa',
        description: 'Canti popolari, folklore, tradizioni regionali',
        examples: [
          'Italiano, Spagnolo, Balcanico',
          'Musiche celtiche e mediterranee',
          'Tradizioni popolari'
        ]
      },
      asia: {
        title: 'Asia',
        description: 'Melodie orientali, canti spirituali, folklore',
        examples: [
          'Giapponese, Cinese, Indiano',
          'Tradizioni millenarie',
          'Canti spirituali e meditativi'
        ]
      },
      americas: {
        title: 'Americhe',
        description: 'Spirituals, folk latino-americano',
        examples: [
          'Gospel, canti andini',
          'Tradizioni indigene',
          'Musiche afro-americane'
        ]
      }
    };

    this.init();
  }

  init() {
    this.markers.forEach(marker => {
      // Hover effect
      marker.addEventListener('mouseenter', (e) => this.handleMarkerHover(e));
      marker.addEventListener('mouseleave', () => this.hideTooltip());

      // Click effect per mobile
      marker.addEventListener('click', (e) => this.handleMarkerClick(e));
    });

    // Animazioni d'entrata
    this.animateMarkersEntrance();
  }

  handleMarkerHover(event) {
    const marker = event.currentTarget;
    const region = marker.dataset.region;
    const data = this.regionsData[region];

    if (!data) return;

    this.showTooltip(marker, data);
  }

  handleMarkerClick(event) {
    event.stopPropagation();
    const marker = event.currentTarget;
    const region = marker.dataset.region;
    const data = this.regionsData[region];

    if (!data) return;

    // Toggle tooltip on mobile
    if (this.tooltip.classList.contains('visible')) {
      this.hideTooltip();
    } else {
      this.showTooltip(marker, data);
    }
  }

  showTooltip(marker, data) {
    // Popola il tooltip
    this.tooltip.querySelector('.tooltip-title').textContent = data.title;
    this.tooltip.querySelector('.tooltip-description').textContent = data.description;

    const examplesList = this.tooltip.querySelector('.tooltip-examples');
    examplesList.innerHTML = '';
    data.examples.forEach(example => {
      const li = document.createElement('li');
      li.textContent = example;
      examplesList.appendChild(li);
    });

    // Posiziona il tooltip
    const markerRect = marker.getBoundingClientRect();
    const containerRect = marker.closest('.world-map-container').getBoundingClientRect();

    const left = markerRect.left - containerRect.left + markerRect.width / 2;
    const top = markerRect.top - containerRect.top - 10;

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.transform = 'translate(-50%, -100%)';

    // Mostra il tooltip
    this.tooltip.classList.add('visible');
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
  }

  animateMarkersEntrance() {
    this.markers.forEach((marker, index) => {
      if (marker.classList.contains('hidden')) return;

      marker.style.opacity = '0';
      marker.style.transform = 'translate(0, 20px)';

      setTimeout(() => {
        marker.style.transition = 'all 0.6s ease-out';
        marker.style.opacity = '1';
        marker.style.transform = 'translate(0, 0)';
      }, 200 + index * 150);
    });
  }
}

// ============================================
// ACCESSIBILITY
// ============================================

class Accessibility {
  static init() {
    // Skip to main content link
    this.addSkipLink();

    // Keyboard navigation enhancements
    this.enhanceKeyboardNav();
  }

  static addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#home';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Salta al contenuto';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--terracotta);
      color: white;
      padding: 12px;
      z-index: 100;
      text-decoration: none;
      font-weight: 700;
      border-radius: 0 0 10px 0;
    `;
    skipLink.addEventListener('focus', function() {
      this.style.top = '0';
    });
    skipLink.addEventListener('blur', function() {
      this.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  static enhanceKeyboardNav() {
    // Trap focus in mobile menu when open
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        document.getElementById('navToggle')?.focus();
      }
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 Coro Raro - Website initialized');

  // Initialize modules
  Accessibility.init();

  new Navbar();
  new BackToTop();
  new ContactForm();
  new LazyLoader();
  new WorldMap();

  // Add loaded class
  document.body.classList.add('loaded');
});

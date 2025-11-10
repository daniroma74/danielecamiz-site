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
// 3D GLOBE INTERACTIVE
// ============================================

class WorldGlobe {
  constructor() {
    this.container = document.getElementById('globeViz');
    this.tooltip = document.getElementById('globeTooltip');

    if (!this.container || typeof Globe === 'undefined') {
      console.warn('Globe.gl not loaded or container not found');
      return;
    }

    // Dati dei paesi con bandierine e brani specifici
    this.countriesData = [
      // EUROPA
      { flag: '🇮🇹', country: 'Italia', lat: 41.9, lng: 12.5, songs: ['Canti popolari italiani', 'Tradizioni regionali'], color: '#228B22' },
      { flag: '🇪🇸', country: 'Spagna', lat: 40.4, lng: -3.7, songs: ['Flamenco', 'Canti tradizionali spagnoli'], color: '#C41E3A' },
      { flag: '🇫🇷', country: 'Francia', lat: 48.9, lng: 2.3, songs: ['Chansons françaises', 'Musica bretone'], color: '#0055A4' },
      { flag: '🇩🇪', country: 'Germania', lat: 52.5, lng: 13.4, songs: ['Lieder tedeschi', 'Folklore bavarese'], color: '#000000' },
      { flag: '🇷🇺', country: 'Russia', lat: 55.8, lng: 37.6, songs: ['Canti cosacchi', 'Musica ortodossa'], color: '#DA291C' },
      { flag: '🇬🇧', country: 'Regno Unito', lat: 51.5, lng: -0.1, songs: ['Folk celtico', 'Madrigali inglesi'], color: '#012169' },
      { flag: '🇬🇷', country: 'Grecia', lat: 38.0, lng: 23.7, songs: ['Musica bizantina', 'Canti tradizionali'], color: '#0D5EAF' },

      // AFRICA
      { flag: '🇿🇦', country: 'Sudafrica', lat: -26.2, lng: 28.0, songs: ['Canti Zulu', 'Gospel africano'], color: '#007A4D' },
      { flag: '🇳🇬', country: 'Nigeria', lat: 9.1, lng: 7.4, songs: ['Canti Yoruba', 'Afrobeat tradizionale'], color: '#008751' },
      { flag: '🇰🇪', country: 'Kenya', lat: -1.3, lng: 36.8, songs: ['Canti Swahili', 'Musica masai'], color: '#BB0000' },

      // AMERICHE
      { flag: '🇺🇸', country: 'Stati Uniti', lat: 38.9, lng: -77.0, songs: ['Spirituals', 'Gospel', 'Folk americano'], color: '#B22234' },
      { flag: '🇧🇷', country: 'Brasile', lat: -15.8, lng: -47.9, songs: ['Bossa nova', 'Samba', 'Canti afro-brasiliani'], color: '#009739' },
      { flag: '🇦🇷', country: 'Argentina', lat: -34.6, lng: -58.4, songs: ['Tango', 'Folk argentino'], color: '#74ACDF' },
      { flag: '🇲🇽', country: 'Messico', lat: 19.4, lng: -99.1, songs: ['Mariachi', 'Son jarocho'], color: '#006847' },
      { flag: '🇵🇪', country: 'Perù', lat: -12.0, lng: -77.0, songs: ['Musica andina', 'Canti quechua'], color: '#D91023' },

      // ASIA
      { flag: '🇨🇳', country: 'Cina', lat: 39.9, lng: 116.4, songs: ['Opera di Pechino', 'Canti tradizionali'], color: '#DE2910' },
      { flag: '🇯🇵', country: 'Giappone', lat: 35.7, lng: 139.7, songs: ['Musica tradizionale', 'Canti shintoisti'], color: '#BC002D' },
      { flag: '🇮🇳', country: 'India', lat: 28.6, lng: 77.2, songs: ['Bhajan', 'Musica carnatica'], color: '#FF9933' },
      { flag: '🇮🇱', country: 'Israele', lat: 31.8, lng: 35.2, songs: ['Canti ebraici', 'Musica klezmer'], color: '#0038B8' }
    ];

    this.init();
  }

  init() {
    // Prepara i marker con bandierine
    const markers = this.countriesData.map(data => ({
      lat: data.lat,
      lng: data.lng,
      size: 1.2,
      color: data.color,
      flag: data.flag,
      country: data.country,
      songs: data.songs
    }));

    // Inizializza il globo - VERSIONE DIURNA BLU
    this.globe = Globe()(this.container)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .pointsData(markers)
      .pointAltitude(0.01)
      .pointRadius('size')
      .pointColor('color')
      .pointLabel(d => `
        <div style="
          background: rgba(255,255,255,0.98);
          padding: 10px 14px;
          border-radius: 10px;
          border: 2px solid ${d.color};
          font-family: 'Open Sans', sans-serif;
          max-width: 220px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          <div style="font-size: 24px; margin-bottom: 4px;">${d.flag}</div>
          <strong style="color: ${d.color}; font-size: 15px; display: block; margin-bottom: 6px;">${d.country}</strong>
          <div style="color: #555; font-size: 12px; line-height: 1.4;">
            ${d.songs.join('<br/>')}
          </div>
        </div>
      `)
      .onPointClick(point => this.showTooltip(point))
      .onPointHover(point => {
        this.container.style.cursor = point ? 'pointer' : 'grab';
      })
      .atmosphereColor('#4A90E2')
      .atmosphereAltitude(0.25);

    // Auto-rotazione lenta
    this.globe.controls().autoRotate = true;
    this.globe.controls().autoRotateSpeed = 0.3;

    // Setup bottoni per continenti
    this.setupButtons();

    // Punto di vista iniziale
    this.globe.pointOfView({ lat: 30, lng: 0, altitude: 2.5 });
  }

  setupButtons() {
    // Coordinate dei continenti per i bottoni
    const continents = {
      africa: { lat: -5, lng: 20, altitude: 2.0 },
      europe: { lat: 50, lng: 10, altitude: 2.0 },
      asia: { lat: 30, lng: 100, altitude: 2.0 },
      americas: { lat: 0, lng: -70, altitude: 2.0 }
    };

    const buttons = document.querySelectorAll('.globe-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const region = btn.dataset.region;
        const coords = continents[region];
        if (coords) {
          // Anima verso il continente
          this.globe.pointOfView({
            lat: coords.lat,
            lng: coords.lng,
            altitude: coords.altitude
          }, 1500);
        }
      });
    });
  }

  showTooltip(data) {
    if (!this.tooltip || !data) return;

    // Popola tooltip con i nuovi dati
    this.tooltip.querySelector('.tooltip-title').innerHTML = `${data.flag} ${data.country}`;
    this.tooltip.querySelector('.tooltip-description').textContent = data.songs[0] || '';

    const examplesList = this.tooltip.querySelector('.tooltip-examples');
    examplesList.innerHTML = '';
    data.songs.forEach(song => {
      const li = document.createElement('li');
      li.textContent = song;
      examplesList.appendChild(li);
    });

    // Mostra tooltip
    this.tooltip.classList.add('visible');

    // Nascondi dopo 5 secondi
    setTimeout(() => this.hideTooltip(), 5000);
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
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
  new WorldGlobe();

  // Add loaded class
  document.body.classList.add('loaded');
});

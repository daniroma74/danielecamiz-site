/**
 * Orchestra ICNT - Main JavaScript
 * Gestisce tutte le interazioni del sito
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function per performance
 */
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

/**
 * Throttle function per scroll events
 */
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

/**
 * Smooth scroll to element
 */
function smoothScrollTo(target) {
  const element = document.querySelector(target);
  if (!element) return;

  const navbarHeight = document.getElementById('navbar').offsetHeight;
  const targetPosition = element.offsetTop - navbarHeight;

  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// ============================================
// NAVBAR
// ============================================

class Navbar {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.navToggle = document.getElementById('navToggle');
    this.navMenu = document.getElementById('navMenu');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.lastScroll = 0;

    this.init();
  }

  init() {
    // Scroll effects
    window.addEventListener('scroll', throttle(() => this.handleScroll(), 100));

    // Mobile menu toggle
    if (this.navToggle) {
      this.navToggle.addEventListener('click', () => this.toggleMobileMenu());
    }

    // Nav links smooth scroll
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => this.handleNavClick(e));
    });

    // Close mobile menu on resize
    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth > 768 && this.navMenu.classList.contains('active')) {
        this.closeMobileMenu();
      }
    }, 250));
  }

  handleScroll() {
    const currentScroll = window.pageYOffset;

    // Add/remove scrolled class
    if (currentScroll > 50) {
      this.navbar.classList.add('scrolled');
    } else {
      this.navbar.classList.remove('scrolled');
    }

    // Update active link based on scroll position
    this.updateActiveLink();

    this.lastScroll = currentScroll;
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

  toggleMobileMenu() {
    this.navMenu.classList.toggle('active');
    this.navToggle.classList.toggle('active');
  }

  closeMobileMenu() {
    this.navMenu.classList.remove('active');
    this.navToggle.classList.remove('active');
  }

  handleNavClick(e) {
    const href = e.currentTarget.getAttribute('href');

    // Only handle internal links
    if (!href || !href.startsWith('#')) return;

    e.preventDefault();

    // Close mobile menu if open
    this.closeMobileMenu();

    // Smooth scroll to target
    smoothScrollTo(href);

    // Update active state
    this.navLinks.forEach(link => link.classList.remove('active'));
    e.currentTarget.classList.add('active');
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
    // Show/hide on scroll
    window.addEventListener('scroll', throttle(() => this.handleScroll(), 100));

    // Click handler
    this.button.addEventListener('click', () => this.scrollToTop());
  }

  handleScroll() {
    if (window.pageYOffset > 500) {
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
// CONTACT FORM
// ============================================

class ContactForm {
  constructor() {
    this.form = document.getElementById('contactForm');
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

    // Validate
    if (!this.validate(data)) {
      return;
    }

    // Show loading state
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Invio in corso...';
    submitBtn.disabled = true;

    try {
      // TODO: Implementare invio effettivo al server
      // Per ora simuliamo con timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success
      this.showMessage('Messaggio inviato con successo! Ti risponderemo presto.', 'success');
      this.form.reset();

    } catch (error) {
      // Error
      this.showMessage('Errore nell\'invio. Riprova più tardi.', 'error');
      console.error('Form submission error:', error);

    } finally {
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  validate(data) {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      this.showMessage('Inserisci un indirizzo email valido.', 'error');
      return false;
    }

    // Required fields
    if (!data.name || !data.subject || !data.message) {
      this.showMessage('Compila tutti i campi richiesti.', 'error');
      return false;
    }

    return true;
  }

  showMessage(message, type) {
    // Remove existing message
    const existing = this.form.querySelector('.form-message');
    if (existing) existing.remove();

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `form-message form-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      padding: 1rem;
      margin-top: 1rem;
      border-radius: 8px;
      font-weight: 500;
      text-align: center;
      background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
      color: ${type === 'success' ? '#155724' : '#721c24'};
      border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
    `;

    // Add to form
    this.form.appendChild(messageEl);

    // Auto remove after 5 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transition = 'opacity 0.3s';
      setTimeout(() => messageEl.remove(), 300);
    }, 5000);
  }
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

class ScrollAnimations {
  constructor() {
    this.elements = document.querySelectorAll('[data-animate]');
    if (!this.elements.length) return;

    this.init();
  }

  init() {
    // Create intersection observer
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          // Optional: stop observing after animation
          // this.observer.unobserve(entry.target);
        }
      });
    }, options);

    // Observe all elements
    this.elements.forEach(el => this.observer.observe(el));
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
    // This is a fallback for older browsers
    if ('loading' in HTMLImageElement.prototype) {
      return; // Native lazy loading supported
    }

    // Fallback intersection observer
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
// PERFORMANCE OPTIMIZATIONS
// ============================================

class Performance {
  static init() {
    // Preconnect to external domains
    this.preconnect([
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://www.youtube.com'
    ]);

    // Add critical resource hints
    this.addResourceHints();
  }

  static preconnect(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  static addResourceHints() {
    // Prefetch next page resources if needed
    // For now, just log
    if (window.performance && window.performance.timing) {
      const loadTime = window.performance.timing.domContentLoadedEventEnd -
                       window.performance.timing.navigationStart;
      console.log(`Page loaded in ${loadTime}ms`);
    }
  }
}

// ============================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================

class Accessibility {
  static init() {
    // Add skip to main content link
    this.addSkipLink();

    // Improve keyboard navigation
    this.enhanceKeyboardNav();

    // Announce page changes to screen readers
    this.setupARIALive();
  }

  static addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#home';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Salta al contenuto principale';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px;
      z-index: 100;
      text-decoration: none;
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

  static setupARIALive() {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    `;

    document.body.appendChild(liveRegion);
  }
}

// ============================================
// HERO PARALLAX EFFECT (Optional)
// ============================================

class HeroParallax {
  constructor() {
    this.hero = document.querySelector('.hero');
    this.heroImage = document.querySelector('.hero-image');

    if (!this.hero || !this.heroImage) return;

    this.init();
  }

  init() {
    window.addEventListener('scroll', throttle(() => this.handleScroll(), 10));
  }

  handleScroll() {
    const scrolled = window.pageYOffset;
    const heroHeight = this.hero.offsetHeight;

    // Only apply parallax while hero is visible
    if (scrolled > heroHeight) return;

    // Parallax effect - slower movement
    const parallaxSpeed = 0.5;
    this.heroImage.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
  }
}

// ============================================
// CONTENT LOADER (Dynamic content from CMS)
// ============================================

class ContentLoader {
  /**
   * Carica tutte le impostazioni del sito dall'API
   */
  static async loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();

      if (!result.success || !result.data) {
        console.warn('No settings data received');
        return;
      }

      const s = result.data;

      // Hero Section
      if (s.hero_background) {
        const heroImage = document.querySelector('.hero-image');
        if (heroImage) {
          heroImage.style.backgroundImage = `url('${s.hero_background}')`;
        }
      }

      if (s.hero_title) {
        const heroTitle = document.querySelector('.hero-title-main');
        if (heroTitle) heroTitle.textContent = s.hero_title;
      }

      if (s.hero_subtitle) {
        const heroSubtitle = document.querySelector('.hero-title-sub');
        if (heroSubtitle) heroSubtitle.textContent = s.hero_subtitle;
      }

      if (s.hero_claim) {
        const heroClaim = document.querySelector('.hero-claim');
        if (heroClaim) heroClaim.textContent = s.hero_claim;
      }

      if (s.hero_cta_primary_text) {
        const primaryBtn = document.querySelector('.hero-cta .btn-primary');
        if (primaryBtn) primaryBtn.textContent = s.hero_cta_primary_text;
      }

      if (s.hero_cta_secondary_text) {
        const secondaryBtn = document.querySelector('.hero-cta .btn-outline');
        if (secondaryBtn) secondaryBtn.textContent = s.hero_cta_secondary_text;
      }

      // About Section
      if (s.about_label) {
        const aboutLabel = document.querySelector('.about-text .section-label');
        if (aboutLabel) aboutLabel.textContent = s.about_label;
      }

      if (s.about_title) {
        const aboutTitle = document.querySelector('.about-text .section-title');
        if (aboutTitle) aboutTitle.textContent = s.about_title;
      }

      if (s.about_image) {
        const aboutImage = document.querySelector('.about-image img');
        if (aboutImage) aboutImage.src = s.about_image;
      }

      if (s.about_badge_number) {
        const badgeNumber = document.querySelector('.badge-number');
        if (badgeNumber) badgeNumber.textContent = s.about_badge_number;
      }

      if (s.about_badge_label) {
        const badgeLabel = document.querySelector('.badge-label');
        if (badgeLabel) badgeLabel.textContent = s.about_badge_label;
      }

      if (s.about_intro) {
        const aboutIntro = document.querySelector('.about-description:first-of-type');
        if (aboutIntro) aboutIntro.innerHTML = s.about_intro;
      }

      if (s.about_description) {
        const aboutDesc = document.querySelector('.about-description:last-of-type');
        if (aboutDesc) aboutDesc.innerHTML = s.about_description;
      }

      // About Features
      const features = document.querySelectorAll('.feature-item');
      for (let i = 0; i < 3 && i < features.length; i++) {
        const num = i + 1;
        const icon = s[`about_feature_${num}_icon`];
        const title = s[`about_feature_${num}_title`];
        const text = s[`about_feature_${num}_text`];

        if (icon) {
          const iconEl = features[i].querySelector('.feature-icon');
          if (iconEl) iconEl.textContent = icon;
        }

        if (title) {
          const titleEl = features[i].querySelector('h4');
          if (titleEl) titleEl.textContent = title;
        }

        if (text) {
          const textEl = features[i].querySelector('p');
          if (textEl) textEl.textContent = text;
        }
      }

      // Concerts Section
      if (s.concerts_label) {
        const concertsLabel = document.querySelector('.concerts-section .section-label');
        if (concertsLabel) concertsLabel.textContent = s.concerts_label;
      }

      if (s.concerts_title) {
        const concertsTitle = document.querySelector('.concerts-section .section-title');
        if (concertsTitle) concertsTitle.textContent = s.concerts_title;
      }

      if (s.concerts_subtitle) {
        const concertsSubtitle = document.querySelector('.concerts-section .section-subtitle');
        if (concertsSubtitle) concertsSubtitle.textContent = s.concerts_subtitle;
      }

      if (s.concerts_cta_text) {
        const concertsCTA = document.getElementById('view-season-btn');
        if (concertsCTA) concertsCTA.textContent = s.concerts_cta_text;
      }

      if (s.concerts_cta_link) {
        const concertsCTA = document.getElementById('view-season-btn');
        if (concertsCTA) concertsCTA.href = s.concerts_cta_link;
      }

      // Media Section
      if (s.media_label) {
        const mediaLabel = document.querySelector('.media-section .section-label');
        if (mediaLabel) mediaLabel.textContent = s.media_label;
      }

      if (s.media_title) {
        const mediaTitle = document.querySelector('.media-section .section-title');
        if (mediaTitle) mediaTitle.textContent = s.media_title;
      }

      if (s.media_subtitle) {
        const mediaSubtitle = document.querySelector('.media-section .section-subtitle');
        if (mediaSubtitle) mediaSubtitle.textContent = s.media_subtitle;
      }

      // SEO
      if (s.site_title) {
        document.title = s.site_title;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', s.site_title);
      }

      if (s.site_description) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', s.site_description);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', s.site_description);
      }

      if (s.site_keywords) {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) metaKeywords.setAttribute('content', s.site_keywords);
      }

      // Contact Section
      if (s.contact_title) {
        const contactTitle = document.querySelector('.contact-section .section-title');
        if (contactTitle) contactTitle.textContent = s.contact_title;
      }

      if (s.contact_subtitle) {
        const contactSubtitle = document.querySelector('.contact-section .section-subtitle');
        if (contactSubtitle) contactSubtitle.textContent = s.contact_subtitle;
      }

      if (s.contact_email) {
        const emailLinks = document.querySelectorAll('.contact-info a[href^="mailto:"]');
        emailLinks.forEach(link => {
          link.href = `mailto:${s.contact_email}`;
          const textSpan = link.querySelector('span:last-child');
          if (textSpan) textSpan.textContent = s.contact_email;
        });
      }

      if (s.contact_phone) {
        const phoneLinks = document.querySelectorAll('.contact-info a[href^="tel:"]');
        phoneLinks.forEach(link => {
          link.href = `tel:${s.contact_phone}`;
          const textSpan = link.querySelector('span:last-child');
          if (textSpan) textSpan.textContent = s.contact_phone;
        });
      }

      if (s.contact_address) {
        const addressEl = document.querySelector('.contact-info .contact-address span:last-child');
        if (addressEl) addressEl.textContent = s.contact_address;
      }

      // Footer
      if (s.footer_copyright) {
        const copyright = document.querySelector('.footer-copyright p');
        if (copyright) copyright.textContent = s.footer_copyright;
      }

      // Social Links
      if (s.social_facebook) {
        const fbLink = document.querySelector('.social-links a[aria-label="Facebook"]');
        if (fbLink) fbLink.href = s.social_facebook;
      }

      if (s.social_instagram) {
        const igLink = document.querySelector('.social-links a[aria-label="Instagram"]');
        if (igLink) igLink.href = s.social_instagram;
      }

      if (s.social_youtube) {
        const ytLink = document.querySelector('.social-links a[aria-label="YouTube"]');
        if (ytLink) ytLink.href = s.social_youtube;
      }

      if (s.social_twitter) {
        const twLink = document.querySelector('.social-links a[aria-label="Twitter"]');
        if (twLink) twLink.href = s.social_twitter;
      }

      console.log('✅ Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Carica i prossimi concerti dal database condiviso
   */
  static async loadConcerts() {
    try {
      const response = await fetch('/api/concerts/upcoming?limit=3');
      const result = await response.json();

      if (!result.success || !result.data) {
        console.warn('No concerts data received');
        return;
      }

      const concerts = result.data;
      const concertsGrid = document.querySelector('.concerts-grid');

      if (!concertsGrid) {
        console.warn('Concerts grid container not found');
        return;
      }

      // Svuota il contenuto esistente
      concertsGrid.innerHTML = '';

      // Se non ci sono concerti
      if (concerts.length === 0) {
        concertsGrid.innerHTML = `
          <p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">
            Nessun concerto in programma al momento. Torna presto per aggiornamenti!
          </p>
        `;
        return;
      }

      // Crea le card dei concerti
      concerts.forEach(concert => {
        const date = new Date(concert.date);
        const day = date.getDate();
        const month = date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
        const year = date.getFullYear();

        const card = document.createElement('article');
        card.className = 'concert-card';
        card.innerHTML = `
          <div class="concert-date">
            <span class="concert-day">${day}</span>
            <span class="concert-month">${month}</span>
            <span class="concert-year">${year}</span>
          </div>
          <div class="concert-info">
            <h3 class="concert-title">${concert.title || 'Concerto'}</h3>
            <p class="concert-program">
              <strong>Programma:</strong> ${concert.programText || 'Da definire'}
            </p>
            <div class="concert-meta">
              <span class="concert-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                ${concert.location || 'Roma'}
              </span>
            </div>
            ${concert.poster_cloudinary_id ? `<a href="https://icnt.danielecamiz.com/concerti/${concert.id}" class="btn btn-small btn-primary">Info e Biglietti</a>` : ''}
          </div>
        `;

        concertsGrid.appendChild(card);
      });

      console.log(`✅ Loaded ${concerts.length} concerts`);
    } catch (error) {
      console.error('Error loading concerts:', error);
    }
  }

  /**
   * Carica tutti i contenuti
   */
  static async loadAll() {
    await Promise.all([
      this.loadSettings(),
      this.loadConcerts()
    ]);
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎵 Orchestra ICNT - Website initialized');

  // Load dynamic content from CMS
  await ContentLoader.loadAll();

  // Initialize all modules
  Performance.init();
  Accessibility.init();

  new Navbar();
  new BackToTop();
  new ContactForm();
  new ScrollAnimations();
  new LazyLoader();
  new HeroParallax();

  // Add loaded class to body
  document.body.classList.add('loaded');
});

// ============================================
// SERVICE WORKER (Optional - PWA)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment to enable PWA features
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('SW registered:', reg))
    //   .catch(err => console.log('SW registration failed:', err));
  });
}

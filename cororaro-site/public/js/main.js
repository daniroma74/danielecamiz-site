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

    this.countriesData = [];
    this.loadData();
  }

  async loadData() {
    try {
      // Mostra loader
      this.container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 24px;">🌍 Caricamento...</div>';

      const response = await fetch('/api/repertoire');
      const result = await response.json();

      if (result.success && result.data) {
        // Trasforma i dati dall'API nel formato per il globo
        this.countriesData = result.data.map(country => ({
          code: country.code,
          flag: country.flag,
          country: country.country,
          lat: country.lat,
          lng: country.lng,
          color: country.color,
          songs: country.songs  // Array completo con titoli, audio_url, etc
        }));

        console.log(`✅ Loaded ${this.countriesData.length} countries from database`);

        // Inizializza il globo con i dati
        this.init();
      } else {
        throw new Error('Failed to load repertoire data');
      }
    } catch (error) {
      console.error('❌ Error loading repertoire:', error);
      this.container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff4444; font-size: 18px;">❌ Errore caricamento dati</div>';
    }
  }

  init() {
    // Inizializza il globo - VERSIONE DIURNA BLU CON BANDIERINE 3D
    this.globe = Globe()(this.container)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      // Usa htmlElementsData per bandierine 3D vere
      .htmlElementsData(this.countriesData)
      .htmlElement(d => {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="
            position: relative;
            cursor: pointer;
            transition: transform 0.3s ease;
          ">
            <!-- Palo della bandierina -->
            <div style="
              width: 2px;
              height: 30px;
              background: linear-gradient(to bottom, #8B4513 0%, #654321 100%);
              position: absolute;
              left: 50%;
              transform: translateX(-50%);
              bottom: -5px;
              box-shadow: 2px 0 4px rgba(0,0,0,0.3);
            "></div>
            <!-- Bandierina emoji -->
            <div style="
              font-size: 28px;
              line-height: 1;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              transform: translateY(-5px);
            ">${d.flag}</div>
            <!-- Badge con numero brani -->
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: ${d.color};
              color: white;
              font-size: 10px;
              font-weight: bold;
              padding: 2px 5px;
              border-radius: 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              font-family: sans-serif;
            ">${d.songs.length}</div>
          </div>
        `;

        // Click e hover handlers
        el.style.pointerEvents = 'auto';
        el.addEventListener('click', () => this.showTooltip(d));
        el.addEventListener('mouseenter', () => {
          el.querySelector('div').style.transform = 'scale(1.3)';
        });
        el.addEventListener('mouseleave', () => {
          el.querySelector('div').style.transform = 'scale(1)';
        });

        return el;
      })
      .htmlAltitude(0.01)
      .atmosphereColor('#4A90E2')
      .atmosphereAltitude(0.25)
      .width(this.container.offsetWidth)
      .height(800);

    // Auto-rotazione lenta
    this.globe.controls().autoRotate = true;
    this.globe.controls().autoRotateSpeed = 0.3;

    // Setup bottoni per continenti
    this.setupButtons();

    // Punto di vista iniziale
    this.globe.pointOfView({ lat: 30, lng: 0, altitude: 2.5 });

    // Resize handler per adattare il globe alla finestra
    window.addEventListener('resize', () => {
      if (this.globe && this.container) {
        this.globe
          .width(this.container.offsetWidth)
          .height(800);
      }
    });
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
    // Apri il modal invece del tooltip
    this.openModal(data);
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
  }

  openModal(countryData) {
    const modal = document.getElementById('repertoireModal');
    if (!modal) return;

    // Popola header del modal
    const modalFlag = modal.querySelector('.modal-flag');
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('.modal-subtitle');
    const songsList = modal.querySelector('#songsList');

    modalFlag.textContent = countryData.flag;
    modalTitle.textContent = countryData.country;
    modalSubtitle.textContent = `${countryData.songs.length} brani nel repertorio`;

    // Popola lista brani
    songsList.innerHTML = '';

    if (countryData.songs.length === 0) {
      songsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎵</div>
          <p>Nessun brano disponibile per questo paese</p>
        </div>
      `;
    } else {
      countryData.songs.forEach(song => {
        const songCard = this.createSongCard(song);
        songsList.appendChild(songCard);
      });
    }

    // Mostra modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Setup close handlers
    this.setupModalCloseHandlers(modal);
  }

  createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';

    const difficultyClass = song.difficulty || 'medium';
    const difficultyLabel = {
      easy: 'Facile',
      medium: 'Medio',
      hard: 'Difficile'
    }[difficultyClass] || 'Medio';

    card.innerHTML = `
      <div class="song-header">
        <h3 class="song-title">${song.title}</h3>
        <div class="song-badges">
          ${song.language ? `<span class="song-badge badge-language">${song.language}</span>` : ''}
          ${song.difficulty ? `<span class="song-badge badge-difficulty ${difficultyClass}">${difficultyLabel}</span>` : ''}
        </div>
      </div>

      ${song.description ? `<p class="song-description">${song.description}</p>` : ''}

      <div class="song-actions">
        ${song.audioUrl ? `
          <a href="${song.audioUrl}" target="_blank" rel="noopener" class="song-btn">
            🎵 Ascolta
          </a>
        ` : `
          <button class="song-btn" disabled>
            🎵 Audio non disponibile
          </button>
        `}

        ${song.sheetMusicUrl ? `
          <a href="${song.sheetMusicUrl}" target="_blank" rel="noopener" class="song-btn secondary">
            📄 Spartito
          </a>
        ` : ''}

        ${song.lyrics ? `
          <button class="song-lyrics-toggle" onclick="this.nextElementSibling.classList.toggle('visible'); this.textContent = this.nextElementSibling.classList.contains('visible') ? '📖 Nascondi testo' : '📖 Mostra testo'">
            📖 Mostra testo
          </button>
          <div class="song-lyrics">${song.lyrics}</div>
        ` : ''}
      </div>
    `;

    return card;
  }

  setupModalCloseHandlers(modal) {
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    closeBtn.onclick = closeModal;
    overlay.onclick = closeModal;

    // Chiudi con ESC
    const escHandler = (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
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
// CONTENT LOADER - Carica contenuti dalle API
// ============================================

class ContentLoader {
  static async loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const s = result.data;

      // Hero section
      if (s.hero_logo) document.getElementById('hero-logo').src = s.hero_logo;
      if (s.hero_claim) document.getElementById('hero-claim').textContent = s.hero_claim;
      if (s.hero_stat_years) document.getElementById('hero-stat-years').textContent = s.hero_stat_years;
      if (s.hero_stat_continents) document.getElementById('hero-stat-continents').textContent = s.hero_stat_continents;
      if (s.hero_stat_emotions) document.getElementById('hero-stat-emotions').textContent = s.hero_stat_emotions;
      if (s.hero_cta_concerts) document.getElementById('hero-cta-concerts').textContent = s.hero_cta_concerts;
      if (s.hero_cta_join) document.getElementById('hero-cta-join').textContent = s.hero_cta_join;

      // About section
      if (s.about_label) document.getElementById('about-label').textContent = s.about_label;
      if (s.about_title) document.getElementById('about-title').textContent = s.about_title;
      if (s.about_lead) document.getElementById('about-lead').innerHTML = s.about_lead;
      if (s.about_text_1) document.getElementById('about-text-1').innerHTML = s.about_text_1;
      if (s.about_text_2) document.getElementById('about-text-2').innerHTML = s.about_text_2;
      if (s.about_image) document.getElementById('about-image').src = s.about_image;
      if (s.about_badge_year) document.getElementById('about-badge-year').textContent = s.about_badge_year;
      if (s.about_badge_location) document.getElementById('about-badge-location').textContent = s.about_badge_location;

      // Projects section
      if (s.projects_label) document.getElementById('projects-label').textContent = s.projects_label;
      if (s.projects_title) document.getElementById('projects-title').textContent = s.projects_title;
      if (s.projects_subtitle) document.getElementById('projects-subtitle').textContent = s.projects_subtitle;
      if (s.projects_intro) document.getElementById('projects-intro').innerHTML = s.projects_intro;
      if (s.projects_stat_funds) document.getElementById('projects-stat-funds').textContent = s.projects_stat_funds;
      if (s.projects_stat_projects) document.getElementById('projects-stat-projects').textContent = s.projects_stat_projects;
      if (s.projects_stat_countries) document.getElementById('projects-stat-countries').textContent = s.projects_stat_countries;

      // Footer & Contact
      if (s.contact_email) {
        const emailLinks = document.querySelectorAll('#footer-email, #contact-direct-email');
        emailLinks.forEach(link => {
          link.href = `mailto:${s.contact_email}`;
          link.textContent = s.contact_email;
        });
      }

      if (s.footer_text) {
        document.getElementById('footer-copyright').textContent = s.footer_text;
      }

      const locationEls = document.querySelectorAll('#footer-location, #contact-direct-location');
      if (s.contact_address) {
        locationEls.forEach(el => el.textContent = s.contact_address);
      }

      // Social Media
      const socialContainer = document.getElementById('footer-social');
      if (socialContainer) {
        let socialHTML = '';
        if (s.social_facebook) socialHTML += `<a href="${s.social_facebook}" target="_blank" aria-label="Facebook">FB</a>`;
        if (s.social_instagram) socialHTML += `<a href="${s.social_instagram}" target="_blank" aria-label="Instagram">IG</a>`;
        if (s.social_youtube) socialHTML += `<a href="${s.social_youtube}" target="_blank" aria-label="YouTube">YT</a>`;
        if (s.social_twitter) socialHTML += `<a href="${s.social_twitter}" target="_blank" aria-label="Twitter">X</a>`;

        if (socialHTML) {
          socialContainer.innerHTML = socialHTML;
        } else {
          socialContainer.innerHTML = '<p style="color: #999;">Seguici sui social!</p>';
        }
      }

    } catch (error) {
      console.error('Errore caricamento settings:', error);
    }
  }

  static async loadJoinInfo() {
    try {
      const response = await fetch('/api/join-info');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const info = result.data;

      // Title e intro
      if (info.title) document.getElementById('join-title').textContent = info.title;
      if (info.intro_text) document.getElementById('join-intro').innerHTML = info.intro_text;

      // Benefits
      const benefitsContainer = document.getElementById('join-benefits');
      if (benefitsContainer && info.benefits_html) {
        benefitsContainer.innerHTML = info.benefits_html;
      }

      // Rehearsal info
      const rehearsalInfo = document.getElementById('join-rehearsal-info');
      if (rehearsalInfo && (info.rehearsal_day || info.rehearsal_time || info.rehearsal_location)) {
        let infoHTML = '<p>';
        if (info.rehearsal_day && info.rehearsal_time) {
          infoHTML += `Le prove si tengono ogni <strong>${info.rehearsal_day}</strong> alle ${info.rehearsal_time}`;
        }
        if (info.rehearsal_location) {
          infoHTML += ` presso <strong>${info.rehearsal_location}</strong>`;
        }
        infoHTML += '.</p>';

        if (info.cta_text) {
          infoHTML += `<p>${info.cta_text}</p>`;
        }

        rehearsalInfo.innerHTML = infoHTML;
      }

    } catch (error) {
      console.error('Errore caricamento join info:', error);
    }
  }

  static async loadMaestri() {
    try {
      const response = await fetch('/api/maestri');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const container = document.getElementById('maestri-container');
      if (!container) return;

      container.innerHTML = result.data.map(maestro => `
        <div class="director-card">
          <div class="director-name">${maestro.full_name}</div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Errore caricamento maestri:', error);
    }
  }

  static async loadValori() {
    try {
      const response = await fetch('/api/values');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const container = document.getElementById('valori-container');
      if (!container) return;

      container.innerHTML = result.data.map(value => `
        <div class="value-card">
          <div class="value-icon">${value.icon || '💎'}</div>
          <h4>${value.title}</h4>
          <p>${value.description}</p>
        </div>
      `).join('');

    } catch (error) {
      console.error('Errore caricamento valori:', error);
    }
  }

  static async loadConcerti() {
    try {
      const response = await fetch('/api/concerts');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const container = document.getElementById('concerti-container');
      if (!container) return;

      // Filtra solo concerti pubblicati e futuri
      const concerts = result.data.filter(c => c.is_published);

      if (concerts.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Nessun concerto in programma al momento. Torna presto per aggiornamenti!</p>';
        return;
      }

      container.innerHTML = concerts.map(concert => {
        const date = new Date(concert.event_date);
        const day = date.getDate();
        const month = date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();

        return `
          <div class="concert-card">
            <div class="concert-date">
              <span class="concert-day">${day}</span>
              <span class="concert-month">${month}</span>
            </div>
            <div class="concert-info">
              <h3>${concert.title}</h3>
              ${concert.cause_description ? `
                <p class="concert-cause">
                  <strong>A sostegno di:</strong> ${concert.cause_description}
                </p>
              ` : ''}
              <div class="concert-details">
                ${concert.location ? `
                  <div class="concert-location">
                    📍 ${concert.location}
                  </div>
                ` : ''}
                ${concert.event_time ? `
                  <div class="concert-time">
                    🕐 Ore ${concert.event_time}
                  </div>
                ` : ''}
              </div>
              ${concert.program ? `
                <p class="concert-program">${concert.program}</p>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Errore caricamento concerti:', error);
    }
  }

  static async loadProgetti() {
    try {
      const response = await fetch('/api/projects');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const container = document.getElementById('progetti-container');
      if (!container) return;

      // Filtra solo progetti attivi
      const projects = result.data.filter(p => p.is_active);

      if (projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Nessun progetto attivo al momento.</p>';
        return;
      }

      container.innerHTML = projects.map(project => `
        <div class="project-card">
          <div class="project-icon">${project.icon || '💚'}</div>
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          ${project.country ? `<small style="color: #666;">📍 ${project.country}</small>` : ''}
        </div>
      `).join('');

    } catch (error) {
      console.error('Errore caricamento progetti:', error);
    }
  }

  static async loadGallery(limit = 9) {
    try {
      const response = await fetch('/api/gallery');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const container = document.getElementById('galleria-container');
      if (!container) return;

      // Filtra solo foto pubblicate e limita il numero
      let images = result.data.filter(img => img.is_published);

      // Sulla homepage mostra solo le ultime N foto
      if (limit) {
        images = images.slice(0, limit);
      }

      if (images.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Nessuna foto nella galleria al momento.</p>';
        return;
      }

      container.innerHTML = images.map(image => `
        <div class="gallery-item">
          <img src="${image.image_url}" alt="${image.caption || 'Foto galleria'}" loading="lazy">
          ${image.caption ? `<div class="gallery-caption">${image.caption}</div>` : ''}
        </div>
      `).join('');

    } catch (error) {
      console.error('Errore caricamento galleria:', error);
    }
  }

  static async loadAll() {
    // Carica prima i settings, poi tutto il resto in parallelo
    await this.loadSettings();

    await Promise.all([
      this.loadMaestri(),
      this.loadValori(),
      this.loadConcerti(),
      this.loadProgetti(),
      this.loadGallery(),
      this.loadJoinInfo()
    ]);
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

  // Carica contenuti dalle API
  ContentLoader.loadAll();

  // Add loaded class
  document.body.classList.add('loaded');
});

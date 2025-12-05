/**
 * UX Interactions Enhancement 2025
 * Modern micro-interactions and smooth behaviors
 */

(function() {
  'use strict';

  // === Smooth Header on Scroll ===
  function initStickyHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let lastScroll = 0;
    const scrollThreshold = 50;

    const handleScroll = () => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > scrollThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
  }

  // === Ripple Effect on Buttons ===
  function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn, .filter-chip');

    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = this.querySelector('::before');
        // CSS handles the ripple animation
      });
    });
  }

  // === Intersection Observer for Staggered Animations ===
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all animatable elements
    const animatableElements = document.querySelectorAll('.event-card, .card, .stat-item');
    animatableElements.forEach(el => observer.observe(el));
  }

  // === Live Counter Animation ===
  function animateValue(element, start, end, duration) {
    if (!element) return;

    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current);
    }, 16);
  }

  // === Stat Counters Enhancement ===
  function initStatCounters() {
    const statValues = document.querySelectorAll('.stat-value');

    statValues.forEach(stat => {
      const value = parseInt(stat.textContent) || 0;
      stat.textContent = '0';

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateValue(stat, 0, value, 1500);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });

      observer.observe(stat);
    });
  }

  // === Smooth Anchor Links ===
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);

        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Update URL without scrolling
          history.pushState(null, null, href);
        }
      });
    });
  }

  // === Keyboard Navigation Enhancement ===
  function initKeyboardNav() {
    const focusableElements = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const cards = document.querySelectorAll('.event-card');

    cards.forEach(card => {
      // Make cards keyboard accessible
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }

      // Enter key to click
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const link = card.querySelector('a');
          if (link) link.click();
        }
      });
    });
  }

  // === Tooltips ===
  function initTooltips() {
    const tooltipElements = document.querySelectorAll('[aria-label]');

    tooltipElements.forEach(el => {
      if (!el.hasAttribute('data-tooltip')) {
        el.setAttribute('data-tooltip', el.getAttribute('aria-label'));
      }
    });
  }

  // === Lazy Load Images Enhancement ===
  function enhanceLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      // Browser supports native lazy loading
      const images = document.querySelectorAll('img[loading="lazy"]');
      images.forEach(img => {
        img.addEventListener('load', function() {
          this.classList.add('loaded');
        });
      });
    } else {
      // Fallback for older browsers
      const images = document.querySelectorAll('img[loading="lazy"]');
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  // === Parallax Effect (subtle) ===
  function initParallax() {
    const parallaxElements = document.querySelectorAll('.hero-section, .poster-sidebar');
    if (window.innerWidth < 768) return; // Disable on mobile

    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;

      parallaxElements.forEach(el => {
        const speed = el.dataset.parallaxSpeed || 0.5;
        const yPos = -(scrolled * speed);
        el.style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
    }, { passive: true });
  }

  // === Filter Animation Enhancement ===
  function enhanceFilters() {
    const filterChips = document.querySelectorAll('.filter-chip');

    filterChips.forEach(chip => {
      chip.addEventListener('click', function() {
        // Remove active from siblings
        this.parentElement.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('active');
        });

        // Add active to clicked
        this.classList.add('active');

        // Trigger haptic feedback on supported devices
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      });
    });
  }

  // === Copy to Clipboard with Feedback ===
  function initCopyButtons() {
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (!copyBtn) return;

      const textToCopy = copyBtn.dataset.copy;

      navigator.clipboard.writeText(textToCopy).then(() => {
        // Show success feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copiato!';
        copyBtn.classList.add('success');

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('success');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    });
  }

  // === Auto-update Live Stats ===
  function initLiveStats() {
    const liveBookings = document.getElementById('live_bookings');
    if (!liveBookings) return;

    // Poll for updates every 30 seconds
    setInterval(async () => {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) return;

        const data = await response.json();
        if (data.bookings !== undefined) {
          const currentValue = parseInt(liveBookings.textContent);
          const newValue = data.bookings;

          if (newValue !== currentValue) {
            // Animate to new value
            animateValue(liveBookings, currentValue, newValue, 800);

            // Highlight change
            liveBookings.parentElement.classList.add('highlight');
            setTimeout(() => {
              liveBookings.parentElement.classList.remove('highlight');
            }, 1500);
          }
        }
      } catch (err) {
        console.log('Stats update failed (silent)');
      }
    }, 30000);
  }

  // === Focus Trap for Modals ===
  function initFocusTrap() {
    const modals = document.querySelectorAll('[role="dialog"]');

    modals.forEach(modal => {
      const focusableElements = modal.querySelectorAll(
        'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      });
    });
  }

  // === Preload Next Page on Hover ===
  function initSmartPreloading() {
    const links = document.querySelectorAll('a[href^="/"]');
    const preloaded = new Set();

    links.forEach(link => {
      link.addEventListener('mouseenter', function() {
        const href = this.href;
        if (preloaded.has(href)) return;

        // Create prefetch link
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);

        preloaded.add(href);
      }, { once: true });
    });
  }

  // === Reduce Motion Check ===
  function respectReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (prefersReducedMotion.matches) {
      document.documentElement.classList.add('reduce-motion');
    }

    prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    });
  }

  // === Page Visibility API for Performance ===
  function handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, pause animations/polling
        document.documentElement.classList.add('page-hidden');
      } else {
        // Page is visible again
        document.documentElement.classList.remove('page-hidden');
      }
    });
  }

  // === Initialize Everything ===
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    console.log('[UX] Initializing modern interactions...');

    // Core UX enhancements
    respectReducedMotion();
    initStickyHeader();
    initRippleEffect();
    initScrollAnimations();
    initStatCounters();
    initSmoothScroll();
    initKeyboardNav();
    initTooltips();
    enhanceLazyLoading();
    enhanceFilters();
    initCopyButtons();
    initFocusTrap();
    handleVisibilityChange();

    // Performance optimizations
    if (window.innerWidth >= 768) {
      initParallax();
      initSmartPreloading();
    }

    // Live features
    if (!document.hidden) {
      initLiveStats();
    }

    console.log('[UX] Modern interactions initialized ✓');
  }

  // Start initialization
  init();

})();

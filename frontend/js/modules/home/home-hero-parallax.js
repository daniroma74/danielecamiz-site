// frontend/js/modules/home/home-hero-parallax.js
// Subtle parallax effect for hero image on scroll

(function() {
  'use strict';

  const heroImg = document.getElementById('hero_img');
  if (!heroImg) return;

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Throttle function for performance
  let ticking = false;
  let lastScrollY = window.scrollY;

  function updateParallax() {
    const scrollY = window.scrollY;
    const heroSection = document.getElementById('hero_section');

    if (!heroSection) return;

    // Only apply parallax while hero is visible
    const heroHeight = heroSection.offsetHeight;
    if (scrollY > heroHeight) {
      ticking = false;
      return;
    }

    // Parallax factor: image moves slower than scroll (0.3 = 30% of scroll speed)
    const parallaxFactor = 0.3;
    const translateY = scrollY * parallaxFactor;

    // Apply transform with GPU acceleration
    heroImg.style.transform = `translateY(${translateY}px)`;

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  // Listen to scroll events
  window.addEventListener('scroll', requestTick, { passive: true });

  // Initial call
  updateParallax();
})();

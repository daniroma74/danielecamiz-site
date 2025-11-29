// frontend/js/gallery-detail.js
// Modern lightbox for gallery detail page with event delegation
(function() {
  'use strict';

  let currentIndex = 0;
  let photos = [];
  let lightbox = null;

  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    lightbox = document.getElementById('lightbox');
    if (!lightbox) {
      console.warn('[gallery-detail] Lightbox element not found');
      return;
    }

    // Collect photo data from DOM
    const photoElements = document.querySelectorAll('.gallery-item--photo');
    photos = Array.from(photoElements).map((el, idx) => ({
      index: idx,
      full: el.getAttribute('data-full') || '',
      title: el.getAttribute('data-title') || '',
      description: el.getAttribute('data-description') || ''
    }));

    if (photos.length === 0) {
      console.warn('[gallery-detail] No photos found');
      return;
    }

    console.log('[gallery-detail] Initialized with', photos.length, 'photos');

    // Update total count
    const totalEl = document.getElementById('lightbox-total');
    if (totalEl) totalEl.textContent = photos.length;

    // Event delegation on parent container
    const container = document.querySelector('.gallery-items--photos');
    if (container) {
      container.addEventListener('click', handlePhotoClick);
      console.log('[gallery-detail] Click listener attached to container');
    }

    // Lightbox controls
    const closeBtn = lightbox.querySelector('.lightbox__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
      });
    }

    const prevBtn = lightbox.querySelector('.lightbox__prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevPhoto();
      });
    }

    const nextBtn = lightbox.querySelector('.lightbox__next');
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextPhoto();
      });
    }

    // Click outside to close
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
  }

  function handlePhotoClick(e) {
    // Find the clicked photo item
    const photoItem = e.target.closest('.gallery-item--photo');
    if (!photoItem) return;

    const index = parseInt(photoItem.getAttribute('data-index'), 10);
    if (isNaN(index)) return;

    console.log('[gallery-detail] Photo clicked, index:', index);
    openLightbox(index);
  }

  function openLightbox(index) {
    if (!lightbox || !photos.length) return;

    currentIndex = Math.max(0, Math.min(index, photos.length - 1));
    console.log('[gallery-detail] Opening lightbox at index:', currentIndex);

    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;

    console.log('[gallery-detail] Closing lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function prevPhoto() {
    if (!photos.length) return;
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    console.log('[gallery-detail] Previous photo, index:', currentIndex);
    updateLightbox();
  }

  function nextPhoto() {
    if (!photos.length) return;
    currentIndex = (currentIndex + 1) % photos.length;
    console.log('[gallery-detail] Next photo, index:', currentIndex);
    updateLightbox();
  }

  function updateLightbox() {
    if (!lightbox || !photos[currentIndex]) return;

    const photo = photos[currentIndex];

    const img = document.getElementById('lightbox-img');
    if (img) {
      img.src = photo.full;
      img.alt = photo.title;
    }

    const title = document.getElementById('lightbox-title');
    if (title) title.textContent = photo.title;

    const description = document.getElementById('lightbox-description');
    if (description) description.textContent = photo.description;

    const current = document.getElementById('lightbox-current');
    if (current) current.textContent = currentIndex + 1;

    console.log('[gallery-detail] Updated lightbox:', photo.title);
  }

  function handleKeyboard(e) {
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      prevPhoto();
    } else if (e.key === 'ArrowRight') {
      nextPhoto();
    }
  }

  // Start initialization
  init();
})();

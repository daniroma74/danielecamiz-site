// frontend/js/modules/gallery/gallery-entry.js
// Cover click → try LIGHTBOX first; if unavailable, fallback to in-page grid toggle.
// Plain JS (no modules).
(function(){
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function showTitle(section){
    const title = qs('.gallery-category-title', section);
    if (!title) return;
    title.hidden = false;
    title.style.display = 'block';
  }
  function hideTitle(section){
    const title = qs('.gallery-category-title', section);
    if (!title) return;
    title.hidden = true;
    title.style.display = 'none';
  }

  function openGrid(section){
    const grid = qs('.gallery-grid', section);
    if (!grid) return;
    grid.hidden = false;
    grid.style.display = 'grid';
    grid.dataset.collapsed = 'false';
    showTitle(section);
  }

  function closeGrid(section){
    const grid = qs('.gallery-grid', section);
    if (!grid) return;
    grid.hidden = true;
    grid.style.display = 'none';
    grid.dataset.collapsed = 'true';
    hideTitle(section);
  }

  function toggleSection(targetId){
    const section = document.getElementById(targetId);
    if (!section) return;
    const grid = qs('.gallery-grid', section);
    if (!grid) return;

    const willOpen = grid.hidden || grid.dataset.collapsed !== 'false';

    // Close all other sections
    qsa('.gallery-category').forEach(sec => {
      if (sec !== section) closeGrid(sec);
    });

    // Update aria-expanded on covers
    qsa('.gallery-covers .cover-block').forEach(a => {
      const tid = a.getAttribute('data-target') || (a.getAttribute('href')||'').replace(/^#/, '');
      a.setAttribute('aria-expanded', (tid === targetId && willOpen) ? 'true' : 'false');
    });

    // Open/close this one
    if (willOpen) {
      openGrid(section);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      closeGrid(section);
    }
  }

  // ===== Helpers to derive IDs/keys =====
  function fromIdToCatKey(id){
    const m = (id||'').match(/^gallery_category_(.+)$/);
    return m ? m[1] : '';
  }

  function deriveTargetAndCatKey(link){
    // Prefer explicit data-target → "gallery_category_<cat>"
    let targetId = link.getAttribute('data-target');
    if (targetId && targetId.charAt(0) === '#') targetId = targetId.slice(1);

    // Else, try href="#gallery_category_<cat>"
    if (!targetId) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) targetId = href.slice(1);
    }

    // Derive catKey from data-category OR from targetId pattern
    let catKey = link.getAttribute('data-category') || '';
    if (!catKey && targetId) catKey = fromIdToCatKey(targetId);

    // If still missing, try closest section id or its data-category
    if (!targetId || !catKey) {
      const sec = link.closest('.gallery-category');
      if (sec) {
        if (!targetId) targetId = sec.id || '';
        if (!catKey)   catKey   = sec.getAttribute('data-category') || fromIdToCatKey(targetId);
      }
    }

    // As a last resort: if we have catKey but not targetId, build it
    if (!targetId && catKey) targetId = 'gallery_category_' + catKey;

    return { targetId, catKey };
  }

  function tryOpenLightbox(catKey){
    if (!catKey) return false;
    const section = document.getElementById('gallery_category_' + catKey);
    if (!section) return false;

    // Ensure there are images for this category (hidden is OK)
    const imgs = qsa('.gallery-grid img[data-category="' + catKey + '"]', section);
    if (!imgs.length) return false;

    if (typeof window.openGalleryImage === 'function') {
      try { window.openGalleryImage(catKey, 0); return true; } catch {}
    }
    if (window.GalleryLightbox && typeof window.GalleryLightbox.open === 'function') {
      try { window.GalleryLightbox.open(catKey, 0); return true; } catch {}
    }
    return false;
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Start closed
    qsa('.gallery-category').forEach(closeGrid);

    // Bind covers
    qsa('.gallery-covers .cover-block').forEach(link => {
      // role/button for a11y
      link.setAttribute('role','button');
      link.setAttribute('tabindex','0');

      function handleAction(ev){
        if (ev) ev.preventDefault();
        const { targetId, catKey } = deriveTargetAndCatKey(link);
        if (!targetId && !catKey) return; // nothing to do

        // 1) Try lightbox first
        if (tryOpenLightbox(catKey)) {
          // set aria-expanded for the active cover
          qsa('.gallery-covers .cover-block').forEach(a => {
            const t = a.getAttribute('data-target') || (a.getAttribute('href')||'').replace(/^#/, '');
            a.setAttribute('aria-expanded', t === ('gallery_category_' + catKey) ? 'true' : 'false');
          });
          return;
        }
        // 2) Fallback to in-page grid toggle
        if (targetId) toggleSection(targetId);
      }

      link.addEventListener('click', handleAction);
      link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') handleAction(e);
      });
    });

    // Hash deep-link
    if (location.hash) {
      const id = location.hash.replace(/^#/, '');
      const target = document.getElementById(id);
      if (target && target.classList.contains('gallery-category')) {
        openGrid(target);
        qsa('.gallery-covers .cover-block').forEach(a => {
          const tid = a.getAttribute('data-target') || (a.getAttribute('href')||'').replace(/^#/, '');
          a.setAttribute('aria-expanded', tid === id ? 'true' : 'false');
        });
      }
    }
  });
})();
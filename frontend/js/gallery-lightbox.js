// frontend/js/gallery-lightbox.js
// Lightbox per Gallery, compatibile con i CSS esistenti (#lightbox, .show, .lightbox-*)
(function(){
    var overlay, imgEl, counterEl, lastActive, bound = false;
  
    function $(id){ return document.getElementById(id); }
    function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  
    function collectCategory(cat){
      var section = document.getElementById('gallery_category_' + cat);
      if (!section) return [];
      return qsa('.gallery-grid img[data-category="'+cat+'"]', section)
        .map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' }));
    }
  
    function render(){
      if (!window.__gItems || !window.__gItems.length) return;
      var cur = window.__gItems[window.__gIdx];
      imgEl.style.opacity = 0;
      setTimeout(function(){
        imgEl.src = cur.src;
        imgEl.alt = cur.alt;
        imgEl.style.opacity = 1;
        counterEl.textContent = (window.__gIdx + 1) + ' / ' + window.__gItems.length;
      }, 60);
    }
  
    function open(cat, idx){
      var items = collectCategory(cat);
      if (!items.length) return;
  
      overlay   = overlay   || $('lightbox');
      imgEl     = imgEl     || $('lightbox_img');
      counterEl = counterEl || $('lightbox_counter');
      if (!overlay || !imgEl || !counterEl) return;
  
      // stato
      window.__gCat   = cat;
      window.__gItems = items;
      window.__gIdx   = Math.max(0, Math.min(idx|0, items.length - 1));
  
      // mostra
      lastActive = document.activeElement;
      overlay.classList.add('show');
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
  
      render();
  
      if (!bound){
        bound = true;
        overlay.addEventListener('click', function(e){
          const wrap = overlay.querySelector('.lightbox-image-wrapper');
          if (!wrap || !wrap.contains(e.target)) close();
        });
        document.addEventListener('keydown', function(e){
          if (e.key === 'Escape') close();
          else if (e.key === 'ArrowRight') next();
          else if (e.key === 'ArrowLeft')  prev();
        });
      }
    }
  
    function close(){
      if (!overlay) return;
      overlay.classList.remove('show');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      if (lastActive && typeof lastActive.focus === 'function') {
        try { lastActive.focus(); } catch {}
      }
    }
  
    function next(){
      if (!window.__gItems || !window.__gItems.length) return;
      window.__gIdx = (window.__gIdx + 1) % window.__gItems.length;
      render();
    }
  
    function prev(){
      if (!window.__gItems || !window.__gItems.length) return;
      window.__gIdx = (window.__gIdx - 1 + window.__gItems.length) % window.__gItems.length;
      render();
    }
  
    // export global per onclick inline
    window.openGalleryImage = open;
    window.closeGallery = close;
    window.nextGallery = next;
    window.prevGallery = prev;
  })();
  
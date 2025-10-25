// frontend/js/concerts-lightbox.js
// Usa l'overlay già presente nella view: #concert_lightbox
(function () {
  var overlay, contentBox, posterEl, detailsEl, lastActive, bound = false;

  function $(id) { return document.getElementById(id); }
  function esc(s){ if(s==null)return ''; return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function parsePayload(p){ try{return (typeof p==='string')?JSON.parse(p):p;}catch{return null;} }
  function lang() { var l=(document.documentElement.getAttribute('lang')||'it').toLowerCase(); return (l==='en'||l==='it')?l:'it'; }
  function t(itKey,enKey){ return lang()==='en' ? (enKey||itKey||'') : (itKey||enKey||''); }

  function programToList(program){
    if(!program) return [];
    if(Array.isArray(program)) return program.filter(Boolean);
    if(typeof program==='string') return program.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    return [];
  }

  function buildDetailsHTML(c){
    var parts = [];
    if (c.title) parts.push('<h3 class="lightbox-title">'+esc(c.title)+'</h3>');
    if (c.date || c.location) {
      var dateTxt = esc(c.date||''), locTxt = esc(c.location||''), sep = (dateTxt&&locTxt)?' – ':'';
      parts.push('<p style="margin:.25rem 0 1rem 0;opacity:.9;">'+dateTxt+sep+locTxt+'</p>');
    }
    var facts = [];
    if (c.orchestra) facts.push('<li><strong>'+esc(t('Orchestra','Orchestra'))+':</strong> '+esc(c.orchestra)+'</li>');
    if (c.conductor) facts.push('<li><strong>'+esc(t('Direttore','Conductor'))+':</strong> '+esc(c.conductor)+'</li>');
    if (c.soloists) facts.push('<li><strong>'+esc(t('Solista','Soloists'))+':</strong> '+esc(c.soloists)+'</li>');
    if (facts.length) parts.push('<ul style="margin:.25rem 0 1rem 1.1rem;line-height:1.5;">'+facts.join('')+'</ul>');
    var pg = programToList(c.program);
    if (pg.length) {
      parts.push('<div style="margin:.5rem 0 0 0;"><strong>'+esc(t('Programma','Program'))+':</strong><ul style="margin:.25rem 0 0 1.1rem;line-height:1.5;">'
        + pg.map(item=>'<li>'+esc(item)+'</li>').join('') + '</ul></div>');
    }
    if (c.notes) parts.push('<p style="margin:.75rem 0 0 0;white-space:pre-wrap;">'+esc(c.notes)+'</p>');
    if (c.youtube) parts.push('<div class="lightbox-buttons"><a class="btn" href="'+esc(c.youtube)+'" target="_blank" rel="noopener">YouTube</a></div>');
    if (!c.title && !facts.length && !pg.length && !c.notes && !c.youtube)
      parts.push('<p style="opacity:.8;">'+esc(t('Nessun dettaglio disponibile.','No additional details.'))+'</p>');
    return parts.join('');
  }

  function ensureRefs(){
    if (!overlay) overlay = $('concert_lightbox');
    if (!overlay) { console.warn('[concerts-lightbox] overlay #concert_lightbox non trovato'); return false; }
    if (!contentBox) contentBox = overlay.querySelector('.concert-lightbox-content');
    if (!posterEl)   posterEl   = $('concert_poster');
    if (!detailsEl)  detailsEl  = $('concert_details');

    // Allinea alle classi della modale generica
    overlay.classList.add('modal-overlay');
    if (contentBox && !contentBox.classList.contains('modal-box')) {
      contentBox.classList.add('modal-box');
    }
    var inner = overlay.querySelector('.concert-lightbox-body');
    if (inner && !inner.classList.contains('modal-content')) {
      inner.classList.add('modal-content');
    }

    if (!bound) {
      bound = true;
      // chiudi cliccando fuori
      overlay.addEventListener('click', function(e){
        if (contentBox && !contentBox.contains(e.target)) close();
      });
      // bottone close
      var closeBtn = overlay.querySelector('.concert-lightbox-close');
      if (closeBtn) closeBtn.addEventListener('click', function(ev){ ev.preventDefault(); close(); });
      // ESC
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
    }
    return true;
  }

  function open(payload){
    var c = parsePayload(payload);
    if(!c) return;
    if(!ensureRefs()) return;

    posterEl.src = c.poster || c.locandina || '';
    posterEl.alt = c.title ? ('Poster – '+c.title) : 'Concert poster';
    detailsEl.innerHTML = buildDetailsHTML(c);

    overlay.classList.add('show');
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    lastActive = document.activeElement;
    try { (overlay.querySelector('.concert-lightbox-close')||overlay).focus(); } catch {}
  }

  function close(){
    if(!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('hidden','');
    document.body.style.overflow = '';
    if (posterEl) posterEl.src = '';
    if (detailsEl) detailsEl.innerHTML = '';
    if (lastActive && typeof lastActive.focus === 'function') { try { lastActive.focus(); } catch {} }
  }

  // Delega in capture per elementi con data-open="concert" (se presenti)
  document.addEventListener('click', function(e){
    var trigger = e.target.closest('[data-open="concert"]');
    if (!trigger) return;
    e.preventDefault();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    e.stopPropagation();
    var payload = trigger.getAttribute('data-payload') || (trigger.dataset && trigger.dataset.payload) || null;
    open(payload);
  }, { capture: true });

  // Intercetta il click sul <summary> usato per "Mostra dettagli" e apre la lightbox
  document.addEventListener('click', function(e){
    var summary = e.target.closest('summary.details-summary, summary.concert-details, summary');
    if (!summary) return;

    // Fermiamo l'espansione inline del <details>
    e.preventDefault();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    e.stopPropagation();

    // Se è dentro un <details>, richiudilo per sicurezza
    var details = summary.closest('details');
    if (details && details.hasAttribute('open')) details.removeAttribute('open');

    // Se il summary o un ascendente hanno già un payload JSON, usalo
    var payload = summary.getAttribute('data-payload') || (summary.dataset && summary.dataset.payload) || null;
    if (!payload) {
      var withPayload = summary.closest('[data-payload]');
      if (withPayload) payload = withPayload.getAttribute('data-payload');
    }

    if (!payload) {
      // Fallback: estrai i dati dal DOM vicino al blocco concerto
      var block = summary.closest('.concert-card, .concert-item, li, article, .upcoming-row');
      var titleEl = block ? block.querySelector('.concert-title, .title, h3, .cell-title') : null;
      var dateEl  = block ? block.querySelector('.concert-date, time[datetime], .cell-date') : null;
      var placeEl = block ? block.querySelector('.concert-place, .location, .cell-place') : null;
      var posterImg = block ? block.querySelector('img.concert-poster, img[alt*="Poster"], img.poster, img') : null;
      var programPre = block ? block.querySelector('.concert-program pre, pre.program') : null;
      var facts = block ? block.querySelectorAll('.concert-facts li, .facts li') : null;

      var data = {
        title: titleEl ? (titleEl.textContent || '').trim() : '',
        date:  dateEl  ? ((dateEl.textContent || dateEl.getAttribute('datetime')) || '').trim() : '',
        location: placeEl ? (placeEl.textContent || '').trim() : '',
        poster: posterImg ? (posterImg.getAttribute('src') || '') : ''
      };
      if (programPre) data.program = programPre.textContent || '';
      if (facts && facts.length) {
        facts.forEach(function(li){
          var strong = li.querySelector('strong');
          var label = strong ? (strong.textContent || '').toLowerCase() : '';
          var val = (li.textContent || '').replace(strong ? strong.textContent : '', '').trim();
          if (label.includes('orchestra')) data.orchestra = val;
          else if (label.includes('direttore') || label.includes('conductor')) data.conductor = val;
          else if (label.includes('solista') || label.includes('soloist') || label.includes('soloists')) data.soloists = val;
          else if (label.includes('note') || label.includes('notes')) data.notes = val;
        });
      }
      payload = data;
    }

    open(payload);
  }, { capture: true });

  // API globali già usate nella view
  window.openConcertLightbox = open;
  window.closeConcertLightbox = close;
})();
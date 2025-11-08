+// Concerts page glue module (slim)
// - Manages <details> labels (Mostra di più / Mostra di meno)
// - Intercepts <summary> clicks and delegates to window.openConcertLightbox(payload)
// The lightbox engine lives in /frontend/js/concerts-lightbox.js

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function lang(){ var l=(document.documentElement.getAttribute('lang')||'it').toLowerCase(); return (l==='en'||l==='it')?l:'it'; }
function t(itKey,enKey){ return lang()==='en' ? (enKey||itKey||'') : (itKey||enKey||''); }

function parseConcert(payload){
  if (!payload) return null;
  if (typeof payload === 'string') { try { return JSON.parse(payload); } catch { return null; } }
  return payload;
}

// -------- Details labels --------
function bindDetailsLabels() {
  $all('.concert-details').forEach(function(d){
    var sum = $('.details-summary', d);
    if (!sum) return;
    var more = sum.getAttribute('data-more') || 'Mostra di più';
    var less = sum.getAttribute('data-less') || 'Mostra di meno';
    sum.textContent = d.open ? less : more;
    d.addEventListener('toggle', function(){ sum.textContent = d.open ? less : more; });
  });
}

// -------- Build payload from nearby DOM (fallback when no data-payload) --------
function payloadFromBlock(block){
  if (!block) return null;
  var titleEl = $('.concert-title, .title, h3, .cell-title', block);
  var dateEl  = $('.concert-date, time[datetime], .cell-date', block);
  var placeEl = $('.concert-place, .location, .cell-place', block);
  var poster  = $('img.concert-poster, img[alt*="Poster"], img.poster, img', block);
  var programPre = $('.concert-program pre, pre.program', block);
  var facts = $all('.concert-facts li, .facts li', block);

  var data = {
    title: titleEl ? (titleEl.textContent || '').trim() : '',
    date:  dateEl  ? ((dateEl.textContent || dateEl.getAttribute('datetime')) || '').trim() : '',
    location: placeEl ? (placeEl.textContent || '').trim() : '',
    poster: poster ? (poster.getAttribute('src') || '') : ''
  };
  if (programPre) data.program = programPre.textContent || '';
  if (facts.length) {
    facts.forEach(function(li){
      var strong = $('strong', li);
      var label = strong ? (strong.textContent || '').toLowerCase() : '';
      var val = (li.textContent || '').replace(strong ? strong.textContent : '', '').trim();
      if (label.includes('orchestra')) data.orchestra = val;
      else if (label.includes('direttore') || label.includes('conductor')) data.conductor = val;
      else if (label.includes('solista') || label.includes('soloist') || label.includes('soloists')) data.soloists = val;
      else if (label.includes('note') || label.includes('notes')) data.notes = val;
    });
  }
  return data;
}

// -------- Intercept <summary> to open lightbox instead of inline expansion --------
function bindSummaryToLightbox(){
  document.addEventListener('click', function(e){
    var summary = e.target.closest('summary.details-summary, summary.concert-details, details.concert-details > summary');
    if (!summary) return;

    // NON aprire lightbox se siamo già dentro la modal anno
    var inYearModal = summary.closest('#year_modal');
    if (inYearModal) {
      // Lascia che il <details> funzioni normalmente (anche se il CSS lo nasconde)
      return;
    }

    // Only act if the global lightbox API exists
    if (typeof window.openConcertFromDOM !== 'function') return;

    e.preventDefault();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    e.stopPropagation();

    var details = summary.closest('details');
    if (details && details.hasAttribute('open')) details.removeAttribute('open');

    // Find the concert item that contains this summary
    var concertItem = summary.closest('.concert-item, .concert-card, li[data-concert-id], article[data-concert-id]');
    if (!concertItem) return;

    // Get the concert ID from data attribute
    var concertId = concertItem.getAttribute('data-concert-id');
    if (!concertId) {
      console.warn('[concerts] No data-concert-id found on concert item');
      return;
    }

    // Open lightbox using the new DB-based method
    window.openConcertFromDOM(concertId);
  }, { capture: true });
}

function init(){
  bindDetailsLabels();
  bindSummaryToLightbox();
  console.debug('[concerts] glue loaded');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

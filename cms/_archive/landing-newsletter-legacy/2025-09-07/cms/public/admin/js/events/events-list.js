// events-list.js — Admin > Events (list interactions)
(function () {
  'use strict';
  const qs  = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Sidebar: evidenzia "Eventi"
  try { qs('.sidebar-link[href="/admin/events"]')?.classList.add('active'); } catch {}

  // Persistenza open/closed per <details.year-group> + hash #y-YYYY
  const KEY = 'admin.events.year.open';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const write = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} };

  function getYear(d) {
    const y = qs('summary .year', d)?.textContent?.trim();
    if (y) return y;
    const dy = d.getAttribute('data-year');
    if (dy) return String(dy).trim();
    const m = qs('summary', d)?.textContent?.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : '';
  }

  function hydrateYears(){
    const map = read();
    qsa('.year-group').forEach(d => {
      const year = getYear(d);
      if (!year) return;
      if (!d.id) d.id = `y-${year}`;
      if (Object.hasOwn(map, year)) d.open = !!map[year];
      d.addEventListener('toggle', () => { const m = read(); m[year] = d.open; write(m); });
    });
    if (location.hash && /^#y-\d{4}$/i.test(location.hash)) {
      const t = qs(location.hash); if (t?.matches('.year-group')) { t.open = true; setTimeout(()=>t.scrollIntoView({behavior:'smooth'}), 0); }
    }
  }

  // Conferma su form con data-confirm
  function wireConfirm(){
    qsa('form[data-confirm]').forEach(f => {
      f.addEventListener('submit', (ev) => {
        const msg = f.dataset.confirm || "Confermi l'operazione?";
        if (!window.confirm(msg)) { ev.preventDefault(); return false; }
        qs('button[type="submit"]', f)?.setAttribute('disabled','true');
      }, { passive:false });
    });
  }

  // Filtro rapido opzionale
  function wireFilter(){
    const input = qs('#events_filter'); if (!input) return;
    const rows = qsa('table tbody tr');
    const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
    const hay = rows.map(tr => ({
      tr,
      text: norm([
        tr.querySelector('.title')?.textContent,
        tr.querySelector('.location')?.textContent,
        tr.querySelector('.date')?.textContent
      ].filter(Boolean).join(' '))
    }));
    let t=0;
    input.addEventListener('input', ()=>{
      clearTimeout(t);
      t=setTimeout(()=>{
        const q = norm(input.value);
        hay.forEach(({tr,text})=>{
          const show = !q || text.includes(q);
          tr.toggleAttribute('hidden', !show);
          tr.classList.toggle('is-hidden', !show);
        });
      },120);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    hydrateYears();
    wireConfirm();
    wireFilter();
  });
})(); }
        // disabilita bottone submit per evitare doppio invio
        const btn = qs('button[type="submit"]', form);
        if (btn) btn.disabled = true;
      }, { passive: false });
    });
  }

  // 4) Filtro rapido (opzionale) — richiede <input id="events_filter">
  function wireQuickFilter() {
    const input = qs('#events_filter');
    if (!input) return;

    const rows = qsa('table tbody tr');
    const norm = (s) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');

    const hay = rows.map((tr) => ({
      tr,
      text: norm([
        tr.querySelector('.title')?.textContent,
        tr.querySelector('.location')?.textContent,
        tr.querySelector('.date')?.textContent
      ].filter(Boolean).join(' '))
    }));

    let t = 0;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = norm(input.value);
        hay.forEach(({ tr, text }) => {
          const show = !q || text.includes(q);
          // usa sia [hidden] sia una classe, così funzioni con CSS esistenti
          tr.toggleAttribute('hidden', !show);
          if (!show) tr.classList.add('is-hidden');
          else tr.classList.remove('is-hidden');
        });
      }, 120);
    });
  }

  // 5) Init
  document.addEventListener('DOMContentLoaded', () => {
    hydrateYearGroups();
    wireDeleteConfirm();
    wireQuickFilter();
  });
})();
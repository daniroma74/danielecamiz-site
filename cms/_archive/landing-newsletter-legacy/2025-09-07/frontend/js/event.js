// frontend/js/event.js — v1 (aggiornato)
// - Formattazione data (Luxon)
// - Toggle programma (senza scroll in alto)
// - Modale prenotazione con focus trap (non si chiude da sola)
// - POST prenotazione + messaggi esito
// - Share link (un solo pulsante)
// NOTE: la rotta .ics è gestita in backend ed è già a posto se messa prima della JSON.

const state = {
  lang: (document.querySelector('main.event-page')?.dataset?.lang || 'it'),
  slug: (document.querySelector('main.event-page')?.dataset?.slug || ''),
  event: null,
  bookingOpen: false,
  focusTrap: { first: null, last: null, prev: null },
  submitting: false          // ← nuovo: evita doppi invii del form
};

const i18n = {
  it: {
    show:"Mostra", hide:"Nascondi", share:"Condividi",
    invalidEmail: "Inserisci un'email valida.", required:"Campo obbligatorio.",
    successConfirmed:"Prenotazione confermata! Riceverai una email di conferma.",
    successWaitlist:"Evento pieno: sei in lista d'attesa.",
    soldout:"Posti esauriti.",
    sending:"Invio…", confirm:"Conferma prenotazione", network:"Errore di rete"
  },
  en: {
    show:"Show", hide:"Hide", share:"Share",
    invalidEmail: "Please enter a valid email address.", required:"This field is required.",
    successConfirmed:"Booking confirmed! You'll receive a confirmation email.",
    successWaitlist:"Event is full: you are on the waitlist.",
    soldout:"Sold out.",
    sending:"Sending…", confirm:"Confirm reservation", network:"Network error"
  }
};

function qs(sel){ return document.querySelector(sel); }
function setText(id, txt){ const el=qs(id); if(el) el.textContent = txt; }

function fmtDateRange(ev, lang){
  const { DateTime } = window.luxon || {};
  if(!DateTime || !ev?.datetime) return '';
  const tz = 'Europe/Rome';
  const start = DateTime.fromISO(ev.datetime, { zone: tz });
  const end = ev.end_datetime ? DateTime.fromISO(ev.end_datetime, { zone: tz }) : null;
  const locale = (lang==='it' ? 'it' : 'en-GB');

  const day = start.setLocale(locale).toLocaleString({ weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const tStart = start.setLocale(locale).toLocaleString(DateTime.TIME_24_SIMPLE);
  if(end){
    const sameDay = start.hasSame(end,'day');
    const tEnd = end.setLocale(locale).toLocaleString(DateTime.TIME_24_SIMPLE);
    return sameDay ? `${day} ${lang==='it'?'alle':''} ${tStart}–${tEnd}` : `${day} ${tStart} → ${end.setLocale(locale).toLocaleString(DateTime.DATETIME_MED)}`;
  }
  return `${day} ${lang==='it'?'alle':''} ${tStart}`;
}

function renderEvent(ev){
  state.event = ev;

  // Data/ora
  const dtEl = qs('#dateTime');
  if (dtEl){
    dtEl.textContent = fmtDateRange(ev, state.lang);
    dtEl.setAttribute('datetime', ev.datetime || '');
  }

  // Capienza
  const capLine = qs('#capacityLine'); const capInfo = qs('#capacityInfo');
  const total = ev.capacity ?? null; const hold = ev.holdback ?? 0; const reserved = ev.stats?.reserved ?? 0;
  if(total != null && capLine && capInfo){
    const free = Math.max(0, (total - hold) - reserved);
    capLine.hidden = false;
    capInfo.textContent = (state.lang==='it') ? `Capienza disponibile: ${free}/${total}` : `Available capacity: ${free}/${total}`;
  }else if (capLine){ capLine.hidden = true; }

  // Mappa
  const addr = ev.location?.address || '';
  const q = encodeURIComponent(addr || ev.location?.name || 'Rome');
  const map = qs('#mapFrame');
  if (map) map.src = `https://www.google.com/maps?q=${q}&output=embed`;

  // ICS (href già impostato in EJS, qui solo per sicurezza)
  const ics = `/api/events/${encodeURIComponent(ev.slug || state.slug)}.ics`;
  if (qs('#icsLink'))  qs('#icsLink').href = ics;

  // Tickets
  renderTicketTypes(ev);
}

function renderTicketTypes(ev){
  const wrap = qs('#ticketTypes'); if(!wrap) return;
  wrap.innerHTML = '';
  const types = ev.tickets || [{ type:"free", label:{it:"Posto gratuito", en:"Free seat"}, maxQty:4 }];
  types.forEach((t, idx)=>{
    const id = `tk_${idx}`;
    const label = t.label?.[state.lang] || t.label?.it || t.type;
    const note = t.note?.[state.lang];
    const row = document.createElement('div');
    row.className = 'ticket-row';
    row.innerHTML = `
      <div>
        <div><strong>${label}</strong></div>
        ${note ? `<div class="muted small">${note}</div>` : ''}
      </div>
      <div class="counter">
        <button type="button" data-dec="${idx}" aria-label="Decrease">−</button>
        <input id="${id}" data-type="${t.type}" type="number" min="0" max="${t.maxQty ?? 4}" value="0" inputmode="numeric" pattern="[0-9]*" />
        <button type="button" data-inc="${idx}" aria-label="Increase">+</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  // Delegation (un solo listener)
  wrap.addEventListener('click', (e)=>{
    const inc = e.target.getAttribute('data-inc');
    const dec = e.target.getAttribute('data-dec');
    if(inc === null && dec === null) return;
    const idx = parseInt(inc ?? dec, 10);
    const input = document.getElementById(`tk_${idx}`);
    if(!input) return;
    const max = parseInt(input.max || '4',10), min = parseInt(input.min || '0',10);
    let v = parseInt(input.value || '0',10);
    if(inc !== null) v = Math.min(max, v+1);
    if(dec !== null) v = Math.max(min, v-1);
    input.value = String(v);
  }, { once:true });
}

function openModal(e){
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const modal = qs('#bookingModal');
  if(!modal) return;
  state.focusTrap.prev = document.activeElement;
  modal.setAttribute('aria-hidden', 'false');
  state.bookingOpen = true;
  const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  state.focusTrap.first = focusables[0]; state.focusTrap.last = focusables[focusables.length-1];
  state.focusTrap.first?.focus();
  document.addEventListener('keydown', trapTab);
}

function closeModal(e){
  if (e) e.preventDefault();
  const modal = qs('#bookingModal');
  if(!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  state.bookingOpen = false;
  document.removeEventListener('keydown', trapTab);
  state.focusTrap.prev?.focus();
}

function trapTab(e){
  if(!state.bookingOpen) return;
  if(e.key === 'Escape'){ closeModal(e); return; }
  if(e.key !== 'Tab') return;
  const {first,last} = state.focusTrap;
  if(!first || !last) return;
  if(e.shiftKey){ if(document.activeElement===first){ last.focus(); e.preventDefault(); } }
  else { if(document.activeElement===last){ first.focus(); e.preventDefault(); } }
}

function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function collectTickets(){
  const wrap = qs('#ticketTypes'); if(!wrap) return [];
  const inputs = wrap.querySelectorAll('input[type="number"]');
  const arr = []; inputs.forEach(inp=>{ const qty=parseInt(inp.value||'0',10); if(qty>0) arr.push({ type:inp.dataset.type, qty }); });
  return arr;
}

async function submitBooking(e){
  e.preventDefault();
  if (state.submitting) return;       // guard contro doppi click
  state.submitting = true;

  const lang = state.lang;
  const first = qs('#firstName'), last = qs('#lastName'), email = qs('#email');
  const formStatus = qs('#formStatus');
  const setErr = (id,msg)=>{ const el=qs(id); if(el) el.textContent = msg || ''; };

  setErr('#errFirstName',''); setErr('#errLastName',''); setErr('#errEmail',''); setErr('#errTickets',''); setErr('#errPrivacy','');
  if(qs('#hpWebsite')?.value.trim()){ formStatus.textContent='Error.'; state.submitting=false; return; } // honeypot

  let ok = true;
  if(!first?.value.trim()){ setErr('#errFirstName', i18n[lang].required); ok=false; }
  if(!last?.value.trim()){ setErr('#errLastName', i18n[lang].required); ok=false; }
  if(!isEmail(email?.value.trim() || '')){ setErr('#errEmail', i18n[lang].invalidEmail); ok=false; }
  const tickets = collectTickets();
  if(tickets.length===0){ setErr('#errTickets', i18n[lang].required); ok=false; }
  if(!qs('#privacyConsent')?.checked){ setErr('#errPrivacy', i18n[lang].required); ok=false; }
  if(!ok){ state.submitting=false; return; }

  const body = {
    event_id: state.event?.id || state.slug,
    tickets,
    first_name: first.value.trim(),
    last_name: last.value.trim(),
    email: email.value.trim(),
    phone: qs('#phone')?.value.trim() || '',
    language: lang,
    privacy_consent: true,
    newsletter_optin: !!qs('#newsletterOptin')?.checked
  };

  const btn = qs('#submitBooking');
  if(btn){ btn.disabled = true; btn.textContent = i18n[lang].sending; }
  try{
    const r = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if(r.status===409){ formStatus.textContent = i18n[lang].soldout; return; }
    if(!r.ok){ const err = await r.json().catch(()=>({error:'Error'})); formStatus.textContent = err.error || 'Error'; return; }
    const data = await r.json();
    formStatus.textContent = (data.status==='confirmed') ? i18n[lang].successConfirmed
                         : (data.status==='waitlisted' ? i18n[lang].successWaitlist : 'OK');
    setTimeout(()=>closeModal(), 1400);
  }catch(_){
    formStatus.textContent = i18n[lang].network;
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = i18n[lang].confirm; }
    state.submitting = false;
  }
}


async function init(){
  // Luxon
  if(!window.luxon){ await import('https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js'); }

  // Carica evento
  try{
    const res = await fetch(`/api/events/${encodeURIComponent(state.slug)}`);
    if(res.ok){ state.event = await res.json(); }
  }catch{}
  renderEvent(state.event || {});

  // Toggle programma (no scroll)
  const toggle = qs('#programToggle');
  if(toggle){
    toggle.addEventListener('click', (e)=>{
      e.preventDefault();
      const panel = qs('#programPanel'); if(!panel) return;
      const hidden = panel.hasAttribute('hidden');
      if(hidden){
        panel.removeAttribute('hidden');
        toggle.setAttribute('aria-expanded','true');
        toggle.textContent = i18n[state.lang].hide;
      }else{
        panel.setAttribute('hidden','');
        toggle.setAttribute('aria-expanded','false');
        toggle.textContent = i18n[state.lang].show;
      }
    });
  }

  // Modale
  qs('#bookBtn')?.addEventListener('click', openModal);
  qs('#closeModal')?.addEventListener('click', closeModal);
  qs('#cancelBooking')?.addEventListener('click', closeModal);
  qs('#bookingForm')?.addEventListener('submit', submitBooking);

  // Share (unico pulsante)
  qs('#shareBtn')?.addEventListener('click', shareLink);
}

async function shareLink(e){
  if (e) e.preventDefault();
  const url = window.location.href;
  if(navigator.share){
    try{ await navigator.share({ title: document.title, url }); }catch(_){}
  }else{
    try{ await navigator.clipboard.writeText(url); }catch(_){}
  }
}

window.addEventListener('DOMContentLoaded', init);

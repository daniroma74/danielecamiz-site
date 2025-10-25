// admin/js/events/event-landing.js
// Landing tab helper: prefill (GET), safe submit (POST), dirty-state, and minimal UX without dependencies.
(function(){
  'use strict';

  // ---------- utils ----------
  function qs(sel, ctx){ return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function serializeForm(form){
    const fd = new FormData(form);
    const usp = new URLSearchParams();
    for (const [k,v] of fd.entries()) usp.append(k, v);
    return usp.toString();
  }

  function setFormBusy(form, on){
    form.classList.toggle('is-loading', !!on);
    qsa('input, select, textarea, button', form).forEach(el => {
      if (on) el.setAttribute('disabled','disabled'); else el.removeAttribute('disabled');
    });
  }

  function toast(msg){
    if (window.toast && typeof window.toast.success === 'function') { window.toast.success(msg); return; }
    if (window.Toast && typeof window.Toast.show === 'function') { window.Toast.show(msg); return; }
    try { console.info('[landing]', msg); } catch(_){/*noop*/}
  }

  function getLandingForm(){
    return qs('form[data-landing-form]')
        || qs('#landing_form')
        || qs('form[action*="/admin/events/"][action$="/landing"]')
        || null;
  }

  function getEventId(form){
    const fromData = form.getAttribute('data-event-id');
    if (fromData) return fromData;
    try {
      const m = form.action.match(/\/admin\/events\/(\d+)\/landing/i);
      if (m) return m[1];
    } catch(_){/*noop*/}
    const wrap = form.closest('[data-event-id]');
    if (wrap && wrap.dataset.eventId) return wrap.dataset.eventId;
    return null;
  }

  function getLandingGetUrl(form){
    const explicit = form.getAttribute('data-landing-get');
    if (explicit) return explicit;
    const action = form.getAttribute('action') || '';
    if (action.endsWith('/landing')) return action + '.json';
    try {
      const u = new URL(action, window.location.origin);
      if (!u.pathname.endsWith('.json')) u.pathname += '.json';
      return u.toString();
    } catch(_){
      return action + (action.includes('?') ? '&' : '?') + 'format=json';
    }
  }

  // ---------- dirty state ----------
  let suspendDirty = false;
  function markPristine(form){ form.dataset.dirty = '0'; }
  function markDirty(form){ if (!suspendDirty) form.dataset.dirty = '1'; }
  function isDirty(form){ return form.dataset.dirty === '1'; }

  function bindInputsDirty(form){
    const handler = () => markDirty(form);
    qsa('input, select, textarea', form).forEach(el => {
      el.removeEventListener('change', handler);
      el.addEventListener('change', handler);
      el.removeEventListener('input', handler);
      el.addEventListener('input', handler);
    });
  }

  function enableCtrlS(form){
    document.addEventListener('keydown', function(e){
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 's'){
        const within = form.contains(document.activeElement) || qs('#tab-landing')?.contains(document.activeElement);
        if (within){ e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.submit(); }
      }
    });
  }

  function showHideBlocks(form){
    const bookingToggle = qs('[name="booking_enabled"]', form);
    const bookingWrap = qs('[data-booking-fields]', form);
    if (bookingToggle && bookingWrap){ bookingWrap.style.display = bookingToggle.checked ? '' : 'none'; }
    if (bookingToggle){ bookingToggle.addEventListener('change', () => { if (bookingWrap) bookingWrap.style.display = bookingToggle.checked ? '' : 'none'; }); }
  }

  // ---------- prefill (GET) ----------
  function fill(form, item){
    suspendDirty = true;
    try {
      // strings/textareas
      const map = {
        hero_title: 'input[name="hero_title"]',
        hero_subtitle: 'input[name="hero_subtitle"]',
        body_html: 'textarea[name="body_html"]',
        practical_info_html: 'textarea[name="practical_info_html"]',
        cta_label: 'input[name="cta_label"]',
        cta_url: 'input[name="cta_url"]',
        seo_title: 'input[name="seo_title"]',
        seo_description: 'textarea[name="seo_description"]'
      };
      Object.keys(map).forEach(k => { const el = qs(map[k], form); if (el) el.value = item && (item[k] != null) ? String(item[k]) : ''; });

      // numeric ids
      const heroId = qs('input[name="hero_asset_id"]', form);
      if (heroId) heroId.value = (item && item.hero_asset_id != null) ? String(item.hero_asset_id) : '';
      const ogId = qs('input[name="og_asset_id"]', form);
      if (ogId) ogId.value = (item && item.og_asset_id != null) ? String(item.og_asset_id) : '';

      // checkbox
      const chk = qs('input[name="booking_enabled"]', form);
      if (chk) chk.checked = !!(item && item.booking_enabled);

      // hidden lang if present
      const lang = qs('input[name="lang"]', form);
      if (lang && item && item.lang) lang.value = String(item.lang);

      // reflect dep blocks
      showHideBlocks(form);
    } finally {
      suspendDirty = false;
      markPristine(form);
    }
  }

  async function prefill(form){
    const url = getLandingGetUrl(form);
    try {
      setFormBusy(form, true);
      const res = await fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const item = json && (json.item || json.data || json) || {};
      fill(form, item);
    } catch(err){
      // Prefill è best-effort: log e vai avanti con form vuota
      try { console.warn('[landing] prefill error:', err); } catch(_){/*noop*/}
    } finally {
      setFormBusy(form, false);
    }
  }

  // ---------- submit (POST) ----------
  async function saveLanding(form){
    const action = form.getAttribute('action');
    const method = (form.getAttribute('method') || 'post').toUpperCase();
    const body = serializeForm(form);
    setFormBusy(form, true);
    try {
      const res = await fetch(action, {
        method,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        credentials: 'same-origin',
        redirect: 'follow'
      });
      if (res.redirected) { window.location.assign(res.url); return; }
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          try {
            const json = await res.json();
            if (json && (json.ok || json.success || json.item)) {
              toast('Contenuti landing salvati.');
              markPristine(form);
              setFormBusy(form, false);
              return;
            }
          } catch(_){/*noop*/}
        }
        toast('Contenuti landing salvati.');
        markPristine(form);
        setFormBusy(form, false);
        return;
      }
      throw new Error('HTTP ' + res.status);
    } catch(err){
      setFormBusy(form, false);
      alert('Salvataggio non riuscito. Riprova.\n\nDettagli: ' + (err && err.message ? err.message : 'Errore sconosciuto'));
    }
  }

  // ---------- attach ----------
  function attach(){
    const form = getLandingForm();
    if (!form) return;

    // pristine at load, then prefill
    markPristine(form);
    prefill(form);

    bindInputsDirty(form);
    enableCtrlS(form);
    showHideBlocks(form);

    form.addEventListener('submit', function(e){ e.preventDefault(); saveLanding(form); });

    // reload button support (optional)
    const reloadBtn = qs('#btn_landing_reload, [data-landing-reload]', form) || qs('#btn_landing_reload, [data-landing-reload]');
    if (reloadBtn){
      reloadBtn.addEventListener('click', function(e){ e.preventDefault(); prefill(form); });
    }

    // save button shortcut (optional)
    const saveBtn = qs('#btn_landing_save, [data-landing-save]', form) || qs('#btn_landing_save, [data-landing-save]');
    if (saveBtn){ saveBtn.addEventListener('click', function(e){ e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.submit(); }); }

    // unload guard
    window.addEventListener('beforeunload', function(e){
      if (isDirty(form)){
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', attach);

  // expose minimal API for debugging
  window.adminEventsLanding = {
    _attach: attach,
    _save: function(){ const f = getLandingForm(); if (f) saveLanding(f); },
    _prefill: function(){ const f = getLandingForm(); if (f) prefill(f); }
  };
})();   
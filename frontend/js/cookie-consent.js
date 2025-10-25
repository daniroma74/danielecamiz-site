(function () {
  const COOKIE_NAME_STATE = 'cookie_consent'; // 'accept' | 'reject' | 'custom'
  const COOKIE_NAME_PREFS = 'cookie_prefs';   // JSON { measurement, marketing }
  const ONE_YEAR = 365 * 24 * 60 * 60;

  function setCookie(name, value, seconds) {
    const d = new Date();
    d.setTime(d.getTime() + (seconds * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
  }
  function getCookie(name) {
    return document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.split('=').slice(1).join('=') || '';
  }
  function eraseCookie(name) { document.cookie = `${name}=; Max-Age=0; path=/`; }

  function parsePrefs() {
    try { return JSON.parse(decodeURIComponent(getCookie(COOKIE_NAME_PREFS)) || '{}'); }
    catch { return {}; }
  }

  function applyConsent() {
    const state = getCookie(COOKIE_NAME_STATE);   // 'accept' | 'reject' | 'custom' | ''
    const prefs = parsePrefs();                   // { measurement: true/false, marketing: true/false }

    document.documentElement.classList.remove('consent-accepted','consent-rejected','consent-custom');
    if (state === 'accept') document.documentElement.classList.add('consent-accepted');
    else if (state === 'reject') document.documentElement.classList.add('consent-rejected');
    else if (state === 'custom') document.documentElement.classList.add('consent-custom');

    // Attiva/disattiva elementi che richiedono consenso (es. embed Bandcamp)
    const blocks = document.querySelectorAll('[data-consent-group]');
    blocks.forEach(el => {
      const grp = el.getAttribute('data-consent-group');
      const allowed = (state === 'accept') || (state === 'custom' && prefs[grp]);
      const placeholder = el.nextElementSibling?.matches?.('.consent-placeholder') ? el.nextElementSibling : null;
      if (allowed) {
        el.removeAttribute('hidden');
        if (placeholder) placeholder.setAttribute('hidden','hidden');
        // Sblocca eventuali script differiti tipo <script type="text/plain" data-consent="marketing">
        document.querySelectorAll(`script[type="text/plain"][data-consent="${grp}"]`).forEach(scr => {
          const s = document.createElement('script');
          Array.from(scr.attributes).forEach(a => { if (a.name!=='type') s.setAttribute(a.name, a.value); });
          s.textContent = scr.textContent || '';
          scr.replaceWith(s);
        });
      } else {
        el.setAttribute('hidden','hidden');
        if (placeholder) placeholder.removeAttribute('hidden');
      }
    });
  }

  function openBanner() {
    const el = document.getElementById('cookie_banner');
    if (el) el.removeAttribute('hidden');
  }
  function closeBanner() {
    const el = document.getElementById('cookie_banner');
    if (!el) return;
    el.setAttribute('hidden','hidden');
    setTimeout(() => { el.parentNode && el.parentNode.removeChild(el); }, 50);
  }

  function saveAndApply(state, prefs) {
    setCookie(COOKIE_NAME_STATE, state, ONE_YEAR);
    if (state === 'custom') {
      setCookie(COOKIE_NAME_PREFS, JSON.stringify(prefs || {}), ONE_YEAR);
    } else {
      eraseCookie(COOKIE_NAME_PREFS);
    }
    applyConsent();
    closeBanner();
  }

  function wireBanner() {
    const banner = document.getElementById('cookie_banner');
    if (!banner) return;
    const btnAccept = banner.querySelector('[data-consent="accept"]');
    const btnReject = banner.querySelector('[data-consent="reject"]');
    const btnPrefs  = banner.querySelector('[data-consent="prefs"]');
    const formPrefs = banner.querySelector('#cookie_prefs_form');

    btnAccept?.addEventListener('click', () => saveAndApply('accept'));
    btnReject?.addEventListener('click', () => saveAndApply('reject'));
    btnPrefs?.addEventListener('click', () => {
      const fd = new FormData(formPrefs);
      const prefs = {
        measurement: !!fd.get('measurement'),
        marketing:   !!fd.get('marketing')
      };
      saveAndApply('custom', prefs);
    });

    if (!getCookie(COOKIE_NAME_STATE)) openBanner();
  }

  function wireManageLink() {
    const link = document.getElementById('manage_cookies_link');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openBanner();
    });
  }

  window.CookieConsent = { open: openBanner, applyConsent };

  document.addEventListener('DOMContentLoaded', () => {
    applyConsent();
    wireBanner();
    wireManageLink();
  });
})();

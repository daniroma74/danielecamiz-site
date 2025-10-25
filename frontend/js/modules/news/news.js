// frontend/js/modules/news/news.js
// Tabs filtering + ARIA + querystring sync (+ optional pagination) + newsletter subscribe (no deps).
// Now supports **categories** (preferred) via data-cat / data-filter-cat / ?cat=
// and keeps backward compatibility with legacy tags via data-tags / data-filter / ?tag=
(function () {
  /* ===== Utils ===== */
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || '').trim()); }
  function getQS() { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } }
  function setQS(next) {
    try {
      const url = new URL(window.location.href);
      Object.keys(next || {}).forEach(k => {
        const v = next[k];
        if (v === null || v === undefined || v === '') url.searchParams.delete(k);
        else url.searchParams.set(k, String(v));
      });
      window.history.replaceState({}, '', url.pathname + (url.search || '') + (url.hash || ''));
    } catch {}
  }

  /* ===== Filtering helpers ===== */
  function detectFilterMode(tabs, items) {
    // Prefer categories if explicitly present
    const hasCatTabs = (tabs || []).some(el => el.hasAttribute('data-filter-cat'));
    const hasCatItems = (items || []).some(el => el.hasAttribute('data-cat'));
    if (hasCatTabs || hasCatItems) return 'cat';
    return 'tag';
  }

  function applyFilterAndPaginate(key, items, limit, mode) {
    // Returns { total, visible }
    let total = 0, visible = 0;
    const k = (key || 'all');
    const passing = [];

    for (const li of items) {
      if (k === 'all') { passing.push(li); continue; }
      if (mode === 'cat') {
        const cat = (li.getAttribute('data-cat') || '').trim();
        if (cat && cat === k) passing.push(li);
      } else {
        const tags = (li.getAttribute('data-tags') || '').split('|').filter(Boolean);
        if (tags.includes(k)) passing.push(li);
      }
    }

    total = passing.length;
    const max = (typeof limit === 'number' && isFinite(limit)) ? Math.max(0, limit) : Infinity;

    // Hide all
    items.forEach(li => { li.style.display = 'none'; });
    // Show up to limit
    for (let i = 0; i < passing.length; i++) {
      if (i < max) { passing[i].style.display = ''; visible++; }
    }
    return { total, visible };
  }

  function initTabsAndPaging() {
    const nav = document.getElementById('news_tabs');
    const tabs = $all('#news_tabs .news-tab');
    const listEl = document.getElementById('news_list');
    const items = $all('#news_list .news-card');
    const countEl = document.getElementById('news_count');
    const loadMoreBtn = document.getElementById('news_load_more'); // optional

    if (!nav || !tabs.length || !listEl || !items.length) return;

    // Determine mode (cat vs tag)
    const MODE = detectFilterMode(tabs, items); // 'cat' | 'tag'
    const KEY_ATTR = (MODE === 'cat') ? 'data-filter-cat' : 'data-filter';
    const QS_KEY = (MODE === 'cat') ? 'cat' : 'tag';

    // ARIA roles
    nav.setAttribute('role', 'tablist');

    // Page size for optional pagination
    const btnSize = loadMoreBtn && parseInt(loadMoreBtn.getAttribute('data-page-size'), 10);
    const listSize = listEl && parseInt(listEl.getAttribute('data-page-size'), 10);
    const PAGE_SIZE = (!isNaN(btnSize) ? btnSize : (!isNaN(listSize) ? listSize : 9));

    // State
    let currentBtn = tabs.find(b => b.classList.contains('is-active')) || tabs[0];
    let currentKey = currentBtn ? (currentBtn.getAttribute(KEY_ATTR) || currentBtn.getAttribute('data-filter') || 'all') : 'all';
    let currentPage = 1; // only used if loadMoreBtn exists

    // Querystring: cat/tag + pg
    const qs = getQS();
    const qsVal = qs.get(QS_KEY);
    const qsPg = parseInt(qs.get('pg') || '1', 10);
    if (qsVal) {
      const match = tabs.find(b => (b.getAttribute(KEY_ATTR) === qsVal) || (b.getAttribute('data-filter') === qsVal));
      if (match) {
        currentBtn = match; currentKey = qsVal;
        tabs.forEach(b => b.classList.remove('is-active'));
        currentBtn.classList.add('is-active');
      }
    }
    if (!isNaN(qsPg) && qsPg > 1) currentPage = qsPg;

    // Init ARIA attributes
    tabs.forEach((btn) => {
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', (btn === currentBtn) ? 'true' : 'false');
      btn.setAttribute('tabindex', (btn === currentBtn) ? '0' : '-1');
    });

    function updateAriaActive(nextBtn) {
      if (currentBtn === nextBtn) return;
      currentBtn.classList.remove('is-active');
      currentBtn.setAttribute('aria-selected', 'false');
      currentBtn.setAttribute('tabindex', '-1');
      nextBtn.classList.add('is-active');
      nextBtn.setAttribute('aria-selected', 'true');
      nextBtn.setAttribute('tabindex', '0');
      currentBtn = nextBtn;
      currentKey = nextBtn.getAttribute(KEY_ATTR) || nextBtn.getAttribute('data-filter') || 'all';
    }

    function updateCount(total) {
      if (!countEl) return;
      try {
        const n = Number(total) || 0;
        countEl.textContent = '(' + n + ')';
        const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
        const label = (lang === 'en') ? (n === 1 ? '1 result' : n + ' results') : (n === 1 ? '1 risultato' : n + ' risultati');
        countEl.setAttribute('aria-label', label);
      } catch {}
    }

    function refresh() {
      const limit = loadMoreBtn ? (currentPage * PAGE_SIZE) : Infinity;
      const res = applyFilterAndPaginate(currentKey, items, limit, MODE);
      updateCount(res.total);
      if (loadMoreBtn) {
        loadMoreBtn.style.display = (res.visible >= res.total) ? 'none' : '';
      }
    }

    // Initial paint
    refresh();

    // Tab clicks
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn === currentBtn) return;
        updateAriaActive(btn);
        currentPage = 1; // reset pagination on filter change
        const next = {};
        // Update QS: set cat/tag for anything except 'all'; drop pg when changing tab
        next[QS_KEY] = (currentKey === 'all' ? null : currentKey);
        next.pg = null;
        setQS(next);
        refresh();
        btn.focus();
      });
      // Keyboard support (Left/Right)
      btn.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const list = tabs;
        const i = list.indexOf(currentBtn);
        const nextI = (e.key === 'ArrowRight') ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[nextI].click();
      });
    });

    // Load More (optional)
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        currentPage += 1;
        const next = {}; next[QS_KEY] = (currentKey === 'all' ? null : currentKey); next.pg = currentPage;
        setQS(next);
        refresh();
        loadMoreBtn.focus();
      });
    }
  }

  /* ===== Newsletter form ===== */
  function initNewsletterForm() {
    const form = document.getElementById('newsletter_form');
    if (!form) return; // not on this page

    const emailInput = document.getElementById('newsletter_email');
    const feedback = document.getElementById('newsletter_feedback');
    const submitBtn = form.querySelector('button[type="submit"]');
    const lang = (form.getAttribute('data-lang') || 'it').toLowerCase();

    // Prevent bubbling that could steal focus
    ['mousedown','touchstart','click'].forEach((evt) => {
      form.addEventListener(evt, (e) => { e.stopPropagation(); }, true);
      if (emailInput) {
        emailInput.addEventListener(evt, (e) => { e.stopPropagation(); }, true);
      }
    });

    const MSG = (lang === 'en') ? {
      placeholder: 'email address',
      invalid: 'Invalid email address.',
      sending: 'Subscribing…',
      ok: 'Subscription saved. Thank you!',
      server: 'Server error. Please try again.'
    } : {
      placeholder: 'indirizzo email',
      invalid: 'Indirizzo email non valido.',
      sending: 'Iscrizione in corso…',
      ok: 'Iscrizione registrata. Grazie!',
      server: 'Errore del server. Riprova.'
    };

    function setFeedback(text) { if (feedback) { feedback.textContent = text || ''; } }
    function disableForm(disabled) { if (submitBtn) submitBtn.disabled = !!disabled; if (emailInput) emailInput.disabled = !!disabled; }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (emailInput && emailInput.value || '').trim();

      if (!isValidEmail(email)) { setFeedback(MSG.invalid); if (emailInput) emailInput.focus(); return; }

      setFeedback(MSG.sending);
      disableForm(true);

      try {
        const res = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, consent: true, lang })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.ok) {
          setFeedback(MSG.ok);
          try { form.reset(); } catch {}
        } else {
          setFeedback(data && data.error === 'invalid_email' ? MSG.invalid : MSG.server);
        }
      } catch (err) {
        setFeedback(MSG.server);
      } finally {
        disableForm(false);
      }
    });
  }

  /* ===== LQIP fade-out ===== */
  function initLqipFade() {
    function hideLqipFor(img) {
      try {
        const wrap = img.closest('.news-card__media, .post-hero');
        if (!wrap) return;
        const lq = wrap.querySelector('img.lqip');
        if (lq) {
          requestAnimationFrame(() => { lq.classList.add('is-hidden'); });
        }
      } catch {}
    }
    // When an image loads, hide its LQIP sibling
    document.addEventListener('load', function (e) {
      const img = e.target;
      if (!img || img.tagName !== 'IMG') return;
      hideLqipFor(img);
    }, true);
    // Hide LQIP immediately for images already cached/complete
    Array.from(document.images || []).forEach((img) => {
      if (img.complete) hideLqipFor(img);
    });
  }

  /* ===== Init ===== */
  function init() {
    initTabsAndPaging();
    initNewsletterForm();
    initLqipFade();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

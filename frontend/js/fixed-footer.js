// fixed-footer.js — robust footer height reservation (clamped)
// Ensures the page reserves just enough space for the fixed footer, no more.
(function () {
  const root = document.documentElement;
  const footer = document.getElementById('site_footer') || document.querySelector('.site-footer');
  if (!footer) return;

  const inner = footer.querySelector('.footbar-inner');
  const mainEl = document.getElementById('main_content'); // optional helper

  const MIN_H = 20;         // absolute lower bound (px)
  const MAX_H = 56;         // absolute upper bound (px)
  const MOBILE_MAX = 32;    // mobile cap (px)
  const FALLBACK = 32;      // guaranteed safe default (px)

  function clamp(n, a, b) { return Math.min(Math.max(n, a), b); }

  function measureFooter() {
    // Use offsetHeight (excludes out-of-flow popover) from the inner container first
    // This avoids counting the mobile popover (.footer-links) which is position:absolute
    let raw = 0;
    if (inner && inner.offsetHeight) raw = inner.offsetHeight;
    else if (footer && footer.offsetHeight) raw = footer.offsetHeight;
    else raw = FALLBACK;

    // Mobile-specific cap
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const cap = isMobile ? MOBILE_MAX : MAX_H;

    // Clamp into a safe range
    const h = clamp(raw, MIN_H, cap);
    return h;
  }

  function applyHeight() {
    // Defer to next frame to wait layout stabilization (fonts, etc.)
    window.requestAnimationFrame(() => {
      const h = measureFooter();
      root.style.setProperty('--footer-h', h + 'px');
      // Optional direct padding if your CSS doesn't target the actual main element
      if (mainEl) mainEl.style.paddingBottom = h + 'px';
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHeight, { once: true });
  } else {
    applyHeight();
  }
  // Also on full load (fonts/images) and after a tiny delay
  window.addEventListener('load', applyHeight, { once: true });
  setTimeout(applyHeight, 120);

  // Recalculate on resize / orientation change
  window.addEventListener('resize', applyHeight, { passive: true });
  window.addEventListener('orientationchange', applyHeight, { passive: true });

  // Observe real footer height changes (e.g., language switch, dynamic year)
  if ('ResizeObserver' in window && inner) {
    try {
      const ro = new ResizeObserver(applyHeight);
      ro.observe(inner);
    } catch (_) {}
  }

  // Mutation changes inside footer (buttons, text)
  try {
    const mo = new MutationObserver(applyHeight);
    mo.observe(footer, { childList: true, subtree: true, characterData: true });
  } catch (_) {}

  // If the mobile overflow menu is toggled, do NOT expand reservation (it is absolute)
  const footToggle = document.getElementById('foot_toggle');
  if (footToggle) {
    footToggle.addEventListener('change', () => {
      // Re-apply height without counting the popover
      applyHeight();
    });
  }
})();
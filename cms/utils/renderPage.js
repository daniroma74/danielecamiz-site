// cms/utils/renderPage.js
import path from 'path';
import { getPageAssets } from './assetHelpers.js';

const DFLT_LAYOUT = 'layouts/base-frontend';

function dedupe(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean)));
}

function normalizeView(view) {
  let v = String(view || '').replace(/^[\\/]+/, '');
  if (!/^pages\//.test(v)) v = `pages/${v}`;
  // ensure no trailing .ejs (Express will add ext)
  return v.replace(/\.ejs$/i, '');
}

// Infer a stable pageKey from the view path unless explicitly provided
// 'pages/frontend/index' -> 'home'
// 'pages/news/index'     -> 'news-index'
// 'pages/news/detail'    -> 'news-detail'
function inferPageKey(view, explicit) {
  if (explicit) return explicit;
  const v = normalizeView(view);
  const parts = v.split('/');
  // expect: pages/<section>/<name>
  const section = parts[1] || '';
  const name = (parts[2] || '').toLowerCase();
  if (v === 'pages/frontend/index' || (section === 'frontend' && name === 'index')) return 'home';
  if (section && name) return `${section}-${name}`;
  return name || section || 'page';
}

export default function renderPageMiddleware(app) {
  return function renderPageAttach(req, res, next) {
    res.renderPage = function renderPage(view, locals = {}) {
      const normView = normalizeView(view);
      const layout   = locals.layout || DFLT_LAYOUT;
      const pageKey  = inferPageKey(normView, locals.pageKey);

      // Global CSS collected elsewhere (optional)
      const cssGlobal = Array.isArray(app?.locals?.cssGlobal) ? app.locals.cssGlobal : [];

      // Page assets from manifest (with filesystem fallback)
      const { styles: defStyles = [], scripts: defScripts = [] } = getPageAssets(pageKey);

      // Merge with any explicit overrides coming from the controller/route
      const pageStyles  = dedupe([ ...cssGlobal, ...(locals.pageStyles  || []), ...defStyles ]);
      const pageScripts = dedupe([                 ...(locals.pageScripts || []), ...defScripts ]);

      // Merge base locals and apply stable fallbacks so views never crash
      const base = { ...res.locals, ...locals };
      if (typeof base.homeData === 'undefined') base.homeData = { hero: {} };
      if (!Array.isArray(base.projects))        base.projects = [];
      if (!Array.isArray(base.newsTeaser))      base.newsTeaser = [];
      if (!Array.isArray(base.bandcampItems))   base.bandcampItems = [];
      if (!Array.isArray(base.videoItems))      base.videoItems = [];
      if (!Array.isArray(base.homeConcerts))    base.homeConcerts = [];
      if (!base.contactMini || typeof base.contactMini !== 'object') base.contactMini = {};

      // Trace minimal (view, layout, pageKey, counts) to help diagnostics
      console.log('[renderPage]', { view: normView, layout, pageKey, css: pageStyles.length, js: pageScripts.length });

      // Pass-through ALL locals (no filtering), plus consolidated assets
      const pass = { ...base, pageStyles, pageScripts, layout };

      // Single render: let express-ejs-layouts handle the layout
      return res.render(normView, pass);
    };

    next();
  };
}
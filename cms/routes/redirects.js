// cms/routes/redirects.js
// Redirects minimal-sicuri: niente catch-all che ingoia le rotte reali.

import { Router } from 'express';
const router = Router();

// Mappa redirect legacy specifici (aggiungi qui solo quelli davvero necessari)
const LEGACY_MAP = new Map([
  // esempi:
  ['/evento', '/concerts'],
  ['/eventi', '/concerts'],
  ['/concerti', '/concerts'],
  // aggiungi eventuali vecchi percorsi -> nuovi qui sopra
]);

// Middleware: applica solo redirect espliciti; mai toccare rotte reali
router.use((req, res, next) => {
  const p = req.path || '/';

  // 1) Se è un redirect puntuale noto → 301.
  if (LEGACY_MAP.has(p)) {
    return res.redirect(301, LEGACY_MAP.get(p));
  }

  // 2) Whitelist percorsi “reali” che non vanno mai toccati.
  //    (event/events, api, admin, assets, uploads, ecc.)
  if (/^\/(event|events|api|admin|assets|uploads|frontend|health|sitemap|privacy|terms|news|concerts|bio|contact|gallery|video)(\/|$)/.test(p)) {
    return next();
  }

  // 3) Default: non fare nulla. Lascia decidere agli altri router (o 404).
  return next();
});

export default router;
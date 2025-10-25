// cms/routes/langRoutes.js
import express from 'express';
const router = express.Router();

const SUPPORTED = new Set(['it', 'en']);

router.get('/:lng', (req, res) => {
  const lngRaw = (req.params.lng || '').toLowerCase();
  const lng = SUPPORTED.has(lngRaw) ? lngRaw : 'it';

  // Imposta cookie i18next (letto da i18next LanguageDetector)
  res.cookie('i18next', lng, {
    maxAge: 31536000000, // 1 anno
    httpOnly: false,
    sameSite: 'Lax',
    path: '/'
  });

  // Ritorna alla pagina chiamante aggiungendo/aggiornando ?lng=
  const ret = req.query.return || req.get('referer') || '/';
  try {
    const url = new URL(ret, `${req.protocol}://${req.get('host')}`);
    // imposta/aggiorna ?lng
    url.searchParams.set('lng', lng);
    return res.redirect(url.pathname + url.search + url.hash);
  } catch {
    // se URL non valido, fallback homepage
    const qs = `?lng=${lng}`;
    return res.redirect('/' + qs);
  }
});

export default router;

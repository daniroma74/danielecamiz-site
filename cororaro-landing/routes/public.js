// cororaro-landing/routes/public.js
// Routes per landing pages pubbliche (sottodomini dinamici)

import express from 'express';
import { Concert } from '../models/Concert.js';

const router = express.Router();

// ============================================
// PUBLIC LANDING PAGE
// ============================================
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const { concertSlug } = req;

  if (!concertSlug) {
    return res.status(404).send(`
      <h1>404 - Landing non trovata</h1>
      <p>Questo sottodominio non corrisponde a nessun concerto.</p>
      <p><a href="https://cororaro.it">Torna al sito principale</a></p>
    `);
  }

  try {
    const concert = Concert.findBySlug(db, concertSlug);

    if (!concert || !concert.is_published) {
      return res.status(404).send(`
        <h1>404 - Concerto non trovato</h1>
        <p>Il concerto "${concertSlug}" non esiste o non è più disponibile.</p>
        <p><a href="https://cororaro.it">Torna al sito principale</a></p>
      `);
    }

    // Parse gallery images
    if (concert.gallery_images) {
      try {
        concert.gallery_images = JSON.parse(concert.gallery_images);
      } catch (e) {
        concert.gallery_images = [];
      }
    }

    res.render('pages/landing', {
      title: concert.hero_title || concert.title,
      concert
    });
  } catch (error) {
    console.error('Error loading landing:', error);
    res.status(500).send('Errore nel caricamento della landing page');
  }
});

// Catch-all per altre route su landing pubbliche
router.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Pagina non trovata</h1>
    <p><a href="/">Torna alla landing</a></p>
  `);
});

export default router;

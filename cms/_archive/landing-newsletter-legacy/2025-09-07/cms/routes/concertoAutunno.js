import express from 'express';
const router = express.Router();

// Route per entrambi gli URL
router.get('/concerto-autunno', handleConcerto);
router.get('/', (req, res, next) => {
  // Solo per il sottodominio
  if (req.hostname === 'concerto-autunno2025.danielecamiz.com') {
    return handleConcerto(req, res);
  }
  next();
});

function handleConcerto(req, res) {
  res.render('pages/landing/concerto-autunno', {
    layout: false,
    title: 'Concerto d\'Autunno 2025 - ICNT'
  });
}

// Endpoint prenotazioni
router.post('/concerto-autunno/prenota', async (req, res) => {
  const { nome, email, telefono, newsletter } = req.body;
  
  try {
    const db = req.app.locals.db;
    await db.run(
      'INSERT INTO bookings (id, event_id, email, first_name, phone, newsletter_optin, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Date.now().toString(), '62', email, nome, telefono || '', newsletter ? 1 : 0, 'confirmed']
    );
    
    res.json({ success: true, message: 'Prenotazione confermata!' });
  } catch (err) {
    console.error('Errore prenotazione:', err);
    res.status(500).json({ success: false, message: 'Errore nella prenotazione' });
  }
});

// Route per il sottodominio
router.post('/prenota', (req, res, next) => {
  if (req.hostname === 'concerto-autunno2025.danielecamiz.com') {
    req.url = '/concerto-autunno/prenota';
    return router.handle(req, res, next);
  }
  next();
});

export default router;
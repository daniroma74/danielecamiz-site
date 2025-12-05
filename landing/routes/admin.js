// landing/routes/admin.js
import { Router } from 'express';
import { 
  renderDashboard,
  renderEditor, 
  renderEditorFromConcert,
  saveEvent, 
  renderBookings, 
  exportBookings,
  createEvent,
  deleteEvent,
  recalculateStats
} from '../controllers/adminController.js';
import { renderCheckin } from '../controllers/checkinController.js';
import { renderArchive, renderArchivedEvent, renderSnapshot } from '../controllers/archiveController.js';

const router = Router();

// Dashboard
router.get('/', renderDashboard);
router.get('/dashboard', renderDashboard);

// Archivio
router.get('/archive', renderArchive);
router.get('/archive/snapshot/:slug', renderSnapshot);  // Visualizza snapshot HTML
// router.get('/archive/:slug', renderArchivedEvent); // Non più usato - apre subdomain direttamente

// Editor
router.get('/editor', renderEditorFromConcert);
router.get('/edit/:slug', renderEditor);
router.post('/save/:slug', saveEvent);

// Eventi (deprecati)
router.get('/new-event', (req, res) => {
  res.send('Crea prima il concerto in Concerts Admin');
});
router.post('/create-event', createEvent);
router.post('/delete/:slug', deleteEvent);

// Prenotazioni
router.get('/bookings/:slug', renderBookings);
router.get('/bookings/:slug/export', exportBookings);

// Check-in
router.get('/checkin/:slug', renderCheckin);

// API
router.post('/api/recalculate-stats', recalculateStats);

export default router;
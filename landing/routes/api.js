// landing/routes/api.js
import { Router } from 'express';
import { 
  createBooking, 
  getBookings, 
  cancelBooking, 
  updateBooking,
  getBookingStats 
} from '../controllers/bookingController.js';
import { checkInBooking } from '../controllers/checkinController.js';

const router = Router();

// Prenotazioni
router.post('/booking/:slug', createBooking);
router.get('/booking/:slug', getBookings);
router.get('/booking/:slug/stats', getBookingStats);

// Gestione singola prenotazione
router.delete('/booking/cancel/:id', cancelBooking);
router.put('/booking/update/:id', updateBooking);

// Check-in
router.post('/checkin/:code', checkInBooking);

export default router;
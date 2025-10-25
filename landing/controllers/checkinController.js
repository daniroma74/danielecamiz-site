// landing/controllers/checkinController.js
import { getOne, queryDB, runDB } from '../config/database.js';

export async function renderCheckin(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = req.params.slug;
    
    const concert = await getOne(db, 'SELECT * FROM concerts WHERE slug = ?', [slug]);
    
    if (!concert) {
      return res.status(404).send('Evento non trovato');
    }
    
    const bookings = await queryDB(db,
      `SELECT id, first_name, last_name, email, seats, code, status, checked_in, checked_in_at
       FROM bookings 
       WHERE event_id = ? 
       ORDER BY first_name ASC`,
      [concert.id]
    );
    
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      checkedIn: bookings.filter(b => b.checked_in === 1).length,
      totalSeats: bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.seats, 0)
    };
    
    res.render('pages/admin/checkin', {
      event: concert,
      bookings,
      stats,
      title: `Check-in: ${concert.title}`
    });
    
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function checkInBooking(req, res) {
  try {
    const db = req.app.locals.db;
    const { code } = req.params;
    
    const booking = await getOne(db,
      'SELECT * FROM bookings WHERE code = ?',
      [code]
    );
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Prenotazione non trovata' 
      });
    }
    
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Prenotazione non valida' 
      });
    }
    
    if (booking.checked_in === 1) {
      return res.json({ 
        success: false, 
        message: 'Già effettuato check-in',
        alreadyCheckedIn: true
      });
    }
    
    await runDB(db,
      "UPDATE bookings SET checked_in = 1, checked_in_at = datetime('now') WHERE code = ?",
      [code]
    );
    
    res.json({ 
      success: true, 
      message: 'Check-in effettuato',
      booking: {
        name: `${booking.first_name} ${booking.last_name || ''}`.trim(),
        seats: booking.seats
      }
    });
    
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il check-in' 
    });
  }
}
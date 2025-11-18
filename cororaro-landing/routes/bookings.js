import express from 'express';
import crypto from 'crypto';
import { sendBookingConfirmation } from '../services/email.js';

const router = express.Router();

// ============================================
// CREATE BOOKING
// ============================================
router.post('/create', async (req, res) => {
  const db = req.app.locals.db;
  const {
    concert_id,
    first_name,
    last_name,
    email,
    phone,
    seats,
    notes,
    newsletter_optin
  } = req.body;

  // Validation
  if (!concert_id || !first_name || !last_name || !email || !seats) {
    return res.status(400).json({
      success: false,
      message: 'Compila tutti i campi obbligatori'
    });
  }

  try {
    // Check concert exists
    const concert = db.prepare('SELECT * FROM concerts WHERE id = ? AND is_published = 1').get(concert_id);
    if (!concert) {
      return res.status(404).json({
        success: false,
        message: 'Concerto non trovato'
      });
    }

    // Generate unique booking code
    const booking_code = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Create booking
    const result = db.prepare(`
      INSERT INTO concert_bookings (
        concert_id, booking_code, first_name, last_name, email, phone,
        seats, notes, newsletter_optin, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).run(
      concert_id,
      booking_code,
      first_name,
      last_name,
      email,
      phone || null,
      seats,
      notes || null,
      newsletter_optin ? 1 : 0
    );

    // If newsletter opt-in, add to newsletter table
    if (newsletter_optin) {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO concert_newsletter (email, first_name, last_name, optin_source, optin_concert_id)
          VALUES (?, ?, ?, 'booking', ?)
        `).run(email, first_name, last_name, concert_id);
      } catch (e) {
        console.error('Error adding to newsletter:', e);
        // Non-blocking error
      }
    }

    // Get complete booking
    const booking = db.prepare(`
      SELECT b.*, c.title, c.date, c.time, c.location
      FROM concert_bookings b
      JOIN concerts c ON c.id = b.concert_id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);

    // Send confirmation email
    try {
      await sendBookingConfirmation(booking);
      db.prepare('UPDATE concert_bookings SET confirmation_sent = 1 WHERE id = ?').run(booking.id);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Booking is still created even if email fails
    }

    res.json({
      success: true,
      message: 'Prenotazione confermata!',
      booking_code: booking_code,
      booking: booking
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione della prenotazione'
    });
  }
});

// ============================================
// GET BOOKING BY CODE
// ============================================
router.get('/:code', (req, res) => {
  const db = req.app.locals.db;
  const { code } = req.params;

  try {
    const booking = db.prepare(`
      SELECT b.*, c.title, c.date, c.time, c.location
      FROM concert_bookings b
      JOIN concerts c ON c.id = b.concert_id
      WHERE b.booking_code = ?
    `).get(code);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Prenotazione non trovata'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della prenotazione'
    });
  }
});

// ============================================
// CANCEL BOOKING
// ============================================
router.post('/:code/cancel', (req, res) => {
  const db = req.app.locals.db;
  const { code } = req.params;

  try {
    const result = db.prepare(`
      UPDATE concert_bookings
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
      WHERE booking_code = ? AND status = 'confirmed'
    `).run(code);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prenotazione non trovata o già cancellata'
      });
    }

    res.json({
      success: true,
      message: 'Prenotazione cancellata con successo'
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella cancellazione'
    });
  }
});

export default router;

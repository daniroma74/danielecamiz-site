// landing/controllers/bookingController.js
import { getOne, queryDB, runDB } from '../config/database.js';
import { sendBookingConfirmation } from '../services/emailService.js';

export async function createBooking(req, res) {
  const slug = req.params.slug;
  const { 
    first_name, last_name, email, phone, seats, note, 
    language, privacy_consent, newsletter_consent 
  } = req.body;
  
  if (!first_name || !email || !seats || !privacy_consent) {
    return res.status(400).json({ 
      success: false, 
      message: 'Campi obbligatori mancanti o consenso privacy non fornito' 
    });
  }
  
  try {
    const db = req.app.locals.db;
    
    const concert = await getOne(db, 
      'SELECT id, title, subtitle, date, starts_at, location, max_capacity FROM concerts WHERE slug = ? AND is_future = 1',
      [slug]
    );
    
    if (!concert) {
      return res.status(404).json({ success: false, message: 'Evento non trovato' });
    }
    
    const landingSettings = await getOne(db,
      'SELECT booking_enabled, venue_capacity FROM landing_settings WHERE concert_id = ?',
      [concert.id]
    );
    
    if (landingSettings && landingSettings.booking_enabled === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Le prenotazioni per questo evento sono chiuse' 
      });
    }
    
    // Controllo capienza massima - usa venue_capacity se presente, altrimenti max_capacity
    const currentBookings = await getOne(db,
      'SELECT COALESCE(SUM(seats), 0) as total FROM bookings WHERE event_id = ? AND status = "confirmed"',
      [concert.id]
    );
    
    const maxCapacity = landingSettings?.venue_capacity || concert.max_capacity || 200;
    const requestedSeats = parseInt(seats);
    
    if (currentBookings.total + requestedSeats > maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Spiacenti, rimangono solo ${maxCapacity - currentBookings.total} posti disponibili`
      });
    }
    
    const bookingCode = `${slug.substring(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const bookingId = `${concert.id}-${Date.now()}`;
    
    await runDB(db, `
      INSERT INTO bookings (
        id, event_id, code, email, first_name, last_name, phone, seats, 
        note, status, language, privacy_consent, newsletter_consent, 
        booking_source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, 'landing', datetime('now'))
    `, [
      bookingId, String(concert.id), bookingCode, email, first_name, last_name || '', 
      phone || '', requestedSeats, note || '', language || 'it', 
      privacy_consent ? 1 : 0, newsletter_consent ? 1 : 0
    ]);
    
    if (newsletter_consent) {
      try {
        const contactName = last_name ? `${first_name} ${last_name}` : first_name;
        
        const existingContact = await getOne(db,
          'SELECT id, status FROM contacts WHERE email = ?',
          [email]
        );
        
        let contactId;
        
        if (existingContact) {
          contactId = existingContact.id;
          
          if (existingContact.status === 'unsubscribed') {
            await runDB(db,
              'UPDATE contacts SET status = "subscribed", subscribed_at = datetime("now") WHERE id = ?',
              [contactId]
            );
          }
        } else {
          const result = await runDB(db, `
            INSERT INTO contacts (email, name, source, status, subscribed_at, created_at, updated_at)
            VALUES (?, ?, 'booking', 'subscribed', datetime('now'), datetime('now'), datetime('now'))
          `, [email, contactName]);
          
          contactId = result.lastID;
        }
        
        await runDB(db,
          'UPDATE bookings SET contact_id = ? WHERE id = ?',
          [contactId, bookingId]
        );
        
        const newsletterList = await getOne(db,
          'SELECT id FROM lists WHERE slug = "newsletter"'
        );
        
        if (newsletterList) {
          await runDB(db, `
            INSERT OR IGNORE INTO list_subscriptions (list_id, contact_id, created_at)
            VALUES (?, ?, datetime('now'))
          `, [newsletterList.id, contactId]);
        }
        
      } catch (newsletterError) {
        console.error('Newsletter subscription error:', newsletterError);
      }
    }
    
    // Invio email con QR Code
    try {
      await sendBookingConfirmation(
        {
          email,
          first_name,
          last_name: last_name || '',
          booking_code: bookingCode,
          seats: requestedSeats,
          event_id: String(concert.id),
          language: language || 'it'
        },
        {
          title: concert.title,
          subtitle: concert.subtitle,
          date: concert.date,
          starts_at: concert.starts_at || '20:00',
          location: concert.location,
          slug
        }
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    
    // Calcola posti rimanenti
    const remainingSeats = maxCapacity - (currentBookings.total + requestedSeats);
    
    res.json({ 
      success: true, 
      bookingCode,
      message: 'Prenotazione confermata',
      remainingSeats
    });
    
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante la prenotazione' 
    });
  }
}

export async function getBookings(req, res) {
  const slug = req.params.slug;
  
  try {
    const db = req.app.locals.db;
    
    const concert = await getOne(db, 'SELECT id FROM concerts WHERE slug = ?', [slug]);
    if (!concert) {
      return res.status(404).json({ success: false, message: 'Evento non trovato' });
    }
    
    const bookings = await queryDB(db, `
      SELECT * FROM bookings 
      WHERE event_id = ? AND status = 'confirmed'
      ORDER BY created_at DESC
    `, [concert.id]);
    
    res.json({ success: true, bookings });
    
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Errore caricamento prenotazioni' });
  }
}

export async function cancelBooking(req, res) {
  console.log('=== CANCEL BOOKING START ===');
  console.log('ID ricevuto:', req.params.id);
  
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    console.log('Cerco prenotazione con ID:', id);
    
    const booking = await getOne(db, 
      'SELECT * FROM bookings WHERE id = ?', 
      [id]
    );
    
    console.log('Prenotazione trovata:', booking);
    
    if (!booking) {
      console.log('Prenotazione NON trovata');
      return res.status(404).json({ success: false, message: 'Prenotazione non trovata' });
    }
    
    console.log('Eseguo UPDATE per cancellare...');
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
        [id],
        function(err) {
          if (err) {
            console.error('ERRORE UPDATE:', err);
            reject(err);
          } else {
            console.log('UPDATE OK - Changes:', this.changes);
            resolve(this.changes);
          }
        }
      );
    });
    
    console.log('Cancellazione completata con successo');
    res.json({ success: true, message: 'Prenotazione cancellata' });
    
  } catch (error) {
    console.error('=== ERRORE CANCEL BOOKING ===');
    console.error('Tipo errore:', error.constructor.name);
    console.error('Messaggio:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Errore cancellazione prenotazione',
      error: error.toString()
    });
  }
}

export async function updateBooking(req, res) {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { seats, note, status } = req.body;
    
    const booking = await getOne(db, 
      'SELECT * FROM bookings WHERE id = ?', 
      [id]
    );
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Prenotazione non trovata' });
    }
    
    await queryDB(db, `
      UPDATE bookings 
      SET seats = ?, note = ?, status = ?
      WHERE id = ?
    `, [seats || booking.seats, note || booking.note, status || booking.status, id]);
    
    res.json({ success: true, message: 'Prenotazione aggiornata' });
    
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, message: error.message || 'Errore aggiornamento prenotazione' });
  }
}

export async function getBookingStats(req, res) {
  try {
    const db = req.app.locals.db;
    const { slug } = req.params;
    
    const concert = await getOne(db, 
      'SELECT id, max_capacity FROM concerts WHERE slug = ?', 
      [slug]
    );
    
    if (!concert) {
      return res.status(404).json({ success: false, message: 'Evento non trovato' });
    }
    
    const landingSettings = await getOne(db,
      'SELECT venue_capacity FROM landing_settings WHERE concert_id = ?',
      [concert.id]
    );
    
    const stats = await getOne(db, `
      SELECT 
        COUNT(*) as total_bookings,
        COALESCE(SUM(seats), 0) as total_seats,
        COALESCE(SUM(CASE WHEN checked_in = 1 THEN seats ELSE 0 END), 0) as checked_in_seats
      FROM bookings 
      WHERE event_id = ? AND status = 'confirmed'
    `, [concert.id]);
    
    const maxCapacity = landingSettings?.venue_capacity || concert.max_capacity || 200;
    const remainingSeats = maxCapacity - (stats?.total_seats || 0);
    
    res.json({
      success: true,
      stats: {
        ...stats,
        max_capacity: maxCapacity,
        remaining_seats: remainingSeats,
        fill_percentage: Math.round((stats.total_seats / maxCapacity) * 100)
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Errore caricamento statistiche' });
  }
}
import { getOne, queryDB, runDB } from '../config/database.js';

export class Booking {
  static async create(db, data) {
    const token = Date.now().toString(36) + Math.random().toString(36);
    
    return await runDB(db, `
      INSERT INTO bookings (id, event_id, email, first_name, phone, seats, status, created_at, newsletter_consent)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'), ?)
    `, [token, data.event_id, data.email, data.name, 
        data.phone || '', data.seats, data.newsletter_consent ? 1 : 0]);
  }
  
  static async findByToken(db, token) {
    return await getOne(db, 'SELECT * FROM bookings WHERE id = ?', [token]);
  }
  
  static async findByEvent(db, eventId) {
    return await queryDB(db, `
      SELECT * FROM bookings 
      WHERE event_id = ? 
      ORDER BY created_at DESC
    `, [eventId]);
  }
  
  static async cancel(db, token) {
    return await runDB(db, `
      UPDATE bookings 
      SET status = 'cancelled', cancelled_at = datetime('now')
      WHERE id = ?
    `, [token]);
  }
  
  static async checkin(db, token) {
    return await runDB(db, `
      UPDATE bookings 
      SET checked_in = 1, checked_in_at = datetime('now')
      WHERE id = ?
    `, [token]);
  }
}
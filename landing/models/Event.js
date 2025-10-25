import { getOne, queryDB, runDB } from '../config/database.js';

export class Event {
  static async findBySlug(db, slug) {
    return await getOne(db, `
      SELECT c.*, ls.*,
             (SELECT COALESCE(SUM(seats), 0) FROM bookings 
              WHERE event_id = c.id AND status != 'cancelled') as booking_count
      FROM concerts c
      LEFT JOIN landing_settings ls ON ls.concert_id = c.id
      WHERE c.slug = ?
    `, [slug]);
  }
  
  static async findAll(db) {
    return await queryDB(db, `
      SELECT c.*, 
             (SELECT COALESCE(SUM(seats), 0) FROM bookings 
              WHERE event_id = c.id AND status != 'cancelled') as booking_count
      FROM concerts c
      ORDER BY c.date DESC
    `);
  }
  
  static async create(db, data) {
    return await runDB(db, `
      INSERT INTO concerts (slug, title, date, location, max_capacity, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [data.slug, data.title, data.date, data.location, data.max_capacity || 200]);
  }
  
  static async update(db, slug, data) {
    return await runDB(db, `
      UPDATE concerts 
      SET title = ?, subtitle = ?, location = ?, 
          description_short = ?, description_html = ?, 
          max_capacity = ?, updated_at = datetime('now')
      WHERE slug = ?
    `, [data.title, data.subtitle, data.location, 
        data.description_short, data.description_html, 
        data.max_capacity, slug]);
  }
}
// cms/routes/api/repertoireApi.js  
import express from 'express';
import { initDatabase } from '../../utils/utils.js';

const router = express.Router();

// Search works API endpoint
router.get('/search', async (req, res) => {
    try {
        const db = await initDatabase();
        const { q, composer, category } = req.query;
        const lang = req.language || 'it';
        
        let sql = `
            SELECT w.*, c.full_name as composer_name, 
                   cat.label_${lang} as category_name,
                   COUNT(DISTINCT cp.concert_id) as performance_count
            FROM works w
            JOIN composers c ON w.composer_id = c.id
            LEFT JOIN categories cat ON w.category_id = cat.id
            LEFT JOIN concert_program cp ON cp.work_id = w.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (q) {
            sql += ` AND (w.title LIKE ? OR w.subtitle LIKE ? OR c.full_name LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        
        if (composer) {
            sql += ` AND w.composer_id = ?`;
            params.push(composer);
        }
        
        if (category) {
            sql += ` AND w.category_id = ?`;
            params.push(category);
        }
        
        sql += ` GROUP BY w.id ORDER BY c.sort_key, w.title`;
        
        const works = await new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
        });
        
        res.json({ success: true, works });
    } catch (error) {
        console.error('API Repertoire search error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get work details  
router.get('/work/:id', async (req, res) => {
    try {
        const db = await initDatabase();
        const { id } = req.params;
        const lang = req.language || 'it';
        
        // Get work details
        const work = await new Promise((resolve, reject) => {
            db.get(`
                SELECT w.*, c.full_name as composer_name, 
                       cat.label_${lang} as category_name
                FROM works w
                JOIN composers c ON w.composer_id = c.id
                LEFT JOIN categories cat ON w.category_id = cat.id
                WHERE w.id = ?
            `, [id], (err, row) => err ? reject(err) : resolve(row));
        });
        
        if (!work) {
            return res.status(404).json({ success: false, error: 'Brano non trovato' });
        }
        
        // Get performances
        const performances = await new Promise((resolve, reject) => {
            db.all(`
                SELECT c.id, c.title, c.date, c.location
                FROM concert_program cp
                JOIN concerts c ON c.id = cp.concert_id
                WHERE cp.work_id = ?
                ORDER BY c.date DESC
            `, [id], (err, rows) => err ? reject(err) : resolve(rows || []));
        });
        
        res.json({ success: true, work, performances });
    } catch (error) {
        console.error('API Work details error:', error);
        res.json({ success: false, error: error.message });
    }
});

export default router;
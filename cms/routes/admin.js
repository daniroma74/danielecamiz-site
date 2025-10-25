import { Router } from 'express';
const router = Router();

// Admin disattivato temporaneamente per evitare handler non-funzione.
// Quando vorrai riattivarlo sistemiamo i controller e ripristiniamo il backup.
router.use((req, res) => res.status(404).render('404'));

export default router;
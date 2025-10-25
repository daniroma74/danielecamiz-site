// cms/routes/contactRoutes.js
import { Router } from 'express';
import { getContactPage } from '../controllers/contactController.js';

const router = Router();

/* Se montato su "/" */
router.get('/contact',      getContactPage);
router.get('/it/contact', (req, res, next) => { res.locals.lang = 'it'; return getContactPage(req, res, next); });
router.get('/en/contact', (req, res, next) => { res.locals.lang = 'en'; return getContactPage(req, res, next); });

/* Se montato su "/contact" */
router.get('/',     getContactPage); // -> /contact
router.get('/it', (req, res, next) => { res.locals.lang = 'it'; return getContactPage(req, res, next); }); // -> /contact/it
router.get('/en', (req, res, next) => { res.locals.lang = 'en'; return getContactPage(req, res, next); }); // -> /contact/en

export default router;

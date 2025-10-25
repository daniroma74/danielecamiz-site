import { Router } from 'express';
import { renderLanding } from '../controllers/eventController.js';

const router = Router();

router.get('/', renderLanding);

export default router;
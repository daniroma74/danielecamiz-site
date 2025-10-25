// cms/routes/admin/eventsRoutes.js
import { Router } from 'express';
import {
  list,
  getEventEditPage,
  getNewEventPage,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventStatus,
  // Programma
  programList,
  programCreate,
  programUpdate,
  programDelete,
  programReorder,
  // Assegnazioni
  assignmentsList,
  assignmentsCreate,
  assignmentsUpdate,
  assignmentsDelete,
  assignmentsPrincipal,
  // Poster
  posterUpdate,
  // Landing
  landingGet,
  landingSave,
  // Lookups
  lookupArtists,
  lookupInstruments,
} from '../../controllers/admin/eventsController.js';

const router = Router();

// ===== Pagine HTML =====
router.get('/', list);                           // Lista eventi
router.get('/new', getNewEventPage);             // Form nuovo evento
router.post('/new', createEvent);                // Crea evento
router.get('/:eventId/edit', getEventEditPage);  // Form modifica
router.post('/:eventId/edit', updateEvent);      // Salva modifiche
router.post('/:eventId/delete', deleteEvent);    // Elimina
router.post('/:eventId/status', setEventStatus); // Cambia stato

// ===== Programma: CRUD + reorder =====
router.get('/:eventId/program', programList);
router.post('/:eventId/program', programCreate);
router.put('/program/:itemId', programUpdate);
router.delete('/program/:itemId', programDelete);
router.post('/:eventId/program/reorder', programReorder);

// ===== Assegnazioni: CRUD + flag principal =====
router.get('/:eventId/assignments', assignmentsList);
router.post('/:eventId/assignments', assignmentsCreate);
router.put('/assignments/:assignId', assignmentsUpdate);
router.delete('/assignments/:assignId', assignmentsDelete);
router.post('/assignments/:assignId/principal', assignmentsPrincipal);

// ===== Poster =====
router.post('/:eventId/poster', posterUpdate);

// ===== Landing =====
router.get('/:eventId/landing', landingGet);
router.post('/:eventId/landing', landingSave);

// ===== Lookups (autocomplete) =====
router.get('/lookup/artists', lookupArtists);
router.get('/lookup/instruments', lookupInstruments);

export default router;
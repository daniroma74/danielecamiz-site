// server/landingMount.js
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import eventsRoutes from './routes/eventsRoutes.js';
import bookingsRoutes from './routes/bookingsRoutes.js';
import redirectsRoutes from './routes/redirects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function mountLanding(app){
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
  app.use(eventsRoutes);
  app.use(bookingsRoutes);
  app.use(redirectsRoutes);
}

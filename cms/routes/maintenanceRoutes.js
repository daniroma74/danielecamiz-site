import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { requireAuth } from './authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const maintenanceFile = path.join(__dirname, '..', 'config', 'maintenance.json');

const router = express.Router();

// GET stato manutenzione globale
router.get('/api/maintenance/global', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile(maintenanceFile, 'utf8');
    const config = JSON.parse(data);
    res.json({ enabled: !!config.global });
  } catch (e) {
    res.status(500).json({ error: 'Errore caricando stato manutenzione' });
  }
});

// POST modifica manutenzione globale
router.post('/api/maintenance/global', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile(maintenanceFile, 'utf8');
    const config = JSON.parse(data);
    config.global = req.body.enabled === true;
    await fs.writeFile(maintenanceFile, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Errore salvando stato manutenzione' });
  }
});

// GET stato manutenzione pagina specifica
router.get('/api/maintenance/pages/:pageName', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile(maintenanceFile, 'utf8');
    const config = JSON.parse(data);
    const pageStatus = !!(config.pages && config.pages[req.params.pageName]);
    res.json({ enabled: pageStatus });
  } catch (e) {
    res.status(500).json({ error: 'Errore caricando stato manutenzione pagina' });
  }
});

// POST toggle manutenzione pagina specifica
router.post('/api/maintenance/pages/:pageName/toggle', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile(maintenanceFile, 'utf8');
    const config = JSON.parse(data);
    if (!config.pages) config.pages = {};
    const page = req.params.pageName;
    // Se undefined o false -> true, se true -> false
    config.pages[page] = !config.pages[page];
    await fs.writeFile(maintenanceFile, JSON.stringify(config, null, 2));
    res.json({ success: true, page, enabled: config.pages[page] });
  } catch (e) {
    res.status(500).json({ error: 'Errore salvando stato manutenzione pagina' });
  }
});

export default router;
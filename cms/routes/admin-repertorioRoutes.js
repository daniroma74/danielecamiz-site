import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE_PATH = path.join(__dirname, '../data/repertorio.json');

router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json({ it: '', en: '' }); // default vuoto
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    await fs.writeFile(FILE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Errore nel salvataggio repertorio' });
  }
});

export default router;
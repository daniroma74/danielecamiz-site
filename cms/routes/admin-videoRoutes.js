import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEO_FILE = path.join(__dirname, '..', 'data', 'video.json');

// Leggi lista video
router.get('/', (req, res) => {
  fs.readFile(VIDEO_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Impossibile leggere video.json' });
    try {
      const videos = JSON.parse(data);
      res.json(videos);
    } catch {
      res.status(500).json({ error: 'Formato video.json non valido' });
    }
  });
});

// Aggiungi o modifica video
router.post('/', (req, res) => {
  const newVideo = req.body;
  fs.readFile(VIDEO_FILE, 'utf8', (err, data) => {
    let videos = [];
    if (!err) {
      try {
        videos = JSON.parse(data);
      } catch {
        return res.status(500).json({ error: 'Formato video.json non valido' });
      }
    }
    // Se id esiste modifica, altrimenti aggiungi
    if(newVideo.id) {
      const idx = videos.findIndex(v => v.id === newVideo.id);
      if(idx !== -1) videos[idx] = newVideo;
      else videos.push(newVideo);
    } else {
      newVideo.id = Date.now().toString();
      videos.push(newVideo);
    }
    fs.writeFile(VIDEO_FILE, JSON.stringify(videos, null, 2), err => {
      if(err) return res.status(500).json({ error: 'Errore nel salvataggio' });
      res.json({ success: true, video: newVideo });
    });
  });
});

// Elimina video
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  fs.readFile(VIDEO_FILE, 'utf8', (err, data) => {
    if(err) return res.status(500).json({ error: 'Errore lettura video.json' });
    let videos;
    try {
      videos = JSON.parse(data);
    } catch {
      return res.status(500).json({ error: 'Formato video.json non valido' });
    }
    videos = videos.filter(v => v.id !== id);
    fs.writeFile(VIDEO_FILE, JSON.stringify(videos, null, 2), err => {
      if(err) return res.status(500).json({ error: 'Errore scrittura video.json' });
      res.json({ success: true });
    });
  });
});

export default router;
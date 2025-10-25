// danielecamiz-site/server.js
// Coming soon: server minimale e robusto

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// cartella del frontend con comingsoon.html e assets
const frontendDir = path.join(__dirname, '../frontend');

// statici (css/js/img) con cache leggera
app.use('/css', express.static(path.join(frontendDir, 'css'), { maxAge: '1h' }));
app.use('/js', express.static(path.join(frontendDir, 'js'), { maxAge: '1h' }));
app.use('/img', express.static(path.join(frontendDir, 'img'), { maxAge: '1h' }));

// pagina principale
app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'comingsoon.html'));
});

// healthcheck per Nginx/Cloudflare
app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'coming-soon', ts: Date.now() });
});

// 404 minimale (resta su coming soon)
app.use((_req, res) => {
  res.status(404).sendFile(path.join(frontendDir, 'comingsoon.html'));
});

// avvio
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Coming soon attiva su http://localhost:${PORT}`);
});

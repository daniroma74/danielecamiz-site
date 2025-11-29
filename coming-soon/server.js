import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Static HTML
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daniele Camiz - Baritono | Coming Soon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 600px;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      font-weight: 300;
      letter-spacing: 2px;
    }
    h2 {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      color: #d4af37;
      font-weight: 300;
    }
    p {
      font-size: 1.1rem;
      line-height: 1.8;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .email {
      display: inline-block;
      padding: 15px 30px;
      background: rgba(212, 175, 55, 0.1);
      border: 2px solid #d4af37;
      color: #d4af37;
      text-decoration: none;
      border-radius: 5px;
      transition: all 0.3s;
      font-size: 1.1rem;
    }
    .email:hover {
      background: #d4af37;
      color: #1a1a2e;
    }
    @media (max-width: 768px) {
      h1 { font-size: 2rem; }
      h2 { font-size: 1.2rem; }
      p { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Daniele Camiz</h1>
    <h2>Baritono</h2>
    <p>
      Il nuovo sito è attualmente in costruzione.<br>
      A breve sarà online con tutti i contenuti aggiornati.
    </p>
    <p>
      <a href="mailto:info@danielecamiz.com" class="email">info@danielecamiz.com</a>
    </p>
  </div>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Coming soon page attiva su http://localhost:${PORT}`);
});

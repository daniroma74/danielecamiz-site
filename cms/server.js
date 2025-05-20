
// 🚀 Test deploy con mongodb correttamente inclusoconst express = require('express');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://admin:bIVzZzyxep0dvANr@cluster0.xrs3l1h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);
let db;

client.connect().then(() => {
  db = client.db("danieleCMS");
  console.log("✅ Connesso a MongoDB Atlas");
}).catch(err => {
  console.error("❌ Errore connessione MongoDB:", err);
});

const app = express();
app.use(express.json());
app.use(fileUpload());

// === Percorsi ===
const dataDir = path.join(__dirname, 'data');
const backupDir = path.join(__dirname, 'backups');
const adminDir = path.join(__dirname, 'admin');
const frontendDir = path.join(__dirname, '../frontend');
const galleryDir = path.join(frontendDir, 'img/galleria');
const coversDir = path.join(galleryDir, 'covers');
const locandineDir = path.join(frontendDir, 'img/locandine');

// === Static ===
app.use('/frontend', express.static(frontendDir));
app.use('/admin', express.static(adminDir));
app.use('/img', express.static(path.join(frontendDir, 'img')));

// === CORS ===
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// === Utility SEO ===
function toSEOFriendly(str) {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function isSEOName(filename) {
  return /^[a-z0-9\-]+\.(jpg|jpeg|png|gif)$/i.test(filename);
}

// === API GENERICHE ===
function genericAPI(resourceName) {
  const filePath = path.join(dataDir, `${resourceName}.json`);
  app.get(`/api/${resourceName}`, (req, res) => res.sendFile(filePath));
  app.post(`/api/${resourceName}`, (req, res) => {
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${resourceName}-${timestamp}.json`);
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), err => {
      if (err) return res.status(500).json({ error: `Errore salvataggio ${resourceName}` });
      console.log(`✅ ${resourceName}.json salvato`);
      res.json({ success: true });
    });
  });
}

genericAPI('bio');
genericAPI('galleria');

// === API concerti su MongoDB ===
app.get('/api/concerti', async (req, res) => {
  try {
    const concerti = await db.collection('concerti').find().toArray();
    res.json(concerti);
  } catch (err) {
    console.error("Errore lettura concerti:", err);
    res.status(500).json({ error: 'Errore lettura concerti' });
  }
});

app.post('/api/concerti', async (req, res) => {
  const array = req.body;
  if (!Array.isArray(array)) return res.status(400).json({ error: 'Formato non valido' });

  try {
    await db.collection('concerti').deleteMany({});
    await db.collection('concerti').insertMany(array);
    console.log("✅ Concerti salvati su MongoDB");
    res.json({ success: true });
  } catch (err) {
    console.error("Errore salvataggio concerti:", err);
    res.status(500).json({ error: 'Errore salvataggio' });
  }
});

// === UPLOAD LOCANDINA ===
app.post('/upload/locandina', (req, res) => {
  if (!req.files?.file) return res.status(400).json({ error: 'Nessun file ricevuto.' });

  const file = req.files.file;
  const titolo = (req.body.titolo || 'concerto').toLowerCase();
  const data = req.body.data || 'data';
  const luogo = (req.body.luogo || 'luogo').toLowerCase();

  const nomeFileBase = `${data}-${luogo}-${titolo}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const estensione = path.extname(file.name).toLowerCase();
  const fileName = `${nomeFileBase}${estensione}`;
  const filePath = path.join(locandineDir, fileName);

  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'File già esistente.' });

  file.mv(filePath, err => {
    if (err) return res.status(500).json({ error: 'Errore salvataggio.' });
    res.json({ path: `img/locandine/${fileName}` });
  });
});

// === DELETE LOCANDINA ===
app.post('/delete-locandina', (req, res) => {
  const fileName = req.body.filename;
  if (!fileName) return res.status(400).json({ error: 'Nome file mancante.' });

  const filePath = path.join(locandineDir, fileName);
  fs.unlink(filePath, err => {
    if (err && err.code !== 'ENOENT') return res.status(500).json({ error: 'Errore eliminazione.' });
    res.json({ success: true });
  });
});

// === UPLOAD IMMAGINI GALLERIA ===
app.post('/upload/galleria', (req, res) => {
  if (!req.files?.file || !req.body.categoria) {
    return res.status(400).json({ error: 'Dati mancanti.' });
  }

  const file = req.files.file;
  const categoria = req.body.categoria.trim();
  const titolo = req.body.titolo?.trim() || '';
  const didascalia = req.body.didascalia?.trim() || '';
  const baseName = titolo || didascalia || path.parse(file.name).name;
  const seoBase = toSEOFriendly(baseName);
  const ext = path.extname(file.name).toLowerCase();
  const finalName = isSEOName(file.name) ? file.name : `${Date.now()}-${seoBase}${ext}`;

  const destDir = path.join(galleryDir, categoria);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, finalName);
  file.mv(destPath, err => {
    if (err) return res.status(500).json({ error: 'Errore salvataggio immagine.' });
    res.json({
      path: `img/galleria/${categoria}/${finalName}`,
      filename: finalName,
      originale: file.name,
      suggerito: isSEOName(file.name) ? null : finalName
    });
  });
});

// === UPLOAD COPERTINA GALLERIA ===
app.post('/upload/copertina', (req, res) => {
  if (!req.files?.file || !req.body.categoria) {
    return res.status(400).json({ error: 'File o categoria mancante.' });
  }

  const file = req.files.file;
  const categoria = req.body.categoria.toLowerCase();
  const timestamp = Date.now();
  const filename = `cover-${categoria}-${timestamp}${path.extname(file.name)}`;
  const filepath = path.join(coversDir, filename);

  file.mv(filepath, err => {
    if (err) return res.status(500).json({ error: 'Errore salvataggio copertina.' });

    const galleriaPath = path.join(dataDir, 'galleria.json');
    const galleriaData = JSON.parse(fs.readFileSync(galleriaPath, 'utf8'));

    const index = galleriaData.findIndex(g => g.categoria === categoria);
    if (index !== -1) {
      galleriaData[index].cover = `covers/${filename}`;
      fs.writeFileSync(galleriaPath, JSON.stringify(galleriaData, null, 2), 'utf8');
      return res.json({ success: true, path: `covers/${filename}` });
    } else {
      return res.status(404).json({ error: 'Galleria non trovata.' });
    }
  });
});

// === ROOT ===
app.use('/', express.static(frontendDir));

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server CMS avviato su http://localhost:${PORT}`);
});
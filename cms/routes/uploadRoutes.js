import express from 'express';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Paths (all relative to cms/)
const CMS_ROOT       = path.join(__dirname, '..');
const UPLOADS_ROOT   = path.join(CMS_ROOT, 'uploads');                 // cms/uploads
const NEWS_COVERS    = path.join(UPLOADS_ROOT, 'news_covers');         // cms/uploads/news_covers
const FRONTEND_DIR   = path.join(CMS_ROOT, 'frontend');                // legacy (locandine)
const LOCANDINE_DIR  = path.join(FRONTEND_DIR, 'img', 'locandine');    // legacy

// ============== helpers ==============
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
function safeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}
function getExtFromMime(mime = '') {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg' : '.jpg',
    'image/png' : '.png',
    'image/webp': '.webp'
  };
  return map[mime] || '.jpg';
}
function withoutExt(p){ return p.replace(/\.[^.]+$/, ''); }
function toPosix(p){ return p.split(path.sep).join(path.posix.sep); }

// Lazy load sharp (graceful fallback if not installed)
let _sharp = null;
async function getSharp() {
  if (_sharp) return _sharp;
  try {
    const mod = await import('sharp');
    _sharp = mod.default || mod; // ESM/CJS interop
    return _sharp;
  } catch (e) {
    return null; // not installed
  }
}

const VAR_WIDTHS = [480, 768, 1024, 1200];
const MINI_WIDTH = 24; // LQIP width
const SIZES_ATTR = '(max-width: 600px) 100vw, (max-width: 1024px) 90vw, 1200px';

async function generateVariants(absSrc, absDir, baseName, overwrite = true) {
  const sharp = await getSharp();
  if (!sharp) return { created: [], srcset: '', sizes: SIZES_ATTR, warning: 'sharp_not_installed' };

  const created = [];
  for (const w of VAR_WIDTHS) {
    const outPath = path.join(absDir, `${baseName}-${w}.webp`);
    if (!overwrite && fs.existsSync(outPath)) {
      created.push({ w, path: outPath, skipped: true });
      continue;
    }
    try {
      await sharp(absSrc).resize({ width: w }).webp({ quality: 82 }).toFile(outPath);
      created.push({ w, path: outPath, skipped: false });
    } catch (e) {
      // continue generating others
      created.push({ w, path: outPath, error: true });
    }
  }

  // LQIP (blur-up) very small variant
  let lqipPath = path.join(absDir, `${baseName}-${MINI_WIDTH}.webp`);
  try {
    if (overwrite || !fs.existsSync(lqipPath)) {
      await sharp(absSrc).resize({ width: MINI_WIDTH }).webp({ quality: 60 }).toFile(lqipPath);
    }
  } catch (_) {
    lqipPath = null; // ignore errors, LQIP optional
  }

  // Build srcset (posix URLs)
  const relBaseDir = toPosix(path.relative(CMS_ROOT, absDir)); // e.g. uploads/news_covers/2025/slug
  const srcset = created
    .filter(c => c && fs.existsSync(c.path) && !c.error)
    .map(c => `/${toPosix(path.join(relBaseDir, `${baseName}-${c.w}.webp`))} ${c.w}w`)
    .join(', ');

  let lqipUrl = '';
  let lqipDataUri = '';
  if (lqipPath && fs.existsSync(lqipPath)) {
    lqipUrl = `/${toPosix(path.join(relBaseDir, `${baseName}-${MINI_WIDTH}.webp`))}`;
    try {
      const b = fs.readFileSync(lqipPath);
      const b64 = b.toString('base64');
      lqipDataUri = `data:image/webp;base64,${b64}`;
    } catch (_) {}
  }

  return { created, srcset, sizes: SIZES_ATTR, lqipUrl, lqipDataUri };
}

function buildResponsePayload(destDir, destName, year, slug, variantsInfo) {
  const rel = path.posix.join('uploads', 'news_covers', year, slug, destName);
  const baseNoExt = withoutExt(destName); // "cover"
  const variants = VAR_WIDTHS.map(w => ({
    w,
    path: path.posix.join('uploads', 'news_covers', year, slug, `${baseNoExt}-${w}.webp`),
    url: `/${path.posix.join('uploads', 'news_covers', year, slug, `${baseNoExt}-${w}.webp`)}`
  }));
  const payload = {
    path: rel,
    url: `/${rel}`,
    variants,
    srcset: variantsInfo?.srcset || '',
    sizes: variantsInfo?.sizes || SIZES_ATTR,
    lqip_url: variantsInfo?.lqipUrl || '',
    lqip_data_uri: variantsInfo?.lqipDataUri || ''
  };
  return payload;
}

function moveFile(file, destPath) {
  return new Promise((resolve, reject) => {
    file.mv(destPath, err => {
      if (err) reject(err); else resolve();
    });
  });
}

// =============== NEWS COVER: Upload locale (1200x630 consigliato) ===============
// Variante A (preferita): multipart/form-data (express-fileupload) → field name: 'file'
// Variante B (fallback):  JSON { file_b64: 'data:image/png;base64,...', slug, year, overwrite }
router.post('/news-cover', async (req, res) => {
  try {
    const slug = safeSlug(req.body?.slug);
    const year = String(req.body?.year || new Date().getFullYear());
    const overwrite = String(req.body?.overwrite || '0') === '1';
    if (!slug) return res.status(400).json({ error: 'Slug mancante.' });

    ensureDir(UPLOADS_ROOT);
    const destDir = path.join(NEWS_COVERS, year, slug);
    ensureDir(destDir);

    // A) multipart via express-fileupload
    if (req.files && req.files.file) {
      const file = req.files.file;
      const ext = (path.extname(file.name) || getExtFromMime(file.mimetype)).toLowerCase();
      const destName = `cover${ext}`;
      const destPath = path.join(destDir, destName);

      if (!overwrite && fs.existsSync(destPath)) {
        return res.status(409).json({ error: 'Cover già presente. Imposta overwrite=1 per sostituire.' });
      }

      await moveFile(file, destPath);

      // Generate responsive variants with sharp (if available)
      const variantsInfo = await generateVariants(destPath, destDir, 'cover', true);
      const payload = buildResponsePayload(destDir, destName, year, slug, variantsInfo);
      if (variantsInfo.warning === 'sharp_not_installed') payload.warning = 'sharp_not_installed';
      return res.json(payload);
    }

    // B) JSON base64 fallback (se configurato client-side)
    if (req.body?.file_b64) {
      const m = String(req.body.file_b64).match(/^data:(image\/[-+a-zA-Z0-9.]+);base64,(.+)$/);
      if (!m) return res.status(400).json({ error: 'Formato base64 non valido.' });
      const ext = getExtFromMime(m[1]);
      const buf = Buffer.from(m[2], 'base64');
      const destName = `cover${ext}`;
      const destPath = path.join(destDir, destName);
      if (!overwrite && fs.existsSync(destPath)) {
        return res.status(409).json({ error: 'Cover già presente. Imposta overwrite=1 per sostituire.' });
      }
      fs.writeFileSync(destPath, buf);

      // Generate responsive variants with sharp (if available)
      const variantsInfo = await generateVariants(destPath, destDir, 'cover', true);
      const payload = buildResponsePayload(destDir, destName, year, slug, variantsInfo);
      if (variantsInfo.warning === 'sharp_not_installed') payload.warning = 'sharp_not_installed';
      return res.json(payload);
    }

    // Se arrivo qui, non ho ricevuto né multipart né base64
    const info = {
      hasBody: !!req.body,
      hasFiles: !!req.files,
      keys: Object.keys(req.body || {})
    };
    return res.status(400).json({ error: 'Nessun file ricevuto (usa field "file" multipart o "file_b64").', info });
  } catch (e) {
    console.error('[upload/news-cover] error:', e);
    return res.status(500).json({ error: 'Errore interno upload.' });
  }
});

// Delete cover locale (rimuove anche le varianti)
// Body: { slug, year (YYYY) }
router.post('/news-cover/delete', (req, res) => {
  const slug = safeSlug(req.body.slug);
  const year = String(req.body.year || '');
  if (!slug || !year) return res.status(400).json({ error: 'Parametri mancanti.' });

  const dir = path.join(NEWS_COVERS, year, slug);
  const mainVariants = ['.jpg', '.jpeg', '.png', '.webp'];
  let removedAny = false;
  // remove master files
  for (const ext of mainVariants) {
    const p = path.join(dir, `cover${ext}`);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); removedAny = true; } catch (e) { return res.status(500).json({ error: 'Errore eliminazione.' }); }
    }
  }
  // remove responsive variants
  for (const w of VAR_WIDTHS) {
    const p = path.join(dir, `cover-${w}.webp`);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); removedAny = true; } catch (e) { return res.status(500).json({ error: 'Errore eliminazione varianti.' }); }
    }
  }
  // remove LQIP
  const lqip = path.join(dir, `cover-${MINI_WIDTH}.webp`);
  if (fs.existsSync(lqip)) {
    try { fs.unlinkSync(lqip); removedAny = true; } catch (e) { return res.status(500).json({ error: 'Errore eliminazione LQIP.' }); }
  }

  return res.json({ success: true, removed: removedAny });
});

// =================== LOCANDINE: Upload locale esistente (legacy) ===================
router.post('/locandina', (req, res) => {
  if (!req.files?.file) return res.status(400).json({ error: 'Nessun file ricevuto.' });

  const file = req.files.file;
  const titolo = (req.body.titolo || 'concerto').toLowerCase();
  const data = req.body.data || 'data';
  const luogo = (req.body.luogo || 'luogo').toLowerCase();

  const nomeFileBase = `${data}-${luogo}-${titolo}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const estensione = path.extname(file.name).toLowerCase();
  const fileName = `${nomeFileBase}${estensione}`;
  ensureDir(LOCANDINE_DIR);
  const filePath = path.join(LOCANDINE_DIR, fileName);

  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'File già esistente.' });

  file.mv(filePath, err => {
    if (err) return res.status(500).json({ error: 'Errore salvataggio.' });
    res.json({ path: `img/locandine/${fileName}` });
  });
});

// =================== Cloudinary: Upload locandine (opzionale) ===================
router.post('/cloudinary', (req, res) => {
  const idConcerto = req.body.id;
  if (!req.files?.file || !idConcerto) {
    return res.status(400).json({ error: 'File o ID concerto mancante.' });
  }

  const file = req.files.file;
  const filename = `concerto_${idConcerto}`;

  cloudinary.uploader.upload_stream({
    folder: 'danielecamiz/locandine_concerti',
    public_id: filename,
    overwrite: true
  }, (error, result) => {
    if (error) return res.status(500).json({ error: 'Errore upload Cloudinary', details: error });

    const cloudinaryUrl = result.secure_url;
    res.json({ url: cloudinaryUrl });
  }).end(file.data);
});

// =================== Delete locandina server ===================
router.post('/delete-locandina', (req, res) => {
  const fileName = req.body.filename;
  if (!fileName) return res.status(400).json({ error: 'Nome file mancante.' });

  const filePath = path.join(LOCANDINE_DIR, fileName);
  fs.unlink(filePath, err => {
    if (err && err.code !== 'ENOENT') return res.status(500).json({ error: 'Errore eliminazione.' });
    res.json({ success: true });
  });
});

export default router;
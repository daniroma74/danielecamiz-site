

// cms/controllers/newsletterController.js
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const CMS_ROOT = process.cwd();
const AUDIT_DIR = path.join(CMS_ROOT, 'data', 'backup', 'audit', 'newsletter');

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(String(email || '').trim());
}

async function ensureDir(dirPath) {
  try { await fs.mkdir(dirPath, { recursive: true }); } catch {}
}

async function writeAudit(entry) {
  await ensureDir(AUDIT_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const id = randomUUID();
  const filePath = path.join(AUDIT_DIR, `sub-${ts}-${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');
  return filePath;
}

export async function subscribe(req, res) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const consent = Boolean(req.body?.consent);
    const langRaw = res.locals?.lang || req.language || req.body?.lang || 'it';
    const lang = String(langRaw).toLowerCase().split('-')[0];

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || '';
    const ua = req.get('user-agent') || '';
    const now = new Date().toISOString();

    const entry = {
      type: 'newsletter_subscribe',
      email,
      consent,
      lang,
      ip,
      ua,
      at: now,
      route: req.originalUrl || ''
    };

    await writeAudit(entry);
    return res.json({ ok: true, message: 'subscribed' });
  } catch (err) {
    console.error('[newsletter] subscribe error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
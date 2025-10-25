// auditLogger.js
// One-file-per-action JSON writer under cms/data/backup/audit/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');
const AUDIT_DIR  = path.join(ROOT, 'data', 'backup', 'audit');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function auditLog({ user = null, action = '', payload = {} }) {
  try {
    ensureDir(AUDIT_DIR);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const safeAction = String(action || 'action').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const filename = `${ts}__${safeAction}.json`;
    const filePath = path.join(AUDIT_DIR, filename);

    const entry = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id ?? null, email: user.email ?? null, name: user.name ?? null } : null,
      action: action || '',
      payload
    };
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf8');
    return filePath;
  } catch (err) {
    console.error('[auditLog] write error:', err);
    return null;
  }
}
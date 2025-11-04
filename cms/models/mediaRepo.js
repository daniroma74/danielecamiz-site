

// mediaRepo.js – central media URL resolver
import { getDb as getMainDb } from '../utils/sqliteMain.js';
import { CLOUDINARY_CONFIG } from '../../shared/cloudinary-manager/config.js';

const CLOUD_NAME = CLOUDINARY_CONFIG.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUD_BASE = CLOUD_NAME ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/` : '';
const UPLOADS_BASE = '/uploads/';

function isHttp(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function normLocalPath(p) {
  if (!p) return null;
  const clean = String(p).replace(/^\/+/, '');
  return clean.startsWith('uploads/') ? `/${clean}` : `${UPLOADS_BASE}${clean}`;
}

export function buildTransform(opts = {}) {
  if (!opts || Object.keys(opts).length === 0) return '';
  const t = [];
  if (opts.width) t.push(`w_${Math.floor(opts.width)}`);
  if (opts.height) t.push(`h_${Math.floor(opts.height)}`);
  if (opts.crop) t.push(`c_${opts.crop}`);           // fill|fit|crop|thumb
  if (opts.quality) t.push(`q_${opts.quality}`);     // auto|80
  if (opts.gravity) t.push(`g_${opts.gravity}`);
  if (opts.dpr) t.push(`dpr_${opts.dpr}`);
  if (opts.format) t.push(`f_${opts.format}`);       // jpg|webp|auto
  return t.length ? t.join(',') + '/' : '';
}

export function resolveUrl(asset, opts = {}) {
  if (!asset) return null;
  if (asset.canonical_url && isHttp(asset.canonical_url)) return asset.canonical_url;

  const { storage, path, cloudinary_id, category } = asset;

  if (storage === 'cloudinary') {
    if (!cloudinary_id) return null;
    if (!CLOUD_BASE) return null; // evita URL errati se manca il cloud name
    const tr = buildTransform(opts);
    return `${CLOUD_BASE}${tr}${cloudinary_id}`;
  }

  if (storage === 'local') {
    // policy: cover/news/ui locali di default; poster futuri locali già salvati come path
    return normLocalPath(path);
  }

  // fallback category-based (opzionale)
  if (category && path) return normLocalPath(path);
  return null;
}

export async function imgSrcById(id, opts = {}) {
  if (id == null) return null;
  const db = await getMainDb();
  const row = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id, storage, path, cloudinary_id, canonical_url, category FROM media_assets WHERE id = ?`,
      [id],
      (err, r) => (err ? reject(err) : resolve(r))
    );
  });
  if (!row) return null;
  return resolveUrl(row, opts);
}

export default { resolveUrl, imgSrcById, buildTransform };
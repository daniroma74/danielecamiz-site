// cms/utils/mediaResolver.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mediaRepo, { resolveUrl as resolveAssetUrl, imgSrcById, buildTransform } from '../models/mediaRepo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Bases resolved from this file (independent from process.cwd())
const CMS_BASE = path.resolve(__dirname, '..');
const FRONTEND_BASE = path.resolve(__dirname, '..', '..', 'frontend');

function fileExists(p) { try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; } }
function toPosix(p) { return String(p || '').split(path.sep).join(path.posix.sep); }
function stripLeadingSlash(p) { return String(p || '').replace(/^\/+/, ''); }
function isHttp(url) { return typeof url === 'string' && /^https?:\/\//i.test(url); }

// ================= Cloudinary helpers (delegates to mediaRepo) =================
// Build Cloudinary URL from public_id with optional transforms
export function cloudinaryUrlFromId(publicId, opts = {}) {
  if (!publicId) return null;
  // Delegate to mediaRepo semantics using a pseudo-asset
  const pseudo = { storage: 'cloudinary', cloudinary_id: publicId };
  return resolveAssetUrl(pseudo, opts);
}

// ============== Posters resolver (concerts) ==============
// Priority: canonical_url → cloudinary → local uploads (future/past) → legacy frontend/img → null
// Backward-compatible with existing fields; if you have media_assets.id use resolvePosterUrlAsync.
export function resolvePosterUrl({ poster_canonical_url, poster_cloudinary_id, poster_local_filename, is_future }) {
  if (poster_canonical_url && isHttp(poster_canonical_url)) return poster_canonical_url;

  const cUrl = cloudinaryUrlFromId(poster_cloudinary_id);
  if (cUrl) return cUrl;

  if (poster_local_filename) {
    const primarySub = (is_future === true || is_future === 1 || is_future === '1') ? 'posters_future' : 'posters_past';

    const tryLocal = (sub) => {
      const abs = path.join(CMS_BASE, 'uploads', sub, poster_local_filename);
      if (fileExists(abs)) return `/media/${sub}/${poster_local_filename}`;
      return null;
    };

    const localUrl = tryLocal(primarySub) || tryLocal('posters_future') || tryLocal('posters_past');
    if (localUrl) return localUrl;

    const legacyPath = path.join(FRONTEND_BASE, 'img', 'posters', poster_local_filename);
    if (fileExists(legacyPath)) return `/img/posters/${poster_local_filename}`;
  }

  return null;
}

// Prefer this when the poster is in media_assets: tries id first, then falls back to legacy fields.
export async function resolvePosterUrlAsync({ poster_media_id, poster_canonical_url, poster_cloudinary_id, poster_local_filename, is_future }, opts = {}) {
  if (poster_canonical_url && isHttp(poster_canonical_url)) return poster_canonical_url;
  if (poster_media_id != null) {
    const viaId = await imgSrcById(poster_media_id, opts);
    if (viaId) return viaId;
  }
  const viaCloud = cloudinaryUrlFromId(poster_cloudinary_id, opts);
  if (viaCloud) return viaCloud;
  return resolvePosterUrl({ poster_canonical_url, poster_cloudinary_id, poster_local_filename, is_future });
}

// ============== Generic frontend/img resolver (local) ==============
export function resolveFrontendImg(relPath) {
  if (!relPath) return null;
  const abs = path.join(FRONTEND_BASE, 'img', relPath);
  if (fileExists(abs)) return `/img/${toPosix(relPath)}`;
  return null;
}

export function safeBoolean(v) { return v === true || v === 1 || v === '1'; }

// ================= Local responsive (news covers) =================
// Given a cover URL like "/uploads/news_covers/2025/slug/cover.png",
// discover responsive variants generated at upload time:
//   cover-480.webp, cover-768.webp, cover-1024.webp, cover-1200.webp
// Returns { src, srcset, sizes, variants[] }
const VAR_WIDTHS = [480, 768, 1024, 1200];
const MINI_WIDTH = 24; // LQIP width (cover-24.webp)
const SIZES_POST = '(max-width: 600px) 100vw, (max-width: 1024px) 90vw, 1200px';
const SIZES_CARD = '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw';

function buildVariantPaths(coverUrlOrPath) {
  if (!coverUrlOrPath) return { dirAbs: null, dirRel: null, baseName: null };
  const rel = stripLeadingSlash(coverUrlOrPath); // uploads/news_covers/2025/slug/cover.png
  const dirRel = toPosix(path.posix.dirname(rel));
  const base = path.posix.basename(rel); // cover.png
  const baseName = base.replace(/\.[^.]+$/, ''); // cover
  const dirAbs = path.join(CMS_BASE, dirRel);
  return { dirAbs, dirRel, baseName };
}

function discoverExistingVariants(dirAbs, dirRel, baseName) {
  const variants = [];
  for (const w of VAR_WIDTHS) {
    const abs = path.join(dirAbs, `${baseName}-${w}.webp`);
    if (fileExists(abs)) {
      const rel = `/${toPosix(path.join(dirRel, `${baseName}-${w}.webp`))}`;
      variants.push({ w, url: rel });
    }
  }
  return variants.sort((a,b) => a.w - b.w);
}

function discoverLqip(dirAbs, dirRel, baseName) {
  const abs = path.join(dirAbs, `${baseName}-${MINI_WIDTH}.webp`);
  if (!fileExists(abs)) return null;
  const url = `/${toPosix(path.join(dirRel, `${baseName}-${MINI_WIDTH}.webp`))}`;
  let dataUri = '';
  try { const b = fs.readFileSync(abs); dataUri = `data:image/webp;base64,${b.toString('base64')}`; } catch (_) {}
  return { url, data_uri: dataUri };
}

export function buildLocalSrcset(coverUrlOrPath, { sizes = SIZES_POST } = {}) {
  const { dirAbs, dirRel, baseName } = buildVariantPaths(coverUrlOrPath);
  if (!dirAbs || !baseName) return null;
  const found = discoverExistingVariants(dirAbs, dirRel, baseName);
  if (!found.length) return null;
  const srcset = found.map(v => `${v.url} ${v.w}w`).join(', ');
  const src = found[found.length - 1].url; // largest as default
  return { src, srcset, sizes, variants: found };
}

export function buildCoverPostSrcset(coverUrlOrPath) { return buildLocalSrcset(coverUrlOrPath, { sizes: SIZES_POST }); }
export function buildCoverCardSrcset(coverUrlOrPath) { return buildLocalSrcset(coverUrlOrPath, { sizes: SIZES_CARD }); }

// ===== LQIP helpers =====
export function buildCoverLqip(coverUrlOrPath) {
  const { dirAbs, dirRel, baseName } = buildVariantPaths(coverUrlOrPath);
  if (!dirAbs || !baseName) return null;
  return discoverLqip(dirAbs, dirRel, baseName);
}

// ============== New centralized helpers (opt-in) ==============
// Directly resolve a media_assets row-like object (or subset) using the centralized repo
export function resolveAsset(asset, opts = {}) { return resolveAssetUrl(asset, opts); }
// Async helper to resolve by media id
export async function resolveMediaById(id, opts = {}) { return imgSrcById(id, opts); }
// Re-export builder for controllers that want Cloudinary transforms
export { buildTransform };
export default { cloudinaryUrlFromId, resolvePosterUrl, resolvePosterUrlAsync, resolveFrontendImg, safeBoolean, buildLocalSrcset, buildCoverPostSrcset, buildCoverCardSrcset, buildCoverLqip, resolveAsset, resolveMediaById, buildTransform };
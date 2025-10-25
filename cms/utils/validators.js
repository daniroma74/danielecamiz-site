// validators.js
export const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
export const isEmail = v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isISODate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim());
export const isSlug = v => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.trim());
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const toInt = (v, def = 0) => Number.isFinite(+v) ? +v : def;
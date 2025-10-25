// cms/services/social/index.js
// Social sharing dispatcher (no external deps). Adapters live in sibling files (e.g., linkedin.js, facebook.js).
// Each adapter must export: async function publish(payload) -> { ok, post_id, permalink, error }

import fs from 'fs/promises';
import path from 'path';
import { resolveFrontendImg } from '../../utils/mediaResolver.js';

export const SUPPORTED_PROVIDERS = [
  'linkedin',
  'facebook',
  'threads',
  'mastodon',
  'pinterest',
  'instagram',
  'x', // twitter
];

/* ========================= helpers ========================= */
function ensureLeadingSlash(p = '') { return p.startsWith('/') ? p : '/' + p; }
function isHttpUrl(u = '') { return /^https?:\/\//i.test(String(u)); }

export function absoluteUrl(baseUrl, urlOrPath) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!urlOrPath) return base || '';
  const s = String(urlOrPath).trim();
  if (!s) return base || '';
  if (isHttpUrl(s)) return s;
  if (s.startsWith('//')) return `https:${s}`; // schemeless → assume https
  return base + ensureLeadingSlash(s);
}

export function normalizeMediaUrl(urlOrPath, baseUrl = '') {
  const raw = String(urlOrPath || '').trim();
  if (!raw) return '';
  const local = resolveFrontendImg(raw);
  const candidate = local || raw;
  return absoluteUrl(baseUrl, candidate);
}

export function withUtm(absUrl, { source = 'social', medium = 'social', campaign = '', content = '' } = {}) {
  try {
    const u = new URL(absUrl);
    if (source)   u.searchParams.set('utm_source', source);
    if (medium)   u.searchParams.set('utm_medium', medium);
    if (campaign) u.searchParams.set('utm_campaign', campaign);
    if (content)  u.searchParams.set('utm_content', content);
    return u.toString();
  } catch {
    return absUrl; // fallback
  }
}

export function pickPostImage(post = {}, baseUrl = '') {
  const raw = post?.seo?.og_image || post?.cover_url || '';
  const candidate = raw || '/img/icons/favicon-180.png';
  return normalizeMediaUrl(candidate, baseUrl);
}

export function defaultMessage(post = {}, absUrl = '') {
  const title = String(post?.title || '').trim();
  const tags = Array.isArray(post?.tags) ? post.tags : [];
  const hash = tags
    .map(t => String(t || '').trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 3)
    .map(t => `#${t}`)
    .join(' ');
  const core = (title && absUrl) ? `${title} — ${absUrl}` : (title || absUrl);
  return hash ? `${core}\n${hash}` : core;
}

function yyyymm(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

async function appendAudit(provider, post, payload, result) {
  try {
    const CMS_ROOT = process.cwd();
    const dir = path.join(CMS_ROOT, 'data', 'backup', 'audit');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `social-${yyyymm()}.jsonl`);
    const row = {
      ts: new Date().toISOString(),
      provider,
      ok: !!result?.ok,
      error: result?.error || null,
      post: { id: post?.id || '', slug: post?.slug || '', lang: post?.lang || '', title: post?.title || '' },
      result: { post_id: result?.post_id || '', permalink: result?.permalink || '' },
      payload: {
        title: payload?.title || '',
        url: payload?.url || '',
        imageUrl: payload?.imageUrl || '',
        message: payload?.message || ''
        // NOTE: providerOptions intentionally omitted to keep audit light
      }
    };
    await fs.appendFile(file, JSON.stringify(row) + '\n', 'utf8');
  } catch (e) {
    // silent: audit must never break publishing
  }
}

async function loadAdapter(provider) {
  const name = String(provider || '').toLowerCase();
  if (!SUPPORTED_PROVIDERS.includes(name)) return null;
  try {
    const mod = await import(`./${name}.js`);
    if (typeof mod.publish !== 'function') return null;
    return mod;
  } catch {
    return null; // adapter not present yet
  }
}

/*
Payload contract for adapters:
{
  provider: 'linkedin' | 'facebook' | ...,
  title: string,
  url: string,              // absolute, with UTM (+ ?lng=<lang>)
  imageUrl: string,         // absolute
  message: string,          // final share text
  lang: 'it'|'en',
  providerOptions?: object  // provider-specific options (e.g., facebook: { pageIds, pageMessages })
}
*/

export function buildCanonicalShare(post, { baseUrl, provider, overrideMessage, utmCampaignPrefix = 'news_' } = {}) {
  const absBase = String(baseUrl || '').replace(/\/$/, '');
  const lang = post?.lang || 'it';
  const slug = post?.slug || post?.id || '';

  // Ensure landing respects content language via i18n
  let pathWithLang = `/news/${slug}`;
  if (lang) pathWithLang += (pathWithLang.includes('?') ? '&' : '?') + `lng=${encodeURIComponent(lang)}`;

  const canonical = absoluteUrl(absBase, pathWithLang);

  // Map provider for UTM source (x -> twitter)
  const utmSrc = provider === 'x' ? 'twitter' : (provider || 'social');

  const urlWithUtm = withUtm(canonical, {
    source: utmSrc,
    medium: 'social',
    campaign: `${utmCampaignPrefix}${slug}`,
    content: post?.id || ''
  });
  const imageUrl = pickPostImage(post, absBase);
  const message  = (overrideMessage && String(overrideMessage).trim()) || defaultMessage(post, urlWithUtm);
  return { provider, title: post?.title || '', url: urlWithUtm, imageUrl, message, lang };
}

export async function publishToProviders({
  providers = [],
  post,
  baseUrl,
  overrides = {},       // { linkedin: '...', facebook: '...', threads: '...' }
  providerOptions = {}, // { linkedin?: {...}, facebook?: {...}, threads?: {...} }
  beforePublish,        // optional hook (payload) => payload | void
  afterPublish          // optional hook (provider, payload, result)
} = {}) {
  const results = {};
  for (const raw of providers) {
    const provider = String(raw || '').toLowerCase();
    const adapter = await loadAdapter(provider);
    if (!adapter) {
      results[provider] = { ok: false, error: 'adapter_not_available' };
      continue;
    }

    let payload = buildCanonicalShare(post, { baseUrl, provider, overrideMessage: overrides?.[provider] });

    // Attach provider-specific options so adapters can read them (e.g., facebook pageMessages/pageIds)
    const optsForProvider = (providerOptions && providerOptions[provider]) ? providerOptions[provider] : undefined;
    if (optsForProvider) {
      payload = { ...payload, providerOptions: optsForProvider };
    }

    if (typeof beforePublish === 'function') {
      try { payload = (await beforePublish(payload)) || payload; } catch {}
    }

    let result;
    try {
      result = await adapter.publish(payload);
    } catch (e) {
      result = { ok: false, error: String(e && e.message || e) };
    }

    if (typeof afterPublish === 'function') {
      try { await afterPublish(provider, payload, result); } catch {}
    }

    await appendAudit(provider, post, payload, result);
    results[provider] = result;
  }
  return results;
}
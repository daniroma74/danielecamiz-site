// cms/utils/youtubeService.js
// Fetch YouTube lato server, cache 10' e forzatura IPv4 (per API key con whitelist su IPv4).
import https from 'https';
import dns from 'dns';
import { URL } from 'url';
import net from 'net';

const TTL_MS = 10 * 60 * 1000;
let CACHE = { ts: 0, max: 0, channel: '', items: [] };
let PLAYLIST_CACHE = { ts: 0, max: 0, playlistId: '', items: [] };

const FETCH_TIMEOUT_MS = parseInt(process.env.YT_FETCH_TIMEOUT_MS || '8000', 10);

function createAgent() {
  const ip = process.env.OUTBOUND_IP || process.env.YT_OUTBOUND_IP || '';
  if (ip && net.isIP(ip)) {
    // Use a dedicated agent with the specific localAddress only if it's a valid IP
    return new https.Agent({ localAddress: ip, keepAlive: true, maxSockets: 4 });
  }
  // Otherwise, use a clean agent (avoids inheriting a globalAgent.localAddress=undefined)
  return new https.Agent({ keepAlive: true, maxSockets: 4 });
}

const lookupIPv4 = (hostname, opts, cb) =>
  dns.lookup(hostname, { family: 4, all: false }, cb);

function fetchJson(urlStr) {
  const url = new URL(urlStr);
  const baseOptions = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: { 'User-Agent': 'danielecamiz.com server' }
  };

  const agent = createAgent();

  function attempt(opts) {
    return new Promise((resolve, reject) => {
      const req = https.get(opts, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode} ${data}`));
          }
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Parse error: ${e.message}`)); }
        });
      });
      req.on('error', reject);
      if (FETCH_TIMEOUT_MS > 0) {
        req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error('ETIMEDOUT')));
      }
    });
  }

  // First try: dedicated agent + forced IPv4 lookup
  return attempt({ ...baseOptions, agent, lookup: lookupIPv4 })
    .catch(err => {
      // Fallback: if IP/localAddress issues or DNS trouble, retry without custom agent/lookup
      const msg = String(err && (err.message || err)).toLowerCase();
      if (msg.includes('invalid ip address') || msg.includes('eaddrnotavail') || msg.includes('enetunreach') || msg.includes('eai_again')) {
        return attempt({ ...baseOptions });
      }
      throw err;
    });
}

function normalizeItems(json) {
  const items = Array.isArray(json?.items) ? json.items : [];
  return items
    .filter(it => it?.id && (it.id.videoId || typeof it.id === 'string'))
    .map(it => ({
      id: it.id.videoId || it.id,
      title: it.snippet?.title || '',
      thumbnail: it.snippet?.thumbnails?.medium?.url
        || it.snippet?.thumbnails?.default?.url
        || '',
      liveBroadcastContent: it.snippet?.liveBroadcastContent || 'none',
      description: it.snippet?.description || ''
    }));
}

function normalizePlaylistItems(json) {
  const items = Array.isArray(json?.items) ? json.items : [];
  return items
    .filter(it => it?.snippet?.resourceId?.videoId)
    .map(it => ({
      id: it.snippet.resourceId.videoId,
      title: it.snippet?.title || '',
      thumbnail: it.snippet?.thumbnails?.medium?.url
        || it.snippet?.thumbnails?.default?.url
        || '',
      liveBroadcastContent: it.snippet?.liveBroadcastContent || 'none',
      description: it.snippet?.description || ''
    }));
}

export async function getLatestVideos(max = 3) {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL = process.env.YT_CHANNEL_ID;
  if (!API_KEY || !CHANNEL) return [];

  const now = Date.now();
  // Extend cache to 24h when quota is exceeded
  const cacheExtended = 24 * 60 * 60 * 1000;
  if (CACHE.items.length && CACHE.max === max && CACHE.channel === CHANNEL && (now - CACHE.ts) < cacheExtended) {
    console.log('[YouTube] Returning cached items (age: ' + Math.round((now - CACHE.ts) / 1000 / 60) + ' min)');
    return CACHE.items;
  }

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?key=${encodeURIComponent(API_KEY)}` +
    `&channelId=${encodeURIComponent(CHANNEL)}` +
    `&part=snippet,id&order=date&type=video&maxResults=${Math.max(1, Math.min(10, max))}`;

  try {
    const json = await fetchJson(url);
    if (json?.error) {
      const isQuotaError = json.error.message?.includes('quota') || json.error.code === 403;
      if (isQuotaError) {
        console.warn('[YouTube] API quota exceeded, using cache if available');
        // Return old cache even if expired, better than nothing
        if (CACHE.items.length) return CACHE.items;
      }
      console.error('YouTube API error:', json.error);
      return CACHE.items.length ? CACHE.items : [];
    }
    const items = normalizeItems(json);
    CACHE = { ts: now, max, channel: CHANNEL, items };
    return items;
  } catch (err) {
    console.error('YouTube fetch error:', err.message || err);
    // Return cached items if available, even if expired
    return CACHE.items.length ? CACHE.items : [];
  }
}

export async function getLatestVideosFromPlaylist(playlistId, max = 3) {
  const API_KEY = process.env.YT_API_KEY;
  if (!API_KEY || !playlistId) return [];

  const now = Date.now();
  const cacheExtended = 24 * 60 * 60 * 1000;

  // Check cache
  if (PLAYLIST_CACHE.items.length &&
      PLAYLIST_CACHE.max === max &&
      PLAYLIST_CACHE.playlistId === playlistId &&
      (now - PLAYLIST_CACHE.ts) < cacheExtended) {
    console.log('[YouTube Playlist] Returning cached items (age: ' + Math.round((now - PLAYLIST_CACHE.ts) / 1000 / 60) + ' min)');
    return PLAYLIST_CACHE.items;
  }

  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems` +
    `?key=${encodeURIComponent(API_KEY)}` +
    `&playlistId=${encodeURIComponent(playlistId)}` +
    `&part=snippet&maxResults=${Math.max(1, Math.min(50, max))}`;

  try {
    const json = await fetchJson(url);
    if (json?.error) {
      const isQuotaError = json.error.message?.includes('quota') || json.error.code === 403;
      if (isQuotaError) {
        console.warn('[YouTube Playlist] API quota exceeded, using cache if available');
        if (PLAYLIST_CACHE.items.length) return PLAYLIST_CACHE.items;
      }
      console.error('YouTube Playlist API error:', json.error);
      return PLAYLIST_CACHE.items.length ? PLAYLIST_CACHE.items : [];
    }
    const items = normalizePlaylistItems(json);
    PLAYLIST_CACHE = { ts: now, max, playlistId, items };
    return items;
  } catch (err) {
    console.error('YouTube Playlist fetch error:', err.message || err);
    return PLAYLIST_CACHE.items.length ? PLAYLIST_CACHE.items : [];
  }
}

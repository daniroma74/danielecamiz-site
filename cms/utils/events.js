// cms/utils/events.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base "cms/" (una cartella sopra /utils)
const CMS_BASE = path.join(__dirname, '..');

function resolveDataDir(raw) {
  if (!raw) return path.join(CMS_BASE, 'data', 'events'); // default cms/data/events
  if (path.isAbsolute(raw)) return raw;                   // assoluto
  // Se comincia con "cms/", rimuovi il prefisso e risolvi da CMS_BASE
  if (raw.startsWith('cms/')) return path.join(CMS_BASE, raw.slice(4));
  // Altrimenti risolvi sempre rispetto a CMS_BASE (così "data/events" -> cms/data/events)
  return path.join(CMS_BASE, raw);
}

const DATA_DIR = resolveDataDir(process.env.DATA_DIR);

function safeJoin(dir, file){
  const p = path.normalize(path.join(dir, file));
  if(!p.startsWith(path.normalize(dir))) throw new Error('Path traversal');
  return p;
}

export async function loadEvent(slug){
  try{
    const p = safeJoin(DATA_DIR, `${slug}.json`);
    const raw = await fs.readFile(p, 'utf-8');
    const ev = JSON.parse(raw);
    return normalizeEvent(ev);
  }catch(err){
    return null;
  }
}

export async function getEventById(id){
  try{
    const files = await fs.readdir(DATA_DIR);
    for(const f of files){
      if(!f.endsWith('.json')) continue;
      try{
        const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
        const ev = JSON.parse(raw);
        if(ev.id === id) return normalizeEvent(ev);
      }catch{}
    }
  }catch{}
  return null;
}

function normalizeEvent(ev){
  ev.id ??= ev.slug || crypto.randomUUID();
  ev.slug ??= ev.id;
  ev.title ??= { it:'Titolo', en:'Title' };
  ev.subtitle ??= { it:'Sottotitolo', en:'Subtitle' };
  ev.poster ??= { url:'', alt:{ it:'Locandina', en:'Poster' } };
  ev.location ??= { name:'', address:'' };
  ev.program ??= { it:[], en:[] };
  ev.tickets ??= [{ type:'free', label:{it:'Posto gratuito', en:'Free seat'}, maxQty:4 }];
  ev.stats ??= { reserved: 0 };
  return ev;
}

function foldText(s){
  const lines = s.split(/\r?\n/);
  const out=[]; for(const line of lines){
    if(line.length<=75){ out.push(line); continue; }
    let l=line; while(l.length>75){ out.push(l.slice(0,75)); l=' '+l.slice(75); }
    out.push(l);
  }
  return out.join('\r\n');
}

export function makeICS(event){
  const toUTC = (iso) => {
    const d = new Date(iso);
    const pad = (n)=> String(n).padStart(2,'0');
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth()+1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + 'Z'
    );
  };

  if (!event?.datetime) {
    // fallback: evento senza datetime → evento di 1h da adesso
    const s = new Date(); const e = new Date(s.getTime()+60*60*1000);
    event = { ...event, datetime: s.toISOString(), end_datetime: e.toISOString() };
  }

  const uid = `${event.id || event.slug || 'event'}@danielecamiz.com`;
  const dtStamp = toUTC(new Date().toISOString());
  const dtStart = toUTC(event.datetime);
  const dtEnd = event.end_datetime ? toUTC(event.end_datetime) : null;

  const rawSummary = (event.title?.it || event.title?.en || event.title || 'Concerto') +
    (event.subtitle?.it ? ` — ${event.subtitle.it}` : (event.subtitle?.en ? ` — ${event.subtitle.en}` : ''));
  const summary = rawSummary.replace(/\r?\n/g,' ').replace(/[,;]/g, '\\,'); // escape , ;

  const locationStr = (event.location?.name && event.location?.address)
    ? `${event.location.name} — ${event.location.address}`
    : (event.location?.name || event.location?.address || 'Roma');
  const safeLocation = locationStr.replace(/\r?\n/g,' ').replace(/[,;]/g, '\\,');

  const base = process.env.BASE_URL || 'https://www.danielecamiz.com';
  const pageUrl = `${base}/eventi/${event.slug || ''}`;
  const descr = [
    (event.description_plain?.it || event.description_plain?.en || '').trim(),
    '',
    `Pagina: ${pageUrl}`
  ].join('\\n').replace(/\r?\n/g,'\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//I Concerti nel Tempio//Landing//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    ...(dtEnd ? [`DTEND:${dtEnd}`] : []),
    `DTSTAMP:${dtStamp}`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    `SUMMARY:${summary}`,
    `LOCATION:${safeLocation}`,
    `DESCRIPTION:${descr}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '' // newline finale
  ];

  // Fold RFC: spezza righe >75 char con CRLF + spazio
  return lines.join('\r\n').replace(/(.{75})(?=.)/g, '$1\r\n ');
}



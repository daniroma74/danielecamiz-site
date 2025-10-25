import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const {
  PORT = 4012,
  CACHE_TTL_MS = 10000,
  SHEET_ID,
  TAB_RISPOSTE = 'Risposte al modulo 1',
  TAB_META = 'LinkConcerti',
  ACCESS_CODE = 'icnt2025',
  ADMIN_CODE = 'icnt-admin-2025',
  CONFIG_FILE = path.join(process.cwd(), 'data/portal-config.json'),
  GOOGLE_APPLICATION_CREDENTIALS
} = process.env;

if (!SHEET_ID) { console.error('❌ SHEET_ID mancante'); process.exit(1); }
if (!fs.existsSync(CONFIG_FILE)) { console.error('❌ CONFIG_FILE non trovato:', CONFIG_FILE); process.exit(1); }
if (!GOOGLE_APPLICATION_CREDENTIALS || !fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS)) { console.error('❌ Chiave Service Account mancante/inesistente'); process.exit(1); }

let CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
fs.watch(CONFIG_FILE, { persistent:false }, () => {
  try { CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); console.log('🔁 CONFIG ricaricata'); } catch {}
});

const app = express();
app.use(morgan('tiny'));
app.use(cookieParser(process.env.COOKIE_SECRET || 'icnt-cookie-secret'));
app.use(express.json());

// Google Sheets client (read-only)
const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
function safeTab(name){ return /\s|['!]/.test(name) ? `'${name.replace(/'/g,"''")}'` : name; }
async function readTab(name) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${safeTab(name)}!A:ZZ` });
  const values = res.data.values || [];
  const [header = [], ...rows] = values;
  return rows.map(r => {
    const o = {}; header.forEach((h,i)=> o[String(h).trim()] = (r[i] ?? '').toString().trim());
    return o;
  });
}

// --- Utils robusti di mappatura ---
const pickVal = (row, keys=[]) => {
  for (const k of keys) {
    for (const kk of Object.keys(row)) {
      if (kk.toLowerCase() === k.toLowerCase()) return row[kk];
    }
  }
  return '';
};
const getEmail = r => (pickVal(r, ['Indirizzo email','Email','E-mail'])||'').toLowerCase();
const getFullName = r => {
  const n = pickVal(r, ['Nome']) || ''; const c = pickVal(r, ['Cognome']) || '';
  const nc = (n && c) ? `${n} ${c}`.trim() : (pickVal(r, ['Nome e Cognome','Nome e cognome'])||'').trim();
  return nc || 'Senza Nome';
};
const getInstrument = r => pickVal(r, ['Strumento','Strumento suonato','Instrument']) || '';
function instrumentToSection(instr){
  const s = (instr||'').toLowerCase();
  if (s.includes('flauto')) return 'Flauti';
  if (s.includes('oboe')) return 'Oboi';
  if (s.includes('clarinet')) return 'Clarinetti';
  if (s.includes('fagott')) return 'Fagotti';
  if (s.includes('corno')) return 'Corni';
  if (s.includes('tromba')) return 'Trombe';
  if (s.includes('trombone')) return 'Tromboni';
  if (s.includes('tuba')) return 'Tuba';
  if (s.includes('arpa')) return 'Arpa';
  if (s.includes('timpani') || s.includes('percuss')) return 'Timpani e percussioni';
  if (s.includes('violino')) return 'Violino I';
  if (s.includes('viola')) return 'Viole';
  if (s.includes('cello') || s.includes('violoncello')) return 'Violoncelli';
  if (s.includes('contrabbasso') || s.includes('cbasso')) return 'Contrabbassi';
  return instr || 'Altro';
}
function dedupLatest(rows){
  const sorted = rows.map(r => ({...r, __ts: Date.parse(pickVal(r, ['Timestamp','Data'])||'')||0})).sort((a,b)=>a.__ts-b.__ts);
  const map = new Map();
  for (const r of sorted){
    const email = getEmail(r);
    const key = email || `${getFullName(r)}||${getInstrument(r).toLowerCase()}`;
    map.set(key, r);
  }
  return [...map.values()];
}
function normalizeMetaRows(rows){
  const pick = (r, keys) => keys.map(k => r[k] || r[k.toLowerCase()] || '').find(Boolean) || '';
  const out = {};
  for (const r of rows){
    const short = (pick(r, ['Concerto (short)','Concerto']) || '').trim();
    if (!short) continue;
    out[short] = {
      date: pick(r, ['Data (ISO)','DataISO','Data']),
      program: pick(r, ['Programma breve','Programma']),
      drive: pick(r, ['Drive','Cartella Drive','Drive link']),
      calendar: pick(r, ['Calendar','Calendario','Calendar link'])
    };
  }
  return out;
}
function violinsMapFor(short){
  const map = new Map();
  (CONFIG.violins_map || []).forEach(v => {
    const vc = (v.concert || '').trim();
    if (vc && vc !== short) return;
    if (v.name) map.set(v.name.toLowerCase(), v.section);
  });
  return map;
}

// --- Estrattore status super-tollerante ---
/**
 * Restituisce status per ciascun short: 'partecipo' | 'in dubbio' | 'non posso' | ''.
 * Funziona se:
 *  - ci sono colonne per concerto (una per short) con valori "Partecipo/In dubbio/Non posso"
 *  - oppure una colonna multi-scelta con elenco concerti
 *  - oppure più domande separate (partecipo/dubbio/non posso) con valori contenenti lo short
 */
function extractStatusesForRow(row, shorts, headersAll) {
  const status = {}; shorts.forEach(s=>status[s]='');
  const headers = headersAll.map(h=>String(h));
  const lower = s => (s||'').toLowerCase();

  // 1) Caso classico: colonne per concerto (header contiene lo short)
  shorts.forEach(short=>{
    const h = headers.find(H => lower(H).includes(lower(short)));
    if (h && row[h] !== undefined) {
      const v = lower(row[h]);
      if (v.startsWith('partec')) status[short] = 'partecipo';
      else if (v.includes('dubb')) status[short] = 'in dubbio';
      else if (v.startsWith('non')) status[short] = 'non posso';
    }
  });

  // 2) Colonne "macro" (multi-scelta): il valore della cella contiene i nomi dei concerti
  //    Proviamo a riconoscere testate tipo "A quali concerti partecipi" / "Concerti in dubbio" / "concerti che non puoi"
  const H_part = headers.filter(h => lower(h).includes('quali concerti') || lower(h).includes('partecip'));
  const H_dubb = headers.filter(h => lower(h).includes('dubbio'));
  const H_nonp = headers.filter(h => lower(h).includes('non posso') || lower(h).includes('imposs') || lower(h).includes('non partec'));

  const markList = (listHeaders, label) => {
    listHeaders.forEach(h=>{
      const cell = lower(row[h]||'');
      shorts.forEach(short=>{
        if (cell.includes(lower(short))) {
          if (label==='partecipo' && status[short]==='') status[short]='partecipo';
          if (label==='in dubbio' && status[short]!=='partecipo') status[short]='in dubbio';
          if (label==='non posso') status[short]='non posso';
        }
      });
    });
  };
  markList(H_part, 'partecipo');
  markList(H_dubb, 'in dubbio');
  markList(H_nonp, 'non posso');

  // 3) Ultimo tentativo: se esiste qualsiasi header che contenga "partecipo" + short nel header o nel valore
  shorts.forEach(short=>{
    if (status[short]) return;
    headers.forEach(h=>{
      const mix = `${h} ${row[h]||''}`.toLowerCase();
      if (mix.includes(short.toLowerCase())) {
        if (mix.includes('dubb')) status[short]='in dubbio';
        else if (mix.includes('non')) status[short]='non posso';
        else status[short]='partecipo';
      }
    });
  });

  return status;
}

// --- Cache & modello ---
let cache = { at: 0, data: null };
const TTL = Number(CACHE_TTL_MS)||0;

async function computeModel(){
  if (TTL && cache.data && (Date.now()-cache.at) < TTL) return cache.data;

  const [risposteRaw, metaRows] = await Promise.all([
    readTab(TAB_RISPOSTE).catch(()=>[]),
    readTab(TAB_META).catch(()=>[])
  ]);
  const risposte = dedupLatest(risposteRaw);
  const headersAll = Object.keys(risposteRaw[0]||{});    // se vuoto, faremo union
  const metaByShort = normalizeMetaRows(metaRows);

  // Short ufficiali: da LinkConcerti
  const shorts = Object.keys(metaByShort);
  // Se meta è vuoto, prova a sniffare dagli header tra [quadre]
  if (!shorts.length) {
    headersAll.forEach(h=>{
      const m = String(h).match(/\[([^\]]+)\]/);
      if (m) metaByShort[m[1].trim()] = {};
    });
  }
  const allShorts = Object.keys(metaByShort);

  // Per ogni concerto: roster, counts, organico calcolato
  const ORDER = CONFIG.sections_order || [
    'Flauti','Oboi','Clarinetti','Fagotti','Corni','Trombe','Tromboni','Tuba','Arpa','Timpani e percussioni','Violino I','Violino II','Viole','Violoncelli','Contrabbassi'
  ];
  const ORDER_INDEX = sec => ORDER.indexOf(sec)<0 ? 999 : ORDER.indexOf(sec);

  const concerts = [];
  const cfgByShort = new Map((CONFIG.concerts||[]).map(c => [c.short, c]));
  const closedMap = CONFIG.closed || {};

  // Prepara mappa headerByShort (per info admin)
  const headerByShort = {};
  allShorts.forEach(s=>{
    const h = headersAll.find(H => String(H).toLowerCase().includes(s.toLowerCase()));
    headerByShort[s] = h || '';
  });

  // Calcolo per concerto
  for (const short of allShorts) {
    const cfg = cfgByShort.get(short) || {};
    const req = cfg.organico || {};
    const meta = metaByShort[short] || cfg.meta || {};
    const closed = !!closedMap[short];

    const vMap = violinsMapFor(short);
    const bySec = new Map();
    const roster = [];

    let countY=0, countM=0, countN=0;

    for (const r of risposte) {
      const email = getEmail(r);
      const full = getFullName(r);
      const instr = getInstrument(r);
      const sec0 = instrumentToSection(instr);
      const sec = (sec0.startsWith('Violino') && vMap.get(full.toLowerCase())==='Violino II') ? 'Violino II' : (sec0 || 'Altro');

      // status per riga
      const perRow = extractStatusesForRow(r, [short], headersAll);
      const st = perRow[short] || '';

      let status = 'non specificato';
      if (st==='partecipo') { status='partecipo'; countY++; }
      else if (st==='in dubbio') { status='in dubbio'; countM++; }
      else if (st==='non posso') { status='non posso'; countN++; }

      roster.push({ name: full, email, instrument: instr, section: sec, status });

      if ((status==='partecipo' || status==='in dubbio') && (sec in req)) {
        const label = status==='in dubbio' ? `${full} (?)` : full;
        if (!bySec.has(sec)) bySec.set(sec, []);
        bySec.get(sec).push(label);
      }
    }

    // Organico completato con "• ?"
    const out = {};
    Object.keys(req).sort((a,b)=>ORDER_INDEX(a)-ORDER_INDEX(b)).forEach(sec=>{
      const names = (bySec.get(sec)||[]).slice();
      const posti = Number(req[sec]||0);
      while (names.length < posti) names.push('• ?');
      out[sec] = names;
    });

    concerts.push({
      short,
      header: headerByShort[short] || '',
      closed,
      meta,
      counts: { partecipo: countY, dubbio: countM, non_posso: countN, totale: roster.length },
      required: req,
      organico: out,
      roster
    });
  }

  // Iscritti globali
  const members = risposte.map(r=> ({
    name: getFullName(r),
    email: getEmail(r),
    instrument: getInstrument(r)
  }));
  const countsByInstrument = {};
  for (const m of members) countsByInstrument[m.instrument||'(vuoto)'] = (countsByInstrument[m.instrument||'(vuoto)']||0) + 1;

  const data = { concerts, headerByShort, metaByShort, members, countsByInstrument };
  cache = { at: Date.now(), data };
  return data;
}

// ---------- ROUTES ----------
const needUser = (req,res,next)=>{
  const email = (req.signedCookies['icnt_user']||'').toLowerCase();
  if (!email) return res.status(401).json({error:'Login richiesto'});
  req.userEmail = email;
  next();
};
const needAdmin = (req,res,next)=>{
  const hdr = req.get('x-admin-code') || '';
  if (hdr !== ADMIN_CODE) return res.status(403).json({error:'Admin code errato'});
  next();
};

app.get('/api/health', (req,res)=>res.json({ok:true}));

// Debug: headers & sample row (aiuta a capire perché non vede dati)
app.get('/api/debug/headers', needAdmin, async (req,res)=>{
  const rows = await readTab(TAB_RISPOSTE).catch(()=>[]);
  const headers = Object.keys(rows[0]||{});
  res.json({ headers, sample: rows[0]||{} });
});

app.post('/api/login', async (req,res)=>{
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({error:'Parametri mancanti'});
  if (code !== ACCESS_CODE) return res.status(401).json({error:'Codice errato'});

  const rows = await readTab(TAB_RISPOSTE).catch(()=>[]);
  const dedup = dedupLatest(rows);
  const ok = dedup.some(r => getEmail(r) === String(email).toLowerCase());
  if (!ok) return res.status(403).json({error:'Email non trovata nelle risposte (usa la stessa del Form)'});

  res.cookie('icnt_user', email.toLowerCase(), { httpOnly:true, sameSite:'lax', signed:true, maxAge: 7*24*3600e3 });
  res.json({ok:true});
});

app.get('/api/me/concerts', needUser, async (req,res,next)=>{ try{
  const email = req.userEmail.toLowerCase();
  const rows = await readTab(TAB_RISPOSTE);
  const all = dedupLatest(rows);
  const me = all.find(r => getEmail(r)===email) || {};
  // calcola status per me su tutti gli short (da meta)
  const metaRows = await readTab(TAB_META).catch(()=>[]);
  const metaShorts = Object.keys(normalizeMetaRows(metaRows));
  const statuses = extractStatusesForRow(me, metaShorts, Object.keys(rows[0]||{}));
  const want = new Set(Object.keys(statuses).filter(s => statuses[s]==='partecipo' || statuses[s]==='in dubbio'));

  const model = await computeModel();
  res.json(model.concerts.filter(c => want.has(c.short) && !c.closed));
} catch(e){ next(e); }});

app.get('/api/concerts/:short', async (req,res,next)=>{ try{
  const model = await computeModel();
  const found = model.concerts.find(c => c.short === req.params.short);
  if (!found) return res.status(404).json({error:'Concerto non trovato'});
  res.json(found);
} catch(e){ next(e); }});

app.get('/api/concerts/:short/pdf', async (req,res,next)=>{ try{
  const { concerts } = await computeModel();
  const c = concerts.find(x => x.short === req.params.short);
  if (!c) return res.status(404).send('Not found');
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`inline; filename="${c.short}-organico.pdf"`);
  const doc = new PDFDocument({ size:'A4', margin:48 });
  doc.pipe(res);
  const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
  if (fs.existsSync(logoPath)) { try { doc.image(logoPath, 48, 36, { width: 90 }); } catch {} }
  doc.fontSize(18).font('Helvetica-Bold').text('Orchestra ICNT — Organico', 150, 40);
  doc.moveDown(1);
  doc.fontSize(22).font('Helvetica-Bold').text(c.short, { align: 'left' });
  if (c.meta?.program) doc.moveDown(0.1).fontSize(12).font('Helvetica').text(c.meta.program);
  if (c.meta?.date) doc.fontSize(11).fillColor('#555').text(c.meta.date);
  doc.moveDown(0.6).fillColor('#000');

  const roles = CONFIG.roles || {};
  const archiR = roles.archi || {};
  const fiatiR = roles.fiati || {};
  const line = (k,v)=> v ? `${k}: ${v}` : '';
  const rolesLines = [
    line('Spalla VI I', archiR['Violino I']?.spalla),
    line('Spalla VI II', archiR['Violino II']?.spalla),
    line('Spalla Viole', archiR['Viole']?.spalla),
    line('Spalla VC', archiR['Violoncelli']?.spalla),
    line('Spalla Cb', archiR['Contrabbassi']?.spalla),
    line('Primo Flauto', fiatiR['Flauti']?.primo),
    line('Primo Oboe', fiatiR['Oboi']?.primo),
    line('Primo Clarinetto', fiatiR['Clarinetti']?.primo),
    line('Primo Fagotto', fiatiR['Fagotti']?.primo),
    line('Primo Corno', fiatiR['Corni']?.primo),
    line('Primo Tromba', fiatiR['Trombe']?.primo),
    line('Primo Trombone', fiatiR['Tromboni']?.primo),
    line('Primo Tuba', fiatiR['Tuba']?.primo)
  ].filter(Boolean);
  if (rolesLines.length){ doc.fontSize(11).fillColor('#333').text(rolesLines.join('   ·   ')); doc.fillColor('#000').moveDown(0.6); }

  const leftX = 48, colSep = 180, rightW = 380;
  doc.font('Helvetica-Bold').fontSize(12).text('Sezione', leftX, doc.y, { width: colSep - 10 });
  doc.text('Nomi', leftX + colSep, doc.y, { width: rightW - 10 });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(11);
  Object.entries(c.organico).forEach(([sec, names])=>{
    doc.text(sec, leftX, doc.y, { width: colSep - 10, continued: true });
    doc.text(names.join(', '), leftX + colSep, doc.y, { width: rightW - 10 });
    doc.moveDown(0.1);
  });
  doc.end();
} catch(e){ next(e); }});

// ADMIN endpoints
app.get('/api/admin/overview', needAdmin, async (req,res,next)=>{ try{
  const model = await computeModel();
  const closed = CONFIG.closed || {};
  const overview = model.concerts.map(c => ({
    short: c.short, header: c.header, closed: !!closed[c.short],
    counts: c.counts, required: c.required, meta: c.meta
  }));
  res.json({ overview });
} catch(e){ next(e); }});

app.get('/api/admin/concerts/:short/roster', needAdmin, async (req,res,next)=>{ try{
  const model = await computeModel();
  const c = model.concerts.find(x => x.short === req.params.short);
  if (!c) return res.status(404).json({error:'Concerto non trovato'});
  res.json({ roster: c.roster, counts: c.counts, required: c.required, header: c.header, meta: c.meta });
} catch(e){ next(e); }});

app.get('/api/admin/members', needAdmin, async (req,res,next)=>{ try{
  const model = await computeModel();
  res.json({ members: model.members, countsByInstrument: model.countsByInstrument });
} catch(e){ next(e); }});

app.put('/api/admin/concerts/:short/close', needAdmin, (req,res)=>{
  const { closed } = req.body || {};
  const short = req.params.short;
  if (typeof closed !== 'boolean') return res.status(400).json({error:'closed boolean mancante'});
  CONFIG.closed = CONFIG.closed || {};
  CONFIG.closed[short] = closed;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG,null,2));
  res.json({ok:true, closed});
});
app.get('/api/admin/config', needAdmin, (req,res)=> res.json(CONFIG));
app.put('/api/admin/concerts/:short/organico', needAdmin, (req,res)=>{
  const { organico } = req.body || {};
  const short = req.params.short;
  if (!organico || typeof organico !== 'object') return res.status(400).json({error:'organico mancante'});
  const idx = (CONFIG.concerts||[]).findIndex(c=>c.short===short);
  if (idx<0) CONFIG.concerts.push({ short, organico });
  else CONFIG.concerts[idx].organico = organico;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG,null,2));
  res.json({ok:true});
});
app.put('/api/admin/roles', needAdmin, (req,res)=>{
  const { roles } = req.body || {};
  if (!roles || typeof roles !== 'object') return res.status(400).json({error:'roles mancante'});
  CONFIG.roles = roles;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG,null,2));
  res.json({ok:true});
});

// Static
const PUBLIC_DIR = path.join(process.cwd(), 'public');
app.use(express.static(PUBLIC_DIR));
app.get('*', (req,res)=>res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => console.log(`✅ ICNT portal @ http://127.0.0.1:${PORT}`));

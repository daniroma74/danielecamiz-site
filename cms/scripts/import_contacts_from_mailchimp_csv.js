// cms/scripts/import_contacts_from_mailchimp_csv.js
// Import Mailchimp CSV (subscribed / unsubscribed / cleaned) into DB Unico v1.2
// - Zero dipendenze esterne
// - Idempotente (upsert per email)
// - Transazione per file
// - Opzioni: --file, --status, --list, --source, --dry-run, --delimiter, --encoding
//   Esempi:
//     node cms/scripts/import_contacts_from_mailchimp_csv.js \
//       --file /path/subscribed.csv --status subscribed --source mailchimp-2025
//     node cms/scripts/import_contacts_from_mailchimp_csv.js \
//       --file /path/unsubscribed.csv --status unsubscribed --source mailchimp-2025
//     node cms/scripts/import_contacts_from_mailchimp_csv.js \
//       --file /path/cleaned.csv --status bounced --source mailchimp-2025

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { getDb as getMainDb } from '../utils/sqliteMain.js';

// -----------------------------
// Args parsing (no deps)
// -----------------------------
function parseArgs(argv) {
  const args = {
    file: null,
    status: null,
    list: 'newsletter',
    listName: 'Newsletter',
    source: 'mailchimp-import',
    dryRun: false,
    delimiter: ',',
    encoding: 'utf8'
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = i + 1 < argv.length ? argv[i + 1] : null;
    const eat = () => { i++; return next; };
    switch (a) {
      case '--file': args.file = eat(); break;
      case '--status': args.status = eat(); break;
      case '--list': args.list = eat(); break;
      case '--list-name': args.listName = eat(); break;
      case '--source': args.source = eat(); break;
      case '--delimiter': args.delimiter = eat() || ','; break;
      case '--encoding': args.encoding = eat() || 'utf8'; break;
      case '--dry-run': case '--dryrun': case '-n': args.dryRun = true; break;
      default: break;
    }
  }
  return args;
}

function printUsageAndExit(msg) {
  if (msg) console.error(msg);
  console.error(`\nUsage:\n  node cms/scripts/import_contacts_from_mailchimp_csv.js \\
    --file <path.csv> [--status subscribed|unsubscribed|bounced|canceled] \\
    [--list newsletter] [--list-name "Newsletter"] [--source mailchimp-2025] \\
    [--dry-run] [--delimiter ,] [--encoding utf8]\n`);
  process.exit(1);
}

// -----------------------------
// CSV parsing (robusto, no deps)
// -----------------------------
function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvRecord(line, delimiter = ',') {
  // Parser CSV per UNA riga (può terminare "incompleta" se ci sono \n dentro campi quotati)
  // Restituisce { fields, complete } — complete=false se la riga termina ancora in quote aperte
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { // escape ""
        cur += '"';
        i++; // salta il secondo
      } else {
        inQuotes = !inQuotes; // toggle stato quote
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return { fields: out, complete: !inQuotes };
}

async function* csvRecordsStream(filePath, { delimiter = ',', encoding = 'utf8' } = {}) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding }),
    crlfDelay: Infinity
  });
  let acc = '';
  for await (const line of rl) {
    const chunk = acc ? (acc + '\n' + line) : line;
    const { fields, complete } = parseCsvRecord(chunk, delimiter);
    if (complete) {
      yield fields;
      acc = '';
    } else {
      acc = chunk; // accumula finché non chiude le quote
    }
  }
  if (acc) {
    const { fields, complete } = parseCsvRecord(acc, delimiter);
    if (complete) yield fields; // ultima riga
  }
}

// -----------------------------
// DB helpers (promisify sqlite3)
// -----------------------------
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // this.changes, this.lastID
    });
  });
}
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
  });
}
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

// -----------------------------
// Mailchimp mapping helpers
// -----------------------------
function inferStatusFromPath(p) {
  const s = p.toLowerCase();
  if (s.includes('unsub')) return 'unsubscribed';
  if (s.includes('clean')) return 'bounced';
  if (s.includes('subscr')) return 'subscribed';
  return null;
}

function normalizeStatus(raw, fallback = null) {
  const s = String(raw || fallback || '').trim().toLowerCase();
  if (!s) return null;
  if (['subscribed', 'subscribe'].includes(s)) return 'subscribed';
  if (['unsubscribed', 'unsubscribe'].includes(s)) return 'unsubscribed';
  if (['cleaned', 'bounced', 'bounce'].includes(s)) return 'bounced';
  if (['pending'].includes(s)) return 'canceled';
  return 'canceled';
}

function pickFirstNonEmpty(obj, keys = []) {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
}

function parseDateToISO(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function ensureList(db, slug, name) {
  const row = await dbGet(db, 'SELECT id FROM lists WHERE slug = ?', [slug]);
  if (row) return row.id;
  await dbRun(db, 'INSERT INTO lists(name, slug) VALUES(?, ?)', [name || slug, slug]);
  const row2 = await dbGet(db, 'SELECT id FROM lists WHERE slug = ?', [slug]);
  return row2?.id;
}

async function getOrCreateContact(db, { email, name, source, status, tsSubscribed, tsUnsubscribed }) {
  const existing = await dbGet(db, 'SELECT id, status, subscribed_at, unsubscribed_at FROM contacts WHERE email = ?', [email]);
  if (!existing) {
    await dbRun(
      db,
      `INSERT INTO contacts(email, name, source, status, subscribed_at, unsubscribed_at)
       VALUES(?, ?, ?, ?, ?, ?)`,
      [
        email,
        name || null,
        source || null,
        status,
        status === 'subscribed' ? (tsSubscribed || null) : null,
        ['unsubscribed', 'bounced', 'canceled'].includes(status) ? (tsUnsubscribed || null) : null
      ]
    );
    const row = await dbGet(db, 'SELECT id FROM contacts WHERE email=?', [email]);
    return { id: row.id, created: true };
  }

  // Update logic (non distruttivo sui timestamp esistenti se non necessario)
  if (existing.status !== status) {
    const subsAt = status === 'subscribed' ? (tsSubscribed || existing.subscribed_at) : existing.subscribed_at;
    const unsubAt = ['unsubscribed', 'bounced', 'canceled'].includes(status)
      ? (tsUnsubscribed || existing.unsubscribed_at) : existing.unsubscribed_at;
    await dbRun(
      db,
      `UPDATE contacts
       SET name = COALESCE(?, name),
           source = COALESCE(?, source),
           status = ?,
           subscribed_at = ?,
           unsubscribed_at = ?
       WHERE email = ?`,
      [name || null, source || null, status, subsAt || null, unsubAt || null, email]
    );
  } else if (name || source || tsSubscribed || tsUnsubscribed) {
    // status invariato: aggiorna eventuali metadati mancanti
    const subsAt = existing.subscribed_at || (status === 'subscribed' ? tsSubscribed : null);
    const unsubAt = existing.unsubscribed_at || (['unsubscribed', 'bounced', 'canceled'].includes(status) ? tsUnsubscribed : null);
    await dbRun(
      db,
      `UPDATE contacts
       SET name = COALESCE(?, name),
           source = COALESCE(?, source),
           subscribed_at = COALESCE(?, subscribed_at),
           unsubscribed_at = COALESCE(?, unsubscribed_at)
       WHERE email = ?`,
      [name || null, source || null, subsAt || null, unsubAt || null, email]
    );
  }
  return { id: (await dbGet(db, 'SELECT id FROM contacts WHERE email=?', [email])).id, created: false };
}

async function ensureSubscription(db, { listId, contactId }) {
  await dbRun(
    db,
    `INSERT OR IGNORE INTO list_subscriptions(list_id, contact_id)
     VALUES(?, ?)`,
    [listId, contactId]
  );
}

async function ensureConsent(db, { contactId, purpose, grantedAt, source }) {
  // Evita duplicati espliciti (stesso contactId/purpose/data): usa WHERE NOT EXISTS
  await dbRun(
    db,
    `INSERT INTO consents(contact_id, purpose, granted_at, ip, ua, source)
     SELECT ?, ?, ?, NULL, NULL, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM consents WHERE contact_id=? AND purpose=? AND granted_at IS ?
     )`,
    [contactId, purpose, grantedAt || null, source || null, contactId, purpose, grantedAt || null]
  );
}

// -----------------------------
// MAIN
// -----------------------------
(async function main() {
  const args = parseArgs(process.argv);
  if (!args.file) printUsageAndExit('Missing --file');

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) printUsageAndExit(`File not found: ${filePath}`);

  // status: da colonna Status, o da --status, o da nome file
  const inferred = inferStatusFromPath(filePath);
  const canonicalStatus = normalizeStatus(args.status || inferred || null);

  const db = await getMainDb();

  let processed = 0, inserted = 0, updated = 0, subscribed = 0, unsubscribed = 0, bounced = 0;
  const startedAt = Date.now();

  const listSlug = args.list || 'newsletter';
  const listName = args.listName || 'Newsletter';
  let listId = null;
  if (!args.dryRun) {
    listId = await ensureList(db, listSlug, listName);
  } else {
    const row = await dbGet(db, 'SELECT id FROM lists WHERE slug=?', [listSlug]);
    listId = row?.id || null;
  }

  // Transazione per file
  if (!args.dryRun) await dbRun(db, 'BEGIN');

  let header = null;
  for await (const fields of csvRecordsStream(filePath, { delimiter: args.delimiter, encoding: args.encoding })) {
    if (!header) {
      header = fields.map(normalizeHeader);
      continue;
    }
    const row = {};
    header.forEach((h, i) => { row[h] = fields[i] !== undefined ? String(fields[i]).trim() : ''; });

    // colonne comuni possibili
    const email = (row.email_address || row.email || row.e_mail || '').toLowerCase();
    if (!email || !email.includes('@')) { continue; }

    const first = row.first_name || row.fname || row.firstname;
    const last = row.last_name || row.lname || row.lastname;
    const fullName = row.full_name || row.name || [first, last].filter(Boolean).join(' ') || null;

    const statusRaw = row.status || canonicalStatus || 'canceled';
    const status = normalizeStatus(statusRaw);

    // timestamp: varianti possibili in export
    const tsSub = parseDateToISO(pickFirstNonEmpty(row, [
      'optin_time','confirm_time','timestamp','signup_time','date_added','created_at','last_changed'
    ]));
    const tsUnsub = parseDateToISO(pickFirstNonEmpty(row, [
      'unsubscribe_time','unsubscribed_time','unsubscribed_date','last_changed','timestamp','confirm_time'
    ]));

    processed++;

    if (args.dryRun) {
      // Log minimal in dry-run
      if (processed <= 5) {
        console.log(`[dry-run] ${email} | ${status} | name="${fullName || ''}" subAt=${tsSub || '-'} unsubAt=${tsUnsub || '-'}`);
      }
      if (status === 'subscribed') subscribed++; else if (status === 'unsubscribed') unsubscribed++; else if (status === 'bounced') bounced++;
      continue;
    }

    // Upsert contatto
    const before = await dbGet(db, 'SELECT id, status FROM contacts WHERE email=?', [email]);
    const { id: contactId, created } = await getOrCreateContact(db, {
      email,
      name: fullName,
      source: args.source,
      status,
      tsSubscribed: tsSub,
      tsUnsubscribed: tsUnsub
    });

    if (created) {
      inserted++;
    } else if (!before || before.status !== status || fullName) {
      updated++;
    }

    if (status === 'subscribed') {
      subscribed++;
      if (listId) await ensureSubscription(db, { listId, contactId });
      await ensureConsent(db, { contactId, purpose: 'newsletter', grantedAt: tsSub || null, source: args.source });
    } else if (status === 'unsubscribed') {
      unsubscribed++;
    } else if (status === 'bounced') {
      bounced++;
    }
  }

  if (!args.dryRun) await dbRun(db, 'COMMIT');

  const ms = Date.now() - startedAt;
  console.log(`[mailing-import] file=${path.basename(filePath)} processed=${processed} inserted=${inserted} updated=${updated} \n  byStatus: subscribed=${subscribed} unsubscribed=${unsubscribed} bounced=${bounced} ${args.dryRun ? '(dry-run)' : ''} time=${ms}ms`);

  process.exit(0);
})().catch(async (err) => {
  console.error('[mailing-import] ERROR', err && err.stack || err);
  try {
    const db = await getMainDb();
    await dbRun(db, 'ROLLBACK');
  } catch {}
  process.exit(1);
});

// landing/services/emailService.js
import { fileURLToPath } from 'url';
import path from 'path';
import MailService from '../../shared/mail/MailService.js';
import QRCode from 'qrcode';

const mailService = new MailService();
const TZ = process.env.TZ || 'Europe/Rome';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAIN_DB_PATH = process.env.MAIN_DB_PATH || path.resolve(__dirname, '../../cms/db/main.sqlite');

function stripHtml(html = '') { 
  return String(html).replace(/<[^>]*>/g, '').replace(/[ \t]+\n/g, '\n').trim(); 
}

function fullName(booking) {
  const fn = (booking?.first_name || '').trim();
  const ln = (booking?.last_name || '').trim();
  const name = [fn, ln].filter(Boolean).join(' ').trim();
  return name || (booking?.name || '').trim() || '';
}

function formatDateIT(dateStr, timeStr) {
  if (!dateStr) return '';
  const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric', 
    timeZone: TZ 
  }).format(d);
}

function formatTimeIT(dateStr, timeStr) {
  if (timeStr && String(timeStr).trim() !== '') return timeStr;
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false, 
    timeZone: TZ 
  }).format(d);
}

async function getDbClient() {
  try {
    const mod = await import('better-sqlite3');
    const Database = mod.default || mod;
    const db = new Database(MAIN_DB_PATH, { readonly: true, fileMustExist: true });
    return {
      getOne(sql, params = []) { 
        try { return db.prepare(sql).get(params); } 
        catch { return null; } 
      },
      close() { try { db.close(); } catch {} }
    };
  } catch {
    try {
      const sqlite3mod = await import('sqlite3');
      const sqlite3 = sqlite3mod.verbose();
      return {
        getOne(sql, params = []) {
          return new Promise(resolve => {
            const db = new sqlite3.Database(MAIN_DB_PATH, sqlite3.OPEN_READONLY, () => {
              db.get(sql, params, (e, row) => { 
                db.close(); 
                resolve(row || null); 
              });
            });
          });
        },
        close() {}
      };
    } catch (err2) {
      console.warn('[mail] Nessun client SQLite disponibile.');
      return null;
    }
  }
}

async function lookupConcertByIdOrSlug(key) {
  const s = String(key || '').trim();
  if (!s) return null;
  const db = await getDbClient();
  if (!db) return null;
  try {
    let row = await db.getOne(
      'SELECT title, subtitle, date, starts_at, location FROM concerts WHERE slug = ? LIMIT 1', 
      [s]
    );
    if (!row && /^\d+$/.test(s)) {
      row = await db.getOne(
        'SELECT title, subtitle, date, starts_at, location FROM concerts WHERE id = ? LIMIT 1', 
        [Number(s)]
      );
    }
    return row || null;
  } finally {
    db.close();
  }
}

export async function sendBookingConfirmation(bookingArg, eventArg = {}) {
  const booking = bookingArg || {};
  const eventInput = (eventArg && typeof eventArg === 'object' && Object.keys(eventArg).length)
    ? eventArg
    : (booking.event || {});

  const recipient = (booking?.email || '').trim();
  if (!recipient) return { success: false, error: 'Email destinatario mancante' };

  let title = (eventInput?.title || '').trim();
  let subtitle = (eventInput?.subtitle || '').trim();
  let dateStr = (eventInput?.date || '').trim();
  let timeStr = (eventInput?.starts_at || eventInput?.time || '').trim();
  let location = (eventInput?.location || '').trim();

  if (!title || !dateStr || !location) {
    const key = booking?.event_id || eventInput?.slug || '';
    if (key) {
      const row = await lookupConcertByIdOrSlug(key);
      if (row) {
        title    = title    || (row.title || '');
        subtitle = subtitle || (row.subtitle || '');
        dateStr  = dateStr  || (row.date || '');
        timeStr  = timeStr  || (row.starts_at || '');
        location = location || (row.location || '');
      }
    }
  }

  const dateLabel = formatDateIT(dateStr, timeStr);
  const timeLabel = formatTimeIT(dateStr, timeStr);
  const seats = Number(booking?.seats ?? 1) || 1;
  const bookingCode = (booking?.code || booking?.booking_code || '').trim();
  const who = fullName(booking);

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(bookingCode, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      color: { dark: '#1a1a1a', light: '#ffffff' }
    });
  } catch (qrError) {
    console.warn('[mail] QR Code generation failed:', qrError);
  }

  const subtitleHtml = subtitle ? `<p style="font-style:italic; color:#666;">${subtitle}</p>` : '';
  const dateHtml = dateLabel ? `<p><strong>Data:</strong> ${dateLabel}</p>` : '';
  const timeHtml = timeLabel ? `<p><strong>Orario:</strong> ${timeLabel}</p>` : '';
  const locHtml  = location  ? `<p><strong>Luogo:</strong> ${location}</p>`   : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: #d4af37; padding: 30px; text-align: center; }
    .header-logo { font-size: 1.8em; font-weight: bold; margin-bottom: 5px; }
    .header-subtitle { font-size: 0.9em; opacity: 0.8; }
    .content { background: #fff; padding: 30px; }
    .details { background: #f8f8f8; padding: 20px; margin: 20px 0; border-left: 4px solid #d4af37; }
    .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f8f8f8; border-radius: 8px; }
    .qr-code { max-width: 300px; height: auto; margin: 20px auto; }
    .code { font-family: monospace; font-size: 1.3em; color: #d4af37; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    h1 { margin: 0; font-size: 2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">ICNT</div>
      <div class="header-subtitle">I Concerti Nel Tempio</div>
      <h1 style="margin-top: 20px;">Prenotazione Confermata</h1>
    </div>
    <div class="content">
      <p>Gentile <strong>${who}</strong>,</p>
      <p>La tua prenotazione è stata confermata con successo!</p>
      <div class="details">
        <h2 style="margin-top:0; color: #d4af37;">${title || 'Evento'}</h2>
        ${subtitleHtml}
        ${dateHtml}
        ${timeHtml}
        ${locHtml}
        <p><strong>Posti prenotati:</strong> ${seats}</p>
      </div>
      <div class="qr-section">
        <p style="margin-bottom: 15px;"><strong>Il tuo codice prenotazione:</strong></p>
        <p class="code">${bookingCode}</p>
        ${qrCodeDataUrl ? `
          <p style="margin: 20px 0 10px; font-size: 0.9em; color: #666;">Mostra questo QR Code all'ingresso:</p>
          <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code">
        ` : ''}
      </div>
      <p style="margin-top: 30px;">Ti aspettiamo!</p>
      <div class="footer">
        <p><strong>ICNT - I Concerti Nel Tempio</strong></p>
        <p style="font-size:0.85em; color:#999;">Per qualsiasi informazione: icnt@danielecamiz.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `ICNT - I Concerti Nel Tempio
Prenotazione Confermata

Gentile ${who},
La tua prenotazione per "${title || 'Evento'}" è stata confermata.

Dettagli:
${dateLabel ? `- Data: ${dateLabel}` : ''}
${timeLabel ? `- Orario: ${timeLabel}` : ''}
${location ? `- Luogo: ${location}` : ''}

Posti: ${seats}
Codice prenotazione: ${bookingCode}

Ti aspettiamo!
ICNT - I Concerti Nel Tempio
icnt@danielecamiz.com`;

  const headers = {
    'X-Booking-Code': bookingCode || '',
    'X-Event-Id': (booking?.event_id || '').toString()
  };

  try {
    const result = await mailService.sendHtml({
      from: '"ICNT - I Concerti Nel Tempio" <icnt@danielecamiz.com>',
      to: recipient,
      subject: `Conferma prenotazione – ${title || 'Evento'}`,
      html,
      text,
      headers,
      replyTo: 'icnt@danielecamiz.com'
    });
    console.log(`Email inviata a ${recipient}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Errore invio email:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export default mailService;
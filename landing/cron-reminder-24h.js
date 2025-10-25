// landing/cron-reminder-24h.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import MailService from '../shared/mail/MailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../cms/db/main.sqlite');
const mailService = new MailService();

console.log('====================================');
console.log('🔔 CRON: Reminder 24h avviato');
console.log('====================================');
console.log('Database:', DB_PATH);
console.log('Ora:', new Date().toLocaleString('it-IT'));
console.log('====================================\n');

// Calcola data di domani
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

console.log(`📅 Cerco eventi per: ${tomorrowStr}\n`);

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

// Query per trovare prenotazioni di eventi di domani
db.all(`
  SELECT 
    b.id,
    b.code,
    b.email,
    b.first_name,
    b.last_name,
    b.seats,
    b.reminder_sent,
    c.title,
    c.subtitle,
    c.date,
    c.starts_at,
    c.location
  FROM bookings b 
  JOIN concerts c ON b.event_id = c.id 
  WHERE date(c.date) = date(?) 
    AND b.status = 'confirmed'
    AND (b.reminder_sent IS NULL OR b.reminder_sent = 0)
`, [tomorrowStr], async (err, bookings) => {
  
  if (err) {
    console.error('❌ Errore query:', err);
    db.close();
    process.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.log('✅ Nessuna prenotazione da processare per domani.');
    db.close();
    process.exit(0);
  }

  console.log(`📬 Trovate ${bookings.length} prenotazioni da notificare\n`);

  let successCount = 0;
  let errorCount = 0;

  // Processa ogni prenotazione
  for (const booking of bookings) {
    try {
      console.log(`📧 Invio reminder a: ${booking.email} (${booking.first_name})`);
      
      const result = await sendReminderEmail(booking);
      
      if (result.success) {
        // Marca come inviato nel database
        db.run(
          'UPDATE bookings SET reminder_sent = 1 WHERE id = ?',
          [booking.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`⚠️  Errore aggiornamento DB per ${booking.email}:`, updateErr);
            }
          }
        );
        
        successCount++;
        console.log(`   ✅ Inviato con successo (ID: ${result.messageId})\n`);
      } else {
        errorCount++;
        console.error(`   ❌ Errore invio: ${result.error}\n`);
      }
      
      // Pausa di 1 secondo tra un invio e l'altro
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Errore: ${error.message}\n`);
    }
  }

  console.log('====================================');
  console.log('📊 RIEPILOGO');
  console.log('====================================');
  console.log(`✅ Invii riusciti: ${successCount}`);
  console.log(`❌ Invii falliti: ${errorCount}`);
  console.log(`📬 Totale: ${bookings.length}`);
  console.log('====================================\n');

  db.close();
  process.exit(0);
});

// Funzione per inviare email reminder
async function sendReminderEmail(booking) {
  const fullName = [booking.first_name, booking.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  // Formatta data e ora in italiano
  const eventDate = new Date(`${booking.date}T${booking.starts_at || '20:00'}:00`);
  const dateFormatted = eventDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeFormatted = booking.starts_at || '20:00';

  // Genera QR Code
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(booking.code, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff'
      }
    });
  } catch (qrError) {
    console.warn('   ⚠️  QR Code generation failed:', qrError.message);
  }

  const subtitleHtml = booking.subtitle 
    ? `<p style="font-style:italic; color:#666;">${booking.subtitle}</p>` 
    : '';

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
    .reminder-badge { background: #ff6b6b; color: white; padding: 10px 20px; border-radius: 50px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .details { background: #f8f8f8; padding: 20px; margin: 20px 0; border-left: 4px solid #d4af37; }
    .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f8f8f8; border-radius: 8px; }
    .qr-code { max-width: 300px; height: auto; margin: 20px auto; }
    .code { font-family: monospace; font-size: 1.3em; color: #d4af37; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    h1 { margin: 0; font-size: 2em; }
    .important { color: #ff6b6b; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">ICNT</div>
      <div class="header-subtitle">I Concerti Nel Tempio</div>
      <h1 style="margin-top: 20px;">Promemoria Evento</h1>
    </div>
    <div class="content">
      <p>Gentile <strong>${fullName}</strong>,</p>
      
      <div class="reminder-badge">
        🔔 L'evento è DOMANI!
      </div>
      
      <p>Ti ricordiamo che domani si terrà l'evento per cui hai prenotato:</p>
      
      <div class="details">
        <h2 style="margin-top:0; color: #d4af37;">${booking.title}</h2>
        ${subtitleHtml}
        <p><strong>📅 Data:</strong> ${dateFormatted}</p>
        <p><strong>🕐 Orario:</strong> ${timeFormatted}</p>
        <p><strong>📍 Luogo:</strong> ${booking.location}</p>
        <p><strong>👥 Posti prenotati:</strong> ${booking.seats}</p>
      </div>
      
      <p class="important">⚠️ Ti consigliamo di arrivare almeno 15 minuti prima dell'inizio.</p>
      
      <div class="qr-section">
        <p style="margin-bottom: 15px;"><strong>Il tuo codice prenotazione:</strong></p>
        <p class="code">${booking.code}</p>
        ${qrCodeDataUrl ? `
          <p style="margin: 20px 0 10px; font-size: 0.9em; color: #666;">Mostra questo QR Code all'ingresso:</p>
          <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code">
        ` : ''}
      </div>
      
      <p style="margin-top: 30px;">Ci vediamo domani!</p>
      
      <div class="footer">
        <p><strong>ICNT - I Concerti Nel Tempio</strong></p>
        <p style="font-size:0.85em; color:#999;">Per qualsiasi informazione: icnt@danielecamiz.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `
ICNT - I Concerti Nel Tempio
PROMEMORIA EVENTO

Gentile ${fullName},

🔔 L'evento è DOMANI!

Ti ricordiamo che domani si terrà l'evento per cui hai prenotato:

"${booking.title}"
${booking.subtitle ? booking.subtitle : ''}

📅 Data: ${dateFormatted}
🕐 Orario: ${timeFormatted}
📍 Luogo: ${booking.location}
👥 Posti: ${booking.seats}

⚠️ Ti consigliamo di arrivare almeno 15 minuti prima dell'inizio.

Codice prenotazione: ${booking.code}

Ci vediamo domani!

ICNT - I Concerti Nel Tempio
icnt@danielecamiz.com
`;

  try {
    const result = await mailService.sendHtml({
      from: '"ICNT - I Concerti Nel Tempio" <icnt@danielecamiz.com>',
      to: booking.email,
      subject: `Promemoria: ${booking.title} è domani!`,
      html,
      text: text.trim(),
      headers: {
        'X-Booking-Code': booking.code,
        'X-Event-Date': booking.date,
        'X-Reminder-Type': '24h'
      },
      replyTo: 'icnt@danielecamiz.com'
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Gestione timeout
setTimeout(() => {
  console.error('⏱️  Timeout: script bloccato, chiusura forzata');
  db.close();
  process.exit(1);
}, 5 * 60 * 1000); // 5 minuti max
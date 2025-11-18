import nodemailer from 'nodemailer';
import { SMTP_CONFIG, EMAIL_FROM } from '../config/constants.js';

// Create transporter
let transporter;

try {
  // Check if SMTP is configured
  if (SMTP_CONFIG.auth && SMTP_CONFIG.auth.user) {
    transporter = nodemailer.createTransporter(SMTP_CONFIG);
    console.log('✅ Email transporter configured');
  } else {
    console.log('⚠️  Email not configured (set SMTP credentials in .env)');
  }
} catch (error) {
  console.error('❌ Error configuring email:', error.message);
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(booking) {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  const concertDate = new Date(booking.date).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const emailHTML = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #8B4513, #654321);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .booking-code {
          background: #f8f9fa;
          border-left: 4px solid #8B4513;
          padding: 15px;
          margin: 20px 0;
          font-size: 18px;
          font-weight: bold;
        }
        .details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #666;
        }
        .detail-value {
          color: #333;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #8B4513, #654321);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎵 Prenotazione Confermata!</h1>
      </div>

      <div class="content">
        <p>Ciao <strong>${booking.first_name}</strong>,</p>

        <p>La tua prenotazione per il concerto "<strong>${booking.title}</strong>" è stata confermata con successo!</p>

        <div class="booking-code">
          📋 Codice Prenotazione: <span style="color: #8B4513;">${booking.booking_code}</span>
        </div>

        <p><strong>Conserva questo codice!</strong> Ti servirà all'ingresso del concerto.</p>

        <div class="details">
          <h3 style="margin-top: 0;">📅 Dettagli Concerto</h3>

          <div class="detail-row">
            <span class="detail-label">Data</span>
            <span class="detail-value">${concertDate}</span>
          </div>

          ${booking.time ? `
          <div class="detail-row">
            <span class="detail-label">Orario</span>
            <span class="detail-value">${booking.time}</span>
          </div>
          ` : ''}

          ${booking.location ? `
          <div class="detail-row">
            <span class="detail-label">Luogo</span>
            <span class="detail-value">${booking.location}</span>
          </div>
          ` : ''}

          <div class="detail-row">
            <span class="detail-label">Posti Prenotati</span>
            <span class="detail-value">${booking.seats} ${booking.seats === 1 ? 'posto' : 'posti'}</span>
          </div>
        </div>

        <h3>📝 I Tuoi Dati</h3>
        <p>
          <strong>Nome:</strong> ${booking.first_name} ${booking.last_name}<br>
          <strong>Email:</strong> ${booking.email}<br>
          ${booking.phone ? `<strong>Telefono:</strong> ${booking.phone}<br>` : ''}
        </p>

        ${booking.notes ? `
        <p><strong>Note:</strong><br>${booking.notes}</p>
        ` : ''}

        <p style="margin-top: 30px;">
          <strong>Cosa portare:</strong><br>
          • Il tuo codice prenotazione (${booking.booking_code})<br>
          • Un documento d'identità (se richiesto)<br>
          • Il tuo entusiasmo! 🎉
        </p>

        <p>Non vediamo l'ora di vederti al concerto!</p>

        <p style="margin-top: 30px;">
          Un abbraccio,<br>
          <strong>Coro Raro</strong>
        </p>
      </div>

      <div class="footer">
        <p>
          <strong>Coro Raro</strong> - Voci dal Mondo per un Mondo Migliore<br>
          <a href="https://cororaro.it" style="color: #8B4513;">www.cororaro.it</a>
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          Questa è una conferma automatica. Non rispondere a questa email.<br>
          Per assistenza, contattaci a info@cororaro.it
        </p>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Ciao ${booking.first_name},

La tua prenotazione per il concerto "${booking.title}" è stata confermata!

CODICE PRENOTAZIONE: ${booking.booking_code}
(Conserva questo codice, ti servirà all'ingresso)

DETTAGLI CONCERTO:
- Data: ${concertDate}
${booking.time ? `- Orario: ${booking.time}` : ''}
${booking.location ? `- Luogo: ${booking.location}` : ''}
- Posti: ${booking.seats}

I TUOI DATI:
- Nome: ${booking.first_name} ${booking.last_name}
- Email: ${booking.email}
${booking.phone ? `- Telefono: ${booking.phone}` : ''}

${booking.notes ? `Note: ${booking.notes}` : ''}

Non vediamo l'ora di vederti al concerto!

Un abbraccio,
Coro Raro

---
www.cororaro.it
Per assistenza: info@cororaro.it
  `;

  const mailOptions = {
    from: EMAIL_FROM,
    to: booking.email,
    subject: `✅ Prenotazione Confermata - ${booking.title}`,
    text: emailText,
    html: emailHTML
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email sent:', info.messageId);

  return info;
}

/**
 * Send newsletter signup confirmation
 */
export async function sendNewsletterConfirmation(subscriber) {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  const emailHTML = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #4a7c59, #2d5d3d);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e0e0e0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💌 Benvenuto nella Newsletter!</h1>
      </div>

      <div class="content">
        <p>Ciao <strong>${subscriber.first_name || 'Amico del Coro'}</strong>,</p>

        <p>Grazie per esserti iscritto alla newsletter del <strong>Coro Raro</strong>!</p>

        <p>Da oggi riceverai aggiornamenti su:</p>
        <ul>
          <li>🎵 Prossimi concerti ed eventi</li>
          <li>🌍 Nuovi brani dal mondo</li>
          <li>💚 Progetti di solidarietà</li>
          <li>📸 Foto e video delle nostre performance</li>
        </ul>

        <p>Siamo felici di averti con noi in questo viaggio musicale!</p>

        <p style="margin-top: 30px;">
          Un abbraccio corale,<br>
          <strong>Coro Raro</strong>
        </p>
      </div>

      <div class="footer">
        <p>
          <strong>Coro Raro</strong> - Voci dal Mondo per un Mondo Migliore<br>
          <a href="https://cororaro.it" style="color: #4a7c59;">www.cororaro.it</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: EMAIL_FROM,
    to: subscriber.email,
    subject: '💌 Benvenuto nella Newsletter del Coro Raro!',
    html: emailHTML
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Newsletter confirmation sent:', info.messageId);

  return info;
}

/**
 * Send newsletter to subscriber
 */
export async function sendNewsletter(email, name, subject, messageContent) {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  const emailHTML = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #8B4513, #654321);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .message {
          white-space: pre-wrap;
          line-height: 1.8;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎵 Coro Raro</h1>
      </div>

      <div class="content">
        ${name ? `<p>Ciao <strong>${name}</strong>,</p>` : '<p>Ciao,</p>'}

        <div class="message">
${messageContent}
        </div>

        <p style="margin-top: 30px;">
          Un abbraccio,<br>
          <strong>Coro Raro</strong>
        </p>
      </div>

      <div class="footer">
        <p>
          <strong>Coro Raro</strong> - Voci dal Mondo per un Mondo Migliore<br>
          <a href="https://cororaro.it" style="color: #8B4513;">www.cororaro.it</a>
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          Hai ricevuto questa email perché sei iscritto alla newsletter.<br>
          Per disiscriverti, contattaci a info@cororaro.it
        </p>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: subject,
    text: messageContent, // Plain text fallback
    html: emailHTML
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Newsletter sent to ${email}:`, info.messageId);

  return info;
}

export default { sendBookingConfirmation, sendNewsletterConfirmation, sendNewsletter };

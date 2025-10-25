// server/utils/mailer.js
import nodemailer from 'nodemailer';

const MAIL_ENABLED = String(process.env.MAIL_ENABLED || 'false').toLowerCase() === 'true';
let transporter = null;

if(MAIL_ENABLED){
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

export async function sendBookingEmail({ event, booking }){
  const from = process.env.MAIL_FROM || 'I Concerti nel Tempio <noreply@danielecamiz.com>';
  const lang = booking.language === 'en' ? 'en' : 'it';
  const base = process.env.BASE_URL || 'https://danielecamiz.com';
  const icsUrl = `${base}/api/events/${encodeURIComponent(event.slug)}.ics`;

  const subject = lang==='it'
    ? `Conferma prenotazione — ${event.title?.it || 'Concerto'}`
    : `Booking confirmation — ${event.title?.en || 'Concert'}`;

  const lines_it = [
    `Ciao ${booking.first_name},`,
    `la tua prenotazione è ${booking.status==='confirmed'?'confermata':'in lista d’attesa'}.`,
    `Evento: ${event.title?.it || ''}`,
    `Quando: ${new Date(event.datetime).toLocaleString('it-IT',{ timeZone:'Europe/Rome' })}`,
    `Aggiungi al calendario: ${icsUrl}`,
    `Grazie, I Concerti nel Tempio`
  ];
  const lines_en = [
    `Hi ${booking.first_name},`,
    `your booking is ${booking.status==='confirmed'?'confirmed':'on the waitlist'}.`,
    `Event: ${event.title?.en || ''}`,
    `When: ${new Date(event.datetime).toLocaleString('en-GB',{ timeZone:'Europe/Rome' })}`,
    `Add to calendar: ${icsUrl}`,
    `Thank you, I Concerti nel Tempio`
  ];
  const text = (lang==='it'?lines_it:lines_en).join('\n');

  if(!MAIL_ENABLED){ console.log('[MAIL OFF] Would send:', { to: booking.email, subject, text }); return; }
  await transporter.sendMail({ from, to: booking.email, subject, text });
}

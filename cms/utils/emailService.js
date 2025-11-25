// cms/utils/emailService.js
// Email service for sending newsletter confirmations and notifications

import { createTransport } from 'nodemailer';
import crypto from 'crypto';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || process.env.ORG_EMAIL || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'news@danielecamiz.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

/**
 * Create nodemailer transporter using sendmail (postfix)
 */
function getTransporter() {
  // Use sendmail transport (postfix already configured)
  return createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });
}

/**
 * Generate unsubscribe token for email
 */
export function generateUnsubscribeToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'change-this-secret-in-production';
  const hash = crypto.createHmac('sha256', secret)
    .update(email.toLowerCase().trim())
    .digest('hex');
  return hash.substring(0, 32);
}

/**
 * Verify unsubscribe token
 */
export function verifyUnsubscribeToken(email, token) {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

/**
 * Build unsubscribe URL
 */
function buildUnsubscribeUrl(email, lang = 'it') {
  const token = generateUnsubscribeToken(email);
  const encodedEmail = encodeURIComponent(email);
  return `${BASE_URL}/newsletter/unsubscribe?email=${encodedEmail}&token=${token}&lang=${lang}`;
}

/**
 * Send confirmation email after newsletter subscription
 */
export async function sendSubscriptionConfirmation(email, preferences, lang = 'it') {
  const transporter = getTransporter();

  const unsubscribeUrl = buildUnsubscribeUrl(email, lang);
  const manageUrl = `${BASE_URL}/newsletter/manage?email=${encodeURIComponent(email)}&token=${generateUnsubscribeToken(email)}&lang=${lang}`;

  // Email content in Italian or English
  const subject = lang === 'en'
    ? '✅ Newsletter subscription confirmed - Daniele Camiz'
    : '✅ Iscrizione alla newsletter confermata - Daniele Camiz';

  const preferencesText = lang === 'en'
    ? `You will receive:${preferences.wants_site_news ? '\n• News and updates from the website' : ''}${preferences.wants_concerts ? '\n• Concert announcements and updates' : ''}`
    : `Riceverai:${preferences.wants_site_news ? '\n• News e aggiornamenti dal sito' : ''}${preferences.wants_concerts ? '\n• Annunci e aggiornamenti sui concerti' : ''}`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2c3e50, #34495e); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e1e8ed; border-top: none; }
    .preferences { background: #f8f9fa; padding: 15px; border-left: 4px solid #d4af37; margin: 20px 0; }
    .preferences ul { margin: 10px 0; padding-left: 20px; }
    .button { display: inline-block; background: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #7f8c8d; border-radius: 0 0 8px 8px; }
    .unsubscribe { margin-top: 20px; font-size: 13px; color: #95a5a6; }
    .unsubscribe a { color: #7f8c8d; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎼 ${lang === 'en' ? 'Welcome!' : 'Benvenuto!'}</h1>
  </div>

  <div class="content">
    <h2>${lang === 'en' ? 'Subscription confirmed' : 'Iscrizione confermata'}</h2>

    <p>${lang === 'en'
      ? `Thank you for subscribing to Daniele Camiz's newsletter!`
      : `Grazie per esserti iscritto alla newsletter di Daniele Camiz!`}</p>

    <div class="preferences">
      <strong>${lang === 'en' ? 'Your preferences:' : 'Le tue preferenze:'}</strong>
      <ul>
        ${preferences.wants_site_news ? `<li>${lang === 'en' ? 'News and updates from the website' : 'News e aggiornamenti dal sito'}</li>` : ''}
        ${preferences.wants_concerts ? `<li>${lang === 'en' ? 'Concert announcements and updates' : 'Annunci e aggiornamenti sui concerti'}</li>` : ''}
      </ul>
    </div>

    <p>${lang === 'en'
      ? `You'll receive periodic emails based on your preferences. We respect your inbox and will only send relevant, quality content.`
      : `Riceverai email periodiche in base alle tue preferenze. Rispettiamo la tua casella di posta e invieremo solo contenuti pertinenti e di qualità.`}</p>

    <a href="${BASE_URL}" class="button">${lang === 'en' ? 'Visit the website' : 'Visita il sito web'}</a>

    <div class="unsubscribe">
      <p>${lang === 'en'
        ? `Want to change your preferences?`
        : `Vuoi modificare le tue preferenze?`}</p>
      <a href="${manageUrl}" style="color: #d4af37; font-weight: 600;">${lang === 'en' ? 'Manage Preferences' : 'Gestisci Preferenze'}</a>

      <p style="margin-top: 20px; font-size: 13px;">${lang === 'en'
        ? `If you didn't sign up or want to completely unsubscribe:`
        : `Se non ti sei iscritto o vuoi cancellarti completamente:`}</p>
      <a href="${unsubscribeUrl}">${lang === 'en' ? 'Unsubscribe' : 'Cancella iscrizione'}</a>
    </div>
  </div>

  <div class="footer">
    <p>Daniele Camiz - ${lang === 'en' ? 'Orchestra Conductor' : 'Direttore d\'Orchestra'}</p>
    <p>${lang === 'en' ? 'Contact:' : 'Contatto:'} ${FROM_EMAIL}</p>
  </div>
</body>
</html>
`;

  const textBody = `
${subject}

${lang === 'en' ? 'Thank you for subscribing to Daniele Camiz\'s newsletter!' : 'Grazie per esserti iscritto alla newsletter di Daniele Camiz!'}

${preferencesText}

${lang === 'en' ? 'Visit the website:' : 'Visita il sito:'} ${BASE_URL}

${lang === 'en' ? 'If you didn\'t sign up or want to unsubscribe:' : 'Se non ti sei iscritto o vuoi cancellarti:'}
${unsubscribeUrl}

--
Daniele Camiz
${FROM_EMAIL}
`;

  try {
    const info = await transporter.sendMail({
      from: `"Daniele Camiz" <${FROM_EMAIL}>`,
      to: email,
      subject,
      text: textBody,
      html: htmlBody
    });

    console.log('[emailService] Confirmation sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('[emailService] Error sending confirmation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig() {
  const transporter = getTransporter();

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

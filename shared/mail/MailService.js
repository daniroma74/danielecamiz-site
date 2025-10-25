import nodemailer from 'nodemailer';

const MODE = process.env.MAIL_TRANSPORT || 'sendmail'; // 'sendmail' | 'smtp'

function createTransporter() {
  if (MODE === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 25),
      secure: false,
      ignoreTLS: true,
    });
  }
  return nodemailer.createTransport({ sendmail: true, path: '/usr/sbin/sendmail' });
}

export default class MailService {
  constructor() { this.tx = createTransporter(); }
  clean(t) { return String(t||'').replace(/–/g,'-').replace(/—/g,'--').replace(/…/g,'...'); }
  async sendHtml({ from, to, subject, html, text, headers = {} }) {
    const info = await this.tx.sendMail({
      from, to,
      subject: this.clean(subject),
      html, text,
      headers: { 'X-Mailer': 'ICNT', ...headers },
    });
    return { success: true, messageId: info.messageId };
  }
}

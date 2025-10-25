// Wrapper per il MailService condiviso
import MailService from '../../shared/mail/MailService.js';

// Crea un'istanza del servizio
const mailService = new MailService();

// Esporta la funzione per newsletter
export async function sendNewsletterEmail(to, subject, html) {
    return mailService.sendHtml({
        from: process.env.MAIL_FROM || 'newsletter@danielecamiz.com',
        to,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, '') // Versione text semplificata
    });
}

// Esporta anche il service per altri usi
export default mailService;

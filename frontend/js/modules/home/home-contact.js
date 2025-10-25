export function loadContact() {
  const contactTitleEl = document.getElementById('contact_title');
  const contactMailEl = document.getElementById('contact_mail');
  const contactMoreEl = document.getElementById('contact_more');

  if (contactTitleEl) contactTitleEl.textContent = window.labels[window.lang]?.home?.contact_title || 'Contact';
  if (contactMailEl) {
    const mailText = window.labels[window.lang]?.home?.contact_mail || 'info@danielecamiz.com';
    contactMailEl.textContent = mailText;
    contactMailEl.href = 'mailto:' + mailText;
  }
  if (contactMoreEl) contactMoreEl.textContent = window.labels[window.lang]?.home?.contact_more || 'More contacts →';
}
import QRCode from 'qrcode';
import { all } from '../config/database.js';
import { config } from '../config/config.js';

const generateQRCode = async (req, res) => {
  try {
    const url = config.frontend.contactSiteUrl;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.render('tools/qrcode', {
      title: 'QR Code Generator',
      qrDataUrl,
      url
    });
  } catch (error) {
    console.error('QR code error:', error);
    res.status(500).send('Error generating QR code');
  }
};

const previewSite = async (req, res) => {
  // Just redirect to contact site in new tab
  res.redirect(config.frontend.contactSiteUrl);
};

const exportData = async (req, res) => {
  try {
    const settings = await all('SELECT * FROM contact_settings');
    const links = await all('SELECT * FROM contact_links ORDER BY category, order_index');
    const sections = await all('SELECT * FROM contact_sections ORDER BY order_index');

    const exportData = {
      settings,
      links,
      sections,
      exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="contact-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Error exporting data');
  }
};

export default { generateQRCode, previewSite, exportData };

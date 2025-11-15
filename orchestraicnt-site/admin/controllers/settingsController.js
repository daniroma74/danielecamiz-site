// orchestraicnt-site/admin/controllers/settingsController.js
const { localDB } = require('../../config/database');

/**
 * GET /admin/settings
 * Mostra il pannello di modifica impostazioni
 */
async function showSettings(req, res) {
  try {
    const settings = await localDB.all(
      'SELECT * FROM site_settings ORDER BY setting_key ASC'
    );

    // Organizza impostazioni per sezione
    const sections = {
      hero: settings.filter(s => s.setting_key.startsWith('hero_')),
      about: settings.filter(s => s.setting_key.startsWith('about_')),
      media: settings.filter(s => s.setting_key.startsWith('media_')),
      concerts: settings.filter(s => s.setting_key.startsWith('concerts_')),
      contact: settings.filter(s => s.setting_key.startsWith('contact_')),
      footer: settings.filter(s => s.setting_key.startsWith('footer_') || s.setting_key.startsWith('social_')),
      seo: settings.filter(s => s.setting_key.startsWith('site_'))
    };

    res.render('admin/views/settings/index', {
      title: 'Impostazioni Sito - Orchestra ICNT',
      sections
    });
  } catch (error) {
    console.error('[Settings] Error loading settings:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento delle impostazioni'
    });
  }
}

/**
 * POST /admin/settings
 * Salva le impostazioni modificate
 */
async function updateSettings(req, res) {
  try {
    const updates = req.body;

    // Aggiorna ogni impostazione
    for (const [key, value] of Object.entries(updates)) {
      await localDB.run(
        'UPDATE site_settings SET setting_value = ?, updated_at = datetime("now") WHERE setting_key = ?',
        [value, key]
      );
    }

    res.json({
      success: true,
      message: '✅ Impostazioni salvate con successo!'
    });
  } catch (error) {
    console.error('[Settings] Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio delle impostazioni'
    });
  }
}

module.exports = {
  showSettings,
  updateSettings
};

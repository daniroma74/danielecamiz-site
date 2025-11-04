import { get, run } from '../config/database.js';

const showSettings = async (req, res) => {
  try {
    const settings = await get('SELECT * FROM contact_settings WHERE id = 1');

    res.render('settings/index', {
      title: 'Settings - Contact Admin',
      settings: settings || {}
    });
  } catch (error) {
    console.error('Show settings error:', error);
    res.status(500).send('Error loading settings');
  }
};

const updateSettings = async (req, res) => {
  try {
    const {
      name,
      role_it,
      role_en,
      bio_it,
      bio_en,
      avatar_url,
      footer_text_it,
      footer_text_en
    } = req.body;

    await run(
      `INSERT OR REPLACE INTO contact_settings (
        id, name, role_it, role_en, bio_it, bio_en, avatar_url,
        footer_text_it, footer_text_en, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, role_it, role_en, bio_it, bio_en, avatar_url, footer_text_it, footer_text_en]
    );

    res.redirect('/settings?success=1');
  } catch (error) {
    console.error('Update settings error:', error);
    res.redirect('/settings?error=1');
  }
};

export default { showSettings, updateSettings };

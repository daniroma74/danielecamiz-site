import { all, run } from '../config/database.js';

const listSections = async (req, res) => {
  try {
    const sections = await all('SELECT * FROM contact_sections ORDER BY order_index');

    res.render('sections/index', {
      title: 'Manage Sections - Contact Admin',
      sections
    });
  } catch (error) {
    console.error('List sections error:', error);
    res.status(500).send('Error loading sections');
  }
};

const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { title_it, title_en, visible, order_index } = req.body;

    await run(
      `UPDATE contact_sections
       SET title_it = ?, title_en = ?, visible = ?, order_index = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [title_it, title_en, visible, order_index, id]
    );

    res.redirect('/sections?success=1');
  } catch (error) {
    console.error('Update section error:', error);
    res.redirect('/sections?error=1');
  }
};

const toggleVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    await run(
      `UPDATE contact_sections
       SET visible = CASE WHEN visible = 1 THEN 0 ELSE 1 END,
           updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle section visibility error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default { listSections, updateSection, toggleVisibility };

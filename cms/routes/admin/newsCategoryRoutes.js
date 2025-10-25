

// cms/routes/admin/newsCategoryRoutes.js
import express from 'express';
import path from 'path';
import fs from 'fs/promises';

import { getOptions, getCategories, upsertCategory, deleteCategory } from '../../utils/newsCategories.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = express.Router();

/* ====== audit helper (jsonl) ====== */
async function audit(action, data = {}, req) {
  try {
    const root = process.cwd();
    const dir = path.join(root, 'data', 'backup', 'audit', 'admin-categories');
    await fs.mkdir(dir, { recursive: true });
    const iso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const file = path.join(dir, `${iso}.jsonl`);
    const entry = {
      ts: new Date().toISOString(),
      ip: req?.ip || null,
      user: req?.session?.user?.email || null,
      action,
      data
    };
    await fs.appendFile(file, JSON.stringify(entry) + '\n', 'utf8');
  } catch {}
}

/* ====== protect only /admin/news/api endpoints ====== */
router.use('/admin/news/api', ensureAuthenticated);

/* GET /admin/news/api/categories?lang=it|en */
router.get('/admin/news/api/categories', async (req, res) => {
  try {
    const lang = (req.query.lang || req.query.lng || 'it').toString().toLowerCase();
    const items = await getCategories(lang);
    const options = await getOptions(lang);
    res.json({ ok: true, items, options });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/* POST /admin/news/api/categories  { id?, label_it, label_en } */
router.post('/admin/news/api/categories', async (req, res) => {
  try {
    const { id, label_it, label_en } = (req.body || {});
    if (!label_it && !label_en) return res.status(400).json({ ok: false, error: 'missing_labels' });
    const saved = await upsertCategory({ id, label_it, label_en });
    await audit('category_upsert', saved, req);
    res.json({ ok: true, item: saved });
  } catch (err) {
    const code = (err && err.message === 'invalid_category') ? 400 : 500;
    res.status(code).json({ ok: false, error: err?.message || 'server_error' });
  }
});

/* DELETE /admin/news/api/categories/:id */
router.delete('/admin/news/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });
    const deleted = await deleteCategory(id);
    await audit('category_delete', { id, deleted }, req);
    if (!deleted) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, deleted: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

export default router;
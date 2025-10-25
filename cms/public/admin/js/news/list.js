// list.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('news_filters');

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const p = new URLSearchParams(new FormData(form));
    location.assign(`/admin/news?${p.toString()}`);
  });

  // Cambi rapidi su select/input → submit
  ['f_lang','f_status','f_q'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const ev = id === 'f_q' ? 'keyup' : 'change';
    el.addEventListener(ev, () => form?.dispatchEvent(new Event('submit', { cancelable: true })));
  });

  // Click riga per aprire edit
  document.body.addEventListener('click', (e) => {
    const tr = e.target.closest('tr.row-link');
    if (tr && !e.target.closest('.table-actions')) {
      const id = tr.getAttribute('data-id');
      if (id) location.assign(`/admin/news/${id}/edit`);
    }
  });

  // Azioni rapide
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');

    try {
      if (act === 'publish') {
        await http.post(`/admin/news/api/${id}/publish`);
        Toast.show('Pubblicato ✅','ok');
      } else if (act === 'depublish') {
        await http.post(`/admin/news/api/${id}/depublish`);
        Toast.show('Depubblicato','');
      } else if (act === 'duplicate') {
        await http.post(`/admin/news/api/${id}/duplicate`);
        Toast.show('Duplicato ✅','ok');
      } else if (act === 'delete') {
        confirmAction({
          title:'Eliminare?',
          message:'Questa azione è irreversibile.',
          onYes: async () => {
            await http.del(`/admin/news/api/${id}`);
            Toast.show('Eliminato','');
            location.reload();
          }
        });
        return;
      }
      location.reload();
    } catch (err) {
      Toast.show('Errore azione','err');
      console.error(err);
    }
  });
});
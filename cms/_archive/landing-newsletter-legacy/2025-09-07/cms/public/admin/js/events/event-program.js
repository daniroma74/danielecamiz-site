// cms/public/admin/js/events/event-program.js
// Admin – Program tab (CRUD + reorder)

(function(){
  'use strict';

  const root = document.getElementById('event_admin');
  if (!root) return;

  const tbody = document.getElementById('program_tbody');
  const titleInput = document.getElementById('program_title');
  const catalogueInput = document.getElementById('program_catalogue');
  const arrangerInput = document.getElementById('program_arranger');
  const notesInput = document.getElementById('program_notes');

  const btnReload = document.getElementById('btn_program_reload');
  const btnAdd = document.getElementById('btn_program_add');
  const btnSaveOrder = document.getElementById('btn_program_save_order');

  const urls = {
    list: root.dataset.programList,
    create: root.dataset.programCreate,
    reorder: root.dataset.programReorder,
    updateBase: root.dataset.programUpdateBase, // + id
  };

  const state = {
    items: [],
    draggingRow: null,
  };

  function jsonFetch(url, opts = {}){
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const options = Object.assign({}, opts, { headers });
    return fetch(url, options).then(async res => {
      let data = null;
      try { data = await res.json(); } catch(_){}
      if (!res.ok || (data && data.ok === false)) {
        const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      return data || { ok: true };
    });
  }

  function render(){
    tbody.innerHTML = '';
    for (const it of state.items){
      tbody.appendChild(renderRow(it));
    }
    attachDnD();
  }

  function renderRow(it){
    const tr = document.createElement('tr');
    tr.dataset.id = String(it.id);
    tr.draggable = true;

    const tdOrder = document.createElement('td');
    tdOrder.className = 'drag-handle';
    tdOrder.title = 'Trascina per ordinare';
    tdOrder.textContent = '⋮⋮';

    const tdTitle = document.createElement('td');
    tdTitle.className = 'col-title';
    tdTitle.textContent = it.title || '';

    const tdCat = document.createElement('td');
    tdCat.className = 'col-catalogue';
    tdCat.textContent = it.catalogue || '';

    const tdArr = document.createElement('td');
    tdArr.className = 'col-arranger';
    tdArr.textContent = it.arranger || '';

    const tdNotes = document.createElement('td');
    tdNotes.className = 'col-notes';
    tdNotes.textContent = it.notes || '';

    const tdAct = document.createElement('td');
    tdAct.className = 'actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-secondary';
    btnEdit.textContent = 'Modifica';
    btnEdit.addEventListener('click', () => enterEditMode(tr, it));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger';
    btnDel.textContent = 'Elimina';
    btnDel.addEventListener('click', () => onDelete(it.id));

    tdAct.appendChild(btnEdit);
    tdAct.appendChild(btnDel);

    tr.appendChild(tdOrder);
    tr.appendChild(tdTitle);
    tr.appendChild(tdCat);
    tr.appendChild(tdArr);
    tr.appendChild(tdNotes);
    tr.appendChild(tdAct);
    return tr;
  }

  function enterEditMode(tr, it){
    tr.classList.add('is-editing');
    const cells = tr.children;

    const titleEl = inputFromValue(it.title || '', 'Titolo');
    const catEl = inputFromValue(it.catalogue || '', 'Catalogo');
    const arrEl = inputFromValue(it.arranger || '', 'Arrangiatore');
    const notesEl = textareaFromValue(it.notes || '', 'Note');
    cells[1].innerHTML = '';
    cells[1].appendChild(titleEl);
    cells[2].innerHTML = '';
    cells[2].appendChild(catEl);
    cells[3].innerHTML = '';
    cells[3].appendChild(arrEl);
    cells[4].innerHTML = '';
    cells[4].appendChild(notesEl);

    const actions = cells[5];
    actions.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary';
    btnCancel.textContent = 'Annulla';
    btnCancel.addEventListener('click', () => { render(); });

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.textContent = 'Salva';
    btnSave.addEventListener('click', async () => {
      const payload = {
        title: titleEl.value.trim(),
        catalogue: catEl.value.trim() || null,
        arranger: arrEl.value.trim() || null,
        notes: notesEl.value.trim() || null,
      };
      try {
        await jsonFetch(urls.updateBase + it.id, { method: 'PUT', body: JSON.stringify(payload) });
        await load();
      } catch (err) {
        alert('Errore nel salvataggio: ' + err.message);
      }
    });

    actions.appendChild(btnCancel);
    actions.appendChild(btnSave);
  }

  function inputFromValue(val, placeholder){
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.placeholder = placeholder || '';
    input.value = val || '';
    return input;
  }

  function textareaFromValue(val, placeholder){
    const ta = document.createElement('textarea');
    ta.className = 'input';
    ta.rows = 2;
    ta.placeholder = placeholder || '';
    ta.value = val || '';
    return ta;
  }

  async function onDelete(id){
    if (!confirm('Eliminare questo elemento di programma?')) return;
    try {
      await jsonFetch(urls.updateBase + id, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert('Errore nell\'eliminazione: ' + err.message);
    }
  }

  async function onAdd(){
    const title = (titleInput?.value || '').trim();
    const catalogue = (catalogueInput?.value || '').trim();
    const arranger = (arrangerInput?.value || '').trim();
    const notes = (notesInput?.value || '').trim();
    if (!title){
      alert('Inserisci un titolo.');
      titleInput?.focus();
      return;
    }
    const payload = { title, catalogue: catalogue || null, arranger: arranger || null, notes: notes || null };
    try {
      await jsonFetch(urls.create, { method: 'POST', body: JSON.stringify(payload) });
      titleInput.value = '';
      catalogueInput.value = '';
      arrangerInput.value = '';
      notesInput.value = '';
      await load();
    } catch (err) {
      alert('Errore nella creazione: ' + err.message);
    }
  }

  async function onSaveOrder(){
    const ids = Array.from(tbody.querySelectorAll('tr')).map(tr => parseInt(tr.dataset.id, 10)).filter(Number.isInteger);
    try {
      await jsonFetch(urls.reorder, { method: 'POST', body: JSON.stringify({ orderedIds: ids }) });
      await load();
    } catch (err) {
      alert('Errore nel salvataggio dell\'ordine: ' + err.message);
    }
  }

  function attachDnD(){
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach(row => {
      row.addEventListener('dragstart', (e) => {
        state.draggingRow = row;
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', row.dataset.id || ''); } catch(_){}
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
        state.draggingRow = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!state.draggingRow || state.draggingRow === row) return;
        const rect = row.getBoundingClientRect();
        const offset = e.clientY - rect.top;
        const before = offset < rect.height / 2;
        if (before) tbody.insertBefore(state.draggingRow, row);
        else tbody.insertBefore(state.draggingRow, row.nextSibling);
      });
    });
  }

  async function load(){
    try {
      const data = await jsonFetch(urls.list);
      state.items = Array.isArray(data.items) ? data.items : [];
      render();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="6">Errore nel caricamento: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  function bindEvents(){
    btnReload?.addEventListener('click', load);
    btnAdd?.addEventListener('click', onAdd);
    btnSaveOrder?.addEventListener('click', onSaveOrder);
    titleInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAdd(); });
    catalogueInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAdd(); });
    arrangerInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAdd(); });
    notesInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onAdd(); });
  }

  bindEvents();
  load();
})();

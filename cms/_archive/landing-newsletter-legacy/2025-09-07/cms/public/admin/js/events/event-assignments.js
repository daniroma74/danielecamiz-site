// cms/public/admin/js/events/event-assignments.js
// Admin – Assignments tab (CRUD + principal toggle + autocomplete)

(function(){
  'use strict';

  const root = document.getElementById('event_admin');
  if (!root) return;

  const tbody = document.getElementById('assignments_tbody');
  const btnReload = document.getElementById('btn_assignments_reload');
  const btnAdd = document.getElementById('btn_assignments_add');

  const instrumentSearch = document.getElementById('instrument_search');
  const instrumentDropdown = document.getElementById('instrument_search_results');
  const instrumentLabelInput = document.getElementById('assignment_instrument_label');

  const chairInput = document.getElementById('assignment_chair');
  const deskInput = document.getElementById('assignment_desk');
  const artistSearch = document.getElementById('assignment_artist_search');
  const artistDropdown = document.getElementById('assignment_artist_results');
  const principalCheckbox = document.getElementById('assignment_is_principal');
  const notesInput = document.getElementById('assignment_notes');

  const urls = {
    list: root.dataset.assignmentsList,
    create: root.dataset.assignmentsCreate,
    updateBase: root.dataset.assignmentsUpdateBase, // + id
    principalBase: root.dataset.assignmentsPrincipalBase, // + id + '/principal'
    lookupArtists: root.dataset.lookupArtists,
    lookupInstruments: root.dataset.lookupInstruments,
  };

  const state = {
    items: [],
    selectedInstrumentId: null,
    selectedInstrumentName: '',
    selectedArtistId: null,
    selectedArtistName: '',
    searching: { inst: false, artist: false },
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

  function debounce(fn, ms){
    let t = null;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  function render(){
    tbody.innerHTML = '';
    if (!Array.isArray(state.items) || !state.items.length){
      tbody.innerHTML = '<tr><td colspan="7">Nessuna assegnazione.</td></tr>';
      return;
    }
    for (const it of state.items){
      tbody.appendChild(renderRow(it));
    }
  }

  function renderRow(it){
    const tr = document.createElement('tr');
    tr.dataset.id = String(it.id);

    const tdInstr = document.createElement('td');
    tdInstr.textContent = it.instrument_label || it.instrument_name || '';

    const tdChair = document.createElement('td');
    tdChair.textContent = it.chair || '';

    const tdDesk = document.createElement('td');
    tdDesk.textContent = it.desk || '';

    const tdPrincipal = document.createElement('td');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!it.is_principal;
    chk.addEventListener('change', () => onPrincipalToggle(it.id, chk.checked));
    tdPrincipal.appendChild(chk);

    const tdArtist = document.createElement('td');
    tdArtist.textContent = it.artist_name || (Number.isInteger(it.artist_id) ? `#${it.artist_id}` : '—');

    const tdNotes = document.createElement('td');
    tdNotes.textContent = it.notes || '';

    const tdAct = document.createElement('td');
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

    tr.appendChild(tdInstr);
    tr.appendChild(tdChair);
    tr.appendChild(tdDesk);
    tr.appendChild(tdPrincipal);
    tr.appendChild(tdArtist);
    tr.appendChild(tdNotes);
    tr.appendChild(tdAct);
    return tr;
  }

  function enterEditMode(tr, it){
    tr.classList.add('is-editing');
    const cells = tr.children;

    const instrEl = inputFromValue(it.instrument_label || it.instrument_name || '', 'Sezione/Strumento');
    const chairEl = inputFromValue(it.chair || '', 'Posto');
    const deskEl = inputFromValue(it.desk || '', 'Leggio');
    const principalEl = document.createElement('input');
    principalEl.type = 'checkbox';
    principalEl.checked = !!it.is_principal;
    const artistEl = inputFromValue(it.artist_name || (Number.isInteger(it.artist_id) ? `#${it.artist_id}` : ''), 'Artista');
    const notesEl = inputFromValue(it.notes || '', 'Note');

    cells[0].innerHTML = ''; cells[0].appendChild(instrEl);
    cells[1].innerHTML = ''; cells[1].appendChild(chairEl);
    cells[2].innerHTML = ''; cells[2].appendChild(deskEl);
    cells[3].innerHTML = ''; cells[3].appendChild(principalEl);
    cells[4].innerHTML = ''; cells[4].appendChild(artistEl);
    cells[5].innerHTML = ''; cells[5].appendChild(notesEl);

    const actions = cells[6];
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
        instrument_label: instrEl.value.trim() || null,
        chair: chairEl.value.trim() || null,
        desk: deskEl.value.trim() || null,
        is_principal: principalEl.checked ? 1 : 0,
        // nota: per cambiare artista/strumento usare la creazione di una nuova riga o estendere UI
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

  async function onPrincipalToggle(id, isPrincipal){
    try {
      await jsonFetch(urls.principalBase + id + '/principal', { method: 'POST', body: JSON.stringify({ is_principal: !!isPrincipal }) });
    } catch (err) {
      alert('Errore nel set principale: ' + err.message);
      await load();
    }
  }

  async function onDelete(id){
    if (!confirm('Eliminare questa assegnazione?')) return;
    try {
      await jsonFetch(urls.updateBase + id, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert('Errore nell\'eliminazione: ' + err.message);
    }
  }

  async function onAdd(){
    const payload = {
      instrument_id: state.selectedInstrumentId,
      instrument_label: (instrumentLabelInput?.value || '').trim() || null,
      chair: (chairInput?.value || '').trim() || null,
      desk: (deskInput?.value || '').trim() || null,
      is_principal: !!(principalCheckbox?.checked),
      artist_id: state.selectedArtistId,
      notes: (notesInput?.value || '').trim() || null,
    };
    if (!payload.instrument_id && !payload.instrument_label){
      alert('Seleziona uno strumento o inserisci una etichetta.');
      instrumentSearch?.focus();
      return;
    }
    try {
      await jsonFetch(urls.create, { method: 'POST', body: JSON.stringify(payload) });
      clearForm();
      await load();
    } catch (err) {
      alert('Errore nella creazione: ' + err.message);
    }
  }

  function clearForm(){
    state.selectedInstrumentId = null;
    state.selectedInstrumentName = '';
    state.selectedArtistId = null;
    state.selectedArtistName = '';
    if (instrumentSearch) instrumentSearch.value = '';
    if (instrumentLabelInput) instrumentLabelInput.value = '';
    if (chairInput) chairInput.value = '';
    if (deskInput) deskInput.value = '';
    if (artistSearch) artistSearch.value = '';
    if (principalCheckbox) principalCheckbox.checked = false;
    if (notesInput) notesInput.value = '';
    hideDropdown(instrumentDropdown);
    hideDropdown(artistDropdown);
  }

  function showDropdown(container, items, onPick){
    if (!container) return;
    container.innerHTML = '';
    container.style.display = items && items.length ? 'block' : 'none';
    if (!items || !items.length) return;
    const ul = document.createElement('ul');
    for (const it of items){
      const li = document.createElement('li');
      li.textContent = it.name;
      li.tabIndex = 0;
      li.addEventListener('click', () => { onPick(it); hideDropdown(container); });
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') { onPick(it); hideDropdown(container); }});
      ul.appendChild(li);
    }
    container.appendChild(ul);
  }

  function hideDropdown(container){
    if (!container) return;
    container.style.display = 'none';
    container.innerHTML = '';
  }

  const searchInstruments = debounce(async function(){
    const q = (instrumentSearch?.value || '').trim();
    if (!q || q.length < 2){ hideDropdown(instrumentDropdown); return; }
    state.searching.inst = true;
    try {
      const data = await jsonFetch(`${urls.lookupInstruments}?q=${encodeURIComponent(q)}&limit=10`);
      showDropdown(instrumentDropdown, data.items || [], (it) => {
        state.selectedInstrumentId = it.id;
        state.selectedInstrumentName = it.name;
        if (instrumentSearch) instrumentSearch.value = it.name;
      });
    } catch (err) { console.error(err); }
    finally { state.searching.inst = false; }
  }, 250);

  const searchArtists = debounce(async function(){
    const q = (artistSearch?.value || '').trim();
    if (!q || q.length < 2){ hideDropdown(artistDropdown); return; }
    state.searching.artist = true;
    try {
      const data = await jsonFetch(`${urls.lookupArtists}?q=${encodeURIComponent(q)}&limit=10`);
      showDropdown(artistDropdown, data.items || [], (it) => {
        state.selectedArtistId = it.id;
        state.selectedArtistName = it.name;
        if (artistSearch) artistSearch.value = it.name;
      });
    } catch (err) { console.error(err); }
    finally { state.searching.artist = false; }
  }, 250);

  async function load(){
    try {
      const data = await jsonFetch(urls.list);
      state.items = Array.isArray(data.items) ? data.items : [];
      render();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7">Errore nel caricamento: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function bindEvents(){
    btnReload?.addEventListener('click', load);
    btnAdd?.addEventListener('click', onAdd);
    instrumentSearch?.addEventListener('input', () => { state.selectedInstrumentId = null; searchInstruments(); });
    artistSearch?.addEventListener('input', () => { state.selectedArtistId = null; searchArtists(); });
    document.addEventListener('click', (e) => {
      if (!instrumentDropdown.contains(e.target) && e.target !== instrumentSearch) hideDropdown(instrumentDropdown);
      if (!artistDropdown.contains(e.target) && e.target !== artistSearch) hideDropdown(artistDropdown);
    });
  }

  bindEvents();
  load();
})();

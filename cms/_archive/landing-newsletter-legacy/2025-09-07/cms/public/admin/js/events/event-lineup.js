// cms/public/admin/js/events/event-lineup.js
(function(){
  const root = document.getElementById('event_admin');
  if (!root) return;

  const endpoints = {
    base: root.dataset.lineupBase,
    ensembles: root.dataset.ensembles,
    ensureDefault: root.dataset.ensureDefault,
    searchArtists: root.dataset.searchArtists
  };

  const els = {
    tbody: document.getElementById('lineup_tbody'),
    reloadBtn: document.getElementById('btn_lineup_reload'),
    saveBtn: document.getElementById('btn_lineup_save'),
    saveSortBtn: document.getElementById('btn_lineup_save_sort'),
    addEnsBtn: document.getElementById('btn_add_ensemble'),
    ensSelect: document.getElementById('ensemble_select'),
    artistSearchInput: document.getElementById('artist_search'),
    artistSearchBtn: document.getElementById('btn_search_artist'),
    artistResults: document.getElementById('artist_search_results')
  };

  function toInt(v){ const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; }
  function htmlEscape(s){ return String(s==null? '': s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
  function setBusy(node, on){ if (!node) return; node.disabled = !!on; node.classList.toggle('is-busy', !!on); }
  function notice(msg, kind='info'){
    console[kind==='error'?'error':'log']('[lineup]', msg);
  }
  async function getJSON(url){
    const r = await fetch(url, { headers: { 'Accept':'application/json' } });
    if (!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  async function sendJSON(url, method, body){
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }

  // ========== Ensembles ==========
  async function ensureDefaultEnsemble(){
    try{ await sendJSON(endpoints.ensureDefault, 'POST', {}); }catch{} }

  async function loadEnsembles(){
    try {
      const { items } = await getJSON(endpoints.ensembles);
      const sel = els.ensSelect;
      sel.innerHTML = '';
      for (const it of items){
        const opt = document.createElement('option');
        opt.value = String(it.id);
        opt.textContent = it.name;
        sel.appendChild(opt);
      }
    } catch(err){ notice('Cannot load ensembles: '+err.message, 'error'); }
  }

  // ========== Render ==========
  function rowTemplate(item){
    const id = item.id || '';
    const type = item.performer_type; // 'ensemble' | 'artist'
    const name = type === 'ensemble' ? (item.ensemble_name || ('Ensemble #'+item.ensemble_id)) : (item.artist_name || ('Artist #'+item.artist_id));
    const role = item.role || item.artist_role_default || '';
    const tr = document.createElement('tr');
    tr.dataset.entryId = id ? String(id) : '';
    tr.dataset.type = type;
    if (type === 'ensemble') tr.dataset.ensembleId = String(item.ensemble_id);
    if (type === 'artist') tr.dataset.artistId = String(item.artist_id);

    tr.innerHTML = `
      <td class="order">
        <button class="btn btn-ghost btn-up" title="Sposta su">▲</button>
        <button class="btn btn-ghost btn-down" title="Sposta giù">▼</button>
      </td>
      <td class="type">${htmlEscape(type)}</td>
      <td class="name">${htmlEscape(name)}</td>
      <td class="role"><input type="text" class="input role-input" value="${htmlEscape(role)}" placeholder="Ruolo (es. Direttore, Solista)"/></td>
      <td class="actions">
        <button class="btn btn-danger btn-remove">Rimuovi</button>
      </td>`;

    tr.querySelector('.btn-up').addEventListener('click', () => moveRow(tr, -1));
    tr.querySelector('.btn-down').addEventListener('click', () => moveRow(tr, +1));
    tr.querySelector('.btn-remove').addEventListener('click', () => removeRow(tr));
    return tr;
  }

  function renderTable(items){
    els.tbody.innerHTML = '';
    for (const it of items){ els.tbody.appendChild(rowTemplate(it)); }
  }

  function collectEntries(){
    const rows = Array.from(els.tbody.querySelectorAll('tr'));
    return rows.map((tr, idx) => {
      const type = tr.dataset.type;
      const role = tr.querySelector('.role-input')?.value || '';
      const base = { id: toInt(tr.dataset.entryId), performer_type: type, role, sort_order: idx };
      if (type === 'ensemble') return { ...base, ensemble_id: toInt(tr.dataset.ensembleId), artist_id: null };
      return { ...base, ensemble_id: null, artist_id: toInt(tr.dataset.artistId) };
    });
  }

  function existingOrderedIds(){
    const rows = Array.from(els.tbody.querySelectorAll('tr'));
    return rows.map(tr => toInt(tr.dataset.entryId)).filter(Boolean);
  }

  function moveRow(tr, dir){
    const sib = dir < 0 ? tr.previousElementSibling : tr.nextElementSibling;
    if (!sib) return;
    if (dir < 0) els.tbody.insertBefore(tr, sib);
    else els.tbody.insertBefore(sib, tr);
  }

  function removeRow(tr){
    const id = toInt(tr.dataset.entryId);
    if (!id) { tr.remove(); return; }
    const url = endpoints.base.replace(/\/$/,'') + '/' + id;
    setBusy(tr, true);
    fetch(url, { method: 'DELETE', headers: { 'Accept':'application/json' } })
      .then(r => r.json().catch(()=>({ ok:false })))
      .then(() => reload())
      .catch(err => { setBusy(tr,false); notice('Delete failed: '+err.message,'error'); });
  }

  // ========== Actions ==========
  async function reload(){
    try{
      setBusy(els.reloadBtn, true);
      const { items } = await getJSON(endpoints.base);
      renderTable(items);
    }catch(err){ notice('Reload failed: '+err.message, 'error'); }
    finally{ setBusy(els.reloadBtn, false); }
  }

  async function save(){
    try{
      setBusy(els.saveBtn, true);
      const entries = collectEntries();
      const payload = { entries };
      const res = await sendJSON(endpoints.base, 'POST', payload);
      if (!res || res.ok !== true) throw new Error('Save error');
      notice('Saved lineup');
      await reload();
    }catch(err){ notice('Save failed: '+err.message, 'error'); }
    finally{ setBusy(els.saveBtn, false); }
  }

  async function saveOrder(){
    try{
      setBusy(els.saveSortBtn, true);
      const orderedIds = existingOrderedIds();
      if (!orderedIds.length){ notice('No saved items to reorder'); return; }
      const url = endpoints.base.replace(/\/$/,'') + '/reorder';
      const res = await sendJSON(url, 'POST', { orderedIds });
      if (!res || res.ok !== true) throw new Error('Reorder error');
      notice('Order saved');
      await reload();
    }catch(err){ notice('Save order failed: '+err.message, 'error'); }
    finally{ setBusy(els.saveSortBtn, false); }
  }

  function addEnsemble(){
    const sel = els.ensSelect;
    const id = toInt(sel.value);
    if (!id){ notice('Select an ensemble'); return; }
    const name = sel.options[sel.selectedIndex]?.textContent || ('Ensemble #'+id);
    const item = { id:null, performer_type:'ensemble', ensemble_id:id, ensemble_name:name, role:'Orchestra' };
    els.tbody.appendChild(rowTemplate(item));
  }

  async function searchArtists(){
    try{
      const q = (els.artistSearchInput.value || '').trim();
      if (!q){ els.artistResults.innerHTML=''; return; }
      const url = endpoints.searchArtists + '?q=' + encodeURIComponent(q) + '&limit=10';
      const { items } = await getJSON(url);
      const box = els.artistResults; box.innerHTML='';
      const ul = document.createElement('ul'); ul.className = 'dropdown-list';
      items.forEach(it => {
        const li = document.createElement('li');
        li.innerHTML = `<button class="dropdown-item" data-id="${it.id}" data-name="${htmlEscape(it.name)}" data-role="${htmlEscape(it.role_default||'')}">${htmlEscape(it.name)}</button>`;
        li.querySelector('button').addEventListener('click', (ev)=>{
          const btn = ev.currentTarget;
          const id = toInt(btn.dataset.id);
          const name = btn.dataset.name;
          const role = btn.dataset.role || '';
          const item = { id:null, performer_type:'artist', artist_id:id, artist_name:name, artist_role_default:role, role };
          els.tbody.appendChild(rowTemplate(item));
          box.innerHTML='';
          els.artistSearchInput.value='';
        });
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }catch(err){ notice('Search failed: '+err.message, 'error'); }
  }

  function bind(){
    els.reloadBtn?.addEventListener('click', reload);
    els.saveBtn?.addEventListener('click', save);
    els.saveSortBtn?.addEventListener('click', saveOrder);
    els.addEnsBtn?.addEventListener('click', addEnsemble);
    els.artistSearchBtn?.addEventListener('click', searchArtists);
    els.artistSearchInput?.addEventListener('input', (e)=>{ if ((e.target.value||'').length >= 2) searchArtists(); else els.artistResults.innerHTML=''; });
    document.addEventListener('click', (e)=>{
      if (!els.artistResults.contains(e.target) && e.target !== els.artistSearchInput){ els.artistResults.innerHTML=''; }
    });
  }

  (async function init(){
    try{
      setBusy(els.reloadBtn, true);
      await ensureDefaultEnsemble();
      await loadEnsembles();
      await reload();
    } finally {
      setBusy(els.reloadBtn, false);
      bind();
    }
  })();
})();

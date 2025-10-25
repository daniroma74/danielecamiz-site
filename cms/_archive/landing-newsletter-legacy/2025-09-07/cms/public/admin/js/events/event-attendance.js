

// cms/public/admin/js/events/event-attendance.js
(function(){
  const root = document.getElementById('event_admin');
  if (!root) return;

  const endpoints = {
    base: root.dataset.attendanceBase
  };

  const els = {
    tbody: document.getElementById('attendance_tbody'),
    includeInactive: document.getElementById('attendance_include_inactive'),
    reloadBtn: document.getElementById('btn_attendance_reload'),
    saveBtn: document.getElementById('btn_attendance_save')
  };

  function toInt(v){ const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; }
  function toBool(v){ return v === true || v === 1 || v === '1' || v === 'true'; }
  function htmlEscape(s){ return String(s==null? '': s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
  function setBusy(node, on){ if (!node) return; node.disabled = !!on; node.classList.toggle('is-busy', !!on); }
  function notice(msg, kind='info'){ console[kind==='error'?'error':'log']('[attendance]', msg); }

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

  function rowTemplate(item){
    const tr = document.createElement('tr');
    tr.dataset.participantId = String(item.participant_id);

    tr.innerHTML = `
      <td class="name">${htmlEscape(item.name || '')}</td>
      <td class="role">${htmlEscape(item.role || '')}</td>
      <td class="attended">
        <label class="checkbox">
          <input type="checkbox" class="attended-input" ${item.attended ? 'checked' : ''} />
        </label>
      </td>
      <td class="hours"><input type="number" min="0" step="0.5" class="input hours-input" value="${htmlEscape(String(Number(item.hours || 0)))}" /></td>
      <td class="notes"><input type="text" class="input notes-input" value="${htmlEscape(item.notes || '')}" placeholder="Note (opzionale)" /></td>
    `;

    return tr;
  }

  function renderTable(items){
    els.tbody.innerHTML = '';
    for (const it of items){ els.tbody.appendChild(rowTemplate(it)); }
  }

  function collectEntries(){
    const rows = Array.from(els.tbody.querySelectorAll('tr'));
    return rows.map(tr => {
      const participant_id = toInt(tr.dataset.participantId);
      const attended = tr.querySelector('.attended-input')?.checked ? 1 : 0;
      const hRaw = tr.querySelector('.hours-input')?.value;
      const hNum = Number(hRaw);
      const hours = Number.isFinite(hNum) && hNum >= 0 ? hNum : 0;
      const notes = tr.querySelector('.notes-input')?.value || '';
      return { participant_id, attended, hours, notes };
    });
  }

  async function reload(){
    try{
      setBusy(els.reloadBtn, true);
      const includeInactive = toBool(els.includeInactive?.checked);
      const url = endpoints.base + (includeInactive ? '?include_inactive=1' : '');
      const { items } = await getJSON(url);
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
      notice('Attendance saved');
      await reload();
    }catch(err){ notice('Save failed: '+err.message, 'error'); }
    finally{ setBusy(els.saveBtn, false); }
  }

  function bind(){
    els.reloadBtn?.addEventListener('click', reload);
    els.saveBtn?.addEventListener('click', save);
    els.includeInactive?.addEventListener('change', reload);
  }

  (async function init(){
    bind();
    await reload();
  })();
})();
(()=>{
  const qs=(s,e=document)=>e.querySelector(s);
  const qsa=(s,e=document)=>[...e.querySelectorAll(s)];
  const el=(t,a={},c=[])=>{const n=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='class')n.className=v;else if(k==='html')n.innerHTML=v;else n.setAttribute(k,v)};(Array.isArray(c)?c:[c]).filter(Boolean).forEach(x=>n.append(x));return n;};

  // Helper: prende un nodo e se manca mostra messaggio senza crashare
  const need = (selector)=>{
    const n = qs(selector);
    if(!n){
      console.error('Nodo non trovato:', selector);
      const msg = qs('#status') || document.body;
      if (msg) { try { msg.textContent = `Errore UI: manca ${selector}. Ricarica la pagina (CTRL+F5).`; } catch {} }
      return null;
    }
    return n;
  };

  let CODE='';
  const api=async(p,opt={})=>{
    const r=await fetch(p,{...opt,headers:{...(opt.headers||{}),'x-admin-code':CODE,'Content-Type':'application/json'}});
    if(!r.ok) throw new Error(await r.text());
    const ct=r.headers.get('content-type')||'';
    return ct.includes('application/json')? r.json(): r.text();
  };

  function tableOverview(items){
    const t=el('table',{class:'table table-sm'});
    t.append(el('thead',{},el('tr',{},[
      el('th',{},'Concerto [short]'),
      el('th',{},'Colonna (Sheet)'),
      el('th',{},'Stato'),
      el('th',{},'Partecipo'),
      el('th',{},'In dubbio'),
      el('th',{},'Non posso'),
      el('th',{},'Totale'),
      el('th',{},'Azioni')
    ])));
    const tb=el('tbody'); t.append(tb);
    items.forEach(c=>{
      const tr=el('tr');
      tr.append(
        el('td',{}, `${c.short}`),
        el('td',{}, c.header||'-'),
        el('td',{}, c.closed? '🟠 Chiuso' : '🟢 Aperto'),
        el('td',{}, String(c.counts?.partecipo||0)),
        el('td',{}, String(c.counts?.dubbio||0)),
        el('td',{}, String(c.counts?.non_posso||0)),
        el('td',{}, String(c.counts?.totale||0)),
        el('td',{}, el('div',{class:'btn-row'},[
          el('button',{class:'btn btn-sm',onclick:()=>openDetail(c.short)},'Dettaglio'),
          el('button',{class:'btn btn-sm',onclick:()=>toggleClose(c.short,!c.closed)}, c.closed?'Apri':'Chiudi')
        ]))
      );
      tb.append(tr);
    });
    return t;
  }

  async function toggleClose(short,closed){
    try{
      await api(`/api/admin/concerts/${encodeURIComponent(short)}/close`,{method:'PUT',body:JSON.stringify({closed})});
      const st=qs('#status'); if (st) st.textContent=`✔ ${short} ${closed?'chiuso':'aperto'}`;
      await load();
    }catch(e){
      const st=qs('#status'); if (st) st.textContent=`Errore chiudi/apri: ${e.message||e}`;
    }
  }

  function rosterTable(roster){
    const t=el('table',{class:'table table-sm'});
    t.append(el('thead',{},el('tr',{},[
      el('th',{},'Nome'),
      el('th',{},'Strumento'),
      el('th',{},'Sezione'),
      el('th',{},'Stato')
    ])));
    const tb=el('tbody'); t.append(tb);
    roster.forEach(r=>{
      const tr=el('tr');
      tr.append(el('td',{},r.name||''), el('td',{},r.instrument||''), el('td',{},r.section||''), el('td',{},r.status||''));
      tb.append(tr);
    });
    return t;
  }

  const SECTIONS=["Flauti","Oboi","Clarinetti","Fagotti","Corni","Trombe","Tromboni","Tuba","Arpa","Timpani e percussioni","Violino I","Violino II","Viole","Violoncelli","Contrabbassi"];
  function organicoEditor(short, required){
    const card=el('div',{});
    card.append(el('h3',{},'Organico richiesto'));
    const t=el('table',{class:'table table-sm'}); const tb=el('tbody');
    t.append(el('thead',{},el('tr',{},[el('th',{},'Sezione'), el('th',{},'Posti')])));
    SECTIONS.forEach(s=>{
      const val=Number(required?.[s]||0);
      const tr=el('tr'); const input=el('input',{type:'number',min:'0',value:String(val)});
      input.style.width='80px';
      tr.append(el('td',{},s), el('td',{}, input)); tb.append(tr);
      input.addEventListener('change',()=> required[s]=Number(input.value||0));
    });
    card.append(t);
    const save=el('button',{class:'btn',onclick:async()=>{
      try{
        await api(`/api/admin/concerts/${encodeURIComponent(short)}/organico`,{method:'PUT',body:JSON.stringify({organico:required})});
        const st=qs('#status'); if (st) st.textContent='✔ Organico salvato';
      }catch(e){
        const st=qs('#status'); if (st) st.textContent=`Errore salvataggio organico: ${e.message||e}`;
      }
    }},'Salva organico');
    card.append(el('div',{class:'btn-row'},save));
    return card;
  }

  async function openDetail(short){
    const pane=need('#pane-overview'); if (!pane) return;
    pane.innerHTML='Carico...';
    try{
      const data=await api(`/api/admin/concerts/${encodeURIComponent(short)}/roster`);
      const head=el('div',{class:'head'},[el('div',{class:'title'},`Dettaglio — ${short}`)]);
      const meta=el('div',{class:'muted small'},[
        el('span',{},`Colonna: ${data.header||'-'}`),' · ',
        el('span',{},`Partecipo: ${data.counts.partecipo||0}`),' · ',
        el('span',{},`In dubbio: ${data.counts.dubbio||0}`),' · ',
        el('span',{},`Non posso: ${data.counts.non_posso||0}`),' · ',
        el('span',{},`Totale: ${data.counts.totale||0}`)
      ]);
      pane.innerHTML='';
      pane.append(head, meta, el('hr'));
      pane.append(el('h3',{},'Iscritti (deduplicati, ultimi)'));
      pane.append(rosterTable(data.roster));
      pane.append(el('hr'));
      pane.append(organicoEditor(short, data.required||{}));
    }catch(e){
      pane.innerHTML = `<div class="muted">Errore caricamento dettaglio: ${e.message||e}</div>`;
    }
  }

  async function renderOverview(){
    const pane=need('#pane-overview'); if (!pane) return;
    pane.innerHTML='Carico...';
    try{
      const { overview } = await api('/api/admin/overview');
      pane.innerHTML='';
      pane.append(el('h2',{},'Concerti trovati dal Foglio (tra [quadre])'));
      pane.append(el('p',{class:'muted'},'Gli "short" sono estratti automaticamente dalle intestazioni di colonna in Risposte (testo tra [ ]).'));
      pane.append(tableOverview(overview));
    }catch(e){
      pane.innerHTML = `<div class="muted">Errore overview: ${e.message||e}</div>`;
    }
  }

  async function renderMembers(){
    const pane=need('#pane-members'); if (!pane) return;
    pane.innerHTML='Carico...';
    try{
      const { members, countsByInstrument } = await api('/api/admin/members');
      pane.innerHTML='';
      pane.append(el('h2',{},'Iscritti (ultima risposta per persona)'));
      const t=el('table',{class:'table table-sm'});
      t.append(el('thead',{}, el('tr',{},[el('th',{},'Strumento'), el('th',{},'N.')])) , el('tbody'));
      const tb=t.querySelector('tbody');
      Object.entries(countsByInstrument).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
        const tr=el('tr'); tr.append(el('td',{},k||'(vuoto)'), el('td',{},String(v))); tb.append(tr);
      });
      pane.append(t);
    }catch(e){
      pane.innerHTML = `<div class="muted">Errore membri: ${e.message||e}</div>`;
    }
  }

  async function renderRoles(){
    const pane=need('#pane-roles'); if (!pane) return;
    pane.innerHTML='Carico...';
    try{
      const cfg = await api('/api/admin/config');
      const roles = cfg.roles || { archi:{}, fiati:{} };
      const grid=el('div',{class:'grid cards'});

      const mk=(label,val,onchange)=>{
        const card=el('div',{class:'card'});
        card.append(el('div',{class:'kicker'},label));
        const input=el('input',{value:val||''}); input.style.width='100%';
        input.addEventListener('change',()=>onchange(input.value));
        card.append(input);
        return card;
      };
      const a=["Violino I","Violino II","Viole","Violoncelli","Contrabbassi"];
      const f=["Flauti","Oboi","Clarinetti","Fagotti","Corni","Trombe","Tromboni","Tuba"];
      a.forEach(s=> grid.append(mk(`Spalla — ${s}`, roles.archi?.[s]?.spalla, v=>{ roles.archi=roles.archi||{}; roles.archi[s]=roles.archi[s]||{}; roles.archi[s].spalla=v; })));
      f.forEach(s=> grid.append(mk(`Primo — ${s}`, roles.fiati?.[s]?.primo, v=>{ roles.fiati=roles.fiati||{}; roles.fiati[s]=roles.fiati[s]||{}; roles.fiati[s].primo=v; })));
      const save=el('button',{class:'btn',onclick:async()=>{
        try{
          await api('/api/admin/roles',{method:'PUT',body:JSON.stringify({roles})});
          const st=qs('#status'); if (st) st.textContent='✔ Ruoli salvati';
        }catch(e){
          const st=qs('#status'); if (st) st.textContent=`Errore salvataggio ruoli: ${e.message||e}`;
        }
      }},'Salva ruoli');
      pane.innerHTML='';
      pane.append(el('h2',{},'Ruoli'), grid, el('div',{class:'btn-row'}, save));
    }catch(e){
      pane.innerHTML = `<div class="muted">Errore ruoli: ${e.message||e}</div>`;
    }
  }

  function bindTabs(){
    qsa('.tabs [data-tab]').forEach(btn=> btn.addEventListener('click',()=>{
      qsa('section[id^="pane-"]').forEach(p=>p.classList.add('hidden'));
      const pane = qs('#pane-'+btn.dataset.tab);
      if (pane) pane.classList.remove('hidden');
    }));
  }

  async function load(){
    CODE = (qs('#admin-code')?.value || '').trim();
    const st=qs('#status'); if (st) st.textContent='';
    try{
      await renderOverview();
      await renderMembers();
      await renderRoles();
      if (st) st.textContent='✔ Dati caricati';
    }catch(e){
      if (st) st.textContent=`Errore caricamento dati: ${e.message||e}`;
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Se la pagina non è quella giusta, esci in modo pulito
    if (!qs('#pane-overview') || !qs('#pane-members') || !qs('#pane-roles')) {
      console.warn('Pagina admin non completa — forse cache vecchia. Ricarica con CTRL+F5.');
      return;
    }
    bindTabs();
    const btn = qs('#load'); if (btn) btn.addEventListener('click', load);
  });
})();

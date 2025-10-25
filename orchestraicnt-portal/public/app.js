(()=>{
  const qs=(s,e=document)=>e.querySelector(s);
  const el=(t,a={},c=[])=>{const n=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='class')n.className=v;else if(k==='html')n.innerHTML=v;else n.setAttribute(k,v)};(Array.isArray(c)?c:[c]).filter(Boolean).forEach(x=>n.append(x));return n;};

  const state={logged:false};
  async function api(path,opt={}){ const r=await fetch(path,{credentials:'include',...opt}); if(!r.ok) throw new Error(await r.text()); const ct=r.headers.get('content-type')||''; return ct.includes('application/json')? r.json(): r.text(); }

  function sectionTable(org, required){
    const t=el('table',{class:'table'});
    t.append(el('thead',{}, el('tr',{},[ el('th',{},'Sezione'), el('th',{},'Nomi'), el('th',{},'Posti') ])), el('tbody'));
    const tb=t.querySelector('tbody');
    Object.entries(org).forEach(([sec,names])=>{
      const posti = Number(required?.[sec]||0);
      const tr=el('tr'); tr.append(el('td',{},sec), el('td',{}, names.join(', ')), el('td',{}, String(posti)));
      tb.append(tr);
    });
    return t;
  }

  function renderHome(){
    const wrap=el('section',{class:'section wrap'});
    wrap.append(el('h1',{},'Bacheca'));
    wrap.append(el('p',{class:'lead'},'Compila/aggiorna il modulo e consulta i tuoi concerti.'));
    const row=el('div',{class:'btn-row'});
    row.append(
      el('a',{class:'btn',href:'#/me'},'I miei concerti'),
      el('a',{class:'btn',href:'#/parti'},'Le mie parti'),
      el('a',{class:'btn',href:'https://docs.google.com/forms',target:'_blank',rel:'noopener'},'Apri il Google Form')
    );
    wrap.append(row);
    return wrap;
  }

  async function renderMine(){
    const wrap=el('section',{class:'section wrap'});
    wrap.append(el('h1',{},'I miei concerti'));
    const list=await api('/api/me/concerts');
    if(!list.length){ wrap.append(el('p',{class:'muted'},'Non risultano adesioni (Partecipo/In dubbio) o i concerti sono chiusi.')); return wrap; }
    const grid=el('div',{class:'grid cards'});
    list.forEach(c=>{
      const card=el('div',{class:'card'});
      const head=el('div',{class:'head'});
      head.append(el('div',{},[el('div',{class:'kicker'},c.short), el('div',{class:'title'}, c.meta?.program||'')]));
      head.append(el('div',{class:'badge'}, c.meta?.date||''));
      card.append(head);
      if (c.counts) card.append(el('div',{class:'muted small'},`Partecipo ${c.counts.partecipo||0} · In dubbio ${c.counts.dubbio||0}`));
      card.append(sectionTable(c.organico, c.required));
      const btns=el('div',{class:'btn-row'});
      if (c.meta?.drive) btns.append(el('a',{class:'btn',href:c.meta.drive,target:'_blank',rel:'noopener'},'Cartella Drive'));
      if (c.meta?.calendar) btns.append(el('a',{class:'btn',href:c.meta.calendar,target:'_blank',rel:'noopener'},'Calendario'));
      btns.append(el('a',{class:'btn',href:`/api/concerts/${encodeURIComponent(c.short)}/pdf`,target:'_blank'},'Scarica PDF'));
      card.append(btns);
      grid.append(card);
    });
    wrap.append(grid);
    return wrap;
  }

  async function renderParts(){
    const wrap=el('section',{class:'section wrap'});
    wrap.append(el('h1',{},'Le mie parti'));
    const list=await api('/api/me/concerts');
    const grid=el('div',{class:'grid cards'});
    list.forEach(c=>{
      if (!c.meta?.drive) return;
      const card=el('div',{class:'card'},[
        el('div',{class:'head'},[el('div',{},[el('div',{class:'kicker'},c.short), el('div',{class:'title'},'Parti')]), el('div',{class:'badge'},'')]),
        el('div',{class:'sub'},'Apri la cartella del concerto e vai nella sottocartella del tuo strumento.'),
        el('div',{class:'btn-row'}, el('a',{class:'btn',href:c.meta.drive,target:'_blank',rel:'noopener'},'Apri cartella'))
      ]);
      grid.append(card);
    });
    wrap.append(grid);
    return wrap;
  }

  async function router(){
    const app=qs('#app'); app.innerHTML='';
    if(!state.logged){ qs('#gate').classList.remove('hidden'); return; }
    const hash=(location.hash||'#/').replace(/^#/,''); 
    if (hash.startsWith('/me')) app.append(await renderMine());
    else if (hash.startsWith('/parti')) app.append(await renderParts());
    else app.append(renderHome());
  }
  function setupLogin(){
    const gate=qs('#gate'); const email=qs('#email'); const code=qs('#code'); const btn=qs('#login'); const err=qs('#err');
    btn.addEventListener('click', async ()=>{
      err.textContent='';
      try{
        await api('/api/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email.value.trim(), code: code.value.trim() }) });
        state.logged=true; gate.classList.add('hidden'); router();
      }catch(e){
        err.textContent = 'Accesso negato: controlla email (quella del Form) e codice.';
      }
    });
  }
  window.addEventListener('hashchange', router);
  document.addEventListener('DOMContentLoaded', ()=>{ setupLogin(); router(); });
})();

// edit.js — Admin News (clean + Facebook multi-page UI + Facebook multi-page UI + per-page messages)

// ====== SEO helpers ======
function readSEO(form){
  return {
    meta_title: form.querySelector('[name="seo.meta_title"]')?.value || '',
    meta_description: form.querySelector('[name="seo.meta_description"]')?.value || '',
    og_image: form.querySelector('[name="seo.og_image"]')?.value || ''
  };
}

// ====== Utils ======
function debounce(fn, wait=200){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }


function attachCharCounter(el){
  if(!el) return;
  const max = parseInt(el.getAttribute('maxlength') || '0', 10);
  if(!max) return; // no counter if no maxlength
  let counter = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains('char-counter') ? el.nextElementSibling : null;
  if(!counter){
    counter = document.createElement('div');
    counter.className = 'char-counter';
    el.parentNode.insertBefore(counter, el.nextSibling);
  }
  const update = () => {
    const len = (el.value || '').length;
    counter.textContent = `${len}/${max}`;
  };
  el.addEventListener('input', debounce(update, 60));
  update();
}

// ====== Helpers: autosize and per-page preview ======
function autosize(el){
  if(!el) return;
  el.style.height = 'auto';
  const h = Math.max(el.scrollHeight, 72);
  el.style.height = h + 'px';
}

function bindAutosize(el){
  if(!el) return;
  const handler = ()=>autosize(el);
  el.addEventListener('input', handler);
  // trigger once after mount
  setTimeout(handler, 0);
}

function updatePerPagePreview(msgEl){
  if(!msgEl) return;
  const cont = msgEl.parentElement;
  const preview = cont ? cont.querySelector('.fb-page-preview') : null;
  if(!preview) return;
  const v = (msgEl.value || '').trim();
  const global = (document.getElementById('f_msg_facebook')?.value || '').trim();
  if (v) {
    preview.textContent = v;
  } else if (global) {
    preview.textContent = `(ereditato) ${global}`;
  } else {
    preview.textContent = '(Se vuoto, useremo Titolo — URL)';
  }
}

function slugify(s=''){
  return s.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .replace(/--+/g,'-');
}

function mdToHtml(src=''){
  let s = String(src);
  s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/^######\s?(.*)$/gm,'<h6>$1</h6>')
       .replace(/^#####\s?(.*)$/gm,'<h5>$1</h5>')
       .replace(/^####\s?(.*)$/gm,'<h4>$1</h4>')
       .replace(/^###\s?(.*)$/gm,'<h3>$1</h3>')
       .replace(/^##\s?(.*)$/gm,'<h2>$1</h2>')
       .replace(/^#\s?(.*)$/gm,'<h1>$1</h1>');
  s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g,'<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\n{2,}/g,'\n\n').split('\n\n').map(p => `<p>${p.replace(/\n/g,'<br/>')}</p>`).join('');
  return s;
}

function renderTagsChips(input, container){
  if(!container) return;
  const raw = input?.value || '';
  const tags = raw.split(',').map(s=>s.trim()).filter(Boolean);
  container.innerHTML = '';
  tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = t;
    container.appendChild(span);
  });
}

function updateLivePreview(){
  const src = document.getElementById('f_content')?.value || '';
  const html = mdToHtml(src);
  const el = document.getElementById('live_preview');
  if (el) el.innerHTML = html;
}

function getPostId(){
  const p = document.getElementById('share_panel');
  if (p?.dataset?.postId) return p.dataset.postId;
  const btn = document.getElementById('btn_share_now');
  if (btn?.dataset?.id) return btn.dataset.id;
  const m = location.pathname.match(/\/admin\/news\/([^/]+)\/edit$/);
  return m ? m[1] : null;
}

// ====== Cover upload ======
async function uploadCoverFromFile({ fileEl, slug, year }){
  if (!fileEl?.files?.[0]) throw new Error('Seleziona un file');
  if (!slug) throw new Error('Slug mancante');
  const fd = new FormData();
  fd.append('file', fileEl.files[0]);
  fd.append('slug', slug);
  fd.append('year', String(year || new Date().getFullYear()));
  fd.append('overwrite', '1');
  const r = await fetch('/upload/news-cover', { method:'POST', body: fd });
  const out = await r.json();
  if (!r.ok || !out?.url) throw new Error(out?.error || 'Upload fallito');
  return out.url;
}

function bindCoverUpload(){
  const btn = document.getElementById('btn_upload_cover');
  const fileEl = document.getElementById('cover_file');
  const slugEl = document.getElementById('f_slug');
  const titleEl = document.getElementById('f_title');
  const coverEl = document.getElementById('f_cover');
  const ogEl = document.getElementById('f_og_img');
  const preview = document.getElementById('cover_preview');

  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  const updatePreview = () => {
    const v = coverEl?.value?.trim();
    if (preview) {
      if (v) {
        const bust = v + (v.includes('?') ? '&' : '?') + 'v=' + Date.now();
        preview.src = bust;
      } else {
        preview.removeAttribute('src'); // CSS hides when no src
      }
    }
  };
  coverEl?.addEventListener('input', updatePreview);

  btn.addEventListener('click', async () => {
    try {
      let slug = (slugEl?.value || '').trim();
      if (!slug) slug = slugify(titleEl?.value || '');
      if (!slug) { window.Toast?.show('Inserisci il titolo/slug','err'); return; }
      const url = await uploadCoverFromFile({ fileEl, slug, year: new Date().getFullYear() });
      const cleanUrl = url;
      const bust = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();

      if (coverEl) coverEl.value = cleanUrl;
      if (ogEl && !ogEl.value) ogEl.value = cleanUrl;
      if (preview) { preview.src = bust; }
      window.Toast?.show('Cover caricata ✅','ok');

      const id = getPostId();
      if (id) {
        const patch = { cover_url: cleanUrl };
        if (ogEl && !ogEl.value) patch.seo = { og_image: cleanUrl };
        try {
          await http.put(`/admin/news/api/${id}`, patch);
          window.Toast?.show('Cover salvata ✅','ok');
        } catch (e) {
          console.error(e);
          window.Toast?.show('Errore salvataggio cover','err');
        }
      }
    } catch (e) {
      console.error(e);
      window.Toast?.show(e.message || 'Errore upload cover','err');
    }
  });
}

// ====== Categories Admin ======
function bindCategoriesAdmin(){
  if (window.__newsCatAdminInit) return;

  const selectEl = document.getElementById('f_category_id');
  const manageBtn = document.getElementById('btn_manage_categories');
  const langEl = document.getElementById('f_lang');
  const modal = document.getElementById('cat_modal');
  const modalOverlay = modal?.querySelector('.modal__overlay');
  const modalClose = modal?.querySelector('.modal__close');
  const listEl = document.getElementById('cat_list');
  const editIdEl = document.getElementById('cat_edit_id');
  const itEl = document.getElementById('cat_label_it');
  const enEl = document.getElementById('cat_label_en');
  const saveBtn = document.getElementById('cat_save');

  if (!selectEl || !manageBtn) return;

  window.__newsCatAdminInit = true;

  const INITIAL_CATEGORY_ID = selectEl.value || '';

  const openModal = () => { if (!modal) return; modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); };
  const closeModal = () => { if (!modal) return; modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); clearForm(); };
  const clearForm = () => { if (editIdEl) editIdEl.value=''; if (itEl) itEl.value=''; if (enEl) enEl.value=''; };

  async function fetchCategories(){
    const lang = (langEl?.value || 'it').toLowerCase();
    const r = await fetch(`/admin/news/api/categories?lang=${encodeURIComponent(lang)}`);
    const out = await r.json().catch(()=>({}));
    if (!r.ok || !out?.ok) throw new Error('Errore caricamento categorie');
    return out;
  }

  function renderList(items){
    if (!listEl) return;
    listEl.innerHTML = '';
    const ul = document.createDocumentFragment();
    (items||[]).forEach(c => {
      const li = document.createElement('li');
      li.style.display='flex'; li.style.alignItems='center'; li.style.justifyContent='space-between'; li.style.padding='.25rem 0';
      const left = document.createElement('div');
      left.textContent = `${c.id} — ${c.label_it} / ${c.label_en}`;
      const right = document.createElement('div');
      const bEdit = document.createElement('button'); bEdit.type='button'; bEdit.className='btn'; bEdit.textContent='Modifica';
      const bDel = document.createElement('button'); bDel.type='button'; bDel.className='btn'; bDel.textContent='Elimina'; bDel.style.marginLeft='.5rem';
      bEdit.addEventListener('click', () => { editIdEl.value = c.id; itEl.value = c.label_it || ''; enEl.value = c.label_en || ''; });
      bDel.addEventListener('click', async () => {
        if (!confirm('Eliminare la categoria?')) return;
        try {
          const r = await fetch(`/admin/news/api/categories/${encodeURIComponent(c.id)}`, { method: 'DELETE' });
          const out = await r.json().catch(()=>({}));
          if (!r.ok || !out?.ok) throw new Error('Delete error');
          window.Toast?.show('Categoria eliminata','ok');
          await refreshAll();
        } catch(e){ window.Toast?.show('Errore eliminazione','err'); }
      });
      right.appendChild(bEdit); right.appendChild(bDel);
      li.appendChild(left); li.appendChild(right);
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
  }

  function setSelectOptions(options){
    const current = selectEl.value || INITIAL_CATEGORY_ID || '';
    selectEl.innerHTML = '<option value="">— Nessuna —</option>' + (options||[]).map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    if (current && [...selectEl.options].some(op => op.value === current)) selectEl.value = current;
  }

  async function refreshAll(){
    const out = await fetchCategories();
    renderList(out.items);
    setSelectOptions(out.options);
  }

  saveBtn?.addEventListener('click', async () => {
    try {
      const id = editIdEl?.value?.trim();
      const label_it = itEl?.value?.trim();
      const label_en = enEl?.value?.trim();
      if (!label_it && !label_en) { window.Toast?.show('Inserisci almeno una label','err'); return; }
      const r = await fetch('/admin/news/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, label_it, label_en })
      });
      const out = await r.json().catch(()=>({}));
      if (!r.ok || !out?.ok) throw new Error('Save error');
      window.Toast?.show('Categoria salvata','ok');
      clearForm();
      await refreshAll();
    } catch(e){ window.Toast?.show('Errore salvataggio','err'); }
  });

  manageBtn?.addEventListener('click', async () => {
    try { await refreshAll(); openModal(); } catch (e) { window.Toast?.show('Errore caricamento categorie','err'); }
  });
  modalOverlay?.addEventListener('click', closeModal);
  modalClose?.addEventListener('click', closeModal);
  langEl?.addEventListener('change', async () => { try { await refreshAll(); } catch {} });
}

// ====== Facebook Pages selector (multi-page with per-page messages)
async function loadFacebookPagesIfNeeded(){
  const block = document.getElementById('fb_pages_selector');
  if (!block || block.dataset.loading === '1' || block.dataset.loaded === '1') return;
  const api = block.getAttribute('data-api') || '/admin/social/facebook/pages';
  block.dataset.loading = '1';

  const list = document.getElementById('fb_pages_list');
  const tpl  = document.getElementById('tpl_fb_page_item');

  if (list) list.innerHTML = '<div class="help">Caricamento pagine…</div>';

  try {
    const r = await fetch(api);
    const out = await r.json().catch(()=>({}));
    if (!r.ok || !out?.pages) throw new Error(out?.error || 'Errore caricamento pagine');

    const frag = document.createDocumentFragment();
    (out.pages || []).forEach(p => {
      // Use template when available
      if (tpl?.content) {
        const node = tpl.content.cloneNode(true);
        const row  = node.querySelector('.fb-page-row');
        const name = node.querySelector('.fb-page-name');
        const cb   = node.querySelector('.js-fb-page');
        const msg  = node.querySelector('.js-fb-page-message');

        if (row) row.setAttribute('data-page-id', p.id);
        if (name) name.textContent = p.name || 'Pagina';
        if (cb) {
          cb.value = p.id;
          cb.checked = false;
          cb.addEventListener('change', () => {
            if (msg) {
              msg.disabled = !cb.checked;
              updatePerPagePreview(msg);
            }
            updateFBGlobalVisibility();
          });
        }
        if (msg) {
          msg.setAttribute('data-page-id', p.id);
          msg.disabled = !cb?.checked;
          msg.placeholder = `Messaggio per ${p.name || 'Pagina'} (opzionale)`;
          msg.setAttribute('maxlength','5000');
          attachCharCounter(msg);
          bindAutosize(msg);
          updatePerPagePreview(msg);
          msg.addEventListener('input', () => { updatePerPagePreview(msg); updateFBGlobalVisibility(); });
        }

        frag.appendChild(node);
      } else {
        // Fallback: simple checkbox only
        const label = document.createElement('label');
        label.className = 'checkbox';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'js-fb-page';
        cb.value = p.id;
        cb.checked = false;
        const span = document.createElement('span');
        span.textContent = p.name || 'Pagina';
        label.appendChild(cb);
        label.appendChild(span);
        frag.appendChild(label);
      }
    });

    if (list) {
      list.innerHTML = '';
      list.appendChild(frag);
      // Toolbar select all/none
      const toolbarId = 'fb_pages_toolbar';
      let toolbar = document.getElementById(toolbarId);
      if(!toolbar){
        toolbar = document.createElement('div');
        toolbar.id = toolbarId;
        const btnAll = document.createElement('button');
        btnAll.type = 'button';
        btnAll.className = 'btn';
        btnAll.textContent = 'Seleziona tutte';
        const btnNone = document.createElement('button');
        btnNone.type = 'button';
        btnNone.className = 'btn';
        btnNone.textContent = 'Nessuna';
        toolbar.appendChild(btnAll);
        toolbar.appendChild(btnNone);
        list.parentNode.insertBefore(toolbar, list);
        btnAll.addEventListener('click', ()=> {
          document.querySelectorAll('#fb_pages_list .js-fb-page').forEach(cb => {
            cb.checked = true;
            const msg = cb.closest('.fb-page-item')?.querySelector('.js-fb-page-message');
            if (msg) msg.disabled = false;
          });
          updateFBGlobalVisibility();
        });
        btnNone.addEventListener('click', ()=> {
          document.querySelectorAll('#fb_pages_list .js-fb-page').forEach(cb => {
            cb.checked = false;
            const msg = cb.closest('.fb-page-item')?.querySelector('.js-fb-page-message');
            if (msg) msg.disabled = true;
          });
          updateFBGlobalVisibility();
        });
      }

      // Fallback: if template not supported and we rendered simple inputs, attach counters where possible
      document.querySelectorAll('#fb_pages_list .js-fb-page-message[maxlength]').forEach(attachCharCounter);
      updateFBGlobalVisibility();

      if (!(out.pages || []).length) {
        list.innerHTML = '<div class="help">Nessuna pagina configurata in FB_TARGET_PAGE_IDS.</div>';
      }
    }

    // Keep previews in sync with global Facebook message
    const fbGlobal = document.getElementById('f_msg_facebook');
    if (fbGlobal && !fbGlobal.dataset.fbPreviewHook) {
      fbGlobal.dataset.fbPreviewHook = '1';
      fbGlobal.addEventListener('input', debounce(() => {
        document.querySelectorAll('#fb_pages_list .js-fb-page-message').forEach(el => {
          if (!(el.value || '').trim()) updatePerPagePreview(el);
        });
      }, 80));
      // initial sync
      document.querySelectorAll('#fb_pages_list .js-fb-page-message').forEach(el => updatePerPagePreview(el));
    }

    updateFBGlobalVisibility();
    block.dataset.loaded = '1';
  } catch (e) {
    if (list) list.innerHTML = `<div class="help err">Errore: ${e.message || e}</div>`;
  } finally {
    block.dataset.loading = '0';
  }
}

function toggleFacebookSelector(visible){
  const block = document.getElementById('fb_pages_selector');
  if (!block) return;
  if (visible) {
    block.classList.remove('hidden');
    loadFacebookPagesIfNeeded();
    document.querySelectorAll('#fb_pages_list .js-fb-page-message[maxlength]').forEach(attachCharCounter);
    updateFBGlobalVisibility();
  } else {
    block.classList.add('hidden');
  }
}
function updateFBGlobalVisibility(){
  const globalEl = document.getElementById('f_msg_facebook');
  if (!globalEl) return;
  // container that holds the global message
  const wrap = document.getElementById('fb_global_wrap') || globalEl.closest('.form-row') || globalEl.parentElement;

  // If no selected FB pages => HIDE global message (inutile)
  const selected = collectSelectedFacebookPageIds();
  if (!selected.length){
    if (wrap) wrap.style.display = 'none';
    return;
  }

  // Hide the global message only if ALL selected pages have a custom message
  let allHave = true;
  selected.forEach(id => {
    const inp = document.querySelector(`.js-fb-page-message[data-page-id="${CSS.escape(id)}"]`);
    const val = (inp && !inp.disabled && (inp.value || '').trim());
    if (!val) allHave = false;
  });
  if (wrap) wrap.style.display = allHave ? 'none' : '';
}

function collectSelectedFacebookPageIds(){
  return Array.from(document.querySelectorAll('.js-fb-page:checked')).map(el => el.value);
}

function collectFacebookPageMessages(selectedIds){
  const map = {};
  const inputs = document.querySelectorAll('.js-fb-page-message');
  inputs.forEach(inp => {
    const pageId = inp.getAttribute('data-page-id') || '';
    const val = (inp.value || '').trim();
    if (!pageId) return;
    if (selectedIds && Array.isArray(selectedIds) && !selectedIds.includes(pageId)) return;
    if (val) map[pageId] = val;
  });
  return map;
}

// ====== Generic provider toggling (show/hide provider sections, special FB handling)
function bindProviderToggles(){
  const cbs = document.querySelectorAll('.js-share-provider');
  cbs.forEach(cb => {
    const targetSel = cb.getAttribute('data-target');
    const box = targetSel ? document.querySelector(targetSel) : null;
    const toggle = () => {
      const on = !!cb.checked;
      if (box) {
        if (on) box.removeAttribute('hidden'); else box.setAttribute('hidden','');
      }
      // Facebook requires extra wiring to load pages selector
      if ((cb.dataset.provider || '').toLowerCase() === 'facebook') {
        toggleFacebookSelector(on);
        updateFBGlobalVisibility();
      }
    };
    cb.addEventListener('change', toggle);
    // initial state
    toggle();
  });
}

function setupCustomMessageToggle({ provider, textareaId, toggleLabel = 'Personalizza messaggio', cancelLabel = 'Usa messaggio automatico' }){
  const section = document.querySelector(`.share-block[data-provider="${provider}"]`);
  const ta = document.getElementById(textareaId);
  if (!section || !ta) return;

  // Find a sensible container for the textarea and its label/help
  const block = ta.closest('.form-row') || ta.parentElement;
  if (!block) return;

  // Create the "personalizza" toggle button (shown when collapsed)
  let btn = section.querySelector(`.js-toggle-custom-${provider}`);
  if (!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary js-toggle-custom-' + provider;
    btn.textContent = toggleLabel;
    // place button right before the block
    block.parentNode.insertBefore(btn, block);
  }

  // Create a small cancel link inside the block to collapse back
  let cancel = block.querySelector('.js-cancel-custom');
  if (!cancel){
    cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn js-cancel-custom';
    cancel.textContent = cancelLabel;
    cancel.style.marginTop = '.5rem';
    block.appendChild(cancel);
  }

  function apply(){
    const hasValue = !!(ta.value || '').trim();
    // collapsed when empty
    if (hasValue){
      btn.style.display = 'none';
      block.style.display = '';
    } else {
      btn.style.display = '';
      block.style.display = 'none';
    }
  }

  btn.addEventListener('click', () => {
    block.style.display = '';
    btn.style.display = 'none';
    ta.focus();
  });

  cancel.addEventListener('click', () => {
    // clear and collapse
    ta.value = '';
    const cc = block.querySelector('.char-counter');
    if (cc && ta.maxLength) cc.textContent = `0/${ta.maxLength}`;
    apply();
  });

  ta.addEventListener('input', apply);

  // initial
  apply();
}

// ====== Social sharing ======
function readSocialFromForm(form){
  const share_on_publish = !!form.querySelector('#f_share_on_publish')?.checked;
  const providers = {
    linkedin: !!form.querySelector('#f_provider_linkedin')?.checked,
    facebook: !!form.querySelector('#f_provider_facebook')?.checked,
    threads:  !!form.querySelector('#f_provider_threads')?.checked
  };
  const message_overrides = {
    linkedin: (form.querySelector('#f_msg_linkedin')?.value || '').trim(),
    facebook: (form.querySelector('#f_msg_facebook')?.value || '').trim(),
    threads:  (form.querySelector('#f_msg_threads')?.value  || '').trim()
  };
  return { share_on_publish, providers, message_overrides };
}

function collectShareContext(){
  const panel = document.getElementById('share_panel');
  const base = panel?.dataset?.endpointBase || '/admin/news';
  const id = getPostId();
  const providers = Array.from(document.querySelectorAll('.js-share-provider:checked')).map(el => el.dataset.provider);
  const messages = {};
  document.querySelectorAll('.js-share-message').forEach(el => {
    const k = el.dataset.provider;
    if (k) messages[k] = (el.value || '').trim();
  });

  // providerOptions (facebook: pageIds + per-page messages)
  const providerOptions = {};
  if (providers.includes('facebook')) {
    const selected = collectSelectedFacebookPageIds();
    if (selected.length) {
      providerOptions.facebook = { pageIds: selected };
      const pageMessages = collectFacebookPageMessages(selected);
      if (Object.keys(pageMessages).length) {
        providerOptions.facebook.pageMessages = pageMessages;
      }
    }
  }
  return { id, base, providers, messages, providerOptions };
}

function renderShareResult(results){
  const box = document.getElementById('social_status');
  if (!box) return;

  function renderFacebookDetails(pages){
    if (!Array.isArray(pages) || !pages.length) return '';
    const rows = pages.map(p => {
      const status = p.ok ? '✅' : '❌';
      const tail = p.permalink ? ` — <a href="${p.permalink}" target="_blank" rel="noopener">apri</a>` : '';
      const err = p.ok ? '' : ` — ${p.error || ''}`;
      const label = p.name || p.pageName || p.pageId;
      return `<li>${status} ${label}${tail}${err ? ' — ' + err : ''}</li>`;
    }).join('');
    return `<ul class="share-sublist">${rows}</ul>`;
  }

  const items = [];
  Object.entries(results || {}).forEach(([provider, data]) => {
    if (provider === 'facebook' && Array.isArray(data?.pages)) {
      const head = data.ok ? '✅ facebook' : `❌ facebook: ${data.error || ''}`;
      items.push(`<li>${head}${renderFacebookDetails(data.pages)}</li>`);
    } else if (data?.ok) {
      const link = data.permalink ? `<a href="${data.permalink}" target="_blank" rel="noopener">${provider}</a>` : provider;
      items.push(`<li class="ok">✅ ${link}</li>`);
    } else {
      const msg = data?.error || 'Errore';
      items.push(`<li class="err">❌ ${provider}: ${msg}</li>`);
    }
  });

  box.innerHTML = items.length ? `<ul class="share-result">${items.join('')}</ul>` : '';
}

function bindShareNow(){
  const btn = document.getElementById('btn_share_now') || document.querySelector('.js-share-now');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', async () => {
    const form = document.getElementById('news_form');
    const { id, base, providers, messages, providerOptions } = collectShareContext();

    if (!id) { window.Toast?.show('Disponibile dopo il salvataggio','err'); return; }
    const sel = providers && providers.length ? providers : Object.keys(readSocialFromForm(form).providers).filter(k => readSocialFromForm(form).providers[k]);
    if (!sel.length) { window.Toast?.show('Seleziona almeno un provider','err'); return; }

    const payload = { providers: sel, overrides: messages, providerOptions };
    btn.disabled = true;
    const originalTxt = btn.textContent;
    btn.textContent = 'Condivisione...';

    try {
      const res = await http.post(`${base}/${encodeURIComponent(id)}/share`, payload);
      window.Toast?.show('Condivisione completata','ok');
      renderShareResult(res?.results || {});
    } catch (e) {
      console.error(e);
      window.Toast?.show('Errore condivisione','err');
    } finally {
      btn.disabled = false;
      btn.textContent = originalTxt || 'Condividi ora';
    }
  });
}

// ====== Init ======
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('news_form');
  const titleEl = document.getElementById('f_title');
  const slugEl  = document.getElementById('f_slug');
  const contentEl = document.getElementById('f_content');
  const tagsEl = document.getElementById('f_tags');
  const chips = document.getElementById('tags_chips');
  const previewPanel = document.getElementById('preview_panel');
  const toggleBtn = document.getElementById('btn_toggle_preview');

  bindCoverUpload();
  bindCategoriesAdmin();
  bindShareNow();

  // Providers UI wiring (show/hide sections + FB pages lazy load)
  bindProviderToggles();

  // Attach char counters to provider message textareas
  attachCharCounter(document.getElementById('f_msg_linkedin'));
  attachCharCounter(document.getElementById('f_msg_facebook'));
  attachCharCounter(document.getElementById('f_msg_threads'));
  bindAutosize(document.getElementById('f_msg_linkedin'));
  bindAutosize(document.getElementById('f_msg_facebook'));
  bindAutosize(document.getElementById('f_msg_threads'));

  // Collapse provider messages unless user personalizes them
  setupCustomMessageToggle({ provider: 'linkedin', textareaId: 'f_msg_linkedin' });
  setupCustomMessageToggle({ provider: 'threads',  textareaId: 'f_msg_threads'  });

  let slugTouched = false;

  // Toolbar cloning
  const toolbar = document.getElementById('toolbar_actions');
  if (toolbar) {
    const actions = document.querySelector('.actions');
    if (actions) {
      toolbar.innerHTML = '';
      ['submit','publish','depublish','preview','toggle'].forEach(kind => {
        if (kind === 'submit') {
          const btn = actions.querySelector('button[type="submit"]')?.cloneNode(true);
          if (btn) { btn.id = 'toolbar_save_btn'; toolbar.appendChild(btn); }
        } else if (kind === 'publish') {
          const btn = actions.querySelector('button[data-act="publish"]')?.cloneNode(true);
          if (btn) toolbar.appendChild(btn);
        } else if (kind === 'depublish') {
          const btn = actions.querySelector('button[data-act="depublish"]')?.cloneNode(true);
          if (btn) toolbar.appendChild(btn);
        } else if (kind === 'preview') {
          const a = actions.querySelector('a[href*="/admin/news/preview/"]')?.cloneNode(true);
          if (a) toolbar.appendChild(a);
        } else if (kind === 'toggle') {
          const b = actions.querySelector('#btn_toggle_preview')?.cloneNode(true);
          if (b) { b.id = 'toolbar_toggle_preview'; toolbar.appendChild(b); }
        }
      });
    }
  }

  // Auto-slug from title until user edits slug manually
  slugEl?.addEventListener('input', () => { slugTouched = true; });
  titleEl?.addEventListener('input', () => { if (!slugTouched) slugEl.value = slugify(titleEl.value || ''); });

  // Tag chips
  if (tagsEl) {
    renderTagsChips(tagsEl, chips);
    tagsEl.addEventListener('input', () => renderTagsChips(tagsEl, chips));
  }

  // Live preview
  const setPreviewVisible = (v) => {
    if (!previewPanel) return;
    if (v) { previewPanel.classList.remove('hidden'); updateLivePreview(); }
    else { previewPanel.classList.add('hidden'); }
  };
  toggleBtn?.addEventListener('click', () => {
    const isHidden = previewPanel?.classList.contains('hidden');
    setPreviewVisible(isHidden);
  });
  contentEl?.addEventListener('input', updateLivePreview);

  // Ctrl/Cmd+S save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  // Submit (create/update)
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = formToJSON(form);
      data.seo = readSEO(form);
      data.social = readSocialFromForm(form);

      const isEdit = /\/admin\/news\/[^\/]+\/edit$/.test(location.pathname);
      if (isEdit) {
        const id = location.pathname.split('/').slice(-2, -1)[0];
        await http.put(`/admin/news/api/${id}`, data);
        window.Toast?.show('Salvato ✅','ok');
      } else {
        await http.post('/admin/news/api', data);
        window.Toast?.show('Creato ✅','ok');
        location.assign('/admin/news');
      }
    } catch (err) {
      window.Toast?.show('Errore salvataggio','err');
      console.error(err);
    }
  });

  // Quick actions publish/depublish
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if(!btn) return;
    const id = btn.getAttribute('data-id') || location.pathname.split('/').slice(-2, -1)[0];
    const act = btn.getAttribute('data-act');
    try {
      if (act === 'publish') {
        await http.post(`/admin/news/api/${id}/publish`);
        window.Toast?.show('Pubblicato ✅','ok');
        location.reload();
      } else if (act === 'depublish') {
        await http.post(`/admin/news/api/${id}/depublish`);
        window.Toast?.show('Depubblicato','');
        location.reload();
      }
    } catch (err) {
      window.Toast?.show('Errore azione','err');
      console.error(err);
    }
  });
});


// cms/public/admin/js/events/event-poster.js
// Admin – Poster tab (save + preview via optional mediaResolver)

(function(){
  'use strict';

  const root = document.getElementById('event_admin');
  if (!root) return;

  const cloudinaryInput = document.getElementById('poster_cloudinary_id');
  const localInput = document.getElementById('poster_local_filename');
  const btnSave = document.getElementById('btn_poster_save');
  const preview = document.getElementById('poster_preview');

  const urls = {
    update: root.dataset.posterUpdate,
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

  function resolvePoster(cloudinaryId, localFilename){
    // Prefer a global mediaResolver if present (no hard-coded URLs here)
    try {
      if (window.mediaResolver) {
        if (typeof window.mediaResolver.resolvePoster === 'function') {
          return window.mediaResolver.resolvePoster({ cloudinaryId, localFilename });
        }
        if (typeof window.mediaResolver.posterUrl === 'function') {
          return window.mediaResolver.posterUrl(cloudinaryId, localFilename);
        }
      }
    } catch(_){}
    return null;
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  function renderPreview(){
    if (!preview) return;
    const cloudinaryId = (cloudinaryInput?.value || '').trim();
    const localFilename = (localInput?.value || '').trim();

    const url = resolvePoster(cloudinaryId, localFilename);
    if (url) {
      preview.innerHTML = '';
      const fig = document.createElement('figure');
      fig.className = 'poster-figure';
      const img = document.createElement('img');
      img.alt = 'Poster preview';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = url;
      const cap = document.createElement('figcaption');
      cap.textContent = cloudinaryId ? `Cloudinary: ${cloudinaryId}` : (localFilename ? `Locale: ${localFilename}` : '');
      fig.appendChild(img);
      fig.appendChild(cap);
      preview.appendChild(fig);
      return;
    }

    // Fallback: textual preview only (no resolver available)
    const lines = [];
    lines.push(`<strong>Cloudinary ID:</strong> ${escapeHtml(cloudinaryId || '—')}`);
    lines.push(`<strong>File locale:</strong> ${escapeHtml(localFilename || '—')}`);
    lines.push('<em>Nessuna anteprima immagine disponibile senza media resolver.</em>');
    preview.innerHTML = `<div class="poster-text-preview">${lines.join('<br>')}</div>`;
  }

  function prefillFromDataset(){
    const dsCloud = root.dataset.posterCloudinaryId || '';
    const dsLocal = root.dataset.posterLocalFilename || '';
    if (cloudinaryInput && !cloudinaryInput.value) cloudinaryInput.value = dsCloud;
    if (localInput && !localInput.value) localInput.value = dsLocal;
  }

  async function onSave(){
    const cloudinaryId = (cloudinaryInput?.value || '').trim() || null;
    const localFilename = (localInput?.value || '').trim() || null;
    btnSave?.setAttribute('disabled', 'disabled');
    try {
      await jsonFetch(urls.update, { method: 'POST', body: JSON.stringify({ cloudinaryId, localFilename }) });
      // update dataset for consistency
      root.dataset.posterCloudinaryId = cloudinaryId || '';
      root.dataset.posterLocalFilename = localFilename || '';
      renderPreview();
      alert('Poster aggiornato.');
    } catch (err) {
      alert('Errore nel salvataggio poster: ' + err.message);
    } finally {
      btnSave?.removeAttribute('disabled');
    }
  }

  function bindEvents(){
    btnSave?.addEventListener('click', onSave);
    cloudinaryInput?.addEventListener('input', renderPreview);
    localInput?.addEventListener('input', renderPreview);
    [cloudinaryInput, localInput].forEach(el => {
      el?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { onSave(); }
      });
    });
  }

  prefillFromDataset();
  bindEvents();
  renderPreview();
})();
document.addEventListener('DOMContentLoaded', () => {

  const evidenzaList = document.getElementById('evidenza-list');
  const socialList = document.getElementById('social-list');
  const extraList = document.getElementById('extra-list');
  const previewMobile = document.getElementById('preview-mobile');

  // Crea elemento link per lista
  function createLinkItem(section, data = {}) {
    const li = document.createElement('li');
    li.className = 'link-item';

    li.innerHTML = `
      <label>Testo:
        <input type="text" class="input-text" placeholder="Testo del link" value="${data.title || ''}" />
      </label>
      <label>URL:
        <input type="url" class="input-url" placeholder="https://" value="${data.url || ''}" />
      </label>
      ${section !== 'evidenza' ? `
        <label>Icona Oro:
          <input type="text" class="input-icon-gold" placeholder="/img/icons/icon-gold.svg" value="${data.iconGold || data.icon || ''}" />
        </label>
        <label>Icona Nero:
          <input type="text" class="input-icon-black" placeholder="/img/icons/icon-black.svg" value="${data.iconBlack || data.icon || ''}" />
        </label>
      ` : `
        <label>Icona (singola):
          <input type="text" class="input-icon" placeholder="/img/icons/icon.svg" value="${data.icon || ''}" />
        </label>
      `}
      <button type="button" class="remove-btn">Rimuovi</button>
    `;

    li.querySelector('.remove-btn').addEventListener('click', () => {
      li.remove();
      aggiornaPreview();
    });

    li.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', aggiornaPreview);
    });

    return li;
  }

  // Carica dati da backend
  async function caricaDati() {
    try {
      const res = await fetch('/api/contatti');
      if (!res.ok) throw new Error('Errore caricamento dati');
      const dati = await res.json();

      evidenzaList.innerHTML = '';
      dati.evidenza?.forEach(d => evidenzaList.appendChild(createLinkItem('evidenza', d)));

      socialList.innerHTML = '';
      dati.socialLinks?.forEach(d => socialList.appendChild(createLinkItem('social', d)));

      extraList.innerHTML = '';
      dati.extraLinks?.forEach(d => extraList.appendChild(createLinkItem('extraLinks', d)));

      aggiornaPreview();
    } catch (e) {
      alert('Errore caricando dati contatti');
    }
  }

  // Aggiorna anteprima live
  function creaLinkPreview(link) {
    if (!link.url || !link.title) return '';
    const iconHtml = link.iconGold && link.iconBlack
      ? `<img src="${link.iconGold}" alt="" class="gold" style="height:16px; vertical-align:middle; margin-right:6px;"><img src="${link.iconBlack}" alt="" class="black" style="height:16px; vertical-align:middle; display:none;">`
      : (link.icon ? `<img src="${link.icon}" alt="" style="height:16px; vertical-align:middle; margin-right:6px;">` : '');
    return `<a href="${link.url}" target="_blank" class="linktree-btn">
      ${iconHtml}
      ${link.title}
    </a>`;
  }

  function aggiornaPreview() {
    let html = '<strong>In evidenza</strong><br>';
    html += [...evidenzaList.querySelectorAll('li')].map(li => creaLinkPreview({
      title: li.querySelector('.input-text').value.trim(),
      url: li.querySelector('.input-url').value.trim(),
      icon: li.querySelector('.input-icon')?.value.trim()
    })).join('');

    html += '<br><strong>Social</strong><br>';
    html += [...socialList.querySelectorAll('li')].map(li => creaLinkPreview({
      title: li.querySelector('.input-text').value.trim(),
      url: li.querySelector('.input-url').value.trim(),
      iconGold: li.querySelector('.input-icon-gold')?.value.trim(),
      iconBlack: li.querySelector('.input-icon-black')?.value.trim()
    })).join('');

    html += '<br><strong>Link Extra</strong><br>';
    html += [...extraList.querySelectorAll('li')].map(li => creaLinkPreview({
      title: li.querySelector('.input-text').value.trim(),
      url: li.querySelector('.input-url').value.trim(),
      iconGold: li.querySelector('.input-icon-gold')?.value.trim(),
      iconBlack: li.querySelector('.input-icon-black')?.value.trim()
    })).join('');

    previewMobile.innerHTML = html;

    // Hover effetto scambio icone oro/nero
    previewMobile.querySelectorAll('.linktree-btn').forEach(link => {
      link.addEventListener('mouseenter', () => {
        const goldIcon = link.querySelector('.gold');
        const blackIcon = link.querySelector('.black');
        if (goldIcon && blackIcon) {
          goldIcon.style.display = 'none';
          blackIcon.style.display = 'inline';
        }
      });
      link.addEventListener('mouseleave', () => {
        const goldIcon = link.querySelector('.gold');
        const blackIcon = link.querySelector('.black');
        if (goldIcon && blackIcon) {
          goldIcon.style.display = 'inline';
          blackIcon.style.display = 'none';
        }
      });
    });
  }

  // Eventi aggiungi link
  document.getElementById('add-evidenza').addEventListener('click', () => {
    evidenzaList.appendChild(createLinkItem('evidenza'));
    aggiornaPreview();
  });
  document.getElementById('add-social').addEventListener('click', () => {
    socialList.appendChild(createLinkItem('social'));
    aggiornaPreview();
  });
  document.getElementById('add-extra').addEventListener('click', () => {
    extraList.appendChild(createLinkItem('extraLinks'));
    aggiornaPreview();
  });

  // Drag & Drop con SortableJS
  ['evidenza-list', 'social-list', 'extra-list'].forEach(id => {
    Sortable.create(document.getElementById(id), {
      animation: 150,
      ghostClass: 'sortable-ghost',
      handle: '.link-item',
      draggable: 'li',
      onEnd: aggiornaPreview
    });
  });

  // Salvataggio dati al backend
  document.getElementById('save-btn').addEventListener('click', async () => {
    function extractLinks(list) {
      return [...list.querySelectorAll('li')].map(li => {
        const title = li.querySelector('.input-text').value.trim();
        const url = li.querySelector('.input-url').value.trim();
        if (!title || !url) return null;
        if (list.id === 'evidenza-list') {
          const icon = li.querySelector('.input-icon')?.value.trim() || '';
          return { title, url, icon };
        } else {
          const iconGold = li.querySelector('.input-icon-gold')?.value.trim() || '';
          const iconBlack = li.querySelector('.input-icon-black')?.value.trim() || '';
          return { title, url, iconGold, iconBlack };
        }
      }).filter(x => x);
    }

    const dataToSave = {
      evidenza: extractLinks(evidenzaList),
      socialLinks: extractLinks(socialList),
      extraLinks: extractLinks(extraList)
    };

    try {
      const res = await fetch('/api/contatti', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) alert('Dati salvati con successo!');
      else alert('Errore durante il salvataggio');
    } catch {
      alert('Errore di rete durante il salvataggio');
    }
  });

  // Caricamento iniziale dati
  caricaDati();

});
// Funzione per aggiornare lo stato globale (manutenzione ON/OFF)
async function fetchGlobalStatus() {
  const btn = document.getElementById('btnMaintenanceGlobal');
  const led = btn.querySelector('.led');
  const textSpan = btn.querySelector('.btn-text');

  try {
    const res = await fetch('/api/maintenance/global');
    const data = await res.json();

    if (data.enabled === true) {
      // sito in manutenzione (rosso)
      btn.classList.add('maintenance-on');
      btn.setAttribute('aria-pressed', 'true');
      led.style.backgroundColor = '#c1272d';
      led.style.boxShadow = '0 0 15px #c1272d';
      textSpan.textContent = 'Sito in manutenzione';
    } else {
      // sito online (verde)
      btn.classList.remove('maintenance-on');
      btn.setAttribute('aria-pressed', 'false');
      led.style.backgroundColor = '#4caf50';
      led.style.boxShadow = '0 0 10px #4caf50';
      textSpan.textContent = 'Sito online';
    }
  } catch (err) {
    console.error('Errore fetchGlobalStatus:', err);
  }
}

// Funzione per cambiare lo stato globale con conferma
async function toggleGlobal() {
  const btn = document.getElementById('btnMaintenanceGlobal');
  const isMaintenanceOn = btn.classList.contains('maintenance-on'); // true = manutenzione attiva

  const confirmMsg = isMaintenanceOn
    ? 'Sei sicuro di voler mettere il sito online?'
    : 'Sei sicuro di voler mettere il sito in manutenzione?';

  if (!confirm(confirmMsg)) return;

  try {
    await fetch('/api/maintenance/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !isMaintenanceOn }),
    });
    await fetchGlobalStatus();
    await fetchPagesStatus();
  } catch (err) {
    console.error('Errore toggleGlobal:', err);
  }
}

// Funzione per aggiornare lo stato di una singola pagina
async function fetchPageStatus(page, btnStatus, statusText, panelItem) {
  try {
    const res = await fetch(`/api/maintenance/pages/${page}`);
    const data = await res.json();

    if (data.enabled === true) {
      // pagina in manutenzione (rosso)
      btnStatus.classList.remove('status-on');
      btnStatus.classList.add('status-off');
      panelItem.classList.remove('status-on');
      panelItem.classList.add('status-off');
      statusText.style.display = 'inline-block';
      btnStatus.setAttribute('aria-pressed', 'true');
    } else {
      // pagina online (verde)
      btnStatus.classList.remove('status-off');
      btnStatus.classList.add('status-on');
      panelItem.classList.remove('status-off');
      panelItem.classList.add('status-on');
      statusText.style.display = 'none';
      btnStatus.setAttribute('aria-pressed', 'false');
    }
  } catch (err) {
    console.error(`Errore fetchPageStatus per ${page}:`, err);
  }
}

// Funzione per cambiare lo stato manutenzione di una pagina con conferma
async function togglePage(page, btnStatus, statusText, panelItem) {
  const isMaintenanceOn = btnStatus.classList.contains('status-off'); 
  // status-off = manutenzione attiva (rosso)
  // status-on = online (verde)

  const confirmMsg = isMaintenanceOn
    ? `Sei sicuro di voler mettere la pagina ${page} online?`
    : `Sei sicuro di voler mettere la pagina ${page} in manutenzione?`;

  if (!confirm(confirmMsg)) return;

  try {
    await fetch(`/api/maintenance/pages/${page}/toggle`, { method: 'POST' });
    await fetchPageStatus(page, btnStatus, statusText, panelItem);
  } catch (err) {
    console.error(`Errore togglePage per ${page}:`, err);
  }
}

// Funzione per aggiornare tutti gli stati delle pagine
async function fetchPagesStatus() {
  const panelItems = document.querySelectorAll('.panel-item');
  for (const panelItem of panelItems) {
    const page = panelItem.querySelector('.btn-panel').getAttribute('data-panel');
    const btnStatus = panelItem.querySelector('.btn-status');
    const statusText = panelItem.querySelector('.status-text');

    await fetchPageStatus(page, btnStatus, statusText, panelItem);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchGlobalStatus();

  document.getElementById('btnMaintenanceGlobal').addEventListener('click', toggleGlobal);

  document.querySelectorAll('.panel-item').forEach(panelItem => {
    const page = panelItem.querySelector('.btn-panel').getAttribute('data-panel');
    const btnStatus = panelItem.querySelector('.btn-status');
    const statusText = panelItem.querySelector('.status-text');

    fetchPageStatus(page, btnStatus, statusText, panelItem);

    btnStatus.addEventListener('click', () => togglePage(page, btnStatus, statusText, panelItem));

    panelItem.querySelector('.btn-panel').addEventListener('click', () => {
      window.location.href = `/admin/${page}`;
    });
  });
});
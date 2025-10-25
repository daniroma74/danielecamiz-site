// toast.js
(() => {
  const root = document.getElementById('toast_root');
  function node(msg, cls='') {
    const div = document.createElement('div'); div.className = `toast ${cls}`; div.textContent = msg;
    return div;
  }
  function show(msg, type='') {
    if(!root) return;
    const el = node(msg, type); root.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 3200);
  }
  window.Toast = { show };
})();
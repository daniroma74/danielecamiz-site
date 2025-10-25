// modal.js
(() => {
  const modal = document.getElementById('confirm_modal');
  const map = { yes: null, no: null };
  function open({ title='Confermi?', message='', onYes=null, onNo=null }){
    if(!modal) return;
    $('#confirm_title').textContent = title;
    $('#confirm_message').textContent = message;
    map.yes = onYes; map.no = onNo;
    modal.classList.remove('hidden');
  }
  function close(){ modal?.classList.add('hidden'); }
  modal?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm]');
    if(btn){
      const type = btn.getAttribute('data-confirm');
      if(type === 'yes' && typeof map.yes === 'function') map.yes();
      if(type === 'no'  && typeof map.no  === 'function') map.no();
      close();
    }
    if(e.target === modal) close();
  });
  window.ConfirmModal = { open, close };
})();
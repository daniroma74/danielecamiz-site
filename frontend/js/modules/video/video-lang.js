// Modulo per funzioni di lingua specifiche per la pagina video

export function updateVideoLanguage(newLang) {
    window.lang = newLang || window.lang || 'it';
  
    // Mostra o nasconde elementi in base alla lingua (se presenti)
    document.querySelectorAll('.lang-it, .lang-en').forEach(el => {
      el.classList.remove('visible');
      if (el.classList.contains(`lang-${window.lang}`)) {
        el.classList.add('visible');
      }
    });
  
    // Aggiorna stato pulsanti lingua (esempio)
    document.getElementById('btn-it')?.classList.toggle('active', window.lang === 'it');
    document.getElementById('btn-en')?.classList.toggle('active', window.lang === 'en');
  }
  
  // Callback chiamata da main.js o init per aggiornare la lingua
  export function onLangChange(newLang) {
    updateVideoLanguage(newLang);
  }
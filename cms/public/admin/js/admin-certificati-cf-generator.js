// admin-certificati-cf-generator.js — con integrazione codici catastali reali

let comuniMap = new Map();

// Carica il file comuni.json e popola la mappa
fetch('../../data/comuni.json')
  .then(response => response.json())
  .then(data => {
    const lista = data.Foglio1; // 👈 accede correttamente all’array
    lista.forEach(comune => {
      comuniMap.set(comune.comune.toUpperCase(), comune.cod_fisco);
    });
    console.log("✅ comuniMap caricato:", comuniMap.size, "comuni");
  })
  .catch(err => console.error('Errore nel caricamento dei comuni:', err));

function generaCodiceFiscale(nome, cognome, dataNascita, sesso, comune, provincia) {
  const vocali = 'AEIOU';
  const consonanti = str => str.toUpperCase().replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, '');
  const vocaliSolo = str => str.toUpperCase().replace(/[^AEIOU]/g, '');

  const codiceNome = () => {
    const cons = consonanti(nome);
    if (cons.length > 3) return cons[0] + cons[2] + cons[3];
    return (cons + vocaliSolo(nome) + 'XXX').slice(0, 3);
  };

  const codiceCognome = () => {
    const cons = consonanti(cognome);
    return (cons + vocaliSolo(cognome) + 'XXX').slice(0, 3);
  };

  const mesi = 'ABCDEHLMPRST';

  const codiceData = () => {
    const [gg, mm, aaaa] = dataNascita.split('/');
    const anno = aaaa.slice(-2);
    const mese = mesi[parseInt(mm, 10) - 1];
    let giorno = parseInt(gg, 10);
    if (sesso === 'F') giorno += 40;
    return `${anno}${mese}${giorno.toString().padStart(2, '0')}`;
  };

  const codiceComune = () => {
    const normalizzato = comune.trim().toUpperCase();
    const codice = comuniMap.get(normalizzato);
    console.log("Cercando comune:", normalizzato, "→", codice);
    return codice || 'Z100';
  };

  const cf15 = `${codiceCognome()}${codiceNome()}${codiceData()}${codiceComune()}`;
  return cf15 + calcolaControllo(cf15);
}

['nome','cognome','dataNascita','sesso','luogoNascita','provinciaNascita'].forEach(id => {
  document.getElementById(id).addEventListener('input', aggiornaCF);
});

function aggiornaCF() {
  const nome = document.getElementById('nome').value;
  const cognome = document.getElementById('cognome').value;
  const data = document.getElementById('dataNascita').value;
  const sesso = document.getElementById('sesso').value;
  const comune = document.getElementById('luogoNascita').value;
  const provincia = document.getElementById('provinciaNascita').value;

  if (nome && cognome && data && sesso && comune && provincia && data.match(/\d{2}\/\d{2}\/\d{4}/)) {
    const cf = generaCodiceFiscale(nome, cognome, data, sesso, comune, provincia);
    document.getElementById('codiceFiscaleGenerato').value = cf;
  } else {
    document.getElementById('codiceFiscaleGenerato').value = '';
  }
}

function calcolaControllo(cf15) {
  const dispari = {
    0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
    K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
    U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23
  };
  const pari = {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
    K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
    U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25
  };
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf15[i];
    somma += (i % 2 === 0 ? dispari[c] : pari[c]) || 0;
  }
  return String.fromCharCode(65 + (somma % 26));
}
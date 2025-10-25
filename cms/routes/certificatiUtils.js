import { fileURLToPath } from 'url';
import path from 'path';
import fs from "fs/promises";
import fsSync from "fs";

// Ricava __dirname per ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Percorsi assoluti, compatibili con il tuo TREE ===
export const partecipantiPath = path.join(__dirname, '../data/partecipanti.json');
export const concertiPath = path.join(__dirname, '../data/concerti.json');
export const logoPath = path.join(__dirname, '../../pannello-certificati/assets/logo/icnt-logo-pdf.png');
export const firmaPath = path.join(__dirname, '../../pannello-certificati/assets/firma/firma-camiz-icnt.png');

// === Mappa strumenti → qualifiche
export const strumentiMap = {
  violino: "VIOLINISTA", viola: "VIOLISTA", violoncello: "VIOLONCELLISTA", contrabbasso: "CONTRABBASSISTA",
  flauto: "FLAUTISTA", oboe: "OBOISTA", clarinetto: "CLARINETTISTA", fagotto: "FAGOTTISTA",
  corno: "CORNISTA", tromba: "TROMBETTISTA", trombone: "TROMBONISTA", tuba: "TUBISTA",
  timpani: "TIMPANISTA", percussioni: "PERCUSSIONISTA", pianoforte: "PIANISTA",
  arpa: "ARPISTA", organo: "ORGANISTA"
};

// === GENERATORE CODICE FISCALE E CODICI CATASTALI COMUNI ===

let comuniMap = null;

export async function caricaComuniMap() {
  if (comuniMap) return comuniMap;
  const comuniPath = path.join(__dirname, '../../pannello-certificati/assets/data/comuni.json');
  const raw = await fs.readFile(comuniPath, "utf-8");
  const data = JSON.parse(raw);
  comuniMap = new Map();
  const lista = data.Foglio1;
  lista.forEach(comune => {
    comuniMap.set(comune.comune.toUpperCase(), comune.cod_fisco);
  });
  return comuniMap;
}

export async function generaCodiceFiscale({ nome, cognome, dataNascita, sesso, luogoNascita, provinciaNascita }) {
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
  const codiceComune = async () => {
    const map = await caricaComuniMap();
    const normalizzato = luogoNascita.trim().toUpperCase();
    const codice = map.get(normalizzato);
    return codice || 'Z100'; // fallback
  };
  const cf15 =
    codiceCognome() +
    codiceNome() +
    codiceData() +
    (await codiceComune());
  return cf15 + calcolaControllo(cf15);
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

export function capitalizeWords(str) {
  return str.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function wrapText(text, maxLength = 95) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach(word => {
    if ((line + word).length > maxLength) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line += word + " ";
    }
  });
  if (line) lines.push(line.trim());
  return lines;
}

export function backupPartecipanti(partecipantiPath) {
  try {
    if (fsSync.existsSync(partecipantiPath)) {
      const backupPath = partecipantiPath + '.bak';
      fsSync.copyFileSync(partecipantiPath, backupPath);
    }
  } catch (e) {
    console.error("❌ Errore backup partecipanti:", e);
  }
}

export async function salvaPartecipante(partecipantiPath, dati) {
  let partecipanti = [];
  try {
    if (fsSync.existsSync(partecipantiPath)) {
      const raw = await fs.readFile(partecipantiPath, "utf-8");
      partecipanti = raw.trim() ? JSON.parse(raw) : [];
    }
  } catch (e) {
    fsSync.renameSync(partecipantiPath, partecipantiPath + ".corrupt");
    partecipanti = [];
  }
  const esiste = partecipanti.some(p =>
    p.nome.trim().toLowerCase() === dati.nome.trim().toLowerCase() &&
    p.cognome.trim().toLowerCase() === dati.cognome.trim().toLowerCase() &&
    p.dataNascita === dati.dataNascita
  );
  if (!esiste) {
    backupPartecipanti(partecipantiPath);
    const nuovo = {
      ...dati,
      nome: capitalizeWords(dati.nome.trim()),
      cognome: capitalizeWords(dati.cognome.trim())
    };
    partecipanti.push(nuovo);
    await fs.writeFile(partecipantiPath, JSON.stringify(partecipanti, null, 2));
    return true;
  }
  return false;
}

export function suddividiBlocchiOttimale(blocchi, altezzaPagina, sogliaDueTerzi = 0.55) {
  const suddivisioni = [];
  function calcolaPadding(blocchiPagina, spazioTot) {
    const sommaAltezze = blocchiPagina.reduce((sum, b) => sum + b.height, 0);
    const nSpazi = Math.max(1, blocchiPagina.length - 1);
    return (spazioTot - sommaAltezze) / nSpazi;
  }
  function generaSuddivisioni(blocchi, numPagine, start=0, attuale=[]) {
    if (numPagine === 1) {
      suddivisioni.push([...attuale, blocchi.slice(start)]);
      return;
    }
    for (let i = start + 1; i <= blocchi.length - (numPagine - 1); i++) {
      generaSuddivisioni(blocchi, numPagine - 1, i, [...attuale, blocchi.slice(start, i)]);
    }
  }
  let sommaTot = blocchi.reduce((sum, b) => sum + b.height, 0);
  let nPagineMin = Math.ceil(sommaTot / altezzaPagina);
  nPagineMin = Math.max(1, nPagineMin);

  for (let npag = nPagineMin; npag <= Math.min(4, blocchi.length); npag++) {
    generaSuddivisioni(blocchi, npag);
  }

  let best = null, minPaddingDiff = Infinity;
  for (const suddiv of suddivisioni) {
    const paddings = [];
    let ok = true;
    for (let i = 0; i < suddiv.length; i++) {
      const blocchiPagina = suddiv[i];
      const isUltima = (i === suddiv.length - 1);
      const somma = blocchiPagina.reduce((sum, b) => sum + b.height, 0);
      const minRiemp = isUltima ? altezzaPagina * sogliaDueTerzi : 0;
      let areaArmonica = altezzaPagina;
      if (isUltima && somma < minRiemp) areaArmonica = minRiemp;
      if (isUltima && somma < altezzaPagina * 0.25) ok = false;
      paddings.push(calcolaPadding(blocchiPagina, areaArmonica));
    }
    const maxPad = Math.max(...paddings), minPad = Math.min(...paddings);
    const diff = Math.abs(maxPad - minPad);
    if (ok && diff < minPaddingDiff) {
      minPaddingDiff = diff;
      best = suddiv;
    }
  }
  if (!best) best = [blocchi];
  return best;
}

export function drawTextPartecipanteGrassetto(page, y, partecipante, font, fontBold) {
  const margin = 50;
  const nato = partecipante.sesso === 'F' ? 'nata' : 'nato';
  const qualifica = strumentiMap[partecipante.strumento.trim().toLowerCase()] ||
    `STRUMENTISTA AL ${partecipante.strumento.toUpperCase()}`;
  const parte1 = 'Si certifica che ';
  const nome = partecipante.nome;
  const cognome = partecipante.cognome;
  const parte2 = `, ${nato} a ${partecipante.luogoNascita} (${partecipante.provinciaNascita}) il ${partecipante.dataNascita}, CF `;
  const cf = partecipante.codiceFiscale;
  const parte3 = ', ha partecipato in qualità di ';
  const qualificaBold = qualifica;
  const parte4 = ' nel corso dell’anno scolastico ';
  const parte5 = partecipante.annoScolastico ? partecipante.annoScolastico : '';
  const parte6 = ' ai seguenti concerti organizzati dall’Associazione ICNT – I concerti nel tempio:';

  let testoWrap = parte1 + nome + " " + cognome + parte2 + cf + parte3 + qualificaBold + parte4 + parte5 + parte6;
  const lines = wrapText(testoWrap, 95);

  lines.forEach((line, i) => {
    let x = margin;

    function drawAndAdvance(testo, bold = false) {
      page.drawText(testo, { x, y: y - i * 15, size: 11, font: bold ? fontBold : font });
      x += (bold ? fontBold : font).widthOfTextAtSize(testo, 11);
    }

    let tmp = line;
    [
      { t: nome, bold: true },
      { t: cognome, bold: true },
      { t: cf, bold: true },
      { t: qualificaBold, bold: true }
    ].forEach(seg => {
      const idx = tmp.indexOf(seg.t);
      if (idx !== -1) {
        if (idx > 0) drawAndAdvance(tmp.slice(0, idx));
        drawAndAdvance(seg.t, true);
        tmp = tmp.slice(idx + seg.t.length);
      }
    });
    if (tmp.length > 0) drawAndAdvance(tmp, false);
  });
}
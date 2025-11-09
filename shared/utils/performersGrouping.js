// shared/utils/performersGrouping.js
// Funzione condivisa per normalizzare e raggruppare solisti per strumento

/**
 * Normalizza il nome di uno strumento
 * @param {string} instrument - Nome strumento grezzo
 * @returns {string|null} - Nome normalizzato o null se da escludere
 */
export function normalizeInstrument(instrument) {
  if (!instrument) return 'Altro';

  const normalized = instrument.trim().toLowerCase();

  // Escludi "Coro" dai solisti - deve stare solo in ensemble
  if (normalized === 'coro') {
    return null;
  }

  // Raggruppa tutti i cantanti
  if (['soprano', 'mezzosoprano', 'contralto', 'tenore', 'baritono', 'basso'].includes(normalized)) {
    return 'Voce';
  }

  // Normalizza strumenti comuni
  const instrumentMap = {
    'pianoforte': 'Pianoforte',
    'piano': 'Pianoforte',
    'violino': 'Violino',
    'violoncello': 'Violoncello',
    'cello': 'Violoncello',
    'viola': 'Viola',
    'contrabbasso': 'Contrabbasso',
    'flauto': 'Flauto',
    'oboe': 'Oboe',
    'clarinetto': 'Clarinetto',
    'fagotto': 'Fagotto',
    'corno': 'Corno',
    'tromba': 'Tromba',
    'trombone': 'Trombone',
    'arpa': 'Arpa',
    'organo': 'Organo',
    'sassofono': 'Sassofono',
    'chitarra': 'Chitarra',
    'percussioni': 'Percussioni'
  };

  return instrumentMap[normalized] || instrument.trim();
}

/**
 * Raggruppa solisti per strumento normalizzato
 * @param {Array} soloists - Array di oggetti solista {name, instrument, ...}
 * @returns {Array} - Array di gruppi {instrument, soloists: [...]}
 */
export function groupSoloistsByInstrument(soloists) {
  const soloistsByInstrument = {};

  soloists.forEach(soloist => {
    const instrument = normalizeInstrument(soloist.instrument);
    // Salta se è null (es. Coro)
    if (!instrument) return;

    if (!soloistsByInstrument[instrument]) {
      soloistsByInstrument[instrument] = [];
    }

    // Mantieni lo strumento originale per visualizzazione
    soloistsByInstrument[instrument].push({
      ...soloist,
      displayInstrument: soloist.instrument ? soloist.instrument.trim() : null
    });
  });

  // Ordine personalizzato: Voce prima, poi strumenti alfabetici
  const instrumentOrder = ['Voce'];
  const instrumentGroups = Object.keys(soloistsByInstrument)
    .sort((a, b) => {
      const aIndex = instrumentOrder.indexOf(a);
      const bIndex = instrumentOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(instrument => ({
      instrument,
      soloists: soloistsByInstrument[instrument].sort((a, b) => a.name.localeCompare(b.name))
    }));

  return instrumentGroups;
}

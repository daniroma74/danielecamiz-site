import { readFile, writeFile } from 'node:fs/promises';

const keyMap = {
  "titolo": "title",
  "data": "date",
  "luogo": "location",
  "solisti": "soloists",
  "orchestra": "orchestra",
  "direttore": "conductor",
  "programma": "program",
  "note": "notes",
  "locandina": "poster",
  "locandina_cloudinary_url": "locandina_cloudinary_url"
  // eventbrite ed interpreti NON sono mappati, li eliminiamo
};

function renameAndFilterKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(renameAndFilterKeys);
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (key === 'interpreti' || key === 'eventbrite') {
        // Skip these keys completely
        continue;
      }
      const newKey = keyMap[key] || key;
      newObj[newKey] = renameAndFilterKeys(obj[key]);
    }
    return newObj;
  }
  return obj;
}

async function convertFile() {
  try {
    const inputPath = './concerti.json';
    const outputPath = './concertiok.json';

    const data = await readFile(inputPath, 'utf8');
    const jsonData = JSON.parse(data);

    const converted = renameAndFilterKeys(jsonData);

    await writeFile(outputPath, JSON.stringify(converted, null, 2));
    console.log('File convertito e salvato in', outputPath);
  } catch (err) {
    console.error('Errore:', err);
  }
}

convertFile();
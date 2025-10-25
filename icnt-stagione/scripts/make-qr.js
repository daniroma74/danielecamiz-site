import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Dove salvare i file
const outDir = path.resolve(__dirname, '../public/img');
fs.mkdirSync(outDir, { recursive: true });

// URL da codificare (puoi sovrascrivere con: QR_URL='https://...' node scripts/make-qr.js)
const url = process.env.QR_URL || 'https://icnt.danielecamiz.com/s';

// Opzioni stampa: correzione H, bordo bianco (quiet zone) 4
const baseOpts = {
  errorCorrectionLevel: 'H',
  margin: 4,
  color: { dark: '#000000', light: '#FFFFFF' }
};

// 1) SVG vettoriale (ideale per la locandina)
const svg = await QRCode.toString(url, { ...baseOpts, type: 'svg' });
fs.writeFileSync(path.join(outDir, 'qr-icnt-s.svg'), svg);

// 2) PNG hi-res per impaginatori che vogliono raster
await QRCode.toFile(path.join(outDir, 'qr-icnt-s-2048.png'), url, { ...baseOpts, width: 2048 });
await QRCode.toFile(path.join(outDir, 'qr-icnt-s-1024.png'), url, { ...baseOpts, width: 1024 });

console.log('QR creati in:', outDir);
console.log('- qr-icnt-s.svg');
console.log('- qr-icnt-s-2048.png');
console.log('- qr-icnt-s-1024.png');

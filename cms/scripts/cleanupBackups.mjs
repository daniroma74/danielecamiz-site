import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Risolve __dirname anche in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const BACKUP_DIR = join(__dirname, '..', 'backups');
const FILE_TYPES = ['concerti', 'galleria'];
const KEEP = 20;

for (const type of FILE_TYPES) {
  const files = (await readdir(BACKUP_DIR))
    .filter(file => file.startsWith(type))
    .sort()
    .reverse();

  const toDelete = files.slice(KEEP);
  for (const file of toDelete) {
    await unlink(join(BACKUP_DIR, file));
    console.log(`Eliminato: ${file}`);
  }
}

console.log('Pulizia backup completata!');
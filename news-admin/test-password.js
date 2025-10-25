import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const ADMIN_PASSWORD = process.env.NEWS_ADMIN_PASS || 'changeme123';

console.log('\n🔐 TEST PASSWORD:');
console.log('   Variabile NEWS_ADMIN_PASS:', process.env.NEWS_ADMIN_PASS || '❌ NON TROVATA');
console.log('   Password usata:', ADMIN_PASSWORD);
console.log('   Default fallback:', ADMIN_PASSWORD === 'changeme123' ? '⚠️  SÌ (problema!)' : '✅ NO');
console.log('\n');

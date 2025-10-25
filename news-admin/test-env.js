import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica .env locale
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('\n=== TEST VARIABILI AMBIENTE ===\n');

console.log('☁️  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NON TROVATO');
console.log('🔑 CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Presente (***' + process.env.CLOUDINARY_API_KEY.slice(-4) + ')' : '❌ NON TROVATO');

console.log('\n🔐 NEWS ADMIN AUTH:');
console.log('  NEWS_ADMIN_USER:', process.env.NEWS_ADMIN_USER || '❌ NON TROVATO (default: admin)');
console.log('  NEWS_ADMIN_PASS:', process.env.NEWS_ADMIN_PASS ? '✅ Presente (***' + process.env.NEWS_ADMIN_PASS.slice(-3) + ')' : '❌ NON TROVATO');

console.log('\n💾 DATABASE:');
console.log('  MAIN_SQLITE_PATH:', process.env.MAIN_SQLITE_PATH || '❌ NON TROVATO');

console.log('\n📱 SOCIAL:');
console.log('  FB_SYSTEM_USER_TOKEN:', process.env.FB_SYSTEM_USER_TOKEN ? '✅ Presente' : '❌ NON TROVATO');
console.log('  LINKEDIN_ACCESS_TOKEN:', process.env.LINKEDIN_ACCESS_TOKEN ? '✅ Presente' : '❌ NON TROVATO');
console.log('  THREADS_ACCESS_TOKEN:', process.env.THREADS_ACCESS_TOKEN ? '✅ Presente' : '❌ NON TROVATO');

console.log('\n');

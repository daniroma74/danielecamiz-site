import * as Store from './utils/newsStore.js';

console.log('\n🧪 TEST newsStore.js\n');

(async () => {
  try {
    console.log('1. Test listPublished()...');
    const published = await Store.listPublished({ lang: 'it', limit: 10 });
    console.log(`   Trovati ${published.length} articoli pubblicati:`);
    published.forEach(p => {
      console.log(`   - [${p.id}] ${p.title} (slug: ${p.slug}, status: ${p.status})`);
    });
    
    console.log('\n2. Test getByIdOrSlug("prova")...');
    const post = await Store.getByIdOrSlug('prova', { lang: 'it' });
    if (post) {
      console.log(`   ✅ Trovato: ${post.title}`);
      console.log(`      Status: ${post.status}`);
      console.log(`      Slug: ${post.slug}`);
      console.log(`      Content: ${post.content_md?.substring(0, 100)}...`);
    } else {
      console.log(`   ❌ NON trovato!`);
    }
    
    console.log('\n3. Test list() con status=published...');
    const list = await Store.list({ status: 'published', limit: 10 });
    console.log(`   Totale: ${list.total}, Items: ${list.items.length}`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
  
  process.exit(0);
})();

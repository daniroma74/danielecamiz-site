import { db } from './config/database.js';

try {
  console.log('🔄 Running migration 034: Add thumbnail_url to contact_links...');

  // Add column
  db.exec("ALTER TABLE contact_links ADD COLUMN thumbnail_url TEXT");
  console.log('✅ Added thumbnail_url column');

  // Add index
  db.exec("CREATE INDEX IF NOT EXISTS idx_contact_links_thumbnail ON contact_links(thumbnail_url)");
  console.log('✅ Created index on thumbnail_url');

  console.log('✅ Migration 034 executed successfully');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('⚠️  Column already exists, skipping');
  } else {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

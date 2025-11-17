/**
 * Reset Admin Password - Garantito
 * Elimina e ricrea l'utente admin con password admin123
 */

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');

async function resetAdmin() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('🔄 Resetting admin user...\n');

  const username = 'admin';
  const password = 'admin123';
  const fullName = 'Amministratore';
  const email = 'admin@cororaro.it';

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('✅ Password hash generated');

    // Step 1: Delete existing admin user
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM admin_users WHERE username = ?', [username], function(err) {
        if (err) reject(err);
        else {
          console.log(`🗑️  Deleted ${this.changes} existing user(s)`);
          resolve();
        }
      });
    });

    // Step 2: Create fresh admin user
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO admin_users (username, password, full_name, email, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [username, hash, fullName, email],
        function(err) {
          if (err) reject(err);
          else {
            console.log('✅ New admin user created with ID:', this.lastID);
            resolve();
          }
        }
      );
    });

    // Step 3: Verify
    await new Promise((resolve, reject) => {
      db.get('SELECT id, username, full_name FROM admin_users WHERE username = ?', [username], async (err, user) => {
        if (err) reject(err);
        else {
          console.log('\n✅ Verification successful:');
          console.log('   ID:', user.id);
          console.log('   Username:', user.username);
          console.log('   Name:', user.full_name);

          // Test password
          db.get('SELECT password FROM admin_users WHERE username = ?', [username], async (err, row) => {
            if (err) {
              console.error('Error testing password:', err);
            } else {
              const match = await bcrypt.compare('admin123', row.password);
              console.log('   Password test:', match ? '✅ WORKS' : '❌ FAILED');
            }
            resolve();
          });
        }
      });
    });

    console.log('\n📝 Login credentials:');
    console.log('   URL: http://staging.cororaro.it/admin');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n🎉 Admin reset complete!\n');

    db.close();
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

resetAdmin();

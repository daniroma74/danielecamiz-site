/**
 * Update existing user to admin|admin123
 * Converts daniele user to simple admin credentials
 */

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');

async function updateToSimpleCredentials() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('🔄 Updating to simple admin credentials...\n');

  const newUsername = 'admin';
  const newPassword = 'admin123';

  try {
    // Hash password
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('✅ Password hash generated');

    // Update the first active user (likely "daniele")
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE admin_users
         SET username = ?, password = ?, full_name = ?
         WHERE is_active = 1
         LIMIT 1`,
        [newUsername, hash, 'Amministratore'],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Updated ${this.changes} user(s)`);
            resolve();
          }
        }
      );
    });

    // Verify
    await new Promise((resolve, reject) => {
      db.get('SELECT id, username, full_name FROM admin_users WHERE username = ?', [newUsername], async (err, user) => {
        if (err) {
          reject(err);
        } else if (!user) {
          console.log('⚠️  User not found after update, creating new one...');

          // Create new admin user
          db.run(
            `INSERT INTO admin_users (username, password, full_name, email, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [newUsername, hash, 'Amministratore', 'admin@cororaro.it'],
            function(err) {
              if (err) reject(err);
              else {
                console.log('✅ New admin user created with ID:', this.lastID);
                resolve();
              }
            }
          );
        } else {
          console.log('\n✅ Verification successful:');
          console.log('   ID:', user.id);
          console.log('   Username:', user.username);
          console.log('   Name:', user.full_name);

          // Test password
          db.get('SELECT password FROM admin_users WHERE username = ?', [newUsername], async (err, row) => {
            if (err) {
              console.error('Error testing password:', err);
            } else {
              const match = await bcrypt.compare(newPassword, row.password);
              console.log('   Password test:', match ? '✅ WORKS' : '❌ FAILED');
            }
            resolve();
          });
        }
      });
    });

    console.log('\n📝 New login credentials:');
    console.log('   URL: http://staging.cororaro.it');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n🎉 Update complete!\n');

    db.close();
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

updateToSimpleCredentials();

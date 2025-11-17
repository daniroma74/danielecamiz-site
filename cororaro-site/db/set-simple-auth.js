/**
 * Set simple auth: admin|admin123
 * Works regardless of current users
 */

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');

async function setSimpleAuth() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('🔐 Setting simple authentication...\n');

  const username = 'admin';
  const password = 'admin123';

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    // Delete ALL existing users
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM admin_users', [], function(err) {
        if (err) reject(err);
        else {
          console.log(`🗑️  Deleted ${this.changes} existing user(s)`);
          resolve();
        }
      });
    });

    // Create single admin user
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO admin_users (username, password, full_name, email, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [username, hash, 'Amministratore', 'admin@cororaro.it'],
        function(err) {
          if (err) reject(err);
          else {
            console.log('✅ Admin user created with ID:', this.lastID);
            resolve();
          }
        }
      );
    });

    // Test password
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const match = await bcrypt.compare(password, user.password);

    console.log('\n✅ Setup complete!');
    console.log('   User ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Password works:', match ? '✅ YES' : '❌ NO');

    console.log('\n📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n');

    db.close();
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

setSimpleAuth();

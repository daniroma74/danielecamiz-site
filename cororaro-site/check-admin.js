/**
 * Script to check and create admin user
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'cororaro.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔍 Checking admin users...\n');

db.all('SELECT id, username, email, is_active, created_at FROM admin_users', (err, users) => {
  if (err) {
    console.error('❌ Error querying admin_users:', err.message);

    // Table might not exist, create it
    console.log('\n📋 Creating admin_users table...');

    db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        full_name TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Error creating table:', err.message);
        db.close();
        return;
      }

      console.log('✅ Table created');
      createAdminUser();
    });

  } else if (users.length === 0) {
    console.log('⚠️  No admin users found');
    createAdminUser();
  } else {
    console.log('✅ Found admin users:');
    users.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id}, Active: ${user.is_active ? 'Yes' : 'No'})`);
    });
    db.close();
  }
});

function createAdminUser() {
  console.log('\n👤 Creating default admin user...');

  const username = 'admin';
  const password = 'admin123';

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('❌ Error hashing password:', err.message);
      db.close();
      return;
    }

    db.run(
      `INSERT INTO admin_users (username, password, email, full_name, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, 'admin@cororaro.it', 'Amministratore', 1],
      function(err) {
        if (err) {
          console.error('❌ Error creating admin user:', err.message);
        } else {
          console.log('✅ Admin user created successfully!');
          console.log(`   Username: ${username}`);
          console.log(`   Password: ${password}`);
          console.log('   Email: admin@cororaro.it');
        }
        db.close();
      }
    );
  });
}

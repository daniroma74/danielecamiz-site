/**
 * Setup Admin User - Creates or updates admin user with simple credentials
 * Username: admin
 * Password: admin123
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');

async function setupAdminUser() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('🔐 Setting up admin user...\n');

  const username = 'admin';
  const password = 'admin123';
  const fullName = 'Amministratore';

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin_users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'", (err, table) => {
      if (err) {
        console.error('❌ Error checking table:', err);
        db.close();
        return;
      }

      if (!table) {
        // Create table if it doesn't exist
        console.log('📋 Creating admin_users table...');
        db.run(`
          CREATE TABLE admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            full_name TEXT,
            email TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating table:', err);
            db.close();
            return;
          }

          // Insert admin user
          insertOrUpdateAdmin(db, username, hashedPassword, fullName);
        });
      } else {
        // Table exists, insert or update
        insertOrUpdateAdmin(db, username, hashedPassword, fullName);
      }
    });
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    db.close();
  }
}

function insertOrUpdateAdmin(db, username, hashedPassword, fullName) {
  // Check if user exists
  db.get('SELECT id FROM admin_users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('❌ Error checking user:', err);
      db.close();
      return;
    }

    if (user) {
      // Update existing user
      console.log('🔄 Updating existing admin user...');
      db.run(
        'UPDATE admin_users SET password = ?, full_name = ?, is_active = 1 WHERE username = ?',
        [hashedPassword, fullName, username],
        (err) => {
          if (err) {
            console.error('❌ Error updating user:', err);
          } else {
            console.log('✅ Admin user updated successfully!');
            console.log('\n📝 Login credentials:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('\n🌐 Access admin at: http://staging.cororaro.it/admin');
          }
          db.close();
        }
      );
    } else {
      // Insert new user
      console.log('➕ Creating new admin user...');
      db.run(
        'INSERT INTO admin_users (username, password, full_name, email) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, fullName, 'admin@cororaro.it'],
        (err) => {
          if (err) {
            console.error('❌ Error creating user:', err);
          } else {
            console.log('✅ Admin user created successfully!');
            console.log('\n📝 Login credentials:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('\n🌐 Access admin at: http://staging.cororaro.it/admin');
          }
          db.close();
        }
      );
    }
  });
}

setupAdminUser();

/**
 * Force update admin password to admin123
 * Run this on the server to reset the password
 */

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');

async function forceUpdatePassword() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('🔐 Forcing password update for admin user...\n');

  const newPassword = 'admin123';

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('✅ New hash generated');

    db.run(
      'UPDATE admin_users SET password = ? WHERE username = ?',
      [hash, 'admin'],
      function(err) {
        if (err) {
          console.error('❌ Error updating password:', err);
        } else {
          console.log('✅ Password updated successfully!');
          console.log('   Rows affected:', this.changes);
          console.log('\n📝 New credentials:');
          console.log('   Username: admin');
          console.log('   Password: admin123');
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

forceUpdatePassword();

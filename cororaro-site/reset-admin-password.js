/**
 * Script to reset admin password
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'cororaro.db');
const db = new sqlite3.Database(DB_PATH);

const username = 'admin';
const newPassword = 'admin123';

console.log('🔐 Resetting admin password...\n');

// First, check if user exists
db.get('SELECT id, username FROM admin_users WHERE username = ?', [username], (err, user) => {
  if (err) {
    console.error('❌ Error querying database:', err.message);
    db.close();
    return;
  }

  if (!user) {
    console.error('❌ Admin user not found!');
    db.close();
    return;
  }

  console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);
  console.log('🔄 Hashing new password...');

  // Hash the new password
  bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) {
      console.error('❌ Error hashing password:', err.message);
      db.close();
      return;
    }

    console.log('💾 Updating password in database...');

    // Update the password
    db.run(
      'UPDATE admin_users SET password = ? WHERE username = ?',
      [hashedPassword, username],
      function(err) {
        if (err) {
          console.error('❌ Error updating password:', err.message);
        } else {
          console.log('\n✅ Password reset successfully!');
          console.log(`   Username: ${username}`);
          console.log(`   New password: ${newPassword}`);
          console.log('\n🌐 You can now login at: /admin/login');
        }
        db.close();
      }
    );
  });
});

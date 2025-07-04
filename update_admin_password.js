const { generateLaravelCompatibleHash } = require('./src/utils/bcryptHelper');
const db = require('./src/config/database');

async function updateAdminPassword() {
  try {
    // Hash password menggunakan helper yang kompatibel dengan Laravel
    const adminPassword = 'password'; // Default Laravel password
    const hashedPassword = await generateLaravelCompatibleHash(adminPassword, 12);
    
    console.log('Updating admin password to bcrypt hash (Laravel compatible)');
    
    // Update password admin
    const [result] = await db.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'admin@mki.com']
    );
    
    if (result.affectedRows > 0) {
      console.log('Admin password updated successfully!');
      console.log('New admin credentials:');
      console.log('Email: admin@mki.com');
      console.log('Password: password');
      console.log('Note: This is compatible with Laravel default authentication');
    } else {
      console.log('Admin user not found or password already updated');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  }
}

updateAdminPassword(); 
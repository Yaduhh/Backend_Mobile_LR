const bcrypt = require('bcryptjs');

/**
 * Generate bcrypt hash that's 100% compatible with Laravel
 * Laravel uses $2y$ prefix, so we need to convert $2a$ to $2y$
 */
function generateLaravelCompatibleHash(password, saltRounds = 12) {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) {
        reject(err);
        return;
      }
      
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Convert $2a$ prefix to $2y$ to match Laravel
        const laravelHash = hash.replace('$2a$', '$2y$');
        resolve(laravelHash);
      });
    });
  }); 
}

/**
 * Compare password with hash (works with both $2a$ and $2y$ prefixes)
 */
function comparePassword(password, hash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

module.exports = {
  generateLaravelCompatibleHash,
  comparePassword
}; 
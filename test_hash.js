const { generateLaravelCompatibleHash, comparePassword } = require('./src/utils/bcryptHelper');

async function testHash() {
  try {
    const password = 'wakwaw123';
    
    console.log('Testing Laravel-compatible hash generation...');
    console.log('Password:', password);
    
    // Generate hash
    const hash = await generateLaravelCompatibleHash(password, 12);
    console.log('Generated hash:', hash);
    
    // Check if it starts with $2y$
    if (hash.startsWith('$2y$')) {
      console.log('✅ Hash starts with $2y$ (Laravel compatible)');
    } else {
      console.log('❌ Hash does not start with $2y$');
    }
    
    // Test password comparison
    const isValid = await comparePassword(password, hash);
    console.log('Password verification:', isValid ? '✅ Valid' : '❌ Invalid');
    
    // Test with Laravel hash
    const laravelHash = '$2y$12$m.JSsN09qpjW2IzABP4Ieeo4rp/86ucjJA4LH/iLuzlWFcGZY6ukG';
    const isLaravelValid = await comparePassword(password, laravelHash);
    console.log('Laravel hash verification:', isLaravelValid ? '✅ Valid' : '❌ Invalid');
    
  } catch (error) {
    console.error('Error testing hash:', error);
  }
}

testHash(); 
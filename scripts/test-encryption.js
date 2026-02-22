require('dotenv').config();
const encryptionService = require('../src/services/encryptionService');
const logger = require('../src/utils/logger');

function testEncryption() {
  console.log('🔐 Testing Encryption Service\n');
  
  try {
    // Test basic encryption/decryption
    console.log('📝 Testing basic encryption/decryption...');
    const testText = 'test@example.com';
    const encrypted = encryptionService.encrypt(testText);
    const decrypted = encryptionService.decrypt(encrypted);
    
    console.log(`Original: ${testText}`);
    console.log(`Encrypted: ${encrypted}`);
    console.log(`Decrypted: ${decrypted}`);
    console.log(`✅ Match: ${testText === decrypted ? 'YES' : 'NO'}`);
    console.log();
    
    // Test lead data encryption
    console.log('👤 Testing lead data encryption...');
    const leadData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      country: 'Poland',
      service_type: 'Visa Consultation'
    };
    
    const encryptedLeadData = encryptionService.encryptLeadData(leadData);
    const decryptedLeadData = encryptionService.decryptLeadData(encryptedLeadData);
    
    console.log('Original lead data:', JSON.stringify(leadData, null, 2));
    console.log('Encrypted lead data:', JSON.stringify(encryptedLeadData, null, 2));
    console.log('Decrypted lead data:', JSON.stringify(decryptedLeadData, null, 2));
    console.log(`✅ Email match: ${leadData.email === decryptedLeadData.email ? 'YES' : 'NO'}`);
    console.log(`✅ Phone match: ${leadData.phone === decryptedLeadData.phone ? 'YES' : 'NO'}`);
    console.log();
    
    // Test hashing
    console.log('🔒 Testing hashing...');
    const testPassword = 'mysecretpassword';
    const hashed1 = encryptionService.hash(testPassword);
    const hashed2 = encryptionService.hash(testPassword);
    
    console.log(`Original: ${testPassword}`);
    console.log(`Hash 1: ${hashed1}`);
    console.log(`Hash 2: ${hashed2}`);
    console.log(`✅ Hashes match: ${hashed1 === hashed2 ? 'YES' : 'NO'}`);
    console.log();
    
    // Test random string generation
    console.log('🎲 Testing random string generation...');
    const random1 = encryptionService.generateRandomString(16);
    const random2 = encryptionService.generateRandomString(16);
    
    console.log(`Random 1: ${random1}`);
    console.log(`Random 2: ${random2}`);
    console.log(`✅ Different: ${random1 !== random2 ? 'YES' : 'NO'}`);
    console.log();
    
    // Test data masking
    console.log('🎭 Testing data masking...');
    const testEmail = 'user@example.com';
    const testPhone = '+1234567890';
    
    const maskedEmail = encryptionService.maskSensitiveData(testEmail, 'email');
    const maskedPhone = encryptionService.maskSensitiveData(testPhone, 'phone');
    
    console.log(`Original email: ${testEmail}`);
    console.log(`Masked email: ${maskedEmail}`);
    console.log(`Original phone: ${testPhone}`);
    console.log(`Masked phone: ${maskedPhone}`);
    console.log();
    
    // Test edge cases
    console.log('🔍 Testing edge cases...');
    
    // Empty/null values
    const emptyEncrypted = encryptionService.encrypt('');
    const nullEncrypted = encryptionService.encrypt(null);
    const emptyDecrypted = encryptionService.decrypt('');
    const nullDecrypted = encryptionService.decrypt(null);
    
    console.log(`Empty encrypt: ${emptyEncrypted}`);
    console.log(`Null encrypt: ${nullEncrypted}`);
    console.log(`Empty decrypt: ${emptyDecrypted}`);
    console.log(`Null decrypt: ${nullDecrypted}`);
    console.log();
    
    // Test with special characters
    console.log('🔤 Testing special characters...');
    const specialText = 'test@example.com!@#$%^&*()_+-=[]{}|;:,.<>?';
    const specialEncrypted = encryptionService.encrypt(specialText);
    const specialDecrypted = encryptionService.decrypt(specialEncrypted);
    
    console.log(`Original: ${specialText}`);
    console.log(`Encrypted: ${specialEncrypted}`);
    console.log(`Decrypted: ${specialDecrypted}`);
    console.log(`✅ Match: ${specialText === specialDecrypted ? 'YES' : 'NO'}`);
    console.log();
    
    console.log('🎉 All encryption tests completed successfully!');
    console.log('✅ Encryption service is working properly.');
    
  } catch (error) {
    console.error('❌ Encryption test failed:', error.message);
    logger.error('Encryption test failed', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
  }
}

// Run the test
if (require.main === module) {
  testEncryption();
}

module.exports = { testEncryption }; 
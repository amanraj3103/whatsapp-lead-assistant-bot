#!/usr/bin/env node

const dotenv = require('dotenv');
const logger = require('../src/utils/logger');

// Load environment variables
dotenv.config();

console.log('🧪 Testing WhatsApp Lead Assistant Bot Setup...\n');

// Test environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
  'ENCRYPTION_IV'
];

const optionalEnvVars = [
  'CALENDLY_API_KEY',
  'CALENDLY_USER_URI',
  'CALENDLY_EVENT_TYPE_URI',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'ADMIN_EMAIL'
];

console.log('📋 Environment Variables Check:');
console.log('================================');

// Check required environment variables
let allRequiredPresent = true;
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allRequiredPresent = false;
  }
});

console.log('\n📋 Optional Environment Variables:');
console.log('==================================');

// Check optional environment variables
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`⚠️  ${varName}: Not configured (optional)`);
  }
});

// Test service imports
console.log('\n🔧 Service Tests:');
console.log('=================');

try {
  const whatsappService = require('../src/services/whatsappService');
  console.log('✅ WhatsApp Service: Loaded successfully');
} catch (error) {
  console.log('❌ WhatsApp Service: Failed to load');
  console.log(`   Error: ${error.message}`);
}

try {
  const nlpService = require('../src/services/nlpService');
  console.log('✅ NLP Service: Loaded successfully');
} catch (error) {
  console.log('❌ NLP Service: Failed to load');
  console.log(`   Error: ${error.message}`);
}

try {
  const encryptionService = require('../src/services/encryptionService');
  console.log('✅ Encryption Service: Loaded successfully');
} catch (error) {
  console.log('❌ Encryption Service: Failed to load');
  console.log(`   Error: ${error.message}`);
}

try {
  const calendlyService = require('../src/services/calendlyService');
  console.log('✅ Calendly Service: Loaded successfully');
} catch (error) {
  console.log('❌ Calendly Service: Failed to load');
  console.log(`   Error: ${error.message}`);
}

try {
  const leadService = require('../src/services/leadService');
  console.log('✅ Lead Service: Loaded successfully');
} catch (error) {
  console.log('❌ Lead Service: Failed to load');
  console.log(`   Error: ${error.message}`);
}

try {
  const reportingService = require('../src/services/reportingService');
  console.log('✅ Reporting Service: Loaded successfully');
} catch (error) {
  console.log('❌ Reporting Service: Failed to load');
  console.log(`   Error: ${error.message}`);
}

// Test directory creation
console.log('\n📁 Directory Tests:');
console.log('===================');

const fs = require('fs');
const path = require('path');

const directories = ['logs', 'reports'];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      console.log(`❌ Failed to create directory: ${dir}`);
      console.log(`   Error: ${error.message}`);
    }
  } else {
    console.log(`✅ Directory exists: ${dir}`);
  }
});

// Test encryption
console.log('\n🔐 Encryption Test:');
console.log('===================');

try {
  const crypto = require('crypto');
  const testData = 'test@example.com';
  const key = process.env.ENCRYPTION_KEY;
  const iv = process.env.ENCRYPTION_IV;
  
  if (key && iv) {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    if (decrypted === testData) {
      console.log('✅ Encryption/Decryption: Working correctly');
    } else {
      console.log('❌ Encryption/Decryption: Failed');
    }
  } else {
    console.log('⚠️  Encryption: Keys not configured');
  }
} catch (error) {
  console.log('❌ Encryption Test: Failed');
  console.log(`   Error: ${error.message}`);
}

// Summary
console.log('\n📊 Setup Summary:');
console.log('=================');

if (allRequiredPresent) {
  console.log('🎉 All required environment variables are configured!');
  console.log('🚀 Your WhatsApp Lead Assistant Bot is ready to run.');
  console.log('\nTo start the bot:');
  console.log('  npm run dev    # Development mode');
  console.log('  npm start      # Production mode');
  console.log('  docker-compose up  # Docker deployment');
} else {
  console.log('⚠️  Some required environment variables are missing.');
  console.log('Please configure them in your .env file before running the bot.');
}

console.log('\n📚 Next Steps:');
console.log('==============');
console.log('1. Configure your Twilio WhatsApp Business API');
console.log('2. Set up your Calendly integration (optional)');
console.log('3. Configure your email service for reports');
console.log('4. Deploy to your server');
console.log('5. Test the webhook endpoint');

console.log('\n📖 For more information, see the README.md file.'); 
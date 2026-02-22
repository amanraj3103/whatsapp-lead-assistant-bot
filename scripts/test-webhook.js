#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/api/whatsapp/webhook`;

// Test webhook data
const testWebhookData = {
  From: 'whatsapp:+1234567890',
  Body: 'Hi, I need help with study abroad',
  MessageSid: `test_${Date.now()}`,
  AccountSid: 'test_account_sid',
  To: 'whatsapp:+0987654321'
};

// Generate Twilio signature (for testing)
function generateTwilioSignature(url, params, authToken = 'test_auth_token') {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');
  
  const signature = crypto
    .createHmac('sha1', authToken)
    .update(url + sortedParams)
    .digest('base64');
  
  return signature;
}

async function testWebhook(data, includeSignature = false) {
  try {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'TwilioProxy/1.1'
    };

    if (includeSignature) {
      const signature = generateTwilioSignature(WEBHOOK_URL, data);
      headers['X-Twilio-Signature'] = signature;
    }

    console.log(`📤 Sending webhook to: ${WEBHOOK_URL}`);
    console.log(`📋 Data: ${JSON.stringify(data, null, 2)}`);
    
    const response = await axios.post(WEBHOOK_URL, data, { headers });
    
    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📄 Response: ${response.data}`);
    
    return response;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${error.response.data}`);
    }
    return null;
  }
}

async function runWebhookTests() {
  console.log('🌐 Webhook Testing Suite\n');
  console.log(`Target URL: ${WEBHOOK_URL}\n`);

  // Test 1: Basic webhook without signature
  console.log('🧪 Test 1: Basic webhook (no signature)');
  console.log('=' .repeat(50));
  await testWebhook(testWebhookData, false);
  
  console.log('\n' + '=' .repeat(50) + '\n');

  // Test 2: Webhook with signature
  console.log('🧪 Test 2: Webhook with signature');
  console.log('=' .repeat(50));
  await testWebhook(testWebhookData, true);
  
  console.log('\n' + '=' .repeat(50) + '\n');

  // Test 3: Different message types
  const testMessages = [
    'My name is John Smith',
    'john@example.com',
    '+1234567890',
    'Canada',
    'Study',
    'Tomorrow at 2 PM'
  ];

  console.log('🧪 Test 3: Conversation flow');
  console.log('=' .repeat(50));
  
  for (let i = 0; i < testMessages.length; i++) {
    const messageData = {
      ...testWebhookData,
      Body: testMessages[i],
      MessageSid: `test_${Date.now()}_${i}`
    };
    
    console.log(`\n📝 Message ${i + 1}: "${testMessages[i]}"`);
    await testWebhook(messageData, false);
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 Webhook testing complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check the server logs for processing details');
  console.log('2. Verify lead data was created correctly');
  console.log('3. Test with real Twilio webhooks after deployment');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runWebhookTests().catch(console.error);
}

module.exports = { testWebhook, runWebhookTests }; 
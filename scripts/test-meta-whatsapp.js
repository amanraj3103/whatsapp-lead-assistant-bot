#!/usr/bin/env node

const dotenv = require('dotenv');
const conversationHandler = require('../src/services/conversationHandler');
const leadService = require('../src/services/hybridLeadService');
const logger = require('../src/utils/logger');

// Load environment variables
dotenv.config();

console.log('🤖 Meta WhatsApp Bot Testing Suite\n');

// Test with your actual Meta WhatsApp number
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || 'whatsapp:+1234567890';

async function testMetaWhatsAppFlow() {
  console.log(`📱 Testing with phone number: ${TEST_PHONE_NUMBER}`);
  console.log('=' .repeat(60));
  
  // Test conversation flow
  const testMessages = [
    'Hi, I need help with study abroad',
    'My name is John Smith',
    'john.smith@email.com',
    '+1234567890',
    'Canada',
    'Study',
    'Tomorrow at 2 PM'
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n👤 User (${i + 1}): ${message}`);
    
    try {
      const result = await conversationHandler.handleIncomingMessage({
        From: TEST_PHONE_NUMBER,
        Body: message,
        MessageSid: `test_${Date.now()}_${i}`
      });
      
      if (result.success) {
        console.log(`🤖 Bot: ${result.response}`);
        console.log(`   Stage: ${result.stage}`);
        console.log(`   Actions: ${result.actions ? result.actions.join(', ') : 'None'}`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Get final lead data
  try {
    const lead = await leadService.getLeadByPhone(TEST_PHONE_NUMBER);
    if (lead) {
      console.log(`\n📊 Final Lead Data:`);
      console.log(`   ID: ${lead.id}`);
      console.log(`   Stage: ${lead.stage}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Conversation Length: ${lead.conversation ? lead.conversation.length : 0}`);
    }
  } catch (error) {
    console.log(`❌ Error getting lead data: ${error.message}`);
  }
}

async function testWhatsAppService() {
  console.log('\n🔧 Testing WhatsApp Service Configuration');
  console.log('=' .repeat(50));
  
  try {
    const whatsappService = require('../src/services/whatsappService');
    console.log('✅ WhatsApp Service: Loaded successfully');
    
    // Test sending a message (this will fail if not configured, but that's expected)
    try {
      await whatsappService.sendMessage(TEST_PHONE_NUMBER, 'Test message from bot');
      console.log('✅ WhatsApp message sent successfully!');
    } catch (error) {
      console.log('⚠️  WhatsApp message failed (expected if not fully configured):');
      console.log(`   Error: ${error.message}`);
    }
  } catch (error) {
    console.log('❌ WhatsApp Service: Failed to load');
    console.log(`   Error: ${error.message}`);
  }
}

async function main() {
  try {
    // Test WhatsApp service first
    await testWhatsAppService();
    
    // Test conversation flow
    await testMetaWhatsAppFlow();
    
    console.log('\n🎉 Testing completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure your Meta WhatsApp credentials in .env');
    console.log('2. Set up webhook URL in Meta WhatsApp Business API');
    console.log('3. Test with real WhatsApp messages');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main(); 
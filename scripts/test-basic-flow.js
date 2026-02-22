#!/usr/bin/env node

const dotenv = require('dotenv');
const leadService = require('../src/services/hybridLeadService');
const logger = require('../src/utils/logger');

// Load environment variables
dotenv.config();

console.log('🤖 Basic WhatsApp Bot Flow Testing\n');

// Test with a sample phone number
const TEST_PHONE_NUMBER = 'whatsapp:+1234567890';

async function testBasicFlow() {
  console.log(`📱 Testing basic flow with phone number: ${TEST_PHONE_NUMBER}`);
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Create a new lead
    console.log('\n1️⃣ Testing Lead Creation...');
    const lead = await leadService.createLead(TEST_PHONE_NUMBER);
    console.log(`✅ Lead created successfully!`);
    console.log(`   Lead ID: ${lead.id}`);
    console.log(`   Stage: ${lead.stage}`);
    console.log(`   Status: ${lead.status}`);
    
    // Test 2: Add a message to conversation
    console.log('\n2️⃣ Testing Message Addition...');
    const messageData = {
      content: 'Hi, I need help with study abroad',
      direction: 'inbound',
      type: 'text',
      metadata: { responseType: 'user_message' }
    };
    
    await leadService.addMessage(TEST_PHONE_NUMBER, messageData);
    console.log(`✅ Message added to conversation!`);
    
    // Test 3: Get updated lead
    console.log('\n3️⃣ Testing Lead Retrieval...');
    const updatedLead = await leadService.getLeadByPhone(TEST_PHONE_NUMBER);
    console.log(`✅ Lead retrieved successfully!`);
    console.log(`   Conversation length: ${updatedLead.conversation ? updatedLead.conversation.length : 0}`);
    console.log(`   Last message at: ${updatedLead.lastMessageAt}`);
    
    // Test 4: Update lead data
    console.log('\n4️⃣ Testing Lead Update...');
    const updateData = {
      data: {
        name: 'John Smith',
        email: 'john@example.com',
        country: 'Canada',
        service_type: 'Study'
      }
    };
    
    const finalLead = await leadService.updateLead(TEST_PHONE_NUMBER, updateData);
    console.log(`✅ Lead updated successfully!`);
    console.log(`   Name: ${finalLead.data.name}`);
    console.log(`   Email: ${finalLead.data.email}`);
    console.log(`   Country: ${finalLead.data.country}`);
    console.log(`   Service: ${finalLead.data.service_type}`);
    
    // Test 5: Test encryption
    console.log('\n5️⃣ Testing Data Encryption...');
    const encryptionService = require('../src/services/encryptionService');
    const testEmail = 'test@example.com';
    const encrypted = encryptionService.encrypt(testEmail);
    const decrypted = encryptionService.decrypt(encrypted);
    
    if (decrypted === testEmail) {
      console.log(`✅ Encryption/Decryption working correctly!`);
    } else {
      console.log(`❌ Encryption test failed`);
    }
    
    console.log('\n🎉 All basic tests passed!');
    console.log('\n📝 Next steps for full testing:');
    console.log('1. Add your OpenAI API key to .env for AI conversations');
    console.log('2. Configure your Meta WhatsApp credentials');
    console.log('3. Start the server: npm run dev');
    console.log('4. Test with real WhatsApp messages');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testBasicFlow(); 
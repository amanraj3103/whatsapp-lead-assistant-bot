#!/usr/bin/env node

const dotenv = require('dotenv');
const conversationHandler = require('../src/services/conversationHandler');
const leadService = require('../src/services/hybridLeadService');

// Load environment variables
dotenv.config();

console.log('🤖 Real WhatsApp Number Test (Simulation Mode)\n');

// Use your real Meta WhatsApp number here
const REAL_PHONE_NUMBER = process.env.TEST_REAL_PHONE || 'whatsapp:+1234567890';

async function testRealConversation() {
  console.log(`📱 Testing conversation flow with: ${REAL_PHONE_NUMBER}`);
  console.log('=' .repeat(60));
  console.log('💡 This test simulates the conversation without sending actual WhatsApp messages');
  console.log('=' .repeat(60));
  
  const conversationSteps = [
    {
      step: 1,
      message: 'Hi, I need help with study abroad',
      description: 'Initial greeting and service request'
    },
    {
      step: 2,
      message: 'My name is John Smith',
      description: 'Providing name'
    },
    {
      step: 3,
      message: 'john.smith@email.com',
      description: 'Providing email'
    },
    {
      step: 4,
      message: '+1234567890',
      description: 'Providing phone number'
    },
    {
      step: 5,
      message: 'Canada',
      description: 'Providing country of interest'
    },
    {
      step: 6,
      message: 'Study',
      description: 'Confirming service type'
    },
    {
      step: 7,
      message: 'Tomorrow at 2 PM',
      description: 'Providing preferred meeting time'
    }
  ];
  
  for (const step of conversationSteps) {
    console.log(`\n${step.step}️⃣ Step ${step.step}: ${step.description}`);
    console.log(`👤 User: ${step.message}`);
    
    try {
      const result = await conversationHandler.handleIncomingMessage({
        From: REAL_PHONE_NUMBER,
        Body: step.message,
        MessageSid: `test_${Date.now()}_${step.step}`
      });
      
      if (result.success) {
        console.log(`🤖 Bot Response: ${result.response}`);
        console.log(`   Stage: ${result.stage}`);
        console.log(`   Actions: ${result.actions ? result.actions.join(', ') : 'None'}`);
        
        // Show what would be sent via WhatsApp
        console.log(`   📤 Would send via WhatsApp: ${result.response}`);
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
  console.log('\n📊 Final Lead Data:');
  console.log('=' .repeat(30));
  try {
    const lead = await leadService.getLeadByPhone(REAL_PHONE_NUMBER);
    if (lead) {
      console.log(`   Lead ID: ${lead.id}`);
      console.log(`   Stage: ${lead.stage}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Conversation Length: ${lead.conversation ? lead.conversation.length : 0}`);
      
      // Show conversation history
      if (lead.conversation && lead.conversation.length > 0) {
        console.log('\n💬 Conversation History:');
        lead.conversation.forEach((msg, index) => {
          const direction = msg.direction === 'inbound' ? '👤 User' : '🤖 Bot';
          console.log(`   ${index + 1}. ${direction}: ${msg.content}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error getting lead data: ${error.message}`);
  }
  
  console.log('\n🎉 Conversation simulation completed!');
  console.log('\n📝 Next steps for real testing:');
  console.log('1. Replace REAL_PHONE_NUMBER with your actual Meta WhatsApp number');
  console.log('2. Configure Dialog360 API key and Phone Number ID in .env');
  console.log('3. Set up webhook URL in Meta WhatsApp Business API');
  console.log('4. Test with real WhatsApp messages');
}

async function showConfiguration() {
  console.log('\n🔧 Current Configuration:');
  console.log('=' .repeat(30));
  console.log(`WhatsApp Provider: ${process.env.WHATSAPP_PROVIDER || 'twilio'}`);
  console.log(`Dialog360 API Key: ${process.env.DIALOG360_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`Dialog360 Phone ID: ${process.env.DIALOG360_PHONE_NUMBER_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`Company Name: ${process.env.COMPANY_NAME || 'Dream Axis'}`);
  
  if (!process.env.DIALOG360_API_KEY) {
    console.log('\n⚠️  To use Meta WhatsApp Business API:');
    console.log('1. Get your Dialog360 API key from Meta');
    console.log('2. Get your Dialog360 Phone Number ID');
    console.log('3. Add to .env file:');
    console.log('   DIALOG360_API_KEY=your_api_key_here');
    console.log('   DIALOG360_PHONE_NUMBER_ID=your_phone_id_here');
    console.log('   WHATSAPP_PROVIDER=dialog360');
  }
}

async function main() {
  try {
    await showConfiguration();
    await testRealConversation();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main(); 
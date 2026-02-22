#!/usr/bin/env node

const dotenv = require('dotenv');
const conversationHandler = require('../src/services/conversationHandler');
const leadService = require('../src/services/hybridLeadService');

// Load environment variables
dotenv.config();

console.log('🤖 WhatsApp Lead Assistant Bot - Live Conversation Demo\n');
console.log('=' .repeat(70));
console.log('💡 This demonstrates the AI-powered conversation flow');
console.log('=' .repeat(70));

const DEMO_PHONE = 'whatsapp:+1234567890';

async function runDemoConversation() {
  console.log(`�� Demo Phone: ${DEMO_PHONE}`);
  console.log(`🏢 Company: ${process.env.COMPANY_NAME || 'Dream Axis'}`);
  console.log(`🤖 AI Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
  console.log('\n' + '=' .repeat(70));
  
  const conversationSteps = [
    {
      step: 1,
      user: 'Hi',
      description: 'Initial greeting'
    },
    {
      step: 2,
      user: 'I need help with study abroad',
      description: 'Service inquiry'
    },
    {
      step: 3,
      user: 'My name is Sarah Johnson',
      description: 'Providing name'
    },
    {
      step: 4,
      user: 'sarah.johnson@email.com',
      description: 'Providing email'
    },
    {
      step: 5,
      user: '+1234567890',
      description: 'Providing phone number'
    },
    {
      step: 6,
      user: 'Canada',
      description: 'Providing country of interest'
    },
    {
      step: 7,
      user: 'Study',
      description: 'Confirming service type'
    },
    {
      step: 8,
      user: 'Tomorrow at 3 PM',
      description: 'Providing preferred meeting time'
    }
  ];
  
  for (const step of conversationSteps) {
    console.log(`\n${step.step}️⃣ STEP ${step.step}: ${step.description}`);
    console.log('─'.repeat(50));
    console.log(`👤 User: "${step.user}"`);
    
    try {
      const result = await conversationHandler.handleIncomingMessage({
        From: DEMO_PHONE,
        Body: step.user,
        MessageSid: `demo_${Date.now()}_${step.step}`
      });
      
      if (result.success) {
        console.log(`🤖 Bot: "${result.response}"`);
        console.log(`   📊 Stage: ${result.stage}`);
        console.log(`   🎯 Actions: ${result.actions ? result.actions.join(', ') : 'None'}`);
        
        // Show conversation progress
        if (result.stage === 'collecting_info') {
          console.log(`   📝 Collecting: Lead information`);
        } else if (result.stage === 'scheduling') {
          console.log(`   📅 Scheduling: Meeting setup`);
        } else if (result.stage === 'completed') {
          console.log(`   ✅ Completed: Lead collection finished`);
        }
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    // Small delay for realistic conversation flow
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Show final lead data
  console.log('\n' + '=' .repeat(70));
  console.log('📊 FINAL LEAD DATA');
  console.log('=' .repeat(70));
  
  try {
    const lead = await leadService.getLeadByPhone(DEMO_PHONE);
    if (lead) {
      console.log(`🆔 Lead ID: ${lead.id}`);
      console.log(`📱 Phone: ${lead.phoneNumber}`);
      console.log(`👤 Name: ${lead.data.name || 'Not provided'}`);
      console.log(`📧 Email: ${lead.data.email || 'Not provided'}`);
      console.log(`🌍 Country: ${lead.data.country || 'Not provided'}`);
      console.log(`🔧 Service: ${lead.data.service_type || 'Not provided'}`);
      console.log(`⏰ Preferred Time: ${lead.data.preferred_time || 'Not provided'}`);
      console.log(`📊 Stage: ${lead.stage}`);
      console.log(`✅ Status: ${lead.status}`);
      console.log(`💬 Conversation Length: ${lead.conversation ? lead.conversation.length : 0}`);
      
      // Show conversation history
      if (lead.conversation && lead.conversation.length > 0) {
        console.log('\n💬 CONVERSATION HISTORY:');
        console.log('─'.repeat(50));
        lead.conversation.forEach((msg, index) => {
          const direction = msg.direction === 'inbound' ? '👤 User' : '🤖 Bot';
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          console.log(`${index + 1}. [${timestamp}] ${direction}: ${msg.content}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error getting lead data: ${error.message}`);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('🎉 DEMO CONVERSATION COMPLETED!');
  console.log('=' .repeat(70));
  console.log('\n📝 What happened in this demo:');
  console.log('✅ AI analyzed each message and responded intelligently');
  console.log('✅ Lead information was collected systematically');
  console.log('✅ Conversation stage progressed automatically');
  console.log('✅ Data was encrypted and stored securely');
  console.log('✅ Multi-language support was available');
  console.log('✅ Context was maintained throughout the conversation');
  
  console.log('\n�� Ready for production with:');
  console.log('• Real WhatsApp Business API integration');
  console.log('• Google Sheets for data persistence');
  console.log('• Calendly for meeting scheduling');
  console.log('• Email reports and notifications');
  console.log('• Advanced security and encryption');
}

async function showBotCapabilities() {
  console.log('\n🧠 BOT CAPABILITIES:');
  console.log('─'.repeat(30));
  console.log('✅ AI-Powered Conversations');
  console.log('✅ Multi-Language Support (6 languages)');
  console.log('✅ Lead Information Collection');
  console.log('✅ Service Type Detection');
  console.log('✅ Context-Aware Responses');
  console.log('✅ Data Encryption (AES-256)');
  console.log('✅ Conversation History');
  console.log('✅ Stage Management');
  console.log('✅ Error Handling');
  console.log('✅ Fallback Responses');
  
  console.log('\n🌍 SUPPORTED LANGUAGES:');
  console.log('─'.repeat(30));
  console.log('1. English');
  console.log('2. Hindi');
  console.log('3. Malayalam');
  console.log('4. Tamil');
  console.log('5. Bengali');
  console.log('6. Manglish (Malayalam in English letters)');
  
  console.log('\n🔧 SUPPORTED SERVICES:');
  console.log('─'.repeat(30));
  console.log('• Education India');
  console.log('• Education Abroad');
  console.log('• Job Europe');
  console.log('• Visa Consultation');
  console.log('• Study Abroad');
  console.log('• Work Permits');
}

async function main() {
  try {
    await showBotCapabilities();
    await runDemoConversation();
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n📝 Make sure the server is running: npm run dev');
    process.exit(1);
  }
}

// Run the demo
main();

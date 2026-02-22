#!/usr/bin/env node

const axios = require('axios');

console.log('🤖 Full AI-Powered Conversation Test\n');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = 'whatsapp:+1234567890';

async function testFullConversation() {
  console.log(`📱 Testing full conversation flow with: ${TEST_PHONE}`);
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
      const response = await axios.post(`${BASE_URL}/api/whatsapp/webhook`, {
        From: TEST_PHONE,
        Body: step.message,
        MessageSid: `test_${Date.now()}_${step.step}`
      });
      
      if (response.status === 200) {
        console.log(`✅ Bot responded successfully`);
        console.log(`   Status: ${response.status}`);
        
        // If there's a response body, show it
        if (response.data) {
          console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        }
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error: ${error.response.status} - ${error.response.statusText}`);
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`❌ Network error: ${error.message}`);
      }
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test getting conversation summary
  console.log('\n📊 Testing Conversation Summary...');
  try {
    const summaryResponse = await axios.get(`${BASE_URL}/api/whatsapp/conversation/${TEST_PHONE.replace('whatsapp:', '')}`);
    console.log('✅ Conversation summary retrieved');
    console.log(`   Summary: ${JSON.stringify(summaryResponse.data, null, 2)}`);
  } catch (error) {
    console.log(`❌ Could not get conversation summary: ${error.message}`);
  }
  
  // Test admin endpoints
  console.log('\n🔧 Testing Admin Endpoints...');
  try {
    const leadsResponse = await axios.get(`${BASE_URL}/api/admin/leads`);
    console.log('✅ Leads retrieved successfully');
    console.log(`   Total leads: ${leadsResponse.data.leads ? leadsResponse.data.leads.length : 0}`);
  } catch (error) {
    console.log(`❌ Could not get leads: ${error.message}`);
  }
  
  console.log('\n🎉 Full conversation test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Configure your Meta WhatsApp webhook URL');
  console.log('2. Test with real WhatsApp messages');
  console.log('3. Set up Calendly integration for scheduling');
}

async function testWhatsAppSending() {
  console.log('\n📤 Testing WhatsApp Message Sending...');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/whatsapp/send`, {
      to: TEST_PHONE,
      message: 'This is a test message from the WhatsApp Lead Assistant Bot! 🤖'
    });
    
    console.log('✅ Message sent successfully!');
    console.log(`   Message SID: ${response.data.messageSid}`);
    console.log(`   Status: ${response.data.status}`);
    
  } catch (error) {
    console.log('❌ Message sending failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

async function main() {
  try {
    // Test server health first
    console.log('🏥 Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Server is healthy: ${healthResponse.data.status}`);
    
    // Test full conversation
    await testFullConversation();
    
    // Test message sending
    await testWhatsAppSending();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n📝 Make sure the server is running: npm run dev');
    process.exit(1);
  }
}

// Run the test
main(); 
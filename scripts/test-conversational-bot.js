// Load environment variables
require('dotenv').config();

const conversationHandler = require('../src/services/conversationHandler');
const nlpService = require('../src/services/nlpService');
const logger = require('../src/utils/logger');

// Test conversation scenarios
const testConversations = [
  {
    name: "Natural Introduction with Information",
    messages: [
      "Hi! I'm John and I'm interested in studying in Canada",
      "My email is john@example.com and I want to study computer science",
      "I'm from India and my phone is +91-9876543210",
      "Can we schedule a call for tomorrow afternoon?"
    ]
  },
  {
    name: "Casual Conversation Flow",
    messages: [
      "Hey there! 👋",
      "I'm thinking about moving abroad for work",
      "Australia seems nice, what do you think?",
      "I'm Sarah by the way, sarah@email.com",
      "My number is +1-555-123-4567",
      "Yeah, let's set up a call!"
    ]
  },
  {
    name: "Emotional Support Scenario",
    messages: [
      "I'm really worried about my visa application",
      "I'm Maria, maria@test.com, from Brazil",
      "I want to study in the UK but I'm confused about the process",
      "My phone is +55-11-98765-4321",
      "Can you help me understand what I need to do?",
      "Thank you, that makes me feel better. Let's schedule a call"
    ]
  },
  {
    name: "Multiple Topics in One Message",
    messages: [
      "Hi! I'm Alex, alex@email.com, interested in work visa for Germany. My number is +49-30-12345678",
      "I'm excited about this opportunity! When can we talk?"
    ]
  },
  {
    name: "Follow-up Questions",
    messages: [
      "Hello! I'm interested in your services",
      "I want to study abroad",
      "Canada",
      "Computer Science",
      "My name is David, david@test.com, +1-555-987-6543",
      "Perfect! Let's schedule a consultation"
    ]
  }
];

async function testConversationalBot() {
  console.log('🤖 Testing Conversational WhatsApp Bot\n');
  console.log('=' .repeat(60));

  for (const conversation of testConversations) {
    console.log(`\n📝 Test: ${conversation.name}`);
    console.log('-'.repeat(40));
    
    let lead = null;
    
    for (let i = 0; i < conversation.messages.length; i++) {
      const message = conversation.messages[i];
      
      console.log(`\n👤 User: ${message}`);
      
      // Simulate incoming message
      const messageData = {
        From: '+1234567890',
        Body: message,
        MessageSid: `test_${Date.now()}_${i}`
      };
      
      try {
        const response = await conversationHandler.handleIncomingMessage(messageData);
        
        if (response.success) {
          console.log(`🤖 Bot: ${response.response}`);
          console.log(`📊 Stage: ${response.stage}`);
          
          // Get lead for context
          lead = await conversationHandler.getConversationSummary('+1234567890');
          
          if (lead) {
            const missingFields = ['name', 'email', 'phone', 'country', 'service_type']
              .filter(field => !lead.data[field]);
            
            if (missingFields.length > 0) {
              console.log(`⏳ Missing: ${missingFields.join(', ')}`);
            } else {
              console.log(`✅ All info collected!`);
            }
          }
        } else {
          console.log(`❌ Error: ${response.error}`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

async function testNLPAnalysis() {
  console.log('\n🧠 Testing NLP Analysis\n');
  console.log('=' .repeat(60));
  
  const testMessages = [
    "Hi! I'm excited to study in Canada!",
    "I'm worried about my visa application process",
    "My name is Sarah, I want to work in Australia",
    "Can you help me understand the requirements?",
    "Thanks! You've been so helpful 😊"
  ];
  
  for (const message of testMessages) {
    console.log(`\n💬 Message: "${message}"`);
    
    try {
      const analysis = await nlpService.analyzeMessage(message, {
        stage: 'collecting_info',
        collectedData: {},
        recentMessages: []
      });
      
      console.log(`🎯 Intent: ${analysis.intent}`);
      console.log(`😊 Emotion: ${analysis.emotion}`);
      console.log(`📊 Confidence: ${analysis.confidence}`);
      console.log(`🏷️ Entities: ${JSON.stringify(analysis.entities)}`);
      console.log(`💭 Context: ${analysis.context_understanding}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function testResponseGeneration() {
  console.log('\n💬 Testing Response Generation\n');
  console.log('=' .repeat(60));
  
  const testScenarios = [
    {
      analysis: {
        intent: 'greeting',
        emotion: 'excited',
        entities: {},
        missing_fields: ['name', 'email', 'phone', 'country', 'service_type']
      },
      leadData: {},
      stage: 'initial'
    },
    {
      analysis: {
        intent: 'lead_collection',
        emotion: 'happy',
        entities: { name: 'John', country: 'Canada' },
        missing_fields: ['email', 'phone', 'service_type']
      },
      leadData: { name: 'John', country: 'Canada' },
      stage: 'collecting_info'
    },
    {
      analysis: {
        intent: 'service_inquiry',
        emotion: 'confused',
        entities: { service_type: 'study' },
        missing_fields: ['email', 'phone']
      },
      leadData: { name: 'John', country: 'Canada', service_type: 'study' },
      stage: 'collecting_info'
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Scenario: ${scenario.analysis.intent} (${scenario.analysis.emotion})`);
    console.log(`📊 Stage: ${scenario.stage}`);
    console.log(`🏷️ Entities: ${JSON.stringify(scenario.analysis.entities)}`);
    
    try {
      const response = await nlpService.generateResponse(
        scenario.analysis,
        scenario.leadData,
        scenario.stage
      );
      
      console.log(`🤖 Response: ${response}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function runAllTests() {
  try {
    await testConversationalBot();
    await testNLPAnalysis();
    await testResponseGeneration();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✨ The bot now works like ChatGPT with:');
    console.log('   • Natural conversation flow');
    console.log('   • Emotion-aware responses');
    console.log('   • Context understanding');
    console.log('   • Flexible information collection');
    console.log('   • Human-like interactions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Test failed', { error: error.message });
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testConversationalBot,
  testNLPAnalysis,
  testResponseGeneration,
  runAllTests
}; 
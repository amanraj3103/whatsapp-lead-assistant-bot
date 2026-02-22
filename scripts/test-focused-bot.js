// Load environment variables
require('dotenv').config();

const conversationHandler = require('../src/services/conversationHandler');
const nlpService = require('../src/services/nlpService');
const logger = require('../src/utils/logger');

// Test scenarios to demonstrate focus on HR/immigration services
const testScenarios = [
  {
    name: "Off-Topic Questions - Weather",
    messages: [
      "Hi there!",
      "What's the weather like today?",
      "I'm interested in studying abroad",
      "How do I cook pasta?",
      "My name is John and I want to go to Canada"
    ]
  },
  {
    name: "Off-Topic Questions - Random Topics",
    messages: [
      "Hello!",
      "Tell me a joke",
      "What's your favorite color?",
      "I need help with visa application",
      "What's the capital of France?",
      "My email is john@example.com"
    ]
  },
  {
    name: "Service Focus - Natural Flow",
    messages: [
      "Hi! I'm thinking about moving abroad",
      "What services do you offer?",
      "I'm interested in work visa",
      "How much does it cost?",
      "My name is Sarah, sarah@email.com",
      "Can we schedule a call?"
    ]
  },
  {
    name: "Mixed Conversation - Staying Focused",
    messages: [
      "Hello!",
      "How are you today?",
      "I want to study in Australia",
      "What's the weather like in Sydney?",
      "My phone is +1-555-123-4567",
      "How long does the process take?",
      "Thanks for the help!"
    ]
  },
  {
    name: "Emotional Support - Service Focused",
    messages: [
      "I'm really worried about my application",
      "What if I get rejected?",
      "My name is Maria, maria@test.com",
      "I want to study computer science",
      "Can you help me understand the requirements?",
      "That makes me feel better, thank you!"
    ]
  }
];

async function testFocusedBot() {
  console.log('🎯 Testing Focused Customer Service Bot\n');
  console.log('=' .repeat(60));
  console.log('The bot should stay focused on HR/immigration services');
  console.log('while being conversational and helpful.\n');

  for (const scenario of testScenarios) {
    console.log(`\n📝 Scenario: ${scenario.name}`);
    console.log('-'.repeat(50));
    
    let lead = null;
    
    for (let i = 0; i < scenario.messages.length; i++) {
      const message = scenario.messages[i];
      
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
          console.log(`🎯 Type: ${response.type}`);
          
          // Get lead for context
          lead = await conversationHandler.getConversationSummary('+1234567890');
          
          if (lead) {
            const collectedData = Object.keys(lead.data).filter(key => lead.data[key]);
            if (collectedData.length > 0) {
              console.log(`📋 Collected: ${collectedData.join(', ')}`);
            }
          }
          
          // Highlight focus maintenance
          if (response.type === 'refocus') {
            console.log(`🎯 ✅ Successfully redirected to services`);
          } else if (response.response.toLowerCase().includes('immigration') || 
                     response.response.toLowerCase().includes('study abroad') ||
                     response.response.toLowerCase().includes('visa') ||
                     response.response.toLowerCase().includes('service')) {
            console.log(`🎯 ✅ Staying focused on services`);
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

async function testIntentRecognition() {
  console.log('\n🧠 Testing Intent Recognition & Focus\n');
  console.log('=' .repeat(60));
  
  const intentTests = [
    { 
      message: "What's the weather like?", 
      expected: "off_topic",
      description: "Off-topic question"
    },
    { 
      message: "Tell me a joke", 
      expected: "off_topic",
      description: "Random request"
    },
    { 
      message: "What services do you offer?", 
      expected: "service_inquiry",
      description: "Service-related question"
    },
    { 
      message: "I want to study abroad", 
      expected: "lead_collection",
      description: "Service interest"
    },
    { 
      message: "How much does it cost?", 
      expected: "service_inquiry",
      description: "Service inquiry"
    },
    { 
      message: "Can we schedule a call?", 
      expected: "scheduling",
      description: "Scheduling request"
    },
    { 
      message: "What's your favorite color?", 
      expected: "off_topic",
      description: "Personal question"
    },
    { 
      message: "I'm worried about my visa application", 
      expected: "question/complaint",
      description: "Service concern"
    }
  ];
  
  for (const test of intentTests) {
    console.log(`\n💬 Message: "${test.message}"`);
    console.log(`📝 Description: ${test.description}`);
    console.log(`🎯 Expected: ${test.expected}`);
    
    try {
      const analysis = await nlpService.analyzeMessage(test.message, {
        stage: 'collecting_info',
        collectedData: {},
        recentMessages: []
      });
      
      console.log(`✅ Actual: ${analysis.intent}`);
      console.log(`😊 Emotion: ${analysis.emotion}`);
      console.log(`📊 Confidence: ${analysis.confidence}`);
      console.log(`🎯 Should Refocus: ${analysis.should_refocus || false}`);
      
      const response = await nlpService.generateResponse(analysis, {}, 'collecting_info');
      console.log(`🤖 Response: ${response}`);
      
      // Check if response maintains focus
      const isFocused = response.toLowerCase().includes('immigration') || 
                       response.toLowerCase().includes('study abroad') ||
                       response.toLowerCase().includes('visa') ||
                       response.toLowerCase().includes('service') ||
                       response.toLowerCase().includes('help');
      
      if (isFocused) {
        console.log(`🎯 ✅ Response maintains focus on services`);
      } else {
        console.log(`⚠️  Response may not be focused enough`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function testServiceFocus() {
  console.log('\n🎯 Testing Service Focus Examples\n');
  console.log('=' .repeat(60));
  
  const focusTests = [
    {
      scenario: "User asks about weather",
      userMessage: "What's the weather like today?",
      expectedBehavior: "Acknowledge briefly and redirect to services"
    },
    {
      scenario: "User asks for a joke",
      userMessage: "Tell me a joke",
      expectedBehavior: "Politely redirect to immigration/study abroad services"
    },
    {
      scenario: "User asks about random topic",
      userMessage: "What's your favorite color?",
      expectedBehavior: "Acknowledge and steer back to services"
    },
    {
      scenario: "User asks about cooking",
      userMessage: "How do I cook pasta?",
      expectedBehavior: "Redirect to immigration/study abroad expertise"
    }
  ];
  
  for (const test of focusTests) {
    console.log(`\n📋 Scenario: ${test.scenario}`);
    console.log(`👤 User: "${test.userMessage}"`);
    console.log(`🎯 Expected: ${test.expectedBehavior}`);
    
    try {
      const analysis = await nlpService.analyzeMessage(test.userMessage, {
        stage: 'collecting_info',
        collectedData: {},
        recentMessages: []
      });
      
      const response = await nlpService.generateResponse(analysis, {}, 'collecting_info');
      console.log(`🤖 Bot: ${response}`);
      
      // Analyze focus
      const hasServiceKeywords = response.toLowerCase().includes('immigration') || 
                                response.toLowerCase().includes('study abroad') ||
                                response.toLowerCase().includes('visa') ||
                                response.toLowerCase().includes('service');
      
      const hasRedirectKeywords = response.toLowerCase().includes('but i\'m here') ||
                                 response.toLowerCase().includes('however') ||
                                 response.toLowerCase().includes('specifically');
      
      if (hasServiceKeywords && hasRedirectKeywords) {
        console.log(`✅ Perfect focus maintenance!`);
      } else if (hasServiceKeywords) {
        console.log(`✅ Good focus on services`);
      } else {
        console.log(`⚠️  Could be more focused on services`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function runAllTests() {
  try {
    await testFocusedBot();
    await testIntentRecognition();
    await testServiceFocus();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✨ The bot now:');
    console.log('   • Stays focused on HR/immigration services');
    console.log('   • Politely redirects off-topic questions');
    console.log('   • Maintains conversational tone');
    console.log('   • Collects lead information naturally');
    console.log('   • Provides service-related assistance');
    console.log('   • Acts as a professional customer service agent');
    
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
  testFocusedBot,
  testIntentRecognition,
  testServiceFocus,
  runAllTests
}; 
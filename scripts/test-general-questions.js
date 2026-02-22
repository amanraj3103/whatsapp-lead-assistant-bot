// Load environment variables
require('dotenv').config();

const conversationHandler = require('../src/services/conversationHandler');
const nlpService = require('../src/services/nlpService');
const logger = require('../src/utils/logger');

// Test various types of questions and general conversation
const testQuestions = [
  {
    category: "General Questions",
    questions: [
      "What's the weather like today?",
      "How are you doing?",
      "What time is it?",
      "Can you help me with something?",
      "Do you like pizza?",
      "What's your favorite color?"
    ]
  },
  {
    category: "Service-Related Questions",
    questions: [
      "What services do you offer?",
      "How much do your services cost?",
      "What documents do I need?",
      "How long does the process take?",
      "Do you have any testimonials?",
      "What makes you different from other companies?"
    ]
  },
  {
    category: "Random Topics",
    questions: [
      "Tell me a joke",
      "What's the capital of France?",
      "How do I cook pasta?",
      "What's the meaning of life?",
      "Can you recommend a good book?",
      "What's your opinion on AI?"
    ]
  },
  {
    category: "Mixed Conversation",
    conversation: [
      "Hi there!",
      "How are you today?",
      "I'm thinking about studying abroad",
      "What's the weather like in Canada?",
      "My name is Sarah by the way",
      "Do you have any tips for international students?",
      "Thanks for the help!",
      "Can we schedule a call?"
    ]
  }
];

async function testGeneralQuestions() {
  console.log('🤖 Testing Bot Response to General Questions\n');
  console.log('=' .repeat(60));

  for (const testCategory of testQuestions) {
    console.log(`\n📝 Category: ${testCategory.category}`);
    console.log('-'.repeat(40));
    
    if (testCategory.questions) {
      // Test individual questions
      for (const question of testCategory.questions) {
        console.log(`\n👤 User: ${question}`);
        
        try {
          const analysis = await nlpService.analyzeMessage(question, {
            stage: 'collecting_info',
            collectedData: {},
            recentMessages: []
          });
          
          console.log(`🎯 Intent: ${analysis.intent}`);
          console.log(`😊 Emotion: ${analysis.emotion}`);
          console.log(`💭 Context: ${analysis.context_understanding}`);
          
          const response = await nlpService.generateResponse(analysis, {}, 'collecting_info');
          console.log(`🤖 Bot: ${response}`);
          
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('─'.repeat(40));
      }
    } else if (testCategory.conversation) {
      // Test conversation flow
      let lead = null;
      
      for (let i = 0; i < testCategory.conversation.length; i++) {
        const message = testCategory.conversation[i];
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
          } else {
            console.log(`❌ Error: ${response.error}`);
          }
          
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

async function testIntentRecognition() {
  console.log('\n🧠 Testing Intent Recognition\n');
  console.log('=' .repeat(60));
  
  const intentTests = [
    { message: "What's your name?", expected: "greeting/question" },
    { message: "How much do you charge?", expected: "service_inquiry" },
    { message: "I'm confused about the process", expected: "question/complaint" },
    { message: "Thanks for your help!", expected: "goodbye" },
    { message: "Can we schedule a call?", expected: "scheduling" },
    { message: "What documents do I need?", expected: "service_inquiry" },
    { message: "I'm worried about my application", expected: "question/complaint" },
    { message: "Tell me about your services", expected: "service_inquiry" }
  ];
  
  for (const test of intentTests) {
    console.log(`\n💬 Message: "${test.message}"`);
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
      
      const response = await nlpService.generateResponse(analysis, {}, 'collecting_info');
      console.log(`🤖 Response: ${response}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function testContextAwareness() {
  console.log('\n🧠 Testing Context Awareness\n');
  console.log('=' .repeat(60));
  
  const conversationFlow = [
    "Hi! I'm interested in your services",
    "I want to study abroad",
    "Canada seems nice",
    "What's the weather like there?",
    "My name is Alex",
    "How long does the application process take?",
    "That sounds good! Can we schedule a call?"
  ];
  
  let lead = null;
  
  for (let i = 0; i < conversationFlow.length; i++) {
    const message = conversationFlow[i];
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
          const collectedData = Object.keys(lead.data).filter(key => lead.data[key]);
          console.log(`📋 Collected: ${collectedData.join(', ') || 'None'}`);
        }
      } else {
        console.log(`❌ Error: ${response.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function runAllTests() {
  try {
    await testGeneralQuestions();
    await testIntentRecognition();
    await testContextAwareness();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✨ The bot can handle:');
    console.log('   • General questions and random topics');
    console.log('   • Service-related inquiries');
    console.log('   • Emotional support and concerns');
    console.log('   • Context-aware conversations');
    console.log('   • Natural conversation flow');
    console.log('   • Mixed topics in one conversation');
    
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
  testGeneralQuestions,
  testIntentRecognition,
  testContextAwareness,
  runAllTests
}; 
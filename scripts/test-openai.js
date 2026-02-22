#!/usr/bin/env node

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🤖 OpenAI Configuration Test\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('==========================');
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);

if (!process.env.OPENAI_API_KEY) {
  console.log('\n❌ OpenAI API key is missing!');
  console.log('Please add your OpenAI API key to the .env file:');
  console.log('OPENAI_API_KEY=your_openai_api_key_here');
  process.exit(1);
}

// Test OpenAI service
console.log('\n🔧 Testing OpenAI Service...');
try {
  const nlpService = require('../src/services/nlpService');
  console.log('✅ NLP Service loaded successfully');
  
  // Test a simple message analysis
  console.log('\n🧠 Testing AI Message Analysis...');
  const testMessage = 'Hi, my name is John and I need help with study abroad';
  
  const analysis = await nlpService.analyzeMessage(testMessage);
  console.log('✅ Message analysis successful!');
  console.log(`   Intent: ${analysis.intent}`);
  console.log(`   Confidence: ${analysis.confidence}`);
  console.log(`   Entities: ${JSON.stringify(analysis.entities)}`);
  
  // Test conversation handler
  console.log('\n💬 Testing Conversation Handler...');
  const conversationHandler = require('../src/services/conversationHandler');
  console.log('✅ Conversation Handler loaded successfully');
  
  // Test a simple conversation
  const testPhone = 'whatsapp:+1234567890';
  const result = await conversationHandler.handleIncomingMessage({
    From: testPhone,
    Body: 'Hi, I need help with study abroad',
    MessageSid: 'test_123'
  });
  
  console.log('✅ Conversation handled successfully!');
  console.log(`   Response: ${result.response}`);
  console.log(`   Stage: ${result.stage}`);
  console.log(`   Success: ${result.success}`);
  
  console.log('\n🎉 All OpenAI tests passed!');
  console.log('\n🚀 Your bot is ready for full testing!');
  
} catch (error) {
  console.log('❌ OpenAI test failed:');
  console.log(`   Error: ${error.message}`);
  console.log('\n📝 Troubleshooting:');
  console.log('1. Check your OpenAI API key is correct');
  console.log('2. Ensure you have sufficient OpenAI credits');
  console.log('3. Check your internet connection');
  process.exit(1);
} 
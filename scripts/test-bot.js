#!/usr/bin/env node

const dotenv = require('dotenv');
const conversationHandler = require('../src/services/conversationHandler');
const leadService = require('../src/services/leadService');
const reportingService = require('../src/services/reportingService');

// Load environment variables
dotenv.config();

console.log('🤖 WhatsApp Bot Testing Suite\n');

// Test conversation scenarios
const testScenarios = [
  {
    name: 'Complete Lead Collection Flow',
    messages: [
      'Hi, I need help with study abroad',
      'My name is John Smith',
      'john.smith@email.com',
      '+1234567890',
      'Canada',
      'Study',
      'Tomorrow at 2 PM'
    ]
  },
  {
    name: 'Partial Information Flow',
    messages: [
      'Hello',
      'I am Sarah Johnson',
      'sarah@test.com',
      '+9876543210',
      'Australia',
      'Work visa'
    ]
  },
  {
    name: 'Direct Information Flow',
    messages: [
      'Hi, my name is Mike Wilson, email is mike@test.com, phone +1112223333, interested in Canada for study, available tomorrow 3 PM'
    ]
  }
];

async function testConversation(scenario) {
  console.log(`\n📝 Testing: ${scenario.name}`);
  console.log('=' .repeat(50));
  
  let phoneNumber = `whatsapp:+${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  
  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    console.log(`\n👤 User (${i + 1}): ${message}`);
    
    try {
      const result = await conversationHandler.handleIncomingMessage({
        From: phoneNumber,
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
  }
  
  // Get final lead data
  const lead = leadService.getLeadByPhone(phoneNumber);
  if (lead) {
    console.log(`\n📊 Final Lead Data:`);
    console.log(`   ID: ${lead.id}`);
    console.log(`   Stage: ${lead.stage}`);
    console.log(`   Status: ${lead.status}`);
    console.log(`   Data: ${JSON.stringify(lead.data, null, 2)}`);
    console.log(`   Conversation Length: ${lead.conversation.length}`);
  }
}

async function testServices() {
  console.log('\n🔧 Testing Individual Services');
  console.log('=' .repeat(50));
  
  // Test NLP Service
  try {
    const nlpService = require('../src/services/nlpService');
    const analysis = await nlpService.analyzeMessage('Hi, my name is John and I need help with study abroad');
    console.log('✅ NLP Service: Working');
    console.log(`   Intent: ${analysis.intent}`);
    console.log(`   Confidence: ${analysis.confidence}`);
  } catch (error) {
    console.log('❌ NLP Service: Failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test Encryption Service
  try {
    const encryptionService = require('../src/services/encryptionService');
    const testData = { email: 'test@example.com', phone: '+1234567890' };
    const encrypted = encryptionService.encryptLeadData(testData);
    const decrypted = encryptionService.decryptLeadData(encrypted);
    console.log('✅ Encryption Service: Working');
  } catch (error) {
    console.log('❌ Encryption Service: Failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test Calendly Service
  try {
    const calendlyService = require('../src/services/calendlyService');
    const isConfigured = calendlyService.isConfigured();
    console.log(`✅ Calendly Service: ${isConfigured ? 'Configured' : 'Not configured'}`);
  } catch (error) {
    console.log('❌ Calendly Service: Failed');
    console.log(`   Error: ${error.message}`);
  }
}

async function testReportGeneration() {
  console.log('\n📄 Testing Report Generation');
  console.log('=' .repeat(50));
  
  try {
    // Create some test leads
    const testLeads = [
      {
        id: 'test-1',
        phoneNumber: '+1234567890',
        status: 'scheduled',
        stage: 'completed',
        createdAt: new Date().toISOString(),
        data: {
          name: 'Test User 1',
          email: 'test1@example.com',
          phone: '+1234567890',
          country: 'Canada',
          service_type: 'study',
          preferred_time: '2024-01-15T14:00:00Z',
          notes: 'Test lead 1'
        },
        conversation: [
          { direction: 'inbound', content: 'Hi', timestamp: new Date().toISOString() },
          { direction: 'outbound', content: 'Hello!', timestamp: new Date().toISOString() }
        ]
      },
      {
        id: 'test-2',
        phoneNumber: '+0987654321',
        status: 'active',
        stage: 'collecting_info',
        createdAt: new Date().toISOString(),
        data: {
          name: 'Test User 2',
          email: 'test2@example.com',
          phone: '+0987654321',
          country: 'Australia',
          service_type: 'work',
          preferred_time: null,
          notes: 'Test lead 2'
        },
        conversation: [
          { direction: 'inbound', content: 'Hello', timestamp: new Date().toISOString() },
          { direction: 'outbound', content: 'Hi there!', timestamp: new Date().toISOString() }
        ]
      }
    ];
    
    // Add test leads to the service
    testLeads.forEach(lead => {
      leadService.leads.set(lead.id, lead);
    });
    
    const today = new Date().toISOString().split('T')[0];
    const result = await reportingService.generateDailyReport(today, testLeads);
    
    console.log('✅ Report Generation: Working');
    console.log(`   Excel: ${result.excelPath}`);
    console.log(`   PDF: ${result.pdfPath}`);
    console.log(`   Total Leads: ${result.totalLeads}`);
    
  } catch (error) {
    console.log('❌ Report Generation: Failed');
    console.log(`   Error: ${error.message}`);
  }
}

// Additional comprehensive scenarios
const advancedTestScenarios = [
  {
    name: 'Multi-Language: Hindi',
    messages: [
      'Hindi', // Language selection
      'मेरा नाम अमित है',
      'मैं कनाडा में पढ़ाई करना चाहता हूँ',
      'इंजीनियरिंग',
      'amit@email.com',
      '9876543210',
      'दिल्ली'
    ]
  },
  {
    name: 'Multi-Language: Malayalam (Manglish input)',
    messages: [
      'Malayalam', // Language selection
      'ente peru Ramesh aanu', // Manglish input
      'Canada-il padikkan agrahikkunnu',
      'Engineering',
      'ramesh@email.com',
      '9876543210',
      'Kollam'
    ]
  },
  {
    name: 'FAQ/Knowledge Base',
    messages: [
      'English', // Language selection
      'What is HMV?',
      'I want a truck driver job in Europe',
      'My name is Arjun',
      'C+E license',
      'arjun@email.com',
      '9876543210',
      'Delhi'
    ]
  },
  {
    name: 'Out-of-Order Info',
    messages: [
      'English',
      'My name is Priya, my number is 9876543210, I want to study in Canada',
      'MBBS',
      'priya@email.com',
      'Mumbai'
    ]
  },
  {
    name: 'Off-Topic Handling',
    messages: [
      'English',
      'What is the weather like today?',
      'I want to study abroad',
      'My name is Maria',
      'Canada',
      'Nursing',
      'maria@email.com',
      '9876543210',
      'Kochi'
    ]
  },
  {
    name: 'Error Handling: Invalid Email/Phone',
    messages: [
      'English',
      'My name is Rahul',
      'rahul[at]email', // Invalid email
      '98765', // Invalid phone
      'rahul@email.com', // Correct email
      '9876543210', // Correct phone
      'Delhi'
    ]
  }
];

async function testAdvancedScenarios() {
  for (const scenario of advancedTestScenarios) {
    console.log(`\n📝 Advanced Test: ${scenario.name}`);
    console.log('='.repeat(50));
    let phoneNumber = `whatsapp:+${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    for (let i = 0; i < scenario.messages.length; i++) {
      const message = scenario.messages[i];
      console.log(`\n👤 User (${i + 1}): ${message}`);
      try {
        const result = await conversationHandler.handleIncomingMessage({
          From: phoneNumber,
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
    }
    // Get final lead data
    const lead = await leadService.getLeadByPhone(phoneNumber);
    if (lead) {
      console.log(`\n📊 Final Lead Data:`);
      console.log(`   ID: ${lead.id}`);
      console.log(`   Stage: ${lead.stage}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Data: ${JSON.stringify(lead.data, null, 2)}`);
      console.log(`   Conversation Length: ${lead.conversation.length}`);
    }
    console.log('\n' + '='.repeat(50));
  }
}

async function runAllTests() {
  console.log('🚀 Starting WhatsApp Bot Tests...\n');
  
  // Test individual services first
  await testServices();
  
  // Test conversation flows
  for (const scenario of testScenarios) {
    await testConversation(scenario);
  }
  
  // Run advanced scenarios
  await testAdvancedScenarios();
  
  // Test report generation
  await testReportGeneration();
  
  console.log('\n🎉 Testing Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check the generated reports in the reports/ directory');
  console.log('2. Review the logs in the logs/ directory');
  console.log('3. Test with real WhatsApp messages after deployment');
  console.log('4. Monitor the admin dashboard at /api/admin/statistics');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testConversation, testServices, testReportGeneration }; 
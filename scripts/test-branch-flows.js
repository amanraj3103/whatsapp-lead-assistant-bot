process.env.USE_MOCK_WHATSAPP = 'true';

// Load environment variables
require('dotenv').config();

const conversationHandler = require('../src/services/conversationHandler');
const logger = require('../src/utils/logger');
const fs = require('fs');
const outputFile = 'branch-flow-test-output.txt';

const testScenarios = [
  {
    name: 'Education India',
    messages: [
      "Hi, I want to study in India",
      "Bangalore",
      "Engineering",
      "My name is Rahul Sharma",
      "My number is 9876543210",
      "rahul.sharma@email.com",
      "I live in Mumbai"
    ]
  },
  {
    name: 'Education Abroad',
    messages: [
      "I'm interested in studying abroad",
      "Canada",
      "MBBS",
      "My name is Priya Singh",
      "My contact is +91-9988776655",
      "priya.singh@email.com",
      "Delhi"
    ]
  },
  {
    name: 'Job Europe',
    messages: [
      "I want a job in Europe",
      "Truck Driver",
      "My name is Alex John",
      "Contact: +44-123456789",
      "alex.john@email.com",
      "London"
    ]
  }
];

async function runBranchTests() {
  let output = '';
  for (const scenario of testScenarios) {
    output += `\n==============================\n`;
    output += `🟦 Scenario: ${scenario.name}\n`;
    output += '------------------------------\n';
    console.log(`\n==============================`);
    console.log(`🟦 Scenario: ${scenario.name}`);
    console.log('------------------------------');
    let lead = null;
    for (let i = 0; i < scenario.messages.length; i++) {
      const message = scenario.messages[i];
      output += `\n👤 User: ${message}\n`;
      console.log(`\n👤 User: ${message}`);
      const messageData = {
        From: '+19999999999',
        Body: message,
        MessageSid: `test_${Date.now()}_${i}`
      };
      try {
        const response = await conversationHandler.handleIncomingMessage(messageData);
        let botReply = response && response.response ? response.response : '[No bot reply captured]';
        output += `🤖 Bot: ${botReply}\n`;
        output += `📊 Stage: ${response.stage || '[unknown]'}\n`;
        if (response.type === 'question') {
          output += `⏳ Awaiting: ${response.nextField}\n`;
        }
        console.log(`🤖 Bot: ${botReply}`);
        console.log(`📊 Stage: ${response.stage || '[unknown]'}`);
        if (response.type === 'question') {
          console.log(`⏳ Awaiting: ${response.nextField}`);
        }
        lead = await conversationHandler.getConversationSummary('+19999999999');
      } catch (error) {
        output += `❌ Error: ${error.message}\n`;
        console.log(`❌ Error: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (lead) {
      output += '\n✅ Final Collected Lead Data:\n';
      output += JSON.stringify(lead.data, null, 2) + '\n';
      console.log('\n✅ Final Collected Lead Data:');
      console.log(JSON.stringify(lead.data, null, 2));
    }
    output += '==============================\n';
    console.log('==============================\n');
  }
  fs.writeFileSync(outputFile, output);
  console.log(`\n📄 Full output written to: ${outputFile}\n`);
}

if (require.main === module) {
  runBranchTests();
}

module.exports = { runBranchTests }; 
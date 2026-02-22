require('dotenv').config();
const hybridLeadService = require('../src/services/hybridLeadService');
const reportingService = require('../src/services/reportingService');
const logger = require('../src/utils/logger');

async function testEncryptionWithLeads() {
  try {
    console.log('🔐 Testing Encryption with Lead Creation and Daily Report\n');
    
    // Clear any existing leads by restarting the service
    console.log('🧹 Starting fresh test...');
    
    // Create a test lead with encryption
    console.log('📝 Creating test lead with encryption...');
    const testLead = await hybridLeadService.createLead('+9876543210', {
      name: 'Encrypted Test User',
      email: 'encrypted@example.com',
      phone: '+9876543210',
      country: 'Poland',
      service_type: 'Visa Consultation',
      preferred_time: 'Morning',
      notes: 'Test lead with encryption for daily report'
    });
    
    console.log('✅ Test lead created successfully');
    console.log(`📱 Phone: ${testLead.phoneNumber}`);
    console.log(`👤 Name: ${testLead.data.name}`);
    console.log(`📧 Email: ${testLead.data.email}`);
    console.log(`🌍 Country: ${testLead.data.country}`);
    console.log(`🔧 Service: ${testLead.data.service_type}`);
    console.log();
    
    // Check total leads
    const allLeads = await hybridLeadService.getAllLeads();
    console.log(`📊 Total leads in system: ${allLeads.length}`);
    console.log();
    
    // Get leads for today
    const today = new Date().toISOString().split('T')[0];
    const todayLeads = await hybridLeadService.getLeadsForDate(today);
    console.log(`📅 Leads for today (${today}): ${todayLeads.length}`);
    console.log();
    
    // Manually generate and send report
    console.log('📧 Generating and sending daily report...');
    
    const result = await reportingService.generateAndSendDailyReport(
      today,
      todayLeads,
      process.env.ADMIN_EMAIL
    );
    
    console.log('✅ Daily report process completed!');
    console.log(`📊 Total leads: ${todayLeads.length}`);
    console.log(`📧 Email sent: ${result.emailSent}`);
    console.log(`📁 Files generated: ${result.reportInfo.files.length}`);
    console.log();
    console.log('📬 Check your email (amanrajpoland@gmail.com) for the report!');
    console.log();
    console.log('📋 Report files:');
    result.reportInfo.files.forEach(file => {
      console.log(`   📄 ${file}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Encryption with leads test failed', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
  }
}

// Run the test
if (require.main === module) {
  testEncryptionWithLeads();
}

module.exports = { testEncryptionWithLeads }; 
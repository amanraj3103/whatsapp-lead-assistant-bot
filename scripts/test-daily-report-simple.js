const leadService = require('../src/services/leadService');
const reportingService = require('../src/services/reportingService');
const logger = require('../src/utils/logger');

async function testDailyReportSimple() {
  try {
    console.log('🧪 Testing Daily Report Functionality (Simple)\n');
    
    // Create a test lead without encryption
    console.log('📝 Creating test lead...');
    const testLead = leadService.createLead('+1234567890', {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'Poland',
      service_type: 'Visa Consultation',
      preferred_time: 'Afternoon',
      notes: 'Test lead for daily report functionality'
    });
    
    console.log('✅ Test lead created successfully');
    console.log(`📱 Phone: ${testLead.phoneNumber}`);
    console.log(`👤 Name: ${testLead.data.name}`);
    console.log(`📧 Email: ${testLead.data.email}`);
    console.log(`🌍 Country: ${testLead.data.country}`);
    console.log(`🔧 Service: ${testLead.data.service_type}`);
    console.log();
    
    // Check total leads
    const allLeads = leadService.getAllLeads();
    console.log(`📊 Total leads in system: ${allLeads.length}`);
    console.log();
    
    // Get leads for today
    const today = new Date().toISOString().split('T')[0];
    const todayLeads = leadService.getLeadsForDate(today);
    console.log(`📅 Leads for today (${today}): ${todayLeads.length}`);
    console.log();
    
    // Manually generate and send report
    console.log('📧 Generating and sending daily report...');
    
    // Bypass encryption by directly using the lead data
    const leadsForReport = todayLeads.map(lead => ({
      ...lead,
      data: lead.data // Use data directly without decryption
    }));
    
    const result = await reportingService.generateAndSendDailyReport(
      today,
      leadsForReport,
      process.env.ADMIN_EMAIL
    );
    
    console.log('✅ Daily report process completed!');
    console.log(`📊 Total leads: ${leadsForReport.length}`);
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
    logger.error('Daily report test failed', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
  }
}

// Run the test
if (require.main === module) {
  testDailyReportSimple();
}

module.exports = { testDailyReportSimple }; 
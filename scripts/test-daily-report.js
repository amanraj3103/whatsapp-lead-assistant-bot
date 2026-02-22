const leadService = require('../src/services/leadService');
const dailyReportScheduler = require('../src/schedulers/dailyReportScheduler');
const logger = require('../src/utils/logger');

async function testDailyReport() {
  try {
    console.log('🧪 Testing Daily Report Functionality\n');
    
    // Create a test lead
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
    
    // Manually trigger daily report for today
    console.log('📧 Triggering daily report generation...');
    const reportResult = await dailyReportScheduler.generateReportForDate(today);
    
    if (reportResult.success) {
      console.log('✅ Daily report generated successfully!');
      console.log(`📊 Total leads: ${reportResult.totalLeads}`);
      console.log(`📧 Email sent: ${reportResult.emailSent}`);
      console.log(`📁 Files: ${reportResult.files ? reportResult.files.length : 0}`);
      console.log();
      console.log('📬 Check your email (amanrajpoland@gmail.com) for the report!');
    } else {
      console.log('❌ Failed to generate report:', reportResult.message || reportResult.error);
    }
    
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
  testDailyReport();
}

module.exports = { testDailyReport }; 
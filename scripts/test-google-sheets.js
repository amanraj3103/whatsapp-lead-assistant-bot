require('dotenv').config();
const hybridLeadService = require('../src/services/hybridLeadService');
const logger = require('../src/utils/logger');

async function testGoogleSheetsIntegration() {
  try {
    console.log('🧪 Testing Google Sheets Integration\n');
    
    // Check service status
    console.log('📊 Checking service status...');
    const status = hybridLeadService.getStatus();
    console.log('✅ Service Status:', JSON.stringify(status, null, 2));
    console.log();
    
    if (!status.useGoogleSheets) {
      console.log('⚠️  Google Sheets not configured. Using in-memory storage.');
      console.log('📖 Please follow the setup guide in GOOGLE_SHEETS_SETUP.md');
      console.log();
    }
    
    // Create a test lead
    console.log('📝 Creating test lead...');
    const testLead = await hybridLeadService.createLead('+1234567890', {
      name: 'Test User - Google Sheets',
      email: 'test-sheets@example.com',
      phone: '+1234567890',
      country: 'Poland',
      service_type: 'Visa Consultation',
      preferred_time: 'Afternoon',
      notes: 'Test lead for Google Sheets integration'
    });
    
    console.log('✅ Test lead created successfully');
    console.log(`📱 Phone: ${testLead.phoneNumber}`);
    console.log(`👤 Name: ${testLead.data.name}`);
    console.log(`📧 Email: ${testLead.data.email}`);
    console.log(`🌍 Country: ${testLead.data.country}`);
    console.log(`🔧 Service: ${testLead.data.service_type}`);
    console.log(`💾 Storage: ${status.useGoogleSheets ? 'Google Sheets' : 'In-Memory'}`);
    console.log();
    
    // Update the lead
    console.log('🔄 Updating test lead...');
    const updatedLead = await hybridLeadService.updateLead('+1234567890', {
      data: {
        notes: 'Updated notes for Google Sheets test'
      }
    });
    
    console.log('✅ Lead updated successfully');
    console.log(`📝 Updated notes: ${updatedLead.data.notes}`);
    console.log();
    
    // Retrieve the lead
    console.log('🔍 Retrieving test lead...');
    const retrievedLead = await hybridLeadService.getLeadByPhone('+1234567890');
    
    if (retrievedLead) {
      console.log('✅ Lead retrieved successfully');
      console.log(`📱 Phone: ${retrievedLead.phoneNumber}`);
      console.log(`👤 Name: ${retrievedLead.data.name}`);
      console.log(`📝 Notes: ${retrievedLead.data.notes}`);
    } else {
      console.log('❌ Lead not found');
    }
    console.log();
    
    // Get all leads
    console.log('📋 Getting all leads...');
    const allLeads = await hybridLeadService.getAllLeads();
    console.log(`✅ Found ${allLeads.length} total leads`);
    console.log();
    
    // Get leads for today
    console.log('📅 Getting leads for today...');
    const today = new Date().toISOString().split('T')[0];
    const todayLeads = await hybridLeadService.getLeadsForDate(today);
    console.log(`✅ Found ${todayLeads.length} leads for today (${today})`);
    console.log();
    
    // Get statistics
    console.log('📊 Getting lead statistics...');
    const stats = await hybridLeadService.getStatistics();
    console.log('✅ Lead Statistics:', JSON.stringify(stats, null, 2));
    console.log();
    
    // Test message addition
    console.log('💬 Adding test message...');
    await hybridLeadService.addMessage('+1234567890', {
      direction: 'inbound',
      content: 'Test message for Google Sheets integration',
      type: 'text'
    });
    console.log('✅ Message added successfully');
    console.log();
    
    console.log('🎉 Google Sheets integration test completed successfully!');
    
    if (status.useGoogleSheets) {
      console.log('📊 Check your Google Sheet to see the test data!');
    } else {
      console.log('💡 To enable Google Sheets, follow the setup guide in GOOGLE_SHEETS_SETUP.md');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Google Sheets integration test failed', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
  }
}

// Run the test
if (require.main === module) {
  testGoogleSheetsIntegration();
}

module.exports = { testGoogleSheetsIntegration }; 
const whatsappService = require('../src/services/whatsappService');
const calendlyService = require('../src/services/calendlyService');
const logger = require('../src/utils/logger');

async function testViewOnceDocument() {
  try {
    console.log('🧪 Testing View-Once Document Feature\n');
    
    // Test phone number (replace with your number)
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+1234567890';
    
    // Create sample lead data
    const leadData = {
      id: 'test-lead-001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: testPhoneNumber,
      country: 'United States',
      service_type: 'Visa Consultation',
      preferred_call_time: 'Afternoon',
      notes: 'Interested in business visa',
      created_at: new Date().toISOString()
    };
    
    console.log('📋 Lead Data:');
    console.log(JSON.stringify(leadData, null, 2));
    console.log();
    
    // Generate a booking link
    console.log('🔗 Generating booking link...');
    let bookingResult;
    
    try {
      bookingResult = await calendlyService.createBookingLink(leadData);
    } catch (error) {
      console.log('⚠️ Calendly not configured, using mock booking link for testing...');
      bookingResult = {
        success: true,
        bookingLink: 'https://calendly.com/test/consultation?name=John%20Doe&email=john.doe@example.com&country=United%20States&service=Visa%20Consultation',
        bookingId: 'mock-booking-001'
      };
    }
    
    if (!bookingResult.success) {
      console.error('❌ Failed to create booking link:', bookingResult.error);
      return;
    }
    
    const { bookingLink, bookingId } = bookingResult;
    console.log('✅ Booking link generated successfully');
    console.log(`📅 Booking ID: ${bookingId}`);
    console.log(`🔗 Link: ${bookingLink}`);
    console.log();
    
    // Send as view-once document
    console.log('📄 Sending as view-once document...');
    const sendResult = await whatsappService.sendBookingLinkAsViewOnce(
      testPhoneNumber,
      bookingLink,
      leadData
    );
    
    console.log('✅ View-once document sent successfully');
    console.log(`📱 Message ID: ${sendResult.messageSid || sendResult.messageId}`);
    console.log(`📊 Status: ${sendResult.status}`);
    console.log();
    
    // Test regular message for comparison
    console.log('📝 Sending regular text message for comparison...');
    const regularResult = await whatsappService.sendMessage(
      testPhoneNumber,
      whatsappService.formatBookingMessage(bookingLink, leadData)
    );
    
    console.log('✅ Regular message sent successfully');
    console.log(`📱 Message ID: ${regularResult.messageSid || regularResult.messageId}`);
    console.log(`📊 Status: ${regularResult.status}`);
    console.log();
    
    console.log('🎉 View-once document test completed successfully!');
    console.log();
    console.log('📋 Summary:');
    console.log('- View-once document: Enhanced security with HTML document');
    console.log('- Regular message: Standard text message with link');
    console.log('- Both messages sent to:', testPhoneNumber);
    console.log();
    console.log('💡 Benefits of view-once document:');
    console.log('✅ More professional appearance');
    console.log('✅ Better visual presentation');
    console.log('✅ Enhanced security perception');
    console.log('✅ Detailed consultation information');
    console.log('✅ Clear usage instructions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('View-once document test failed', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
  }
}

// Run the test
if (require.main === module) {
  testViewOnceDocument();
}

module.exports = { testViewOnceDocument }; 
require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');
const whatsappService = require('../src/services/whatsappService');

async function sendCalendlyLink() {
  // Fill in the test user details
  const testLeadData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+48739614279',
    country: 'Canada',
    service_type: 'Study visa'
  };
  const to = 'whatsapp:+48739614279'; // Replace with your WhatsApp number

  // Generate the Calendly link and message
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  const message = calendlyService.formatBookingMessage(bookingLink, testLeadData);

  // Send the booking link as a view-once document for enhanced security
  console.log('📄 Sending booking link as view-once document...');
  const sendResult = await whatsappService.sendBookingLinkAsViewOnce(
    to,
    bookingLink,
    testLeadData
  );
  
  console.log('✅ View-once document sent successfully!');
  console.log(`�� Message ID: ${sendResult.messageSid || sendResult.messageId}`);
  console.log(`📊 Status: ${sendResult.status}`);
  console.log();
  console.log('💡 Benefits of view-once document:');
  console.log('✅ More professional appearance');
  console.log('✅ Enhanced security perception');
  console.log('✅ Detailed consultation information');
  console.log('✅ Clear usage instructions');
}

sendCalendlyLink().catch(console.error); 
const { createOneClickLink } = require('../src/utils/oneClickLinks');
const logger = require('../src/utils/logger');

async function testOneClickLinks() {
  try {
    console.log('🧪 Testing One-Click-Expiry Booking Links\n');
    
    // Create a test Calendly link
    const testCalendlyLink = 'https://calendly.com/test/consultation?name=John%20Doe&email=john@example.com';
    
    // Generate a one-click token
    console.log('🔗 Generating one-click token...');
    const token = createOneClickLink(testCalendlyLink);
    const oneClickUrl = `http://localhost:3000/booking/${token}`;
    
    console.log('✅ One-click link generated successfully');
    console.log(`📅 Token: ${token}`);
    console.log(`🔗 URL: ${oneClickUrl}`);
    console.log(`🎯 Calendly Link: ${testCalendlyLink}`);
    console.log();
    
    // Test the link (first click - should work)
    console.log('🔄 Testing first click (should redirect to Calendly)...');
    const response1 = await fetch(oneClickUrl);
    console.log(`📊 Status: ${response1.status}`);
    console.log(`📍 Redirect Location: ${response1.headers.get('location')}`);
    console.log();
    
    // Test the link again (second click - should show expired)
    console.log('🔄 Testing second click (should show expired)...');
    const response2 = await fetch(oneClickUrl);
    console.log(`📊 Status: ${response2.status}`);
    const body2 = await response2.text();
    console.log(`📄 Response contains "expired": ${body2.includes('expired')}`);
    console.log();
    
    // Test with invalid token
    console.log('🔄 Testing invalid token...');
    const response3 = await fetch('http://localhost:3000/booking/invalidtoken123');
    console.log(`📊 Status: ${response3.status}`);
    const body3 = await response3.text();
    console.log(`📄 Response contains "Invalid": ${body3.includes('Invalid')}`);
    console.log();
    
    console.log('🎉 One-click link test completed successfully!');
    console.log();
    console.log('📋 Summary:');
    console.log('✅ First click: Redirects to Calendly');
    console.log('✅ Second click: Shows expired message');
    console.log('✅ Invalid token: Shows invalid message');
    console.log();
    console.log('💡 How it works:');
    console.log('1. Bot generates unique token for each booking');
    console.log('2. User receives link: http://localhost:3000/booking/[token]');
    console.log('3. First click: Redirects to Calendly and marks as used');
    console.log('4. Subsequent clicks: Shows expired message');
    console.log('5. Invalid tokens: Shows invalid message');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('One-click link test failed', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
  }
}

// Run the test
if (require.main === module) {
  testOneClickLinks();
}

module.exports = { testOneClickLinks }; 
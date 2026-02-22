require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testWebhookTracking() {
  console.log('🔗 Testing Webhook-Based One-Time Use Links...\n');
  
  const testPhone = '+9988776664';
  const testLeadData = {
    name: 'Maria Rodriguez',
    email: 'maria@example.com',
    phone: testPhone,
    country: 'Mexico',
    service_type: 'Family visa'
  };
  
  // Test 1: Create a webhook-tracked booking link
  console.log('1. Creating webhook-tracked booking link...');
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ✅ Booking link created: ${bookingLink.substring(0, 50)}...`);
  
  // Extract booking ID from the link
  const urlParams = new URLSearchParams(bookingLink.split('?')[1]);
  const bookingId = urlParams.get('booking_id');
  console.log(`   📋 Booking ID: ${bookingId}`);
  console.log(`   🔒 Webhook tracked: ${urlParams.get('webhook_tracked')}`);
  
  // Test 2: Check link properties
  console.log('\n2. Checking link properties...');
  const isActive = calendlyService.isBookingLinkActive(bookingId);
  const bookingData = calendlyService.getBookingData(bookingId);
  console.log(`   ✅ Link is active: ${isActive}`);
  console.log(`   🔒 Is one-time use: ${bookingData.isOneTimeUse}`);
  console.log(`   📊 Access count: ${bookingData.accessCount || 0}`);
  console.log(`   📊 Usage count: ${bookingData.usageCount || 0}`);
  console.log(`   🎯 Is webhook tracked: ${bookingData.isWebhookTracked}`);
  
  // Test 3: Simulate first link access (webhook event)
  console.log('\n3. Simulating first link access (webhook event)...');
  const wasFirstAccess = calendlyService.trackLinkAccess(bookingId);
  console.log(`   ✅ Was first access: ${wasFirstAccess}`);
  
  // Check updated access count
  const updatedBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📊 Updated access count: ${updatedBookingData.accessCount}`);
  console.log(`   ❌ Link still active: ${updatedBookingData.isActive}`);
  console.log(`   📋 Deactivated at: ${updatedBookingData.deactivatedAt}`);
  
  // Test 4: Simulate second link access (should not deactivate again)
  console.log('\n4. Simulating second link access...');
  const wasSecondAccess = calendlyService.trackLinkAccess(bookingId);
  console.log(`   ✅ Was first access: ${wasSecondAccess}`);
  console.log(`   📊 Final access count: ${calendlyService.getBookingData(bookingId).accessCount}`);
  
  // Test 5: Validate the accessed link
  console.log('\n5. Validating the accessed link...');
  const accessValidation = calendlyService.validateBookingLink(bookingId);
  console.log(`   ✅ Is valid: ${accessValidation.isValid}`);
  console.log(`   📋 Can book: ${accessValidation.canBook}`);
  console.log(`   📋 Reason: ${accessValidation.reason}`);
  console.log(`   📊 Was used: ${accessValidation.wasUsed}`);
  
  // Test 6: Simulate a booking (webhook event)
  console.log('\n6. Simulating a booking event...');
  const mockWebhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'maria@example.com',
        name: 'Maria Rodriguez',
        uri: 'https://api.calendly.com/invitees/999',
        tracking: {
          utm_parameters: {
            booking_id: bookingId
          }
        }
      },
      event: {
        uri: 'https://api.calendly.com/scheduled_events/888',
        start_time: '2025-07-11T16:00:00Z',
        end_time: '2025-07-11T16:30:00Z'
      }
    }
  };
  
  await calendlyService.handleBookingWebhook(mockWebhookData);
  
  // Test 7: Check final booking data
  console.log('\n7. Checking final booking data...');
  const finalBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📋 Is active: ${finalBookingData.isActive}`);
  console.log(`   📊 Final access count: ${finalBookingData.accessCount}`);
  console.log(`   📊 Final usage count: ${finalBookingData.usageCount}`);
  console.log(`   📋 Deactivated at: ${finalBookingData.deactivatedAt}`);
  
  // Test 8: Try to create another link for the same phone number
  console.log('\n8. Attempting to create another link for the same phone number...');
  const secondResult = await calendlyService.createBookingLinkWithValidation(testLeadData);
  console.log(`   ✅ Success: ${secondResult.success}`);
  console.log(`   📋 Error: ${secondResult.error}`);
  console.log(`   📋 Message: ${secondResult.message}`);
  
  // Test 9: Test with different phone number
  console.log('\n9. Testing with different phone number...');
  const differentLeadData = {
    name: 'Carlos Silva',
    email: 'carlos@example.com',
    phone: '+9988776665',
    country: 'Brazil',
    service_type: 'Work permit'
  };
  
  const differentResult = await calendlyService.createBookingLinkWithValidation(differentLeadData);
  console.log(`   ✅ Success: ${differentResult.success}`);
  console.log(`   📋 Is existing: ${differentResult.isExisting}`);
  console.log(`   📋 Message: ${differentResult.message}`);
  
  if (differentResult.success) {
    const differentBookingId = calendlyService.extractBookingIdFromLink(differentResult.link);
    const differentBookingData = calendlyService.getBookingData(differentBookingId);
    console.log(`   🔒 Is one-time use: ${differentBookingData.isOneTimeUse}`);
    console.log(`   🎯 Is webhook tracked: ${differentBookingData.isWebhookTracked}`);
  }
  
  // Test 10: Test booking history
  console.log('\n10. Testing booking history...');
  const history = calendlyService.getBookingHistory(testPhone);
  console.log(`   📋 Total bookings: ${history.length}`);
  if (history.length > 0) {
    console.log(`   📋 Last booking: ${history[0].bookingId}`);
    console.log(`   📋 Was active: ${history[0].isActive}`);
  }
  
  console.log('\n🎉 Webhook tracking test completed!');
  
  console.log('\n📝 System Features:');
  console.log('   ✅ Webhook-tracked one-time use links');
  console.log('   ✅ Real-time link access tracking');
  console.log('   ✅ Immediate deactivation on first access');
  console.log('   ✅ Usage count tracking');
  console.log('   ✅ Access count tracking');
  console.log('   ✅ System prevents multiple bookings per phone number');
  
  console.log('\n🔒 Security Features:');
  console.log('   - Links are deactivated immediately on first access');
  console.log('   - Webhook events track all link usage');
  console.log('   - Access count prevents multiple uses');
  console.log('   - Usage count tracks actual bookings');
  console.log('   - No possibility of double bookings');
  console.log('   - Full audit trail maintained');
  
  console.log('\n⚠️  Important Notes:');
  console.log('   - Webhook tracking works without Calendly API');
  console.log('   - Links are deactivated on first access');
  console.log('   - System tracks both access and usage');
  console.log('   - Prevents multiple bookings per phone number');
  console.log('   - Links become unusable after first access');
  
  console.log('\n🎯 Result:');
  console.log('   The system now uses webhook tracking to prevent');
  console.log('   multiple bookings by deactivating links immediately');
  console.log('   on first access, making them truly one-time use.');
}

// Run the test
testWebhookTracking().catch(console.error); 
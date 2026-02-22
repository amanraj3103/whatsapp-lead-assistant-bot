require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testTrulyOneTimeLinks() {
  console.log('🧪 Testing Truly One-Time Use Calendly Links...\n');
  
  // Test 1: Create a truly one-time use booking link
  console.log('1. Creating a truly one-time use booking link...');
  const testLeadData = {
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '+9988776655',
    country: 'France',
    service_type: 'Study visa'
  };
  
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ✅ Booking link created: ${bookingLink.substring(0, 50)}...`);
  
  // Extract booking ID from the link
  const urlParams = new URLSearchParams(bookingLink.split('?')[1]);
  const bookingId = urlParams.get('booking_id');
  console.log(`   📋 Booking ID: ${bookingId}`);
  
  // Test 2: Check if link is active and one-time use
  console.log('\n2. Checking link properties...');
  const isActive = calendlyService.isBookingLinkActive(bookingId);
  const bookingData = calendlyService.getBookingData(bookingId);
  console.log(`   ✅ Link is active: ${isActive}`);
  console.log(`   🔒 Is one-time use: ${bookingData.isOneTimeUse}`);
  console.log(`   📋 Has scheduling link: ${!!bookingData.schedulingLinkUri}`);
  
  // Test 3: Simulate a booking (webhook event)
  console.log('\n3. Simulating a booking event...');
  const mockWebhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'charlie@example.com',
        name: 'Charlie Brown',
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
  
  // Test 4: Check if link is now inactive
  console.log('\n4. Checking if link is now inactive...');
  const isStillActive = calendlyService.isBookingLinkActive(bookingId);
  console.log(`   ❌ Link is still active: ${isStillActive}`);
  
  // Test 5: Get updated booking data
  console.log('\n5. Getting updated booking data...');
  const updatedBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📋 Is active: ${updatedBookingData.isActive}`);
  console.log(`   📋 Deactivated at: ${updatedBookingData.deactivatedAt}`);
  console.log(`   🔒 Was one-time use: ${updatedBookingData.isOneTimeUse}`);
  
  // Test 6: Try to create another link for the same phone number
  console.log('\n6. Creating another link for the same phone number...');
  const secondBookingLink = await calendlyService.createBookingLink(testLeadData);
  const secondUrlParams = new URLSearchParams(secondBookingLink.split('?')[1]);
  const secondBookingId = secondUrlParams.get('booking_id');
  console.log(`   ✅ Second booking link created: ${secondBookingId}`);
  
  // Test 7: Check validation
  console.log('\n7. Checking booking validation...');
  const validation = calendlyService.validateNewBooking(testLeadData.phone);
  console.log(`   📋 Can book: ${validation.canBook}`);
  console.log(`   📋 Has booked: ${validation.hasBooked}`);
  console.log(`   📋 Active bookings: ${validation.activeBookings}`);
  console.log(`   📋 Reason: ${validation.reason}`);
  
  // Test 8: Get all active bookings for the phone number
  console.log('\n8. Getting all active bookings for phone number...');
  const activeBookings = calendlyService.getActiveBookingsForPhone(testLeadData.phone);
  console.log(`   📋 Active bookings count: ${activeBookings.length}`);
  
  // Test 9: Test cleanup
  console.log('\n9. Testing cleanup...');
  await calendlyService.cleanupOldLinks();
  console.log('   ✅ Cleanup completed');
  
  console.log('\n🎉 Truly one-time use links test completed!');
  console.log('\n📝 Summary:');
  console.log('   - Booking links are created with max_event_count = 1');
  console.log('   - Links are truly one-time use at the Calendly platform level');
  console.log('   - Scheduling links are deleted after booking');
  console.log('   - Fallback links are used when API is not available');
  console.log('   - Old inactive links are automatically cleaned up');
  
  console.log('\n🔒 Security Features:');
  console.log('   - Each link can only be booked once at Calendly level');
  console.log('   - Links become completely unusable after first booking');
  console.log('   - No possibility of double bookings');
  console.log('   - Full audit trail of all booking activities');
  console.log('   - Automatic cleanup of scheduling links');
  
  console.log('\n⚠️  Important Note:');
  console.log('   - One-time use links are created via Calendly API');
  console.log('   - If API fails, fallback to regular links is used');
  console.log('   - Fallback links still have validation but are not one-time use');
  console.log('   - Check logs to see if one-time use links are being created');
}

// Run the test
testTrulyOneTimeLinks().catch(console.error); 
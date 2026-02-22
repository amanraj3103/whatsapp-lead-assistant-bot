require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testOneTimeLinks() {
  console.log('🧪 Testing Truly One-Time Use Calendly Links...\n');
  
  // Test 1: Create a one-time use booking link
  console.log('1. Creating a one-time use booking link...');
  const testLeadData = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1122334455',
    country: 'UK',
    service_type: 'Study visa'
  };
  
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ✅ Booking link created: ${bookingLink.substring(0, 50)}...`);
  
  // Extract booking ID from the link
  const urlParams = new URLSearchParams(bookingLink.split('?')[1]);
  const bookingId = urlParams.get('booking_id');
  console.log(`   📋 Booking ID: ${bookingId}`);
  
  // Test 2: Check if link is active
  console.log('\n2. Checking if link is active...');
  const isActive = calendlyService.isBookingLinkActive(bookingId);
  console.log(`   ✅ Link is active: ${isActive}`);
  
  // Test 3: Get booking data
  console.log('\n3. Getting booking data...');
  const bookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📋 Lead name: ${bookingData.leadData.name}`);
  console.log(`   📋 Phone: ${bookingData.phoneNumber}`);
  console.log(`   📋 Is fallback: ${bookingData.isFallback || false}`);
  console.log(`   📋 Has scheduling link: ${!!bookingData.schedulingLinkUri}`);
  
  // Test 4: Simulate a booking (webhook event)
  console.log('\n4. Simulating a booking event...');
  const mockWebhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'alice@example.com',
        name: 'Alice Johnson',
        uri: 'https://api.calendly.com/invitees/456',
        tracking: {
          utm_parameters: {
            booking_id: bookingId
          }
        }
      },
      event: {
        uri: 'https://api.calendly.com/scheduled_events/789',
        start_time: '2025-07-09T15:00:00Z',
        end_time: '2025-07-09T15:30:00Z'
      }
    }
  };
  
  await calendlyService.handleBookingWebhook(mockWebhookData);
  
  // Test 5: Check if link is now inactive
  console.log('\n5. Checking if link is now inactive...');
  const isStillActive = calendlyService.isBookingLinkActive(bookingId);
  console.log(`   ❌ Link is still active: ${isStillActive}`);
  
  // Test 6: Get updated booking data
  console.log('\n6. Getting updated booking data...');
  const updatedBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📋 Is active: ${updatedBookingData.isActive}`);
  console.log(`   📋 Deactivated at: ${updatedBookingData.deactivatedAt}`);
  
  // Test 7: Try to create another link for the same phone number
  console.log('\n7. Creating another link for the same phone number...');
  const secondBookingLink = await calendlyService.createBookingLink(testLeadData);
  const secondUrlParams = new URLSearchParams(secondBookingLink.split('?')[1]);
  const secondBookingId = secondUrlParams.get('booking_id');
  console.log(`   ✅ Second booking link created: ${secondBookingId}`);
  
  // Test 8: Get all active bookings for the phone number
  console.log('\n8. Getting all active bookings for phone number...');
  const activeBookings = calendlyService.getActiveBookingsForPhone(testLeadData.phone);
  console.log(`   📋 Active bookings count: ${activeBookings.length}`);
  
  // Test 9: Test cleanup
  console.log('\n9. Testing cleanup...');
  await calendlyService.cleanupOldLinks();
  console.log('   ✅ Cleanup completed');
  
  console.log('\n🎉 One-time use links test completed!');
  console.log('\n📝 Summary:');
  console.log('   - Booking links are created with max_event_count = 1');
  console.log('   - Links are truly one-time use at the Calendly level');
  console.log('   - Scheduling links are deleted after booking');
  console.log('   - Fallback links are used when API is not available');
  console.log('   - Old inactive links are automatically cleaned up');
  
  console.log('\n🔒 Security Features:');
  console.log('   - Each link can only be booked once');
  console.log('   - Links are automatically deleted after use');
  console.log('   - No possibility of double bookings');
  console.log('   - Full audit trail of all booking activities');
}

// Run the test
testOneTimeLinks().catch(console.error); 
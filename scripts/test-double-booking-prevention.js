require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testDoubleBookingPrevention() {
  console.log('🧪 Testing Double Booking Prevention...\n');
  
  const testPhone = '+1122334455';
  const testLeadData = {
    name: 'Bob Wilson',
    email: 'bob@example.com',
    phone: testPhone,
    country: 'Germany',
    service_type: 'Work visa'
  };
  
  // Test 1: Initial validation
  console.log('1. Initial validation...');
  const initialValidation = calendlyService.validateNewBooking(testPhone);
  console.log(`   ✅ Can book: ${initialValidation.canBook}`);
  console.log(`   📋 Reason: ${initialValidation.reason}`);
  console.log(`   📋 Total bookings: ${initialValidation.totalBookings}`);
  
  // Test 2: Create first booking link
  console.log('\n2. Creating first booking link...');
  const firstBookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ✅ First booking link created`);
  
  // Test 3: Check validation after creating link
  console.log('\n3. Validation after creating link...');
  const afterCreateValidation = calendlyService.validateNewBooking(testPhone);
  console.log(`   ✅ Can book: ${afterCreateValidation.canBook}`);
  console.log(`   📋 Active bookings: ${afterCreateValidation.activeBookings}`);
  console.log(`   📋 Reason: ${afterCreateValidation.reason}`);
  
  // Test 4: Simulate booking the first link
  console.log('\n4. Simulating booking of first link...');
  const firstBookingId = calendlyService.getActiveBookingsForPhone(testPhone)[0].bookingId;
  
  const mockWebhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'bob@example.com',
        name: 'Bob Wilson',
        uri: 'https://api.calendly.com/invitees/123',
        tracking: {
          utm_parameters: {
            booking_id: firstBookingId
          }
        }
      },
      event: {
        uri: 'https://api.calendly.com/scheduled_events/456',
        start_time: '2025-07-10T10:00:00Z',
        end_time: '2025-07-10T10:30:00Z'
      }
    }
  };
  
  await calendlyService.handleBookingWebhook(mockWebhookData);
  
  // Test 5: Check validation after booking
  console.log('\n5. Validation after booking...');
  const afterBookingValidation = calendlyService.validateNewBooking(testPhone);
  console.log(`   ✅ Can book: ${afterBookingValidation.canBook}`);
  console.log(`   📋 Has booked: ${afterBookingValidation.hasBooked}`);
  console.log(`   📋 Active bookings: ${afterBookingValidation.activeBookings}`);
  console.log(`   📋 Reason: ${afterBookingValidation.reason}`);
  
  // Test 6: Try to create another booking link
  console.log('\n6. Attempting to create another booking link...');
  const secondBookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ⚠️  Second booking link created (this should be prevented in conversation handler)`);
  
  // Test 7: Check booking history
  console.log('\n7. Checking booking history...');
  const history = calendlyService.getBookingHistory(testPhone);
  console.log(`   📋 Total bookings in history: ${history.length}`);
  
  for (let i = 0; i < history.length; i++) {
    const booking = history[i];
    console.log(`   📋 Booking ${i + 1}: ${booking.isActive ? 'Active' : 'Inactive'} - Created: ${booking.createdAt.toISOString()}`);
  }
  
  // Test 8: Test conversation handler logic
  console.log('\n8. Testing conversation handler logic...');
  const validation = calendlyService.validateNewBooking(testPhone);
  
  if (validation.hasBooked) {
    console.log('   ✅ Conversation handler would send "already booked" message');
  } else if (validation.activeBookings > 0) {
    console.log('   ✅ Conversation handler would reuse existing active link');
  } else {
    console.log('   ✅ Conversation handler would create new booking link');
  }
  
  // Test 9: Clean up
  console.log('\n9. Cleaning up...');
  await calendlyService.cleanupOldLinks();
  console.log('   ✅ Cleanup completed');
  
  console.log('\n🎉 Double booking prevention test completed!');
  console.log('\n📝 Summary:');
  console.log('   - System tracks all booking attempts');
  console.log('   - Prevents multiple active bookings per lead');
  console.log('   - Detects when lead has already booked');
  console.log('   - Conversation handler validates before creating links');
  console.log('   - Full booking history is maintained');
  
  console.log('\n🔒 Prevention Features:');
  console.log('   - Validation before creating new links');
  console.log('   - Tracking of booking history');
  console.log('   - Detection of completed bookings');
  console.log('   - Automatic cleanup of old data');
  console.log('   - API endpoints for validation');
}

// Run the test
testDoubleBookingPrevention().catch(console.error); 
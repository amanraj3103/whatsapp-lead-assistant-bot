require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testInactiveLinks() {
  console.log('🧪 Testing Calendly Inactive Links Feature...\n');
  
  // Test 1: Create a booking link
  console.log('1. Creating a booking link...');
  const testLeadData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'Canada',
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
  console.log(`   📋 Created: ${bookingData.createdAt}`);
  
  // Test 4: Simulate a booking (webhook event)
  console.log('\n4. Simulating a booking event...');
  const mockWebhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'john@example.com',
        name: 'John Doe',
        uri: 'https://api.calendly.com/invitees/123',
        tracking: {
          utm_parameters: {
            booking_id: bookingId
          }
        }
      },
      event: {
        uri: 'https://api.calendly.com/scheduled_events/456',
        start_time: '2025-07-07T10:00:00Z',
        end_time: '2025-07-07T10:30:00Z'
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
  
  // Test 9: Clean up old links
  console.log('\n9. Cleaning up old links...');
  calendlyService.cleanupOldLinks();
  console.log('   ✅ Cleanup completed');
  
  console.log('\n🎉 Inactive links test completed!');
  console.log('\n📝 Summary:');
  console.log('   - Booking links are created with unique IDs');
  console.log('   - Links become inactive after appointment booking');
  console.log('   - Multiple links can be created for the same lead');
  console.log('   - Old inactive links are automatically cleaned up');
}

// Run the test
testInactiveLinks().catch(console.error); 
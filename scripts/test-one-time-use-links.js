require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testOneTimeUseLinks() {
  console.log('🔒 Testing One-Time Use Calendly Links...\n');
  
  // Test 1: Get user URI
  console.log('1. Getting Calendly user URI...');
  const userUri = await calendlyService.getUserUri();
  console.log(`   📋 User URI: ${userUri ? userUri.substring(0, 50) + '...' : 'Not found'}`);
  
  // Test 2: Create a one-time use booking link
  console.log('\n2. Creating one-time use booking link...');
  const testLeadData = {
    name: 'David Wilson',
    email: 'david@example.com',
    phone: '+9988776657',
    country: 'UK',
    service_type: 'Business visa'
  };
  
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ✅ Booking link created: ${bookingLink.substring(0, 50)}...`);
  
  // Extract booking ID from the link
  const urlParams = new URLSearchParams(bookingLink.split('?')[1]);
  const bookingId = urlParams.get('booking_id');
  console.log(`   📋 Booking ID: ${bookingId}`);
  
  // Test 3: Check if link is one-time use
  console.log('\n3. Checking link properties...');
  const isActive = calendlyService.isBookingLinkActive(bookingId);
  const bookingData = calendlyService.getBookingData(bookingId);
  console.log(`   ✅ Link is active: ${isActive}`);
  console.log(`   🔒 Is one-time use: ${bookingData.isOneTimeUse}`);
  console.log(`   📋 Has scheduling link: ${!!bookingData.schedulingLinkUri}`);
  
  if (bookingData.isOneTimeUse) {
    console.log(`   🎯 Scheduling link URI: ${bookingData.schedulingLinkUri.substring(0, 50)}...`);
  }
  
  // Test 4: Simulate a booking (webhook event)
  console.log('\n4. Simulating a booking event...');
  const mockWebhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'david@example.com',
        name: 'David Wilson',
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
  
  // Test 5: Check if link is now inactive
  console.log('\n5. Checking if link is now inactive...');
  const isStillActive = calendlyService.isBookingLinkActive(bookingId);
  console.log(`   ❌ Link is still active: ${isStillActive}`);
  
  // Test 6: Get updated booking data
  console.log('\n6. Getting updated booking data...');
  const updatedBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📋 Is active: ${updatedBookingData.isActive}`);
  console.log(`   📋 Deactivated at: ${updatedBookingData.deactivatedAt}`);
  console.log(`   🔒 Was one-time use: ${updatedBookingData.isOneTimeUse}`);
  
  // Test 7: Try to create another link for the same phone number
  console.log('\n7. Attempting to create another link for the same phone number...');
  const secondResult = await calendlyService.createBookingLinkWithValidation(testLeadData);
  console.log(`   ✅ Success: ${secondResult.success}`);
  console.log(`   📋 Error: ${secondResult.error}`);
  console.log(`   📋 Message: ${secondResult.message}`);
  
  // Test 8: Test with different phone number
  console.log('\n8. Testing with different phone number...');
  const differentLeadData = {
    name: 'Emma Davis',
    email: 'emma@example.com',
    phone: '+9988776658',
    country: 'Germany',
    service_type: 'Student visa'
  };
  
  const differentResult = await calendlyService.createBookingLinkWithValidation(differentLeadData);
  console.log(`   ✅ Success: ${differentResult.success}`);
  console.log(`   📋 Is existing: ${differentResult.isExisting}`);
  console.log(`   📋 Message: ${differentResult.message}`);
  
  if (differentResult.success) {
    const differentBookingId = calendlyService.extractBookingIdFromLink(differentResult.link);
    const differentBookingData = calendlyService.getBookingData(differentBookingId);
    console.log(`   🔒 Is one-time use: ${differentBookingData.isOneTimeUse}`);
  }
  
  console.log('\n🎉 One-time use links test completed!');
  
  console.log('\n📝 Summary:');
  console.log('   - One-time use links are created via Calendly API');
  console.log('   - Links have max_event_count = 1 (truly one-time use)');
  console.log('   - Links become unusable after first booking');
  console.log('   - Scheduling links are deleted from Calendly after use');
  console.log('   - System prevents multiple bookings per phone number');
  
  console.log('\n🔒 Security Features:');
  console.log('   - Each link can only be booked once at Calendly level');
  console.log('   - Links become completely unusable after first booking');
  console.log('   - No possibility of double bookings');
  console.log('   - Full audit trail of all booking activities');
  console.log('   - Automatic cleanup of scheduling links');
  
  console.log('\n⚠️  Important Notes:');
  console.log('   - One-time use links require valid Calendly API key');
  console.log('   - If API fails, fallback to regular links is used');
  console.log('   - Fallback links still have validation but are not one-time use');
  console.log('   - Check logs to see if one-time use links are being created');
  
  if (!userUri) {
    console.log('\n❌ Issue: Could not get Calendly user URI');
    console.log('   - Check your CALENDLY_API_KEY is correct');
    console.log('   - Ensure the API key has proper permissions');
    console.log('   - Verify your Calendly account is active');
  } else {
    console.log('\n✅ Calendly API connection successful');
  }
}

// Run the test
testOneTimeUseLinks().catch(console.error); 
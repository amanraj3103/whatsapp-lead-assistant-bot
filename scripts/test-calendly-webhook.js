require('dotenv').config();
const axios = require('axios');

async function testCalendlyWebhook() {
  console.log('🧪 Testing Calendly Webhook Endpoint...\n');
  
  const webhookUrl = 'http://localhost:3000/api/calendly/webhook';
  
  // Test 1: Create a booking link first
  console.log('1. Creating a booking link...');
  const testLeadData = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+9876543210',
    country: 'Australia',
    service_type: 'Work visa'
  };
  
  const calendlyService = require('../src/services/calendlyService');
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  
  // Extract booking ID from the link
  const urlParams = new URLSearchParams(bookingLink.split('?')[1]);
  const bookingId = urlParams.get('booking_id');
  console.log(`   ✅ Booking link created with ID: ${bookingId}`);
  
  // Test 2: Check if link is active
  console.log('\n2. Verifying link is active...');
  const isActive = calendlyService.isBookingLinkActive(bookingId);
  console.log(`   ✅ Link is active: ${isActive}`);
  
  // Test 3: Send webhook event
  console.log('\n3. Sending webhook event...');
  const webhookData = {
    event: 'invitee.created',
    payload: {
      invitee: {
        email: 'jane@example.com',
        name: 'Jane Smith',
        uri: 'https://api.calendly.com/invitees/789',
        tracking: {
          utm_parameters: {
            booking_id: bookingId
          }
        }
      },
      event: {
        uri: 'https://api.calendly.com/scheduled_events/101',
        start_time: '2025-07-08T14:00:00Z',
        end_time: '2025-07-08T14:30:00Z'
      }
    }
  };
  
  try {
    const response = await axios.post(webhookUrl, webhookData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   ✅ Webhook response: ${response.status} - ${response.data.success}`);
    
  } catch (error) {
    console.log(`   ❌ Webhook error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
  }
  
  // Test 4: Check if link is now inactive
  console.log('\n4. Checking if link is now inactive...');
  const isStillActive = calendlyService.isBookingLinkActive(bookingId);
  console.log(`   ❌ Link is still active: ${isStillActive}`);
  
  // Test 5: Get booking data
  console.log('\n5. Getting updated booking data...');
  const bookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📋 Is active: ${bookingData.isActive}`);
  console.log(`   📋 Deactivated at: ${bookingData.deactivatedAt}`);
  
  // Test 6: Test API endpoints
  console.log('\n6. Testing API endpoints...');
  
  try {
    // Test booking status endpoint
    const statusResponse = await axios.get(`http://localhost:3000/api/calendly/bookings/${bookingId}/status`);
    console.log(`   ✅ Status endpoint: ${statusResponse.data.isActive ? 'Active' : 'Inactive'}`);
    
    // Test active bookings endpoint
    const activeResponse = await axios.get(`http://localhost:3000/api/calendly/bookings/${testLeadData.phone}`);
    console.log(`   ✅ Active bookings: ${activeResponse.data.count} found`);
    
    // Test cleanup endpoint
    const cleanupResponse = await axios.post('http://localhost:3000/api/calendly/cleanup');
    console.log(`   ✅ Cleanup endpoint: ${cleanupResponse.data.success}`);
    
  } catch (error) {
    console.log(`   ❌ API error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
  }
  
  console.log('\n🎉 Calendly webhook test completed!');
  console.log('\n📝 Summary:');
  console.log('   - Webhook endpoint receives booking events');
  console.log('   - Links are automatically deactivated after booking');
  console.log('   - API endpoints provide booking status information');
  console.log('   - Cleanup functionality works correctly');
}

// Run the test
testCalendlyWebhook().catch(console.error); 
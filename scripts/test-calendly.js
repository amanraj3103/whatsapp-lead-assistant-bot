require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testCalendly() {
  console.log('🧪 Testing Calendly Integration...\n');
  
  // Test 1: Check configuration
  console.log('1. Checking Calendly configuration...');
  const isConfigured = calendlyService.isConfigured();
  console.log(`   ✅ Calendly configured: ${isConfigured}`);
  
  if (!isConfigured) {
    console.log('   ❌ Calendly not properly configured. Check your .env file.');
    console.log('   Required: CALENDLY_API_KEY and CALENDLY_EVENT_TYPE_URI');
    return;
  }
  
  // Test 2: Test creating a booking link
  console.log('\n2. Testing booking link creation...');
  try {
    const testLeadData = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'Canada',
      service_type: 'Study visa'
    };
    
    const bookingLink = await calendlyService.createBookingLink(testLeadData);
    console.log(`   ✅ Booking link created: ${bookingLink.substring(0, 50)}...`);
    
    // Test 3: Test message formatting
    console.log('\n3. Testing message formatting...');
    const formattedMessage = calendlyService.formatBookingMessage(bookingLink, testLeadData);
    console.log(`   ✅ Message formatted (${formattedMessage.length} characters)`);
    console.log('\n   📝 Sample message:');
    console.log('   ' + formattedMessage.split('\n').join('\n   '));
    
  } catch (error) {
    console.log(`   ❌ Error creating booking link: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('   💡 This might be an authentication issue. Check your API key.');
    } else if (error.message.includes('404')) {
      console.log('   💡 This might be an event type URI issue. Check your CALENDLY_EVENT_TYPE_URI.');
    }
  }
  
  // Test 4: Test getting event types
  console.log('\n4. Testing event types retrieval...');
  try {
    const eventTypes = await calendlyService.getEventTypes();
    console.log(`   ✅ Found ${eventTypes.length} event types`);
    
    if (eventTypes.length > 0) {
      console.log('   📋 Available event types:');
      eventTypes.forEach((eventType, index) => {
        console.log(`      ${index + 1}. ${eventType.name} (${eventType.uri})`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error getting event types: ${error.message}`);
  }
  
  console.log('\n🎉 Calendly test completed!');
}

// Run the test
testCalendly().catch(console.error); 
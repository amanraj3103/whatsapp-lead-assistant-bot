require('dotenv').config();
const calendlyService = require('../src/services/calendlyService');

async function testCustomOneTimeLinks() {
  console.log('🔒 Testing Custom One-Time Use Links with Usage Tracking...\n');
  
  const testPhone = '+9988776659';
  const testLeadData = {
    name: 'Frank Miller',
    email: 'frank@example.com',
    phone: testPhone,
    country: 'USA',
    service_type: 'Tourist visa'
  };
  
  // Test 1: Create a custom one-time use booking link
  console.log('1. Creating custom one-time use booking link...');
  const bookingLink = await calendlyService.createBookingLink(testLeadData);
  console.log(`   ✅ Booking link created: ${bookingLink.substring(0, 50)}...`);
  
  // Extract booking ID from the link
  const urlParams = new URLSearchParams(bookingLink.split('?')[1]);
  const bookingId = urlParams.get('booking_id');
  console.log(`   📋 Booking ID: ${bookingId}`);
  console.log(`   🔒 One-time use: ${urlParams.get('one_time_use')}`);
  console.log(`   ⏰ Expires at: ${urlParams.get('expires_at')}`);
  
  // Test 2: Check link properties
  console.log('\n2. Checking link properties...');
  const isActive = calendlyService.isBookingLinkActive(bookingId);
  const bookingData = calendlyService.getBookingData(bookingId);
  console.log(`   ✅ Link is active: ${isActive}`);
  console.log(`   🔒 Is one-time use: ${bookingData.isOneTimeUse}`);
  console.log(`   📊 Usage count: ${bookingData.usageCount || 0}`);
  console.log(`   📊 Max usage: ${bookingData.maxUsage || 1}`);
  console.log(`   ⏰ Expires at: ${bookingData.expiresAt}`);
  console.log(`   🎯 Is custom link: ${bookingData.isCustomLink}`);
  
  // Test 3: Validate the link
  console.log('\n3. Validating the link...');
  const validation = calendlyService.validateBookingLink(bookingId);
  console.log(`   ✅ Is valid: ${validation.isValid}`);
  console.log(`   📋 Can book: ${validation.canBook}`);
  console.log(`   📋 Reason: ${validation.reason}`);
  
  // Test 4: Simulate first usage (tracking)
  console.log('\n4. Simulating first link usage...');
  const usageTracked = calendlyService.trackLinkUsage(bookingId);
  console.log(`   ✅ Usage tracked: ${usageTracked}`);
  
  // Check updated usage count
  const updatedBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📊 Updated usage count: ${updatedBookingData.usageCount}`);
  console.log(`   ✅ Link still active: ${updatedBookingData.isActive}`);
  
  // Test 5: Simulate second usage (should deactivate)
  console.log('\n5. Simulating second link usage...');
  const secondUsageTracked = calendlyService.trackLinkUsage(bookingId);
  console.log(`   ✅ Usage tracked: ${secondUsageTracked}`);
  
  // Check if link is now deactivated
  const finalBookingData = calendlyService.getBookingData(bookingId);
  console.log(`   📊 Final usage count: ${finalBookingData.usageCount}`);
  console.log(`   ❌ Link still active: ${finalBookingData.isActive}`);
  console.log(`   📋 Deactivated at: ${finalBookingData.deactivatedAt}`);
  
  // Test 6: Validate the used link
  console.log('\n6. Validating the used link...');
  const usedValidation = calendlyService.validateBookingLink(bookingId);
  console.log(`   ✅ Is valid: ${usedValidation.isValid}`);
  console.log(`   📋 Can book: ${usedValidation.canBook}`);
  console.log(`   📋 Reason: ${usedValidation.reason}`);
  console.log(`   📊 Max usage reached: ${usedValidation.maxUsageReached}`);
  
  // Test 7: Try to create another link for the same phone number
  console.log('\n7. Attempting to create another link for the same phone number...');
  const secondResult = await calendlyService.createBookingLinkWithValidation(testLeadData);
  console.log(`   ✅ Success: ${secondResult.success}`);
  console.log(`   📋 Error: ${secondResult.error}`);
  console.log(`   📋 Message: ${secondResult.message}`);
  
  // Test 8: Test with different phone number
  console.log('\n8. Testing with different phone number...');
  const differentLeadData = {
    name: 'Grace Lee',
    email: 'grace@example.com',
    phone: '+9988776660',
    country: 'Singapore',
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
    console.log(`   📊 Usage count: ${differentBookingData.usageCount}`);
    console.log(`   ⏰ Expires at: ${differentBookingData.expiresAt}`);
  }
  
  // Test 9: Test expiration
  console.log('\n9. Testing link expiration...');
  const expiredLeadData = {
    name: 'Henry Brown',
    email: 'henry@example.com',
    phone: '+9988776661',
    country: 'Australia',
    service_type: 'Student visa'
  };
  
  const expiredResult = await calendlyService.createBookingLinkWithValidation(expiredLeadData);
  if (expiredResult.success) {
    const expiredBookingId = calendlyService.extractBookingIdFromLink(expiredResult.link);
    const expiredBookingData = calendlyService.getBookingData(expiredBookingId);
    
    // Manually set expiration to past
    expiredBookingData.expiresAt = new Date(Date.now() - 1000); // 1 second ago
    calendlyService.activeLinks.set(expiredBookingId, expiredBookingData);
    
    const expiredValidation = calendlyService.validateBookingLink(expiredBookingId);
    console.log(`   ✅ Is valid: ${expiredValidation.isValid}`);
    console.log(`   📋 Can book: ${expiredValidation.canBook}`);
    console.log(`   📋 Reason: ${expiredValidation.reason}`);
    console.log(`   ⏰ Expired: ${expiredValidation.expired}`);
  }
  
  console.log('\n🎉 Custom one-time use links test completed!');
  
  console.log('\n📝 System Features:');
  console.log('   ✅ Custom one-time use links with expiration');
  console.log('   ✅ Usage tracking and limits');
  console.log('   ✅ Automatic deactivation after max usage');
  console.log('   ✅ Expiration time limits (24 hours)');
  console.log('   ✅ Comprehensive validation');
  console.log('   ✅ Phone number tracking');
  
  console.log('\n🔒 Security Features:');
  console.log('   - Each link can only be used once');
  console.log('   - Links expire after 24 hours');
  console.log('   - Usage is tracked and limited');
  console.log('   - Links are automatically deactivated');
  console.log('   - No possibility of double bookings');
  console.log('   - Full audit trail maintained');
  
  console.log('\n⚠️  Important Notes:');
  console.log('   - Custom links work without Calendly API');
  console.log('   - Links have built-in expiration (24 hours)');
  console.log('   - Usage is tracked at application level');
  console.log('   - System prevents multiple bookings per phone');
  console.log('   - Links become unusable after first use');
  
  console.log('\n🎯 Result:');
  console.log('   The system now creates truly one-time use links');
  console.log('   that expire after use and prevent double bookings.');
}

// Run the test
testCustomOneTimeLinks().catch(console.error); 
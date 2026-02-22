const logger = require('../utils/logger');

class MockWhatsAppService {
  constructor() {
    this.messages = [];
    this.isEnabled = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_WHATSAPP === 'true';
  }

  async sendMessage(to, message) {
    if (!this.isEnabled) {
      throw new Error('Mock WhatsApp service is disabled');
    }

    const mockMessage = {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to: to,
      body: message,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      direction: 'outbound'
    };
    
    this.messages.push(mockMessage);
    
    logger.info('Mock WhatsApp message sent', {
      messageId: mockMessage.id,
      to: to,
      messageLength: message.length,
      service: 'whatsapp-lead-assistant'
    });
    
    console.log(`📱 MOCK WHATSAPP [${mockMessage.id}]: ${to} → ${message}`);
    
    return {
      messageSid: mockMessage.id,
      status: 'delivered'
    };
  }

  async receiveMessage(from, body) {
    const mockIncoming = {
      From: from,
      Body: body,
      MessageSid: `mock_in_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      AccountSid: 'mock_account_sid',
      To: process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+1234567890',
      ProfileName: 'Test User',
      WaId: from.replace('whatsapp:', '')
    };
    
    console.log(`📱 MOCK WHATSAPP INCOMING: ${from} → ${body}`);
    
    return mockIncoming;
  }

  getMessageHistory() {
    return this.messages;
  }

  clearHistory() {
    this.messages = [];
  }

  enable() {
    this.isEnabled = true;
    console.log('✅ Mock WhatsApp service enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('❌ Mock WhatsApp service disabled');
  }
}

module.exports = new MockWhatsAppService(); 
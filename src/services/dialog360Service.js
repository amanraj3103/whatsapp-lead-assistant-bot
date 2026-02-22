const axios = require('axios');
const logger = require('../utils/logger');

class Dialog360Service {
  constructor() {
    this.apiKey = process.env.DIALOG360_API_KEY;
    this.baseURL = 'https://waba-api.360dialog.io/v1';
    this.phoneNumberId = process.env.DIALOG360_PHONE_NUMBER_ID;
    
    if (!this.apiKey) {
      logger.warn('Dialog360 API key not configured', {
        service: 'whatsapp-lead-assistant'
      });
    }
  }

  async sendMessage(to, message, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Dialog360 API key not configured');
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace('whatsapp:', ''),
        type: 'text',
        text: {
          body: message
        }
      };

      // Add reply_to if provided
      if (options.replyTo) {
        payload.context = {
          message_id: options.replyTo
        };
      }

      const response = await axios.post(
        `${this.baseURL}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Dialog360 message sent successfully', {
        messageId: response.data.messages[0].id,
        to: to,
        messageLength: message.length,
        service: 'whatsapp-lead-assistant'
      });

      return {
        messageSid: response.data.messages[0].id,
        status: 'sent'
      };

    } catch (error) {
      logger.error('Error sending Dialog360 message', {
        error: error.response?.data || error.message,
        to: to,
        messageLength: message.length,
        service: 'whatsapp-lead-assistant'
      });

      throw new Error(`Dialog360 API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async sendTemplateMessage(to, templateName, language = 'en', components = []) {
    try {
      if (!this.apiKey) {
        throw new Error('Dialog360 API key not configured');
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace('whatsapp:', ''),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          }
        }
      };

      if (components.length > 0) {
        payload.template.components = components;
      }

      const response = await axios.post(
        `${this.baseURL}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Dialog360 template message sent successfully', {
        messageId: response.data.messages[0].id,
        templateName: templateName,
        to: to,
        service: 'whatsapp-lead-assistant'
      });

      return {
        messageSid: response.data.messages[0].id,
        status: 'sent'
      };

    } catch (error) {
      logger.error('Error sending Dialog360 template message', {
        error: error.response?.data || error.message,
        templateName: templateName,
        to: to,
        service: 'whatsapp-lead-assistant'
      });

      throw new Error(`Dialog360 template error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async sendMediaMessage(to, mediaUrl, mediaType = 'image', caption = '') {
    try {
      if (!this.apiKey) {
        throw new Error('Dialog360 API key not configured');
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace('whatsapp:', ''),
        type: mediaType,
        [mediaType]: {
          link: mediaUrl
        }
      };

      if (caption && mediaType === 'image') {
        payload[mediaType].caption = caption;
      }

      const response = await axios.post(
        `${this.baseURL}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Dialog360 media message sent successfully', {
        messageId: response.data.messages[0].id,
        mediaType: mediaType,
        to: to,
        service: 'whatsapp-lead-assistant'
      });

      return {
        messageSid: response.data.messages[0].id,
        status: 'sent'
      };

    } catch (error) {
      logger.error('Error sending Dialog360 media message', {
        error: error.response?.data || error.message,
        mediaType: mediaType,
        to: to,
        service: 'whatsapp-lead-assistant'
      });

      throw new Error(`Dialog360 media error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getMessageStatus(messageId) {
    try {
      if (!this.apiKey) {
        throw new Error('Dialog360 API key not configured');
      }

      const response = await axios.get(
        `${this.baseURL}/messages/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Error getting Dialog360 message status', {
        error: error.response?.data || error.message,
        messageId: messageId,
        service: 'whatsapp-lead-assistant'
      });

      throw new Error(`Dialog360 status error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getPhoneNumbers() {
    try {
      if (!this.apiKey) {
        throw new Error('Dialog360 API key not configured');
      }

      const response = await axios.get(
        `${this.baseURL}/phone_numbers`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data.data;

    } catch (error) {
      logger.error('Error getting Dialog360 phone numbers', {
        error: error.response?.data || error.message,
        service: 'whatsapp-lead-assistant'
      });

      throw new Error(`Dialog360 phone numbers error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  verifyWebhookSignature(signature, body, url) {
    // Dialog360 uses HMAC-SHA256 for webhook verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.apiKey)
      .update(body)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  isConfigured() {
    return !!this.apiKey;
  }
}

module.exports = new Dialog360Service(); 
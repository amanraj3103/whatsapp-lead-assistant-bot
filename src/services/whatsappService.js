const twilio = require('twilio');
const logger = require('../utils/logger');
const dialog360Service = require('./dialog360Service');

class WhatsAppService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'twilio';
    
    // Initialize Twilio client if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    
    // Check Dialog360 configuration
    if (dialog360Service.isConfigured()) {
      logger.info('Dialog360 WhatsApp service configured', {
        service: 'whatsapp-lead-assistant'
      });
    }
    
    logger.info(`WhatsApp service initialized with provider: ${this.provider}`, {
      service: 'whatsapp-lead-assistant'
    });
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code)
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendMessage(to, message, options = {}) {
    try {
      // Try Dialog360 first if configured
      if (dialog360Service.isConfigured() && (this.provider === 'dialog360' || this.provider === 'auto')) {
        return await this.sendViaDialog360(to, message, options);
      }
      
      // Fallback to Twilio
      if (this.twilioClient) {
        return await this.sendViaTwilio(to, message, options);
      }
      
      throw new Error('No WhatsApp provider configured');
      
    } catch (error) {
      logger.error('Error sending WhatsApp message', {
        error: error.message,
        to: to,
        messageLength: message.length,
        provider: this.provider,
        service: 'whatsapp-lead-assistant'
      });
      
      throw error;
    }
  }

  async sendViaDialog360(to, message, options = {}) {
    try {
      const result = await dialog360Service.sendMessage(to, message, options);
      
      logger.info('WhatsApp message sent via Dialog360', {
        messageSid: result.messageSid,
        to: to,
        messageLength: message.length,
        service: 'whatsapp-lead-assistant'
      });
      
      return result;
      
    } catch (error) {
      logger.error('Dialog360 message failed, falling back to Twilio', {
        error: error.message,
        to: to,
        service: 'whatsapp-lead-assistant'
      });
      
      // Fallback to Twilio if Dialog360 fails
      if (this.twilioClient) {
        return await this.sendViaTwilio(to, message, options);
      }
      
      throw error;
    }
  }

  async sendViaTwilio(to, message, options = {}) {
    try {
      const result = await this.twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
        body: message
      });
      
      logger.info('WhatsApp message sent via Twilio', {
        messageSid: result.sid,
        to: to,
        messageLength: message.length,
        service: 'whatsapp-lead-assistant'
      });
      
      return {
        messageSid: result.sid,
        status: result.status
      };
      
    } catch (error) {
      logger.error('Twilio message failed', {
        error: error.message,
        to: to,
        service: 'whatsapp-lead-assistant'
      });
      
      throw error;
    }
  }

  /**
   * Send a media message (image, document, etc.)
   * @param {string} to - Recipient phone number
   * @param {string} mediaUrl - URL of the media file
   * @param {string} caption - Optional caption
   * @param {string} mediaType - Type of media (image, document, etc.)
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendMediaMessage(to, mediaUrl, mediaType = 'image', caption = '') {
    try {
      if (dialog360Service.isConfigured() && (this.provider === 'dialog360' || this.provider === 'auto')) {
        return await dialog360Service.sendMediaMessage(to, mediaUrl, mediaType, caption);
      }
      
      // Twilio media support
      if (this.twilioClient) {
        const result = await this.twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: to,
          mediaUrl: [mediaUrl],
          body: caption || ''
        });
        
        return {
          messageSid: result.sid,
          status: result.status
        };
      }
      
      throw new Error('No media provider configured');
      
    } catch (error) {
      logger.error('Error sending media message', {
        error: error.message,
        to: to,
        mediaType: mediaType,
        service: 'whatsapp-lead-assistant'
      });
      
      throw error;
    }
  }

  /**
   * Send a template message (for business verification)
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Template name
   * @param {string} language - Language of the template
   * @param {Array} components - Template components
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendTemplateMessage(to, templateName, language = 'en', components = []) {
    try {
      if (dialog360Service.isConfigured() && (this.provider === 'dialog360' || this.provider === 'auto')) {
        return await dialog360Service.sendTemplateMessage(to, templateName, language, components);
      }
      
      throw new Error('Template messages only supported with Dialog360');
      
    } catch (error) {
      logger.error('Error sending template message', {
        error: error.message,
        to: to,
        templateName: templateName,
        service: 'whatsapp-lead-assistant'
      });
      
      throw error;
    }
  }

  /**
   * Verify webhook signature (for security)
   * @param {string} signature - Request signature
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @returns {boolean} - Whether signature is valid
   */
  verifyWebhookSignature(signature, url, body) {
    try {
      if (dialog360Service.isConfigured()) {
        return dialog360Service.verifyWebhookSignature(signature, body, url);
      }
      
      // Twilio signature verification
      if (this.twilioClient) {
        const twilio = require('twilio');
        return twilio.validateRequest(
          process.env.TWILIO_AUTH_TOKEN,
          signature,
          url,
          body
        );
      }
      
      return false;
      
    } catch (error) {
      logger.error('Error verifying webhook signature', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
      
      return false;
    }
  }

  /**
   * Get message status
   * @param {string} messageSid - Twilio message SID
   * @returns {Promise<Object>} - Message status object
   */
  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        direction: message.direction,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      logger.error('Error getting message status', {
        error: error.message,
        messageSid
      });
      throw error;
    }
  }

  getProvider() {
    return this.provider;
  }

  isConfigured() {
    return dialog360Service.isConfigured() || !!this.twilioClient;
  }

  async getPhoneNumbers() {
    try {
      if (dialog360Service.isConfigured()) {
        return await dialog360Service.getPhoneNumbers();
      }
      
      return [];
      
    } catch (error) {
      logger.error('Error getting phone numbers', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
      
      return [];
    }
  }

  /**
   * Format a booking message with the Calendly link
   * @param {string} bookingLink - The Calendly booking link
   * @param {Object} leadData - Lead information
   * @returns {string} - Formatted message
   */
  formatBookingMessage(bookingLink, leadData) {
    return `🎉 Your personalized booking link for ${leadData.name || 'consultation'} is ready!

📅 Book Your Consultation: ${bookingLink}

📋 Consultation Details:
• Name: ${leadData.name || 'Not provided'}
• Service: ${leadData.service_type || 'Visa consultation'}
• Country: ${leadData.country || 'Not specified'}
• Duration: 30 minutes

⚠️ IMPORTANT: This link can only be used once and will expire after 24 hours.

Looking forward to helping you with your ${leadData.service_type || 'visa'} application! 🚀

If you have any questions, please reply to this message.`;
  }

  /**
   * Send a Calendly booking link as a view-once document
   * @param {string} to - Recipient phone number
   * @param {string} bookingLink - The Calendly booking link
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} - Send result
   */
  async sendBookingLinkAsViewOnce(to, bookingLink, leadData) {
    try {
      // Create a temporary HTML document with the booking link
      const htmlContent = this.createBookingLinkDocument(bookingLink, leadData);
      
      // Create a temporary file
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, '../temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `booking_${Date.now()}.html`;
      const filePath = path.join(tempDir, fileName);
      
      // Write the HTML content to file
      fs.writeFileSync(filePath, htmlContent);
      
      // Send as view-once document
      const result = await this.sendViewOnceDocument(to, filePath, fileName, {
        ...leadData,
        bookingLink: bookingLink
      });
      
      // Clean up the temporary file after sending
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
          logger.info('Temporary booking document cleaned up', {
            filePath: filePath,
            service: 'whatsapp-lead-assistant'
          });
        } catch (error) {
          logger.warn('Could not clean up temporary file', {
            filePath: filePath,
            error: error.message,
            service: 'whatsapp-lead-assistant'
          });
        }
      }, 5000); // Clean up after 5 seconds
      
      return result;
    } catch (error) {
      logger.error('Error sending booking link as view-once document', {
        error: error.message,
        to: to,
        service: 'whatsapp-lead-assistant'
      });
      
      // Fallback to regular text message
      return this.sendMessage(to, this.formatBookingMessage(bookingLink, leadData));
    }
  }

  /**
   * Create an HTML document with the booking link
   * @param {string} bookingLink - The Calendly booking link
   * @param {Object} leadData - Lead information
   * @returns {string} - HTML content
   */
  createBookingLinkDocument(bookingLink, leadData) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Link - ${leadData.name || 'Lead'}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 2em;
            margin-bottom: 10px;
        }
        .title {
            font-size: 1.5em;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 1em;
            opacity: 0.9;
        }
        .booking-link {
            display: block;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 10px;
            text-align: center;
            font-size: 1.2em;
            font-weight: bold;
            margin: 20px 0;
            transition: all 0.3s ease;
        }
        .booking-link:hover {
            background: #45a049;
            transform: translateY(-2px);
        }
        .info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .info h3 {
            margin-top: 0;
            color: #FFD700;
        }
        .info ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .info li {
            margin: 5px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            opacity: 0.8;
            font-size: 0.9em;
        }
        .warning {
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid #FFC107;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .warning strong {
            color: #FFD700;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎉</div>
            <div class="title">Your Booking Link</div>
            <div class="subtitle">Personalized consultation for ${leadData.name || 'you'}</div>
        </div>
        
        <div class="warning">
            <strong>⚠️ IMPORTANT:</strong><br>
            This link can only be used once and will expire after 24 hours.
        </div>
        
        <a href="${bookingLink}" class="booking-link">
            📅 Book Your Consultation Now
        </a>
        
        <div class="info">
            <h3>📋 Consultation Details</h3>
            <ul>
                <li><strong>Name:</strong> ${leadData.name || 'Not provided'}</li>
                <li><strong>Service:</strong> ${leadData.service_type || 'Visa consultation'}</li>
                <li><strong>Country:</strong> ${leadData.country || 'Not specified'}</li>
                <li><strong>Duration:</strong> 30 minutes</li>
            </ul>
        </div>
        
        <div class="info">
            <h3>📅 Important Notes</h3>
            <ul>
                <li>This link can only be used once</li>
                <li>Please book your preferred time slot</li>
                <li>You'll receive a confirmation email</li>
                <li>We'll send you a reminder before the meeting</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Looking forward to helping you with your ${leadData.service_type || 'visa'} application! 🚀</p>
            <p>If you have any questions, please reply to this message.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Send a document as view-once message
   * @param {string} to - Recipient phone number
   * @param {string} filePath - Path to the file
   * @param {string} fileName - Name of the file
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} - Send result
   */
  async sendViewOnceDocument(to, filePath, fileName, leadData) {
    try {
      if (this.provider === 'twilio') {
        // For Twilio, we'll send a regular message with the booking link
        // since Twilio doesn't support base64 data URLs for media
        const bookingLink = leadData.bookingLink || 'https://calendly.com/test/consultation';
        
        const messageData = {
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${to}`,
          body: `🎉 Your personalized booking link for ${leadData.name || 'consultation'} is ready!

📅 Book Your Consultation: ${bookingLink}

📋 Consultation Details:
• Name: ${leadData.name || 'Not provided'}
• Service: ${leadData.service_type || 'Visa consultation'}
• Country: ${leadData.country || 'Not specified'}
• Duration: 30 minutes

⚠️ IMPORTANT: This link can only be used once and will expire after 24 hours.

Looking forward to helping you with your ${leadData.service_type || 'visa'} application! 🚀

If you have any questions, please reply to this message.`
        };
        
        const result = await this.twilioClient.messages.create(messageData);
        
        logger.info('Booking link sent as enhanced message via Twilio', {
          messageLength: messageData.body.length,
          messageSid: result.sid,
          service: 'whatsapp-lead-assistant',
          timestamp: new Date().toISOString(),
          to: `whatsapp:${to}`
        });
        
        return { messageSid: result.sid, status: result.status };
      } else if (this.provider === 'dialog360') {
        // Dialog360 implementation for view-once documents
        const fs = require('fs');
        const FormData = require('form-data');
        
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('to', to);
        form.append('type', 'document');
        form.append('document', fs.createReadStream(filePath), {
          filename: fileName,
          contentType: 'text/html'
        });
        form.append('caption', `🎉 Your personalized booking link for ${leadData.name || 'consultation'} is ready!\n\n📋 This document contains your one-time use booking link.\n\n⚠️ Important: This link can only be used once and will expire after 24 hours.`);
        
        const response = await dialog360Service.client.post('/messages', form, {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${process.env.DIALOG360_API_KEY}`
          }
        });
        
        logger.info('Booking link sent as view-once document via Dialog360', {
          messageId: response.data.messages[0].id,
          service: 'whatsapp-lead-assistant',
          timestamp: new Date().toISOString(),
          to: to
        });
        
        return { messageId: response.data.messages[0].id, status: 'sent' };
      } else {
        // Fallback to regular message
        return this.sendMessage(to, this.formatBookingMessage(bookingLink, leadData));
      }
    } catch (error) {
      logger.error('Error sending view-once document', {
        error: error.message,
        to: to,
        service: 'whatsapp-lead-assistant'
      });
      
      // Fallback to regular message
      return this.sendMessage(to, this.formatBookingMessage(bookingLink, leadData));
    }
  }
}

module.exports = new WhatsAppService(); 
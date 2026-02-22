const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const conversationHandler = require('../services/conversationHandler');
const whatsappService = require('../services/whatsappService');
const Joi = require('joi');

// Validation schema for incoming messages
const messageSchema = Joi.object({
  From: Joi.string().required(),
  Body: Joi.string().optional(),
  MessageSid: Joi.string().required(),
  AccountSid: Joi.string().optional(),
  To: Joi.string().optional(),
  MediaUrl0: Joi.string().optional(),
  MediaContentType0: Joi.string().optional(),
  NumMedia: Joi.string().optional()
}).unknown(true); // Allow extra fields from Twilio



/**
 * POST /api/whatsapp/webhook
 * Handle incoming WhatsApp messages from Twilio
 */
router.post('/webhook', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid webhook request', {
        error: error.details[0].message,
        body: req.body
      });
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Verify webhook signature (optional but recommended for production)
    // const signature = req.headers['x-twilio-signature'];
    // const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 
    // if (signature && !whatsappService.verifyWebhookSignature(signature, url, req.body)) {
    //   logger.warn('Invalid webhook signature', {
    //     signature,
    //     url
    //   });
    //   return res.status(403).json({ error: 'Invalid signature' });
    // }

    // Handle the message
    const result = await conversationHandler.handleIncomingMessage(value);

    // Return TwiML response (required by Twilio)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Message processed successfully</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      body: req.body
    });

    // Return error response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your message. Please try again.</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.status(500).send(twiml);
  }
});

/**
 * GET /api/whatsapp/webhook
 * Webhook verification endpoint (for Twilio setup)
 */
router.get('/webhook', (req, res) => {
  res.status(200).json({
    status: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/whatsapp/send
 * Send a WhatsApp message (for testing or manual sending)
 */
router.post('/send', async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;

    // Validate request
    if (!to || !message) {
      return res.status(400).json({
        error: 'Missing required fields: to, message'
      });
    }

    let result;
    
    if (type === 'media' && req.body.mediaUrl) {
      result = await whatsappService.sendMediaMessage(
        to, 
        req.body.mediaUrl, 
        message, 
        req.body.mediaType
      );
    } else {
      result = await whatsappService.sendMessage(to, message);
    }

    res.json({
      success: true,
      messageSid: result.sid,
      status: result.status
    });

  } catch (error) {
    logger.error('Error sending WhatsApp message', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: 'Failed to send message',
      details: error.message
    });
  }
});

/**
 * GET /api/whatsapp/status/:messageSid
 * Get message delivery status
 */
router.get('/status/:messageSid', async (req, res) => {
  try {
    const { messageSid } = req.params;
    
    const status = await whatsappService.getMessageStatus(messageSid);
    
    res.json({
      success: true,
      status
    });

  } catch (error) {
    logger.error('Error getting message status', {
      error: error.message,
      messageSid: req.params.messageSid
    });

    res.status(500).json({
      error: 'Failed to get message status',
      details: error.message
    });
  }
});

/**
 * GET /api/whatsapp/conversation/:phoneNumber
 * Get conversation summary for a phone number
 */
router.get('/conversation/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const summary = conversationHandler.getConversationSummary(phoneNumber);
    
    if (!summary) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    logger.error('Error getting conversation summary', {
      error: error.message,
      phoneNumber: req.params.phoneNumber
    });

    res.status(500).json({
      error: 'Failed to get conversation summary',
      details: error.message
    });
  }
});

/**
 * POST /api/whatsapp/test
 * Test endpoint for development
 */
router.post('/test', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp webhook endpoint is working',
    timestamp: new Date().toISOString(),
    body: req.body
  });
});

module.exports = router; 
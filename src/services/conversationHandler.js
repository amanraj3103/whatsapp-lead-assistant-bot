const logger = require('../utils/logger');
const nlpService = require('./nlpService');
const whatsappService = require('./whatsappService');
const leadService = require('./hybridLeadService');
const calendlyService = require('./calendlyService');
const reminderService = require('./reminderService');
const encryptionService = require('./encryptionService');
const axios = require('axios'); // Add at the top for HTTP requests

const { createOneClickLink } = require('../utils/oneClickLinks');

class ConversationHandler {
  constructor() {
    this.conversationFlows = {
      initial: this.handleInitialStage.bind(this),
      collecting_info: this.handleCollectingInfoStage.bind(this),
      scheduling: this.handleSchedulingStage.bind(this),
      completed: this.handleCompletedStage.bind(this)
    };
  }

  /**
   * Handle incoming WhatsApp message
   * @param {Object} messageData - Incoming message data
   * @returns {Promise<Object>} - Response data
   */
  async handleIncomingMessage(messageData) {
    try {
      const { From, Body, MessageSid } = messageData;
      const phoneNumber = From;
      const messageContent = Body || '';
      
      logger.info('Processing incoming message', {
        phoneNumber,
        messageLength: messageContent.length,
        messageSid: MessageSid
      });

      // Get or create lead
      let lead = await leadService.getLeadByPhone(phoneNumber);
      
      if (!lead) {
        lead = await leadService.createLead(phoneNumber);
        logger.info('New lead created from incoming message', {
          leadId: lead.id,
          phoneNumber
        });
      }

      // LANGUAGE SELECTION MENU: If no language is set, greet and prompt user to select
      if (!lead.data || !lead.data.language) {
        const greeting = `👋 Hi there! Welcome to ${process.env.COMPANY_NAME || 'Dream Axis'}!`;
        const languageMenu = `${greeting}\n\nPlease select your preferred language:\n1. English\n2. Hindi\n3. Malayalam\n4. Tamil\n5. Bengali\n6. Manglish (Malayalam in English letters)\n\nReply with the language or number.`;
        await whatsappService.sendMessage(phoneNumber, languageMenu);
        // Add bot response to conversation history
        await leadService.addMessage(phoneNumber, {
          content: languageMenu,
          direction: 'outbound',
          type: 'text',
          metadata: { responseType: 'language_menu' }
        });
        // Check if user replied with a language selection
        const lang = messageContent.trim().toLowerCase();
        let selectedLang = null;
        if (["1", "english"].includes(lang)) selectedLang = "English";
        else if (["2", "hindi", "हिंदी"].includes(lang)) selectedLang = "Hindi";
        else if (["3", "malayalam", "മലയാളം"].includes(lang)) selectedLang = "Malayalam";
        else if (["4", "tamil", "தமிழ்"].includes(lang)) selectedLang = "Tamil";
        else if (["5", "bengali", "বাংলা"].includes(lang)) selectedLang = "Bengali";
        else if (["6", "manglish", "malayalam in english letters"].includes(lang)) selectedLang = "Manglish";
        if (selectedLang) {
          lead = await leadService.updateLead(phoneNumber, { data: { ...lead.data, language: selectedLang } });
        } else {
          // Wait for user to reply with language selection before proceeding
          return {
            success: true,
            leadId: lead.id,
            stage: lead.stage,
            response: languageMenu,
            actions: []
          };
        }
      } else {
        // INSTANT LANGUAGE SWITCHING: Detect language change requests in any message
        const lang = messageContent.trim().toLowerCase();
        let selectedLang = null;
        if (["1", "english"].includes(lang)) selectedLang = "English";
        else if (["2", "hindi", "हिंदी"].includes(lang)) selectedLang = "Hindi";
        else if (["3", "malayalam", "മലയാളം"].includes(lang)) selectedLang = "Malayalam";
        else if (["4", "tamil", "தமிழ்"].includes(lang)) selectedLang = "Tamil";
        else if (["5", "bengali", "বাংলা"].includes(lang)) selectedLang = "Bengali";
        else if (["6", "manglish", "malayalam in english letters"].includes(lang)) selectedLang = "Manglish";
        if (selectedLang && lead.data.language !== selectedLang) {
          lead = await leadService.updateLead(phoneNumber, { data: { ...lead.data, language: selectedLang } });
          const confirmMsg = `Language changed to ${selectedLang}. How can I assist you?`;
          await whatsappService.sendMessage(phoneNumber, confirmMsg);
          await leadService.addMessage(phoneNumber, {
            content: confirmMsg,
            direction: 'outbound',
            type: 'text',
            metadata: { responseType: 'language_switch' }
          });
          return {
            success: true,
            leadId: lead.id,
            stage: lead.stage,
            response: confirmMsg,
            actions: []
          };
        }
      }

      // Add message to conversation history
      await leadService.addMessage(phoneNumber, {
        content: messageContent,
        direction: 'inbound',
        type: 'text',
        metadata: { messageSid: MessageSid }
      });

      // Get conversation context for better understanding
      const conversationContext = this.getConversationContext(lead);
      // Add language to conversationContext if set
      if (lead.data && lead.data.language) {
        conversationContext.language = lead.data.language;
      }

      let processedMessageContent = messageContent;
      // If language is Malayalam and message is in Latin script, transliterate using microservice
      if (lead.data && lead.data.language === 'Malayalam' && /^[a-zA-Z0-9\s.,?!]+$/.test(messageContent)) {
        try {
          const translitRes = await axios.post('http://localhost:5005/transliterate', { text: messageContent });
          if (translitRes.data && translitRes.data.result) {
            processedMessageContent = translitRes.data.result;
            logger.info('Transliterated Manglish to Malayalam', { original: messageContent, malayalam: processedMessageContent });
          }
        } catch (err) {
          logger.error('Error calling transliteration microservice', { error: err.message });
        }
      }

      // Analyze message with NLP using conversation context
      const analysis = await nlpService.analyzeMessage(processedMessageContent, conversationContext);

      // Validate extracted entities
      const validation = nlpService.validateEntities(analysis.entities);
      if (!validation.isValid) {
        logger.warn('Invalid entities detected', {
          errors: validation.errors,
          entities: analysis.entities
        });
      }

      // Update lead with extracted data
      const updates = {};
      if (analysis.entities) {
        const validEntities = {};
        Object.keys(analysis.entities).forEach(key => {
          if (analysis.entities[key] && analysis.entities[key] !== 'null') {
            validEntities[key] = analysis.entities[key];
          }
        });
        
        if (Object.keys(validEntities).length > 0) {
          updates.data = validEntities;
        }
      }

      if (Object.keys(updates).length > 0) {
        lead = await leadService.updateLead(phoneNumber, updates);
      }

      // Log updated lead data and missing fields for debugging
      const missingFields = this.getMissingFields(lead.data);
      logger.info('Updated lead data and recalculated missing fields', {
        leadData: lead.data,
        missingFields
      });

      // Generate conversational response using NLP
      const response = await this.generateConversationalResponse(lead, analysis, messageContent);

      // Send response
      if (response.message) {
        await whatsappService.sendMessage(phoneNumber, response.message);
        
        // Add bot response to conversation history
        await leadService.addMessage(phoneNumber, {
          content: response.message,
          direction: 'outbound',
          type: 'text',
          metadata: { responseType: response.type }
        });
      }

      // Handle post-processing actions
      if (response.actions) {
        await this.handlePostProcessingActions(lead, response.actions);
      }

      logger.info('Message processed successfully', {
        leadId: lead.id,
        stage: lead.stage,
        responseType: response.type
      });

      return {
        success: true,
        leadId: lead.id,
        stage: lead.stage,
        response: response.message,
        actions: response.actions
      };

    } catch (error) {
      logger.error('Error handling incoming message', {
        error: error.message,
        phoneNumber: messageData.From
      });

      // Send fallback response
      const fallbackMessage = "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment.";
      await whatsappService.sendMessage(messageData.From, fallbackMessage);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get conversation context for better understanding
   * @param {Object} lead - Lead object
   * @returns {Object} - Conversation context
   */
  getConversationContext(lead) {
    const recentMessages = lead.conversation.slice(-5); // Last 5 messages for context
    
    return {
      stage: lead.stage,
      collectedData: lead.data,
      recentMessages: recentMessages.map(msg => ({
        direction: msg.direction,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      missingFields: this.getMissingFields(lead.data),
      conversationLength: lead.conversation.length
    };
  }

  /**
   * Get missing required fields
   * @param {Object} data - Lead data
   * @returns {Array} - Missing fields
   */
  getMissingFields(data) {
    const serviceType = data.service;
    const requiredFields = this.getRequiredFieldsForService(serviceType);
    if (!requiredFields) return [];
    return requiredFields.filter(field => !data[field]);
  }

  /**
   * Generate conversational response using NLP
   * @param {Object} lead - Lead object
   * @param {Object} analysis - NLP analysis
   * @param {string} message - User message
   * @returns {Promise<Object>} - Response data
   */
  async generateConversationalResponse(lead, analysis, message) {
    try {
      // Use NLP service to generate natural response
      const responseMessage = await nlpService.generateResponse(analysis, lead.data, lead.stage);
      
      // Check if we should move to next stage
      const missingFields = this.getMissingFields(lead.data);
      const shouldMoveToScheduling = missingFields.length === 0 && lead.stage === 'collecting_info';
      
      if (shouldMoveToScheduling) {
        // Move to scheduling stage
        await leadService.updateLead(lead.phoneNumber, { stage: 'scheduling' });
        lead.stage = 'scheduling';
      }

      // Handle special cases
      if (analysis.intent === 'scheduling' && lead.stage === 'scheduling') {
        return await this.handleSchedulingStage(lead, analysis, message);
      }

      if (analysis.intent === 'goodbye') {
        return {
          message: responseMessage,
          type: 'goodbye'
        };
      }

      // Handle off-topic conversations
      if (analysis.intent === 'off_topic' || analysis.should_refocus) {
        return {
          message: responseMessage,
          type: 'refocus',
          shouldRefocus: true
        };
      }

      // If collecting info, ask the next missing field for the selected service
      if (lead.stage === 'collecting_info' && missingFields.length > 0) {
        const nextField = missingFields[0];
        const contextualQuestion = await nlpService.generateContextualQuestion(lead.data, missingFields);
        return {
          message: contextualQuestion,
          type: 'question',
          nextField
        };
      }

      // Return conversational response
      return {
        message: responseMessage,
        type: 'conversational'
      };

    } catch (error) {
      logger.error('Error generating conversational response', {
        error: error.message
      });
      
      // Fallback to stage-based response
      return await this.conversationFlows[lead.stage](lead, analysis, message);
    }
  }

  /**
   * Handle initial conversation stage
   * @param {Object} lead - Lead object
   * @param {Object} analysis - NLP analysis
   * @param {string} message - User message
   * @returns {Promise<Object>} - Response data
   */
  async handleInitialStage(lead, analysis, message) {
    // If user already provided some info, proceed to contextual question
    if (analysis.entities && Object.keys(analysis.entities).some(key => analysis.entities[key])) {
      const missingFields = this.getMissingFields(lead.data);
      if (missingFields.length > 0) {
        const contextualQuestion = await nlpService.generateContextualQuestion(lead.data, missingFields);
        return {
          message: contextualQuestion,
          type: 'question',
          nextField: missingFields[0]
        };
      }
      // If nothing missing, proceed to scheduling
      return await this.handleSchedulingStage(lead, analysis, message);
    }

    // Always greet, then ask for the first missing field
    const missingFields = this.getMissingFields(lead.data);
    let greeting = `👋 Hi there! Welcome to ${process.env.COMPANY_NAME || 'Dream Axis'}!`;
    if (missingFields.length > 0) {
      const contextualQuestion = await nlpService.generateContextualQuestion(lead.data, missingFields);
      return {
        message: `${greeting}\n\n${contextualQuestion}`,
        type: 'greeting+question',
        nextField: missingFields[0]
      };
    }
    // If nothing missing, proceed to scheduling
    return await this.handleSchedulingStage(lead, analysis, message);
  }

  /**
   * Handle information collection stage
   * @param {Object} lead - Lead object
   * @param {Object} analysis - NLP analysis
   * @param {string} message - User message
   * @returns {Promise<Object>} - Response data
   */
  async handleCollectingInfoStage(lead, analysis, message) {
    // Check if this is an off-topic question
    if (analysis.intent === 'off_topic') {
      const response = await nlpService.generateResponse(analysis, lead.data, 'collecting_info');
      return {
        message: response,
        type: 'refocus'
      };
    }

    // Use NLP to generate natural response
    const response = await nlpService.generateResponse(analysis, lead.data, 'collecting_info');
    
    return {
      message: response,
      type: 'conversational'
    };
  }

  /**
   * Handle scheduling stage
   * @param {Object} lead - Lead object
   * @param {Object} analysis - NLP analysis
   * @param {string} message - User message
   * @returns {Promise<Object>} - Response data
   */
  async handleSchedulingStage(lead, analysis, message) {
    // Check if user is asking about scheduling or if we should offer it
    if (analysis.intent === 'scheduling' || message.toLowerCase().includes('schedule') || message.toLowerCase().includes('call')) {
      // Use comprehensive validation to create booking link
      const result = await calendlyService.createBookingLinkWithValidation(lead.data);
      
      if (!result.success) {
        return {
          message: `I'd love to schedule a call with you! However, I'm having trouble generating the booking link right now. Could you please try again in a moment? 😊`,
          type: 'error'
        };
      }

      const { bookingLink, bookingId } = result;

      // Generate a one-click-expiry link
      const oneClickToken = createOneClickLink(bookingLink);
      const oneClickUrl = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/booking/${oneClickToken}`;

      // Send the one-click link as a message
      // Schedule WhatsApp reminders for the lead
      try {
        await reminderService.scheduleReminders(lead);
        logger.info('WhatsApp reminders scheduled after meeting booking', { leadId: lead.id });
      } catch (err) {
        logger.error('Failed to schedule WhatsApp reminders', { error: err.message, leadId: lead.id });
      }
      return {
        message: `Perfect! 🎉 Here's your personalized booking link (it expires after first use for security):\n\n${oneClickUrl}\n\nClick the link to schedule your consultation. I'm looking forward to our call! 😊`,
        type: 'booking_link',
        bookingId,
        oneClickUrl
      };
    }

    // Check if this is an off-topic question
    if (analysis.intent === 'off_topic') {
      const response = await nlpService.generateResponse(analysis, lead.data, 'scheduling');
      return {
        message: response,
        type: 'refocus'
      };
    }

    // If not explicitly about scheduling, continue conversation
    const response = await nlpService.generateResponse(analysis, lead.data, 'scheduling');
    return {
      message: response,
      type: 'conversational'
    };
  }

  /**
   * Handle completed stage
   * @param {Object} lead - Lead object
   * @param {Object} analysis - NLP analysis
   * @param {string} message - User message
   * @returns {Promise<Object>} - Response data
   */
  async handleCompletedStage(lead, analysis, message) {
    // Check if user has new questions or wants to reschedule
    if (analysis.intent === 'service_inquiry' || analysis.intent === 'lead_collection') {
      // User has new questions, move back to collecting info
      await leadService.updateLead(lead.phoneNumber, { stage: 'collecting_info' });
      const response = await nlpService.generateResponse(analysis, lead.data, 'collecting_info');
      return {
        message: response,
        type: 'conversational'
      };
    }

    // Check if this is an off-topic question
    if (analysis.intent === 'off_topic') {
      const response = await nlpService.generateResponse(analysis, lead.data, 'completed');
      return {
        message: response,
        type: 'refocus'
      };
    }

    const completionMessage = `Thank you for your interest in our services! 😊

Your consultation has been scheduled and you should have received the booking link. 

If you have any questions about our immigration and study abroad services or need to reschedule, just let me know! I'm here to help make your journey as smooth as possible. 

Best regards,
${process.env.COMPANY_NAME || 'Our Team'} 👋`;

    return {
      message: completionMessage,
      type: 'completion'
    };
  }

  /**
   * Handle post-processing actions
   * @param {Object} lead - Lead object
   * @param {Array} actions - Actions to perform
   * @returns {Promise<void>}
   */
  async handlePostProcessingActions(lead, actions) {
    try {
      for (const action of actions) {
        switch (action) {
          case 'schedule_meeting':
            logger.info('Meeting scheduled for lead', {
              leadId: lead.id,
              phoneNumber: lead.phoneNumber
            });
            break;

          case 'schedule_reminders':
            logger.info('Reminders scheduled for lead', {
              leadId: lead.id,
              phoneNumber: lead.phoneNumber
            });
            break;

          case 'send_welcome_email':
            // TODO: Implement welcome email functionality
            logger.info('Welcome email would be sent', {
              leadId: lead.id,
              email: lead.data.email
            });
            break;

          default:
            logger.warn('Unknown post-processing action', { action });
        }
      }
    } catch (error) {
      logger.error('Error handling post-processing actions', {
        error: error.message,
        leadId: lead.id,
        actions
      });
    }
  }

  /**
   * Get conversation summary for a lead
   * @param {string} phoneNumber - Lead's phone number
   * @returns {Object} - Conversation summary
   */
  async getConversationSummary(phoneNumber) {
    try {
      const lead = await leadService.getLeadByPhone(phoneNumber);
      
      if (!lead) {
        return null;
      }

      return {
        leadId: lead.id,
        stage: lead.stage,
        status: lead.status,
        data: encryptionService.decryptLeadData(lead.data),
        conversationLength: lead.conversation.length,
        lastMessageAt: lead.lastMessageAt,
        scheduledMeeting: lead.scheduledMeeting
      };
    } catch (error) {
      logger.error('Error getting conversation summary', {
        error: error.message,
        phoneNumber
      });
      return null;
    }
  }

  getRequiredFieldsForService(serviceType) {
    if (serviceType === 'Education India') {
      return ['service', 'education_place', 'course', 'name', 'number', 'email', 'residence'];
    } else if (serviceType === 'Education Abroad') {
      return ['service', 'education_country', 'course', 'name', 'number', 'email', 'residence'];
    } else if (serviceType === 'Job Europe') {
      return ['service', 'work_type', 'name', 'number', 'email', 'residence'];
    }
    // Default fallback
    return ['service', 'name', 'number', 'email', 'residence'];
  }
}

module.exports = new ConversationHandler(); 
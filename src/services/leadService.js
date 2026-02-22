const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const logger = require('../utils/logger');
const encryptionService = require('./encryptionService');
const whatsappService = require('./whatsappService');

// Lead scoring configuration
const SCORING = {
  completenessWeight: 10, // per field
  keywordWeight: 20,
  intentWeight: 20,
  threshold: 70,
  keywords: ['study', 'work', 'visa', 'truck', 'abroad', 'engineering', 'mbbs', 'driver']
};

class LeadService {
  constructor() {
    // In-memory storage (replace with database in production)
    this.leads = new Map();
    this.conversations = new Map();
  }

  /**
   * Create a new lead
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} initialData - Initial lead data
   * @returns {Object} - Created lead object
   */
  createLead(phoneNumber, initialData = {}) {
    try {
      const leadId = uuidv4();
      const timestamp = moment().toISOString();
      const cleanPhone = phoneNumber.replace('whatsapp:', '');
      
      const lead = {
        id: leadId,
        phoneNumber: cleanPhone,
        status: 'active',
        stage: 'initial',
        createdAt: timestamp,
        updatedAt: timestamp,
        lastMessageAt: timestamp,
        data: {
          name: null,
          email: null,
          phone: null,
          country: null,
          service_type: null,
          preferred_time: null,
          notes: null,
          ...initialData
        },
        conversation: [],
        scheduledMeeting: null,
        reminders: {
          fiveHours: false,
          oneHour: false
        },
        score: 0, // Add score field
        qualified: false, // Add qualified field
      };

      this.leads.set(leadId, lead);
      this.conversations.set(cleanPhone, leadId);
      
      // Calculate initial score
      lead.score = this.calculateLeadScore(lead.data);
      // Set qualified
      lead.qualified = lead.score >= SCORING.threshold;
      if (lead.qualified) {
        logger.info('Lead auto-qualified on creation', { leadId: lead.id, score: lead.score });
        // Notify admin on WhatsApp
        const adminNumber = process.env.ADMIN_WHATSAPP || '+911234567890';
        const msg = `🚀 New Qualified Lead!\nName: ${lead.data.name || 'N/A'}\nPhone: ${lead.phoneNumber}\nScore: ${lead.score}`;
        whatsappService.sendMessage(adminNumber, msg).catch(() => {});
      }

      logger.info('New lead created', {
        leadId,
        phoneNumber: lead.phoneNumber,
        stage: lead.stage
      });

      return lead;
    } catch (error) {
      logger.error('Error creating lead', {
        error: error.message,
        phoneNumber
      });
      throw error;
    }
  }

  /**
   * Get lead by phone number
   * @param {string} phoneNumber - Lead's phone number
   * @returns {Object|null} - Lead object or null
   */
  getLeadByPhone(phoneNumber) {
    try {
      const cleanPhone = phoneNumber.replace('whatsapp:', '');
      const leadId = this.conversations.get(cleanPhone);
      
      if (!leadId) {
        return null;
      }

      const lead = this.leads.get(leadId);
      // Expose qualified field
      lead.qualified = lead.qualified;
      return lead;
    } catch (error) {
      logger.error('Error getting lead by phone', {
        error: error.message,
        phoneNumber
      });
      return null;
    }
  }

  /**
   * Get lead by ID
   * @param {string} leadId - Lead ID
   * @returns {Object|null} - Lead object or null
   */
  getLeadById(leadId) {
    try {
      const lead = this.leads.get(leadId);
      // Expose qualified field
      lead.qualified = lead.qualified;
      return lead || null;
    } catch (error) {
      logger.error('Error getting lead by ID', {
        error: error.message,
        leadId
      });
      return null;
    }
  }

  /**
   * Update lead data
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} updates - Data to update
   * @returns {Object} - Updated lead object
   */
  updateLead(phoneNumber, updates) {
    try {
      const lead = this.getLeadByPhone(phoneNumber);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Update lead data
      if (updates.data) {
        lead.data = { ...lead.data, ...updates.data };
      }

      // Update other fields
      Object.keys(updates).forEach(key => {
        if (key !== 'data') {
          lead[key] = updates[key];
        }
      });

      lead.updatedAt = moment().toISOString();
      lead.lastMessageAt = moment().toISOString();

      // Update stage based on data completeness
      lead.stage = this.determineStage(lead.data);
      // Update score (optionally pass last NLP analysis if available)
      lead.score = this.calculateLeadScore(lead.data);
      // Set qualified
      lead.qualified = lead.score >= SCORING.threshold;
      if (lead.qualified) {
        logger.info('Lead auto-qualified on update', { leadId: lead.id, score: lead.score });
        // Notify admin on WhatsApp
        const adminNumber = process.env.ADMIN_WHATSAPP || '+911234567890';
        const msg = `🚀 New Qualified Lead!\nName: ${lead.data.name || 'N/A'}\nPhone: ${lead.phoneNumber}\nScore: ${lead.score}`;
        whatsappService.sendMessage(adminNumber, msg).catch(() => {});
      }

      this.leads.set(lead.id, lead);
      
      logger.info('Lead updated', {
        leadId: lead.id,
        phoneNumber: lead.phoneNumber,
        stage: lead.stage,
        updatedFields: Object.keys(updates)
      });

      return lead;
    } catch (error) {
      logger.error('Error updating lead', {
        error: error.message,
        phoneNumber
      });
      throw error;
    }
  }

  /**
   * Add message to lead conversation
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} message - Message object
   * @returns {Object} - Updated lead object
   */
  addMessage(phoneNumber, message) {
    try {
      const lead = this.getLeadByPhone(phoneNumber);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      const messageEntry = {
        id: uuidv4(),
        timestamp: moment().toISOString(),
        direction: message.direction || 'inbound',
        content: message.content,
        type: message.type || 'text',
        metadata: message.metadata || {}
      };

      lead.conversation.push(messageEntry);
      lead.lastMessageAt = moment().toISOString();

      this.leads.set(lead.id, lead);
      
      logger.info('Message added to conversation', {
        leadId: lead.id,
        messageId: messageEntry.id,
        direction: messageEntry.direction,
        contentLength: messageEntry.content.length
      });

      return lead;
    } catch (error) {
      logger.error('Error adding message to lead', {
        error: error.message,
        phoneNumber
      });
      throw error;
    }
  }

  /**
   * Determine conversation stage based on collected data
   * @param {Object} data - Lead data
   * @returns {string} - Current stage
   */
  determineStage(data) {
    const requiredFields = ['name', 'email', 'phone', 'country', 'service_type'];
    const completedFields = requiredFields.filter(field => data[field]);
    
    if (completedFields.length === 0) {
      return 'initial';
    } else if (completedFields.length < requiredFields.length) {
      return 'collecting_info';
    } else if (!data.preferred_time) {
      return 'scheduling';
    } else {
      return 'completed';
    }
  }

  /**
   * Check if lead data is complete
   * @param {Object} data - Lead data
   * @returns {boolean} - Whether data is complete
   */
  isDataComplete(data) {
    const requiredFields = ['name', 'email', 'phone', 'country', 'service_type'];
    return requiredFields.every(field => data[field]);
  }

  /**
   * Schedule meeting for lead
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} meetingData - Meeting information
   * @returns {Object} - Updated lead object
   */
  scheduleMeeting(phoneNumber, meetingData) {
    try {
      const lead = this.getLeadByPhone(phoneNumber);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      lead.scheduledMeeting = {
        id: uuidv4(),
        scheduledAt: moment().toISOString(),
        meetingTime: meetingData.meetingTime,
        meetingDate: meetingData.meetingDate,
        calendlyLink: meetingData.calendlyLink,
        status: 'scheduled',
        ...meetingData
      };

      lead.stage = 'completed';
      lead.status = 'scheduled';
      lead.updatedAt = moment().toISOString();

      this.leads.set(lead.id, lead);
      
      logger.info('Meeting scheduled for lead', {
        leadId: lead.id,
        meetingId: lead.scheduledMeeting.id,
        meetingTime: lead.scheduledMeeting.meetingTime
      });

      return lead;
    } catch (error) {
      logger.error('Error scheduling meeting', {
        error: error.message,
        phoneNumber
      });
      throw error;
    }
  }

  /**
   * Get all leads
   * @param {Object} filters - Optional filters
   * @returns {Array} - Array of leads
   */
  getAllLeads(filters = {}) {
    try {
      let leads = Array.from(this.leads.values());

      // Apply filters
      if (filters.status) {
        leads = leads.filter(lead => lead.status === filters.status);
      }

      if (filters.stage) {
        leads = leads.filter(lead => lead.stage === filters.stage);
      }

      if (filters.dateFrom) {
        leads = leads.filter(lead => 
          moment(lead.createdAt).isSameOrAfter(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        leads = leads.filter(lead => 
          moment(lead.createdAt).isSameOrBefore(filters.dateTo)
        );
      }

      // Sort by creation date (newest first)
      leads.sort((a, b) => moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf());

      // Expose qualified field for all leads
      leads.forEach(lead => {
        lead.qualified = lead.qualified;
      });

      return leads;
    } catch (error) {
      logger.error('Error getting all leads', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get leads for daily report
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} - Leads for the specified date
   */
  getLeadsForDate(date) {
    try {
      const startOfDay = moment(date).startOf('day');
      const endOfDay = moment(date).endOf('day');

      return Array.from(this.leads.values()).filter(lead => {
        const leadDate = moment(lead.createdAt);
        return leadDate.isBetween(startOfDay, endOfDay, null, '[]');
      });
    } catch (error) {
      logger.error('Error getting leads for date', {
        error: error.message,
        date
      });
      return [];
    }
  }

  /**
   * Delete lead
   * @param {string} leadId - Lead ID
   * @returns {boolean} - Success status
   */
  deleteLead(leadId) {
    try {
      const lead = this.leads.get(leadId);
      
      if (!lead) {
        return false;
      }

      // Remove from conversations map
      this.conversations.delete(lead.phoneNumber);
      
      // Remove from leads map
      this.leads.delete(leadId);
      
      logger.info('Lead deleted', {
        leadId,
        phoneNumber: lead.phoneNumber
      });

      return true;
    } catch (error) {
      logger.error('Error deleting lead', {
        error: error.message,
        leadId
      });
      return false;
    }
  }

  /**
   * Get lead statistics
   * @returns {Object} - Lead statistics
   */
  getStatistics() {
    try {
      const leads = Array.from(this.leads.values());
      
      const stats = {
        total: leads.length,
        active: leads.filter(lead => lead.status === 'active').length,
        scheduled: leads.filter(lead => lead.status === 'scheduled').length,
        completed: leads.filter(lead => lead.stage === 'completed').length,
        byStage: {
          initial: leads.filter(lead => lead.stage === 'initial').length,
          collecting_info: leads.filter(lead => lead.stage === 'collecting_info').length,
          scheduling: leads.filter(lead => lead.stage === 'scheduling').length,
          completed: leads.filter(lead => lead.stage === 'completed').length
        },
        byService: {
          study: leads.filter(lead => lead.data.service_type === 'study').length,
          work: leads.filter(lead => lead.data.service_type === 'work').length,
          visa: leads.filter(lead => lead.data.service_type === 'visa').length
        }
      };

      return stats;
    } catch (error) {
      logger.error('Error getting lead statistics', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Calculate lead score based on keywords, completeness, and intent
   * @param {Object} data - Lead data
   * @param {Object} [nlpAnalysis] - Optional last NLP analysis
   * @returns {number} - Lead score (0-100)
   */
  calculateLeadScore(data, nlpAnalysis = {}) {
    let score = 0;
    // Completeness: +10 for each required field filled
    const requiredFields = ['name', 'email', 'phone', 'country', 'service_type'];
    const filled = requiredFields.filter(f => data[f]);
    score += filled.length * SCORING.completenessWeight;
    // Keywords: +20 for high-value keywords in notes or service_type
    const text = ((data.notes || '') + ' ' + (data.service_type || '')).toLowerCase();
    if (SCORING.keywords.some(k => text.includes(k))) score += SCORING.keywordWeight;
    // Intent: +20 for strong intent (lead_collection, scheduling, service_inquiry)
    if (nlpAnalysis && ['lead_collection', 'scheduling', 'service_inquiry'].includes(nlpAnalysis.intent)) score += SCORING.intentWeight;
    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Get lead score
   * @param {string} phoneNumber - Lead's phone number
   * @returns {number} - Lead score
   */
  getLeadScore(phoneNumber) {
    const lead = this.getLeadByPhone(phoneNumber);
    return lead && typeof lead.score === 'number' ? lead.score : 0;
  }
}

module.exports = new LeadService(); 
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const logger = require('../utils/logger');
const googleSheetsService = require('./googleSheetsService');
const encryptionService = require('./encryptionService');

class HybridLeadService {
  constructor() {
    // In-memory storage as fallback
    this.leads = new Map();
    this.conversations = new Map();
    this.useGoogleSheets = false;
    
    // Check if Google Sheets is available
    this.checkGoogleSheetsAvailability();
  }

  /**
   * Check if Google Sheets service is available
   */
  async checkGoogleSheetsAvailability() {
    try {
      const status = googleSheetsService.getStatus();
      this.useGoogleSheets = status.isInitialized;
      
      if (this.useGoogleSheets) {
        logger.info('Using Google Sheets for lead storage');
      } else {
        logger.info('Using in-memory storage for leads (Google Sheets not configured)');
      }
    } catch (error) {
      logger.warn('Google Sheets not available, using in-memory storage', {
        error: error.message
      });
      this.useGoogleSheets = false;
    }
  }

  /**
   * Create a new lead
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} initialData - Initial lead data
   * @returns {Object} - Created lead object
   */
  async createLead(phoneNumber, initialData = {}) {
    try {
      if (this.useGoogleSheets) {
        return await googleSheetsService.createLead(phoneNumber, initialData);
      } else {
        return this.createLeadInMemory(phoneNumber, initialData);
      }
    } catch (error) {
      logger.error('Error creating lead', {
        error: error.message,
        phoneNumber,
        useGoogleSheets: this.useGoogleSheets
      });
      
      // Fallback to in-memory if Google Sheets fails
      if (this.useGoogleSheets) {
        logger.info('Falling back to in-memory storage for lead creation');
        return this.createLeadInMemory(phoneNumber, initialData);
      }
      
      throw error;
    }
  }

  /**
   * Create lead in memory (fallback method)
   */
  createLeadInMemory(phoneNumber, initialData = {}) {
    const leadId = uuidv4();
    const timestamp = moment().toISOString();
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    
    // Encrypt sensitive data
    const encryptedData = encryptionService.encryptLeadData({
      name: null,
      email: null,
      phone: null,
      country: null,
      service_type: null,
      preferred_time: null,
      notes: null,
      ...initialData
    });
    
    const lead = {
      id: leadId,
      phoneNumber: cleanPhone,
      status: 'active',
      stage: 'initial',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      data: encryptedData,
      conversation: [],
      scheduledMeeting: null,
      reminders: {
        fiveHours: false,
        oneHour: false
      }
    };

    this.leads.set(leadId, lead);
    this.conversations.set(cleanPhone, leadId);
    
    logger.info('New lead created in memory', {
      leadId,
      phoneNumber: lead.phoneNumber,
      stage: lead.stage
    });

    return lead;
  }

  /**
   * Get lead by phone number
   * @param {string} phoneNumber - Lead's phone number
   * @returns {Object|null} - Lead object or null
   */
  async getLeadByPhone(phoneNumber) {
    try {
      if (this.useGoogleSheets) {
        return await googleSheetsService.getLeadByPhone(phoneNumber);
      } else {
        return this.getLeadByPhoneInMemory(phoneNumber);
      }
    } catch (error) {
      logger.error('Error getting lead by phone', {
        error: error.message,
        phoneNumber,
        useGoogleSheets: this.useGoogleSheets
      });
      
      // Fallback to in-memory if Google Sheets fails
      if (this.useGoogleSheets) {
        logger.info('Falling back to in-memory storage for lead retrieval');
        return this.getLeadByPhoneInMemory(phoneNumber);
      }
      
      return null;
    }
  }

  /**
   * Get lead by phone in memory (fallback method)
   */
  getLeadByPhoneInMemory(phoneNumber) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    const leadId = this.conversations.get(cleanPhone);
    
    if (!leadId) {
      return null;
    }

    return this.leads.get(leadId);
  }

  /**
   * Update lead data
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} updates - Data to update
   * @returns {Object} - Updated lead object
   */
  async updateLead(phoneNumber, updates) {
    try {
      if (this.useGoogleSheets) {
        return await googleSheetsService.updateLead(phoneNumber, updates);
      } else {
        return this.updateLeadInMemory(phoneNumber, updates);
      }
    } catch (error) {
      logger.error('Error updating lead', {
        error: error.message,
        phoneNumber,
        useGoogleSheets: this.useGoogleSheets
      });
      
      // Fallback to in-memory if Google Sheets fails
      if (this.useGoogleSheets) {
        logger.info('Falling back to in-memory storage for lead update');
        return this.updateLeadInMemory(phoneNumber, updates);
      }
      
      throw error;
    }
  }

  /**
   * Update lead in memory (fallback method)
   */
  updateLeadInMemory(phoneNumber, updates) {
    const lead = this.getLeadByPhoneInMemory(phoneNumber);
    
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Update lead data
    if (updates.data) {
      // Decrypt existing data, merge with updates, then re-encrypt
      const decryptedData = encryptionService.decryptLeadData(lead.data);
      const updatedData = { ...decryptedData, ...updates.data };
      lead.data = encryptionService.encryptLeadData(updatedData);
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
    const decryptedData = encryptionService.decryptLeadData(lead.data);
    lead.stage = this.determineStage(decryptedData);

    this.leads.set(lead.id, lead);
    
    logger.info('Lead updated in memory', {
      leadId: lead.id,
      phoneNumber: lead.phoneNumber,
      stage: lead.stage,
      updatedFields: Object.keys(updates)
    });

    return lead;
  }

  /**
   * Add message to lead conversation
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} message - Message object
   * @returns {Object} - Updated lead object
   */
  async addMessage(phoneNumber, message) {
    try {
      const lead = await this.getLeadByPhone(phoneNumber);
      
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

      // Update the lead
      await this.updateLead(phoneNumber, {
        conversation: lead.conversation,
        lastMessageAt: lead.lastMessageAt
      });
      
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
   * Get all leads
   * @param {Object} filters - Optional filters
   * @returns {Array} - Array of leads
   */
  async getAllLeads(filters = {}) {
    try {
      if (this.useGoogleSheets) {
        return await googleSheetsService.getAllLeads(filters);
      } else {
        return this.getAllLeadsInMemory(filters);
      }
    } catch (error) {
      logger.error('Error getting all leads', {
        error: error.message,
        useGoogleSheets: this.useGoogleSheets
      });
      
      // Fallback to in-memory if Google Sheets fails
      if (this.useGoogleSheets) {
        logger.info('Falling back to in-memory storage for lead retrieval');
        return this.getAllLeadsInMemory(filters);
      }
      
      return [];
    }
  }

  /**
   * Get all leads in memory (fallback method)
   */
  getAllLeadsInMemory(filters = {}) {
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

    return leads;
  }

  /**
   * Get leads for daily report
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} - Leads for the specified date
   */
  async getLeadsForDate(date) {
    try {
      if (this.useGoogleSheets) {
        return await googleSheetsService.getLeadsForDate(date);
      } else {
        return this.getLeadsForDateInMemory(date);
      }
    } catch (error) {
      logger.error('Error getting leads for date', {
        error: error.message,
        date,
        useGoogleSheets: this.useGoogleSheets
      });
      
      // Fallback to in-memory if Google Sheets fails
      if (this.useGoogleSheets) {
        logger.info('Falling back to in-memory storage for date-based lead retrieval');
        return this.getLeadsForDateInMemory(date);
      }
      
      return [];
    }
  }

  /**
   * Get leads for date in memory (fallback method)
   */
  getLeadsForDateInMemory(date) {
    const startOfDay = moment(date).startOf('day');
    const endOfDay = moment(date).endOf('day');

    return Array.from(this.leads.values()).filter(lead => {
      const leadDate = moment(lead.createdAt);
      return leadDate.isBetween(startOfDay, endOfDay, null, '[]');
    });
  }

  /**
   * Determine lead stage based on data completeness
   * @param {Object} data - Lead data
   * @returns {string} - Stage
   */
  determineStage(data) {
    if (!data.name) {
      return 'initial';
    } else if (!data.email || !data.phone || !data.country || !data.service_type) {
      return 'collecting_info';
    } else if (!data.preferred_time) {
      return 'scheduling';
    } else {
      return 'completed';
    }
  }

  /**
   * Schedule meeting for lead
   * @param {string} phoneNumber - Lead's phone number
   * @param {Object} meetingData - Meeting information
   * @returns {Object} - Updated lead object
   */
  async scheduleMeeting(phoneNumber, meetingData) {
    try {
      const lead = await this.getLeadByPhone(phoneNumber);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      const meetingInfo = {
        id: uuidv4(),
        scheduledAt: moment().toISOString(),
        meetingTime: meetingData.meetingTime,
        meetingDate: meetingData.meetingDate,
        calendlyLink: meetingData.calendlyLink,
        status: 'scheduled',
        ...meetingData
      };

      await this.updateLead(phoneNumber, {
        scheduledMeeting: meetingInfo,
        stage: 'completed',
        status: 'scheduled'
      });

      logger.info('Meeting scheduled for lead', {
        leadId: lead.id,
        meetingId: meetingInfo.id,
        meetingTime: meetingInfo.meetingTime
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
   * Get lead statistics
   * @returns {Object} - Lead statistics
   */
  async getStatistics() {
    try {
      const leads = await this.getAllLeads();
      
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
        },
        storage: this.useGoogleSheets ? 'Google Sheets' : 'In-Memory'
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
   * Get service status
   * @returns {Object} - Service status
   */
  getStatus() {
    return {
      useGoogleSheets: this.useGoogleSheets,
      googleSheetsStatus: googleSheetsService.getStatus(),
      inMemoryLeads: this.leads.size,
      inMemoryConversations: this.conversations.size
    };
  }
}

module.exports = new HybridLeadService(); 
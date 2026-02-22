const { google } = require('googleapis');
const moment = require('moment');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.sheetName = 'Leads';
    this.auth = null;
    this.sheets = null;
    this.isInitialized = false;
    
    if (!this.spreadsheetId) {
      logger.warn('Google Sheet ID not configured. Using in-memory fallback.');
      return;
    }
    
    this.initialize();
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      // Use service account credentials
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isInitialized = true;
      
      logger.info('Google Sheets service initialized successfully');
      
      // Ensure sheet exists and has headers
      await this.ensureSheetExists();
      
    } catch (error) {
      logger.error('Error initializing Google Sheets service', {
        error: error.message
      });
      this.isInitialized = false;
    }
  }

  /**
   * Ensure the sheet exists with proper headers
   */
  async ensureSheetExists() {
    try {
      const headers = [
        'Lead ID',
        'Phone Number',
        'Name',
        'Email',
        'Country',
        'Service Type',
        'Preferred Time',
        'Notes',
        'Status',
        'Stage',
        'Created At',
        'Updated At',
        'Last Message At',
        'Meeting Scheduled',
        'Meeting Time',
        'Meeting Date',
        'Calendly Link'
      ];

      // Check if sheet exists
      try {
        await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A1:Q1`
        });
      } catch (error) {
        // Sheet doesn't exist, create it
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });
        
        logger.info('Google Sheet headers created successfully');
      }
      
    } catch (error) {
      logger.error('Error ensuring sheet exists', {
        error: error.message
      });
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
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }

      const leadId = require('uuid').v4();
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
        }
      };

      // Add to Google Sheet
      const row = this.leadToRow(lead);
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:Q`,
        valueInputOption: 'RAW',
        resource: {
          values: [row]
        }
      });

      logger.info('Lead created in Google Sheets', {
        leadId,
        phoneNumber: lead.phoneNumber,
        stage: lead.stage
      });

      return lead;
    } catch (error) {
      logger.error('Error creating lead in Google Sheets', {
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
  async getLeadByPhone(phoneNumber) {
    try {
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }

      const cleanPhone = phoneNumber.replace('whatsapp:', '');
      
      // Get all leads and find by phone
      const leads = await this.getAllLeads();
      return leads.find(lead => lead.phoneNumber === cleanPhone) || null;
      
    } catch (error) {
      logger.error('Error getting lead by phone from Google Sheets', {
        error: error.message,
        phoneNumber
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
  async updateLead(phoneNumber, updates) {
    try {
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }

      const lead = await this.getLeadByPhone(phoneNumber);
      
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

      // Update in Google Sheet
      await this.updateLeadInSheet(lead);
      
      logger.info('Lead updated in Google Sheets', {
        leadId: lead.id,
        phoneNumber: lead.phoneNumber,
        stage: lead.stage,
        updatedFields: Object.keys(updates)
      });

      return lead;
    } catch (error) {
      logger.error('Error updating lead in Google Sheets', {
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
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:Q` // Skip header row
      });

      const rows = response.data.values || [];
      let leads = rows.map(row => this.rowToLead(row));

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
    } catch (error) {
      logger.error('Error getting all leads from Google Sheets', {
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
  async getLeadsForDate(date) {
    try {
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }

      const startOfDay = moment(date).startOf('day');
      const endOfDay = moment(date).endOf('day');

      const allLeads = await this.getAllLeads();
      
      return allLeads.filter(lead => {
        const leadDate = moment(lead.createdAt);
        return leadDate.isBetween(startOfDay, endOfDay, null, '[]');
      });
    } catch (error) {
      logger.error('Error getting leads for date from Google Sheets', {
        error: error.message,
        date
      });
      return [];
    }
  }

  /**
   * Convert lead object to row array
   * @param {Object} lead - Lead object
   * @returns {Array} - Row array
   */
  leadToRow(lead) {
    return [
      lead.id,
      lead.phoneNumber,
      lead.data.name || '',
      lead.data.email || '',
      lead.data.country || '',
      lead.data.service_type || '',
      lead.data.preferred_time || '',
      lead.data.notes || '',
      lead.status,
      lead.stage,
      lead.createdAt,
      lead.updatedAt,
      lead.lastMessageAt,
      lead.scheduledMeeting ? 'Yes' : 'No',
      lead.scheduledMeeting ? lead.scheduledMeeting.meetingTime : '',
      lead.scheduledMeeting ? lead.scheduledMeeting.meetingDate : '',
      lead.scheduledMeeting ? lead.scheduledMeeting.calendlyLink : ''
    ];
  }

  /**
   * Convert row array to lead object
   * @param {Array} row - Row array
   * @returns {Object} - Lead object
   */
  rowToLead(row) {
    return {
      id: row[0] || '',
      phoneNumber: row[1] || '',
      data: {
        name: row[2] || null,
        email: row[3] || null,
        phone: row[1] || null,
        country: row[4] || null,
        service_type: row[5] || null,
        preferred_time: row[6] || null,
        notes: row[7] || null
      },
      status: row[8] || 'active',
      stage: row[9] || 'initial',
      createdAt: row[10] || moment().toISOString(),
      updatedAt: row[11] || moment().toISOString(),
      lastMessageAt: row[12] || moment().toISOString(),
      scheduledMeeting: row[13] === 'Yes' ? {
        meetingTime: row[14] || '',
        meetingDate: row[15] || '',
        calendlyLink: row[16] || ''
      } : null,
      conversation: [],
      reminders: {
        fiveHours: false,
        oneHour: false
      }
    };
  }

  /**
   * Update lead in Google Sheet
   * @param {Object} lead - Lead object
   */
  async updateLeadInSheet(lead) {
    try {
      // Find the row number for this lead
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === lead.id);
      
      if (rowIndex === -1) {
        throw new Error('Lead not found in sheet');
      }

      // Update the row (add 1 for header, add 1 for 0-based index)
      const range = `${this.sheetName}!A${rowIndex + 2}:Q${rowIndex + 2}`;
      const row = this.leadToRow(lead);
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [row]
        }
      });

    } catch (error) {
      logger.error('Error updating lead in sheet', {
        error: error.message,
        leadId: lead.id
      });
      throw error;
    }
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
   * Get service status
   * @returns {Object} - Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      spreadsheetId: this.spreadsheetId,
      sheetName: this.sheetName
    };
  }
}

module.exports = new GoogleSheetsService(); 
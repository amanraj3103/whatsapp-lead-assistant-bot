const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const leadService = require('../services/hybridLeadService');
const reportingService = require('../services/reportingService');
const reminderService = require('../services/reminderService');
const whatsappService = require('../services/whatsappService');
const calendlyService = require('../services/calendlyService');
const Joi = require('joi');

// Validation schemas
const leadUpdateSchema = Joi.object({
  data: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    country: Joi.string().optional(),
    service_type: Joi.string().valid('study', 'work', 'visa').optional(),
    preferred_time: Joi.string().optional(),
    notes: Joi.string().optional()
  }).optional(),
  status: Joi.string().valid('active', 'scheduled', 'completed', 'cancelled').optional(),
  stage: Joi.string().valid('initial', 'collecting_info', 'scheduling', 'completed').optional()
});

const reportSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  recipientEmail: Joi.string().email().optional()
});

/**
 * GET /api/admin/leads
 * Get all leads with optional filtering
 */
router.get('/leads', (req, res) => {
  try {
    const { status, stage, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (stage) filters.stage = stage;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const leads = leadService.getAllLeads(filters);
    
    // Apply pagination
    const paginatedLeads = leads.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: paginatedLeads,
      pagination: {
        total: leads.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < leads.length
      }
    });

  } catch (error) {
    logger.error('Error getting leads', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get leads',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/leads/:leadId
 * Get specific lead by ID
 */
router.get('/leads/:leadId', (req, res) => {
  try {
    const { leadId } = req.params;
    
    const lead = leadService.getLeadById(leadId);
    
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });

  } catch (error) {
    logger.error('Error getting lead', {
      error: error.message,
      leadId: req.params.leadId
    });

    res.status(500).json({
      error: 'Failed to get lead',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/leads/:leadId
 * Update lead information
 */
router.put('/leads/:leadId', (req, res) => {
  try {
    const { leadId } = req.params;
    const updates = req.body;

    // Validate request body
    const { error } = leadUpdateSchema.validate(updates);
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const lead = leadService.getLeadById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    const updatedLead = leadService.updateLead(lead.phoneNumber, updates);

    res.json({
      success: true,
      data: updatedLead
    });

  } catch (error) {
    logger.error('Error updating lead', {
      error: error.message,
      leadId: req.params.leadId
    });

    res.status(500).json({
      error: 'Failed to update lead',
      details: error.message
    });
  }
});

/**
 * DELETE /api/admin/leads/:leadId
 * Delete a lead
 */
router.delete('/leads/:leadId', (req, res) => {
  try {
    const { leadId } = req.params;
    
    const success = leadService.deleteLead(leadId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting lead', {
      error: error.message,
      leadId: req.params.leadId
    });

    res.status(500).json({
      error: 'Failed to delete lead',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/statistics
 * Get system statistics
 */
router.get('/statistics', (req, res) => {
  try {
    const leadStats = leadService.getStatistics();
    const reportStats = reportingService.getReportStatistics();
    const scheduledReminders = reminderService.getAllScheduledReminders();

    res.json({
      success: true,
      data: {
        leads: leadStats,
        reports: reportStats,
        reminders: {
          scheduled: scheduledReminders.length
        },
        system: {
          calendlyConfigured: calendlyService.isConfigured(),
          whatsappConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
          uptime: process.uptime()
        }
      }
    });

  } catch (error) {
    logger.error('Error getting statistics', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/reports/generate
 * Generate and send daily report
 */
router.post('/reports/generate', async (req, res) => {
  try {
    const { date, recipientEmail } = req.body;

    // Validate request
    const { error } = reportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const reportDate = date || new Date().toISOString().split('T')[0];
    const leads = leadService.getLeadsForDate(reportDate);

    const result = await reportingService.generateAndSendDailyReport(
      reportDate, 
      leads, 
      recipientEmail
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error generating report', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/reports/list
 * List available reports
 */
router.get('/reports/list', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(__dirname, '../../reports');
    
    if (!fs.existsSync(reportsDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(reportsDir);
    const reports = files.map(file => {
      const filepath = path.join(reportsDir, file);
      const stats = fs.statSync(filepath);
      
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });

    res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    logger.error('Error listing reports', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to list reports',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/reports/download/:filename
 * Download a specific report file
 */
router.get('/reports/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(__dirname, '../../reports');
    const filepath = path.join(reportsDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        error: 'Report file not found'
      });
    }

    res.download(filepath);

  } catch (error) {
    logger.error('Error downloading report', {
      error: error.message,
      filename: req.params.filename
    });

    res.status(500).json({
      error: 'Failed to download report',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/reminders/send
 * Manually send a reminder
 */
router.post('/reminders/send', async (req, res) => {
  try {
    const { leadId, reminderType } = req.body;

    if (!leadId || !reminderType) {
      return res.status(400).json({
        error: 'Missing required fields: leadId, reminderType'
      });
    }

    const lead = leadService.getLeadById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    await reminderService.sendReminder(lead, reminderType);

    res.json({
      success: true,
      message: 'Reminder sent successfully'
    });

  } catch (error) {
    logger.error('Error sending reminder', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: 'Failed to send reminder',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/reminders/scheduled
 * Get all scheduled reminders
 */
router.get('/reminders/scheduled', (req, res) => {
  try {
    const reminders = reminderService.getAllScheduledReminders();

    res.json({
      success: true,
      data: reminders
    });

  } catch (error) {
    logger.error('Error getting scheduled reminders', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get scheduled reminders',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/whatsapp/send
 * Send WhatsApp message manually
 */
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;

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
 * GET /api/admin/system/health
 * Get system health status
 */
router.get('/system/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      services: {
        whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        calendly: calendlyService.isConfigured(),
        email: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        openai: !!process.env.OPENAI_API_KEY
      }
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Error getting system health', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get system health',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/cleanup-stats
 * Get cleanup statistics for booking links
 */
router.get('/cleanup-stats', (req, res) => {
  try {
    const cleanupScheduler = require('../schedulers/cleanupScheduler');
    const stats = cleanupScheduler.getCleanupStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting cleanup stats', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get cleanup stats',
      details: error.message
    });
  }
});

module.exports = router; 
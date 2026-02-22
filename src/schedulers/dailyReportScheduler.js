const schedule = require('node-schedule');
const moment = require('moment');
const logger = require('../utils/logger');
const leadService = require('../services/hybridLeadService');
const reportingService = require('../services/reportingService');

class DailyReportScheduler {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the daily report scheduler
   */
  initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('Daily report scheduler already initialized');
        return;
      }

      // Schedule daily report generation at 11:59 PM every day
      schedule.scheduleJob('59 23 * * *', () => {
        this.generateDailyReport();
      });

      // Schedule cleanup of old reports every Sunday at 2 AM
      schedule.scheduleJob('0 2 * * 0', () => {
        this.cleanupOldReports();
      });

      this.isInitialized = true;
      logger.info('Daily report scheduler initialized successfully');
    } catch (error) {
      logger.error('Error initializing daily report scheduler', {
        error: error.message
      });
    }
  }

  /**
   * Generate daily report for the previous day
   */
  async generateDailyReport() {
    try {
      const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
      logger.info('Starting daily report generation', { date: yesterday });

      // Get leads for yesterday
      const leads = leadService.getLeadsForDate(yesterday);
      
      if (leads.length === 0) {
        logger.info('No leads found for daily report', { date: yesterday });
        return;
      }

      // Generate and send report
      const result = await reportingService.generateAndSendDailyReport(
        yesterday,
        leads,
        process.env.ADMIN_EMAIL
      );

      logger.info('Daily report generated and sent successfully', {
        date: yesterday,
        totalLeads: leads.length,
        emailSent: result.emailSent,
        files: result.reportInfo.files
      });

    } catch (error) {
      logger.error('Error generating daily report', {
        error: error.message,
        date: moment().subtract(1, 'day').format('YYYY-MM-DD')
      });
    }
  }

  /**
   * Clean up old report files
   */
  cleanupOldReports() {
    try {
      logger.info('Starting cleanup of old report files');
      reportingService.cleanupOldReports(30); // Keep reports for 30 days
    } catch (error) {
      logger.error('Error cleaning up old reports', {
        error: error.message
      });
    }
  }

  /**
   * Manually trigger report generation for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} recipientEmail - Optional recipient email
   */
  async generateReportForDate(date, recipientEmail = process.env.ADMIN_EMAIL) {
    try {
      logger.info('Manually generating report for date', { date });

      const leads = leadService.getLeadsForDate(date);
      
      if (leads.length === 0) {
        logger.info('No leads found for specified date', { date });
        return {
          success: false,
          message: 'No leads found for the specified date'
        };
      }

      const result = await reportingService.generateAndSendDailyReport(
        date,
        leads,
        recipientEmail
      );

      logger.info('Manual report generation completed', {
        date,
        totalLeads: leads.length,
        emailSent: result.emailSent
      });

      return {
        success: true,
        totalLeads: leads.length,
        emailSent: result.emailSent,
        files: result.reportInfo.files
      };

    } catch (error) {
      logger.error('Error generating manual report', {
        error: error.message,
        date
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    try {
      const jobs = schedule.scheduledJobs;
      const dailyReportJob = Object.values(jobs).find(job => 
        job.name && job.name.includes('59 23 * * *')
      );
      
      const cleanupJob = Object.values(jobs).find(job => 
        job.name && job.name.includes('0 2 * * 0')
      );

      return {
        isInitialized: this.isInitialized,
        dailyReportJob: dailyReportJob ? {
          nextInvocation: dailyReportJob.nextInvocation(),
          name: dailyReportJob.name
        } : null,
        cleanupJob: cleanupJob ? {
          nextInvocation: cleanupJob.nextInvocation(),
          name: cleanupJob.name
        } : null,
        totalScheduledJobs: Object.keys(jobs).length
      };
    } catch (error) {
      logger.error('Error getting scheduler status', {
        error: error.message
      });
      return {
        isInitialized: this.isInitialized,
        error: error.message
      };
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    try {
      schedule.gracefulShutdown();
      this.isInitialized = false;
      logger.info('Daily report scheduler stopped');
    } catch (error) {
      logger.error('Error stopping daily report scheduler', {
        error: error.message
      });
    }
  }
}

module.exports = new DailyReportScheduler(); 
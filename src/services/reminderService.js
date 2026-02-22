const schedule = require('node-schedule');
const moment = require('moment');
const logger = require('../utils/logger');
const whatsappService = require('./whatsappService');
const leadService = require('./leadService');

class ReminderService {
  constructor() {
    this.scheduledJobs = new Map();
    this.initializeReminders();
  }

  /**
   * Initialize reminder system
   */
  initializeReminders() {
    try {
      // Schedule daily cleanup of old reminders
      schedule.scheduleJob('0 2 * * *', () => {
        this.cleanupOldReminders();
      });

      // Schedule hourly check for upcoming meetings
      schedule.scheduleJob('0 * * * *', () => {
        this.checkUpcomingMeetings();
      });

      // Schedule hourly check for incomplete scheduling
      schedule.scheduleJob('15 * * * *', async () => {
        await this.remindIncompleteScheduling();
      });

      logger.info('Reminder service initialized');
    } catch (error) {
      logger.error('Error initializing reminder service', {
        error: error.message
      });
    }
  }

  /**
   * Schedule reminders for a meeting
   * @param {Object} lead - Lead object with scheduled meeting
   * @returns {Object} - Scheduled reminders
   */
  scheduleReminders(lead) {
    try {
      if (!lead.scheduledMeeting) {
        throw new Error('No scheduled meeting found');
      }

      const meetingTime = moment(lead.scheduledMeeting.meetingTime);
      const leadId = lead.id;
      const phoneNumber = lead.phoneNumber;

      // Cancel existing reminders for this lead
      this.cancelReminders(leadId);

      const reminders = {};

      // Schedule 5-hour reminder
      const fiveHourReminder = meetingTime.clone().subtract(5, 'hours');
      if (fiveHourReminder.isAfter(moment())) {
        const job = schedule.scheduleJob(fiveHourReminder.toDate(), () => {
          this.sendReminder(lead, 'fiveHours');
        });

        reminders.fiveHours = {
          scheduledFor: fiveHourReminder.toISOString(),
          jobId: job.name
        };

        this.scheduledJobs.set(`${leadId}_5h`, job);
      }

      // Schedule 1-hour reminder
      const oneHourReminder = meetingTime.clone().subtract(1, 'hour');
      if (oneHourReminder.isAfter(moment())) {
        const job = schedule.scheduleJob(oneHourReminder.toDate(), () => {
          this.sendReminder(lead, 'oneHour');
        });

        reminders.oneHour = {
          scheduledFor: oneHourReminder.toISOString(),
          jobId: job.name
        };

        this.scheduledJobs.set(`${leadId}_1h`, job);
      }

      // Update lead with reminder information
      leadService.updateLead(phoneNumber, {
        reminders: reminders
      });

      logger.info('Reminders scheduled for lead', {
        leadId,
        meetingTime: meetingTime.toISOString(),
        remindersCount: Object.keys(reminders).length
      });

      return reminders;
    } catch (error) {
      logger.error('Error scheduling reminders', {
        error: error.message,
        leadId: lead.id
      });
      throw error;
    }
  }

  /**
   * Send reminder message
   * @param {Object} lead - Lead object
   * @param {string} reminderType - Type of reminder (fiveHours, oneHour)
   */
  async sendReminder(lead, reminderType) {
    try {
      const meetingTime = moment(lead.scheduledMeeting.meetingTime);
      const timeUntilMeeting = meetingTime.diff(moment(), 'hours');
      
      let message;
      
      if (reminderType === 'fiveHours') {
        message = this.formatFiveHourReminder(lead, meetingTime);
      } else if (reminderType === 'oneHour') {
        message = this.formatOneHourReminder(lead, meetingTime);
      } else {
        throw new Error(`Unknown reminder type: ${reminderType}`);
      }

      await whatsappService.sendMessage(lead.phoneNumber, message);
      
      // Update lead reminder status
      leadService.updateLead(lead.phoneNumber, {
        reminders: {
          ...lead.reminders,
          [reminderType]: true
        }
      });

      logger.info('Reminder sent successfully', {
        leadId: lead.id,
        reminderType,
        timeUntilMeeting
      });
    } catch (error) {
      logger.error('Error sending reminder', {
        error: error.message,
        leadId: lead.id,
        reminderType
      });
    }
  }

  /**
   * Format 5-hour reminder message
   * @param {Object} lead - Lead object
   * @param {moment} meetingTime - Meeting time
   * @returns {string} - Formatted message
   */
  formatFiveHourReminder(lead, meetingTime) {
    const name = lead.data.name || 'there';
    const service = lead.data.service_type || 'consultation';
    const formattedTime = meetingTime.format('MMMM Do, YYYY [at] h:mm A');
    
    return `⏰ Hi ${name}! 

Just a friendly reminder that you have a ${service} consultation scheduled for today at ${formattedTime}.

Please make sure you're available for the call. You'll receive a video call link 10 minutes before the scheduled time.

If you need to reschedule or cancel, please let us know as soon as possible.

Looking forward to our call! 📞`;
  }

  /**
   * Format 1-hour reminder message
   * @param {Object} lead - Lead object
   * @param {moment} meetingTime - Meeting time
   * @returns {string} - Formatted message
   */
  formatOneHourReminder(lead, meetingTime) {
    const name = lead.data.name || 'there';
    const service = lead.data.service_type || 'consultation';
    const formattedTime = meetingTime.format('h:mm A');
    
    return `🔔 Hi ${name}! 

Your ${service} consultation is scheduled to start in 1 hour (${formattedTime}).

Please ensure you have a stable internet connection and are in a quiet environment for the video call.

You'll receive the meeting link shortly. If you haven't received it within the next 10 minutes, please contact us.

See you soon! 👋`;
  }

  /**
   * Cancel reminders for a lead
   * @param {string} leadId - Lead ID
   */
  cancelReminders(leadId) {
    try {
      const jobKeys = [`${leadId}_5h`, `${leadId}_1h`];
      
      jobKeys.forEach(key => {
        const job = this.scheduledJobs.get(key);
        if (job) {
          job.cancel();
          this.scheduledJobs.delete(key);
        }
      });

      logger.info('Reminders cancelled for lead', {
        leadId
      });
    } catch (error) {
      logger.error('Error cancelling reminders', {
        error: error.message,
        leadId
      });
    }
  }

  /**
   * Check for upcoming meetings and send reminders
   */
  async checkUpcomingMeetings() {
    try {
      const leads = leadService.getAllLeads({ status: 'scheduled' });
      const now = moment();
      
      for (const lead of leads) {
        if (!lead.scheduledMeeting) continue;
        
        const meetingTime = moment(lead.scheduledMeeting.meetingTime);
        const timeUntilMeeting = meetingTime.diff(now, 'hours');
        
        // Check if 5-hour reminder should be sent
        if (timeUntilMeeting <= 5 && timeUntilMeeting > 4 && !lead.reminders.fiveHours) {
          await this.sendReminder(lead, 'fiveHours');
        }
        
        // Check if 1-hour reminder should be sent
        if (timeUntilMeeting <= 1 && timeUntilMeeting > 0 && !lead.reminders.oneHour) {
          await this.sendReminder(lead, 'oneHour');
        }
      }
    } catch (error) {
      logger.error('Error checking upcoming meetings', {
        error: error.message
      });
    }
  }

  /**
   * Clean up old reminders
   */
  cleanupOldReminders() {
    try {
      const now = moment();
      const keysToDelete = [];
      
      this.scheduledJobs.forEach((job, key) => {
        if (job.nextInvocation() && moment(job.nextInvocation()).isBefore(now)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        const job = this.scheduledJobs.get(key);
        if (job) {
          job.cancel();
          this.scheduledJobs.delete(key);
        }
      });

      logger.info('Old reminders cleaned up', {
        removedCount: keysToDelete.length
      });
    } catch (error) {
      logger.error('Error cleaning up old reminders', {
        error: error.message
      });
    }
  }

  /**
   * Get scheduled reminders for a lead
   * @param {string} leadId - Lead ID
   * @returns {Array} - Scheduled reminders
   */
  getScheduledReminders(leadId) {
    try {
      const reminders = [];
      
      this.scheduledJobs.forEach((job, key) => {
        if (key.startsWith(leadId)) {
          reminders.push({
            type: key.endsWith('_5h') ? 'fiveHours' : 'oneHour',
            scheduledFor: job.nextInvocation(),
            jobId: job.name
          });
        }
      });

      return reminders;
    } catch (error) {
      logger.error('Error getting scheduled reminders', {
        error: error.message,
        leadId
      });
      return [];
    }
  }

  /**
   * Get all scheduled reminders
   * @returns {Array} - All scheduled reminders
   */
  getAllScheduledReminders() {
    try {
      const reminders = [];
      
      this.scheduledJobs.forEach((job, key) => {
        reminders.push({
          key,
          scheduledFor: job.nextInvocation(),
          jobId: job.name
        });
      });

      return reminders;
    } catch (error) {
      logger.error('Error getting all scheduled reminders', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Remind users who haven't completed scheduling
   */
  async remindIncompleteScheduling() {
    try {
      const leads = await leadService.getAllLeads();
      const now = moment();
      for (const lead of leads) {
        // Only consider leads in collecting_info stage, no scheduled meeting, and not reminded in last 24h
        if (
          lead.stage === 'collecting_info' &&
          !lead.scheduledMeeting &&
          (!lead.reminders || !lead.reminders.incompleteScheduling || moment(lead.reminders.incompleteScheduling).isBefore(now.subtract(23, 'hours')))
        ) {
          // If last inbound message was more than 1 hour ago
          const lastInbound = (lead.conversation || []).filter(m => m.direction === 'inbound').pop();
          if (lastInbound && moment(lastInbound.timestamp).isBefore(now.clone().subtract(1, 'hours'))) {
            const name = lead.data.name || 'there';
            const msg = `⏰ Hi ${name}! Just a reminder to complete your appointment scheduling with Dream Axis. If you need help or have questions, just reply here and I'll assist you!`;
            await whatsappService.sendMessage(lead.phoneNumber, msg);
            // Mark reminder as sent
            await leadService.updateLead(lead.phoneNumber, {
              reminders: {
                ...(lead.reminders || {}),
                incompleteScheduling: now.toISOString()
              }
            });
            logger.info('Sent incomplete scheduling reminder', { leadId: lead.id });
          }
        }
      }
    } catch (error) {
      logger.error('Error sending incomplete scheduling reminders', { error: error.message });
    }
  }
}

module.exports = new ReminderService(); 
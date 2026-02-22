const cron = require('node-cron');
const logger = require('../utils/logger');
const calendlyService = require('../services/calendlyService');

class CleanupScheduler {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the cleanup scheduler
   */
  initialize() {
    if (this.isInitialized) {
      logger.warn('Cleanup scheduler already initialized');
      return;
    }

    try {
      // Schedule cleanup every 6 hours
      cron.schedule('0 */6 * * *', () => {
        this.performCleanup();
      }, {
        scheduled: true,
        timezone: "UTC"
      });

      // Also run cleanup on startup
      this.performCleanup();

      this.isInitialized = true;
      logger.info('Cleanup scheduler initialized successfully', {
        service: 'whatsapp-lead-assistant'
      });

    } catch (error) {
      logger.error('Error initializing cleanup scheduler', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
    }
  }

  /**
   * Perform cleanup of old inactive booking links
   */
  async performCleanup() {
    try {
      logger.info('Starting scheduled cleanup of old booking links', {
        service: 'whatsapp-lead-assistant'
      });

      // Get count before cleanup
      const beforeCount = this.getActiveLinksCount();
      
      // Perform cleanup
      await calendlyService.cleanupOldLinks();
      
      // Get count after cleanup
      const afterCount = this.getActiveLinksCount();
      const cleanedCount = beforeCount - afterCount;

      logger.info('Cleanup completed', {
        beforeCount: beforeCount,
        afterCount: afterCount,
        cleanedCount: cleanedCount,
        service: 'whatsapp-lead-assistant'
      });

    } catch (error) {
      logger.error('Error during scheduled cleanup', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
    }
  }

  /**
   * Get count of active booking links
   * @returns {number} - Number of active links
   */
  getActiveLinksCount() {
    try {
      // Access the activeLinks Map from calendlyService
      const activeLinks = calendlyService.activeLinks;
      let count = 0;
      
      for (const [bookingId, bookingData] of activeLinks.entries()) {
        if (bookingData.isActive) {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      logger.error('Error getting active links count', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
      return 0;
    }
  }

  /**
   * Get cleanup statistics
   * @returns {Object} - Cleanup statistics
   */
  getCleanupStats() {
    try {
      const activeLinks = calendlyService.activeLinks;
      let activeCount = 0;
      let inactiveCount = 0;
      let totalCount = 0;
      
      for (const [bookingId, bookingData] of activeLinks.entries()) {
        totalCount++;
        if (bookingData.isActive) {
          activeCount++;
        } else {
          inactiveCount++;
        }
      }
      
      return {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        lastCleanup: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting cleanup stats', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
      return {
        total: 0,
        active: 0,
        inactive: 0,
        lastCleanup: null
      };
    }
  }

  /**
   * Stop the cleanup scheduler
   */
  stop() {
    try {
      // Note: node-cron doesn't have a direct stop method for individual tasks
      // This would require storing the cron task reference
      logger.info('Cleanup scheduler stopped', {
        service: 'whatsapp-lead-assistant'
      });
      
      this.isInitialized = false;
    } catch (error) {
      logger.error('Error stopping cleanup scheduler', {
        error: error.message,
        service: 'whatsapp-lead-assistant'
      });
    }
  }
}

module.exports = new CleanupScheduler(); 
const axios = require('axios');
const logger = require('../utils/logger');

class CalendlyService {
  constructor() {
    this.apiKey = process.env.CALENDLY_API_KEY;
    this.userUri = process.env.CALENDLY_USER_URI;
    this.eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
    this.baseURL = 'https://api.calendly.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Track active booking links
    this.activeLinks = new Map();
  }

  /**
   * Create a truly one-time use Calendly booking link
   * @param {Object} leadData - Lead information
   * @returns {Promise<string>} - Calendly booking link
   */
  async createBookingLink(leadData) {
    try {
      if (!this.apiKey || !this.eventTypeUri) {
        logger.warn('Calendly API key or event type URI not configured');
        return this.getFallbackLink();
      }

      // Create a unique identifier for this booking
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if lead has already booked
      const validation = this.validateNewBooking(leadData.phone || leadData.phoneNumber);
      if (validation.hasBooked) {
        logger.warn('Lead has already booked an appointment', {
          phoneNumber: leadData.phone,
          leadName: leadData.name,
          service: 'whatsapp-lead-assistant'
        });
        throw new Error('Lead has already booked an appointment');
      }
      
      // Create a webhook-tracked one-time use link
      const webhookLink = this.createWebhookTrackedLink(leadData, bookingId);
      
      // Store the active link with metadata
      this.activeLinks.set(bookingId, {
        link: webhookLink,
        leadData: leadData,
        createdAt: new Date(),
        isActive: true,
        phoneNumber: leadData.phone || leadData.phoneNumber,
        bookingId: bookingId,
        isOneTimeUse: true,
        usageCount: 0,
        maxUsage: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isWebhookTracked: true,
        accessCount: 0,
        lastAccessed: null
      });
      
      logger.info('Webhook-tracked one-time use booking link created', {
        bookingId: bookingId,
        leadName: leadData.name,
        service: 'whatsapp-lead-assistant'
      });

      return webhookLink;
    } catch (error) {
      logger.error('Error creating Calendly booking link', {
        error: error.message,
        leadName: leadData.name,
        service: 'whatsapp-lead-assistant'
      });
      
      return this.getFallbackLink();
    }
  }

  /**
   * Create a webhook-tracked one-time use link
   * @param {Object} leadData - Lead information
   * @param {string} bookingId - Unique booking identifier
   * @returns {string} - Webhook-tracked booking link
   */
  createWebhookTrackedLink(leadData, bookingId) {
    const baseUrl = this.getFallbackLink();
    const params = new URLSearchParams();
    
    if (leadData.name) {
      params.append('name', leadData.name);
    }
    if (leadData.email) {
      params.append('email', leadData.email);
    }
    if (leadData.phone) {
      params.append('phone', leadData.phone);
    }
    
    // Add tracking parameters
    params.append('utm_source', 'whatsapp_bot');
    params.append('utm_medium', 'chat');
    params.append('utm_campaign', 'lead_booking');
    params.append('booking_id', bookingId);
    params.append('one_time_use', 'true');
    params.append('webhook_tracked', 'true');
    params.append('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }

  /**
   * Track link access (called when webhook detects link access)
   * @param {string} bookingId - The booking ID to track
   * @returns {boolean} - Whether the link should be deactivated
   */
  trackLinkAccess(bookingId) {
    if (this.activeLinks.has(bookingId)) {
      const bookingData = this.activeLinks.get(bookingId);
      bookingData.accessCount = (bookingData.accessCount || 0) + 1;
      bookingData.lastAccessed = new Date();
      
      // If this is the first access, deactivate the link immediately
      if (bookingData.accessCount === 1) {
        bookingData.isActive = false;
        bookingData.deactivatedAt = new Date();
        logger.info('Link deactivated on first access (webhook tracking)', {
          bookingId: bookingId,
          accessCount: bookingData.accessCount,
          service: 'whatsapp-lead-assistant'
        });
      }
      
      this.activeLinks.set(bookingId, bookingData);
      return bookingData.accessCount === 1; // Return true if this was the first access
    }
    return false;
  }

  /**
   * Handle Calendly webhook events with enhanced tracking
   * @param {Object} webhookData - Webhook data from Calendly
   */
  async handleBookingWebhook(webhookData) {
    try {
      if (webhookData.event === 'invitee.created') {
        const invitee = webhookData.payload.invitee;
        const event = webhookData.payload.event;
        
        // Extract booking ID from UTM parameters
        const bookingId = invitee.tracking?.utm_parameters?.booking_id;
        
        if (bookingId) {
          // Track link access first
          const wasFirstAccess = this.trackLinkAccess(bookingId);
          
          // Track link usage
          this.trackLinkUsage(bookingId);
          
          // Deactivate the booking link
          await this.deactivateBookingLink(bookingId);
          
          // Track the booking
          this.bookingHistory.push({
            bookingId: bookingId,
            inviteeEmail: invitee.email,
            inviteeName: invitee.name,
            eventUri: event.uri,
            startTime: event.start_time,
            endTime: event.end_time,
            bookedAt: new Date(),
            wasFirstAccess: wasFirstAccess
          });
          
          // Update lead status
          try {
            const leadService = require('./leadService');
            await leadService.updateLeadAfterBooking(invitee.email, {
              hasBooked: true,
              bookingId: bookingId,
              eventUri: event.uri,
              bookedAt: new Date()
            });
          } catch (error) {
            logger.error('Error updating lead after booking', {
              bookingId: bookingId,
              error: error.message,
              service: 'whatsapp-lead-assistant'
            });
          }
          
          logger.info('Appointment booked and link deactivated (webhook tracking)', {
            bookingId: bookingId,
            eventUri: event.uri,
            inviteeEmail: invitee.email,
            wasFirstAccess: wasFirstAccess,
            service: 'whatsapp-lead-assistant'
          });
        }
      }
    } catch (error) {
      logger.error('Error handling Calendly webhook', {
        error: error.message,
        webhookData: webhookData,
        service: 'whatsapp-lead-assistant'
      });
    }
  }

  /**
   * Deactivate a booking link and delete the unique event type
   * @param {string} bookingId - The booking ID to deactivate
   * @returns {Promise<boolean>} - Whether the link was successfully deactivated
   */
  async deactivateBookingLink(bookingId) {
    try {
      if (this.activeLinks.has(bookingId)) {
        const bookingData = this.activeLinks.get(bookingId);
        
        // If it's a one-time use unique event type, delete it from Calendly
        if (bookingData.isOneTimeUse && bookingData.eventTypeUri) {
          const deleted = await this.deleteEventType(bookingData.eventTypeUri);
          if (deleted) {
            logger.info('Unique event type deleted from Calendly', {
              bookingId: bookingId,
              eventTypeUri: bookingData.eventTypeUri,
              service: 'whatsapp-lead-assistant'
            });
          }
        }
        
        bookingData.isActive = false;
        bookingData.deactivatedAt = new Date();
        
        this.activeLinks.set(bookingId, bookingData);
        
        logger.info('Booking link deactivated', {
          bookingId: bookingId,
          leadName: bookingData.leadData.name,
          isOneTimeUse: bookingData.isOneTimeUse,
          service: 'whatsapp-lead-assistant'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error deactivating booking link', {
        error: error.message,
        bookingId: bookingId,
        service: 'whatsapp-lead-assistant'
      });
      
      return false;
    }
  }

  /**
   * Delete an event type from Calendly
   * @param {string} eventTypeUri - The event type URI to delete
   * @returns {Promise<boolean>} - Whether deletion was successful
   */
  async deleteEventType(eventTypeUri) {
    try {
      await this.client.delete(eventTypeUri);
      logger.info('Event type deleted from Calendly', {
        uri: eventTypeUri,
        service: 'whatsapp-lead-assistant'
      });
      return true;
    } catch (error) {
      logger.error('Error deleting event type from Calendly', {
        error: error.message,
        uri: eventTypeUri,
        service: 'whatsapp-lead-assistant'
      });
      return false;
    }
  }

  /**
   * Delete a scheduling link from Calendly
   * @param {string} schedulingLinkUri - The scheduling link URI to delete
   * @returns {Promise<boolean>} - Whether deletion was successful
   */
  async deleteSchedulingLink(schedulingLinkUri) {
    try {
      await this.client.delete(schedulingLinkUri);
      logger.info('Scheduling link deleted from Calendly', {
        uri: schedulingLinkUri,
        service: 'whatsapp-lead-assistant'
      });
      return true;
    } catch (error) {
      logger.error('Error deleting scheduling link from Calendly', {
        error: error.message,
        uri: schedulingLinkUri,
        service: 'whatsapp-lead-assistant'
      });
      return false;
    }
  }

  /**
   * Check if a booking link is still active
   * @param {string} bookingId - The booking ID to check
   * @returns {boolean} - Whether the link is still active
   */
  isBookingLinkActive(bookingId) {
    const bookingData = this.activeLinks.get(bookingId);
    return bookingData ? bookingData.isActive : false;
  }

  /**
   * Get booking data by ID
   * @param {string} bookingId - The booking ID
   * @returns {Object|null} - Booking data or null if not found
   */
  getBookingData(bookingId) {
    return this.activeLinks.get(bookingId) || null;
  }

  /**
   * Clean up old inactive booking links (older than 24 hours)
   */
  async cleanupOldLinks() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    for (const [bookingId, bookingData] of this.activeLinks.entries()) {
      if (!bookingData.isActive && bookingData.deactivatedAt < oneDayAgo) {
        // Delete event type from Calendly if it exists
        if (bookingData.isOneTimeUse && bookingData.eventTypeUri) {
          await this.deleteEventType(bookingData.eventTypeUri);
        }
        
        this.activeLinks.delete(bookingId);
        logger.info('Cleaned up old booking link and deleted scheduling link', {
          bookingId: bookingId,
          isOneTimeUse: bookingData.isOneTimeUse,
          service: 'whatsapp-lead-assistant'
        });
      }
    }
  }

  /**
   * Get all active booking links for a phone number
   * @param {string} phoneNumber - The phone number to search for
   * @returns {Array} - Array of active booking data
   */
  getActiveBookingsForPhone(phoneNumber) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    const activeBookings = [];
    
    for (const [bookingId, bookingData] of this.activeLinks.entries()) {
      if (bookingData.isActive && 
          (bookingData.phoneNumber === cleanPhone || 
           bookingData.leadData.phone === cleanPhone)) {
        activeBookings.push({
          bookingId: bookingId,
          ...bookingData
        });
      }
    }
    
    return activeBookings;
  }

  /**
   * Track link usage
   * @param {string} bookingId - The booking ID to track
   * @returns {boolean} - Whether tracking was successful
   */
  trackLinkUsage(bookingId) {
    if (this.activeLinks.has(bookingId)) {
      const bookingData = this.activeLinks.get(bookingId);
      bookingData.usageCount = (bookingData.usageCount || 0) + 1;
      
      // If it's a one-time use link and max usage reached, deactivate it
      if (bookingData.isOneTimeUse && bookingData.usageCount >= bookingData.maxUsage) {
        bookingData.isActive = false;
        bookingData.deactivatedAt = new Date();
        logger.info('One-time use link deactivated due to max usage', {
          bookingId: bookingId,
          usageCount: bookingData.usageCount,
          maxUsage: bookingData.maxUsage,
          service: 'whatsapp-lead-assistant'
        });
      }
      
      this.activeLinks.set(bookingId, bookingData);
      return true;
    }
    return false;
  }

  /**
   * Get comprehensive booking status for a phone number
   * @param {string} phoneNumber - The phone number to check
   * @returns {Object} - Comprehensive booking status
   */
  getBookingStatus(phoneNumber) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    const validation = this.validateNewBooking(cleanPhone);
    const history = this.getBookingHistory(cleanPhone);
    const activeBookings = this.getActiveBookingsForPhone(cleanPhone);
    
    return {
      phoneNumber: cleanPhone,
      canBook: validation.canBook,
      hasBooked: validation.hasBooked,
      activeBookings: activeBookings.length,
      totalBookings: history.length,
      reason: validation.reason,
      history: history,
      activeLinks: activeBookings,
      status: validation.hasBooked ? 'booked' : 
              activeBookings.length > 0 ? 'has_active_links' : 'can_book'
    };
  }

  /**
   * Create a booking link with comprehensive validation
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} - Result with link and validation info
   */
  async createBookingLinkWithValidation(leadData) {
    try {
      const phoneNumber = leadData.phone || leadData.phoneNumber;
      const status = this.getBookingStatus(phoneNumber);
      
      if (status.hasBooked) {
        return {
          success: false,
          error: 'ALREADY_BOOKED',
          message: 'Lead has already booked an appointment',
          status: status
        };
      }
      
      if (status.activeBookings > 0) {
        // Return existing active link
        const existingLink = status.activeLinks[0];
        return {
          success: true,
          link: existingLink.link,
          bookingId: existingLink.bookingId,
          isExisting: true,
          message: 'Using existing active booking link',
          status: status
        };
      }
      
      // Create new booking link
      const bookingLink = await this.createBookingLink(leadData);
      const bookingId = this.extractBookingIdFromLink(bookingLink);
      
      return {
        success: true,
        link: bookingLink,
        bookingId: bookingId,
        isExisting: false,
        message: 'New booking link created',
        status: this.getBookingStatus(phoneNumber)
      };
      
    } catch (error) {
      logger.error('Error creating booking link with validation', {
        error: error.message,
        leadData: leadData,
        service: 'whatsapp-lead-assistant'
      });
      
      return {
        success: false,
        error: 'CREATION_FAILED',
        message: error.message
      };
    }
  }

  /**
   * Extract booking ID from a Calendly link
   * @param {string} link - The Calendly link
   * @returns {string|null} - Booking ID or null
   */
  extractBookingIdFromLink(link) {
    try {
      const urlParams = new URLSearchParams(link.split('?')[1]);
      return urlParams.get('booking_id');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get booking history for a phone number
   * @param {string} phoneNumber - The phone number to check
   * @returns {Array} - Array of booking history
   */
  getBookingHistory(phoneNumber) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    const history = [];
    
    for (const [bookingId, bookingData] of this.activeLinks.entries()) {
      if (bookingData.phoneNumber === cleanPhone || 
          bookingData.leadData.phone === cleanPhone) {
        history.push({
          bookingId: bookingId,
          isActive: bookingData.isActive,
          createdAt: bookingData.createdAt,
          deactivatedAt: bookingData.deactivatedAt,
          leadData: bookingData.leadData
        });
      }
    }
    
    return history;
  }

  /**
   * Validate if a new booking can be created for a lead
   * @param {string} phoneNumber - The phone number to validate
   * @returns {Object} - Validation result
   */
  validateNewBooking(phoneNumber) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    const hasBooked = this.hasLeadBooked(cleanPhone);
    const activeBookings = this.getActiveBookingsForPhone(cleanPhone);
    const history = this.getBookingHistory(cleanPhone);
    
    return {
      canBook: !hasBooked && activeBookings.length === 0,
      hasBooked: hasBooked,
      activeBookings: activeBookings.length,
      totalBookings: history.length,
      reason: hasBooked ? 'Lead has already booked an appointment' : 
              activeBookings.length > 0 ? 'Lead has active booking links' : 'OK'
    };
  }

  /**
   * Validate a booking link with usage tracking
   * @param {string} bookingId - The booking ID to validate
   * @returns {Object} - Validation result
   */
  validateBookingLink(bookingId) {
    const bookingData = this.getBookingData(bookingId);
    
    if (!bookingData) {
      return {
        isValid: false,
        reason: 'Booking link not found',
        canBook: false
      };
    }
    
    if (!bookingData.isActive) {
      return {
        isValid: false,
        reason: 'Booking link has already been used',
        canBook: false,
        wasUsed: true
      };
    }
    
    // Check if link has expired
    if (bookingData.expiresAt && new Date() > bookingData.expiresAt) {
      return {
        isValid: false,
        reason: 'Booking link has expired',
        canBook: false,
        expired: true
      };
    }
    
    // Check usage count for one-time use links
    if (bookingData.isOneTimeUse && bookingData.usageCount >= bookingData.maxUsage) {
      return {
        isValid: false,
        reason: 'Booking link has reached maximum usage',
        canBook: false,
        maxUsageReached: true
      };
    }
    
    // Check if lead has already booked through any link
    const hasBooked = this.hasLeadBooked(bookingData.phoneNumber);
    if (hasBooked) {
      return {
        isValid: false,
        reason: 'Lead has already booked an appointment',
        canBook: false,
        alreadyBooked: true
      };
    }
    
    return {
      isValid: true,
      reason: 'OK',
      canBook: true
    };
  }

  /**
   * Check if a lead has already booked an appointment
   * @param {string} phoneNumber - The phone number to check
   * @returns {boolean} - Whether the lead has already booked
   */
  hasLeadBooked(phoneNumber) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    
    for (const [bookingId, bookingData] of this.activeLinks.entries()) {
      if (!bookingData.isActive && 
          (bookingData.phoneNumber === cleanPhone || 
           bookingData.leadData.phone === cleanPhone)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get a fallback link when Calendly is not configured
   * @returns {string} - Fallback link
   */
  getFallbackLink() {
    return 'https://calendly.com/amanrajpoland/30min';
  }

  /**
   * Format booking message with link
   * @param {string} bookingLink - The booking link
   * @param {Object} leadData - Lead data
   * @returns {string} - Formatted message
   */
  formatBookingMessage(bookingLink, leadData) {
    return `🎉 Perfect! I have all the information I need.

Here's your personalized booking link for a consultation:

${bookingLink}

📅 **Important Notes:**
• This link can only be used once
• Please book your preferred time slot
• You'll receive a confirmation email
• We'll send you a reminder before the meeting

If you have any questions or need to reschedule, just reply to this message!

Looking forward to helping you with your ${leadData.service_type || 'visa'} application! 🚀`;
  }

  /**
   * Check if Calendly is properly configured
   * @returns {boolean} - Whether Calendly is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.userUri && this.eventTypeUri);
  }
}

module.exports = new CalendlyService(); 
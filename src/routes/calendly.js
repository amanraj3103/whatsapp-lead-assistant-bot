const express = require('express');
const router = express.Router();
const calendlyService = require('../services/calendlyService');
const logger = require('../utils/logger');

// Calendly webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    logger.info('Calendly webhook received', {
      event: webhookData.event,
      service: 'whatsapp-lead-assistant'
    });
    
    // Handle the webhook event
    await calendlyService.handleBookingWebhook(webhookData);
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    logger.error('Error processing Calendly webhook', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active booking links for a phone number
router.get('/bookings/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const activeBookings = calendlyService.getActiveBookingsForPhone(phoneNumber);
    
    res.json({
      success: true,
      activeBookings: activeBookings,
      count: activeBookings.length
    });
    
  } catch (error) {
    logger.error('Error getting active bookings', {
      error: error.message,
      phoneNumber: req.params.phoneNumber,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually deactivate a booking link
router.post('/bookings/:bookingId/deactivate', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const success = await calendlyService.deactivateBookingLink(bookingId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Booking link deactivated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Booking link not found or already inactive'
      });
    }
    
  } catch (error) {
    logger.error('Error deactivating booking link', {
      error: error.message,
      bookingId: req.params.bookingId,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking status
router.get('/bookings/:bookingId/status', (req, res) => {
  try {
    const { bookingId } = req.params;
    const isActive = calendlyService.isBookingLinkActive(bookingId);
    const bookingData = calendlyService.getBookingData(bookingId);
    
    res.json({
      success: true,
      isActive: isActive,
      bookingData: bookingData
    });
    
  } catch (error) {
    logger.error('Error getting booking status', {
      error: error.message,
      bookingId: req.params.bookingId,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate booking for a phone number
router.get('/validate/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const validation = calendlyService.validateNewBooking(phoneNumber);
    const history = calendlyService.getBookingHistory(phoneNumber);
    
    res.json({
      success: true,
      validation: validation,
      history: history
    });
    
  } catch (error) {
    logger.error('Error validating booking', {
      error: error.message,
      phoneNumber: req.params.phoneNumber,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking history for a phone number
router.get('/history/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const history = calendlyService.getBookingHistory(phoneNumber);
    
    res.json({
      success: true,
      history: history,
      count: history.length
    });
    
  } catch (error) {
    logger.error('Error getting booking history', {
      error: error.message,
      phoneNumber: req.params.phoneNumber,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clean up old booking links
router.post('/cleanup', async (req, res) => {
  try {
    await calendlyService.cleanupOldLinks();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
    
  } catch (error) {
    logger.error('Error during cleanup', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
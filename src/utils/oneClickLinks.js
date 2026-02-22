const logger = require('./logger');

// In-memory store for one-click-expiry links
const oneClickLinks = {};

/**
 * Create a one-click-expiry booking link
 * @param {string} calendlyLink - The Calendly booking link
 * @returns {string} - The unique token
 */
function createOneClickLink(calendlyLink) {
  const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  oneClickLinks[token] = {
    calendlyLink,
    used: false,
    createdAt: Date.now()
  };
  
  logger.info('One-click booking link created', {
    token: token,
    calendlyLink: calendlyLink,
    service: 'whatsapp-lead-assistant'
  });
  
  return token;
}

/**
 * Get a one-click link entry
 * @param {string} token - The token to look up
 * @returns {Object|null} - The link entry or null if not found
 */
function getOneClickLink(token) {
  return oneClickLinks[token] || null;
}

/**
 * Mark a one-click link as used
 * @param {string} token - The token to mark as used
 * @returns {boolean} - True if marked as used, false if not found
 */
function markOneClickLinkAsUsed(token) {
  const entry = oneClickLinks[token];
  if (entry && !entry.used) {
    entry.used = true;
    logger.info('One-click booking link marked as used', {
      token: token,
      calendlyLink: entry.calendlyLink,
      service: 'whatsapp-lead-assistant'
    });
    return true;
  }
  return false;
}

/**
 * Clean up old one-click links (older than 24 hours)
 */
function cleanupOldOneClickLinks() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  const beforeCount = Object.keys(oneClickLinks).length;
  
  Object.keys(oneClickLinks).forEach(token => {
    const entry = oneClickLinks[token];
    if (now - entry.createdAt > maxAge) {
      delete oneClickLinks[token];
    }
  });
  
  const afterCount = Object.keys(oneClickLinks).length;
  const cleanedCount = beforeCount - afterCount;
  
  if (cleanedCount > 0) {
    logger.info('Cleaned up old one-click links', {
      beforeCount,
      afterCount,
      cleanedCount,
      service: 'whatsapp-lead-assistant'
    });
  }
}

module.exports = {
  createOneClickLink,
  getOneClickLink,
  markOneClickLinkAsUsed,
  cleanupOldOneClickLinks
}; 
const crypto = require('crypto');
const logger = require('../utils/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = process.env.ENCRYPTION_KEY;
    this.iv = process.env.ENCRYPTION_IV;
    
    if (!this.key || !this.iv) {
      logger.warn('Encryption key or IV not found in environment variables. Using fallback encryption.');
      // Generate fallback keys (not recommended for production)
      this.key = crypto.randomBytes(32);
      this.iv = crypto.randomBytes(16);
    } else {
      // Convert string keys to buffers
      this.key = Buffer.from(this.key, 'hex');
      this.iv = Buffer.from(this.iv, 'hex');
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text (hex string)
   */
  encrypt(text) {
    try {
      if (!text) return null;
      
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      logger.debug('Data encrypted successfully', {
        originalLength: text.length,
        encryptedLength: encrypted.length
      });
      
      return encrypted;
    } catch (error) {
      logger.error('Error encrypting data', {
        error: error.message
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Encrypted text (hex string)
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedText) {
    try {
      if (!encryptedText) return null;
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Data decrypted successfully', {
        encryptedLength: encryptedText.length,
        decryptedLength: decrypted.length
      });
      
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting data', {
        error: error.message
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt lead data (email and phone)
   * @param {Object} leadData - Lead data object
   * @returns {Object} - Lead data with encrypted sensitive fields
   */
  encryptLeadData(leadData) {
    try {
      const encryptedData = { ...leadData };
      
      if (leadData.email) {
        encryptedData.email = this.encrypt(leadData.email);
      }
      
      if (leadData.phone) {
        encryptedData.phone = this.encrypt(leadData.phone);
      }
      
      logger.info('Lead data encrypted', {
        hasEmail: !!leadData.email,
        hasPhone: !!leadData.phone
      });
      
      return encryptedData;
    } catch (error) {
      logger.error('Error encrypting lead data', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Decrypt lead data (email and phone)
   * @param {Object} leadData - Lead data object with encrypted fields
   * @returns {Object} - Lead data with decrypted sensitive fields
   */
  decryptLeadData(leadData) {
    try {
      const decryptedData = { ...leadData };
      
      if (leadData.email) {
        decryptedData.email = this.decrypt(leadData.email);
      }
      
      if (leadData.phone) {
        decryptedData.phone = this.decrypt(leadData.phone);
      }
      
      logger.info('Lead data decrypted', {
        hasEmail: !!leadData.email,
        hasPhone: !!leadData.phone
      });
      
      return decryptedData;
    } catch (error) {
      logger.error('Error decrypting lead data', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Hash data for comparison (one-way encryption)
   * @param {string} text - Text to hash
   * @returns {string} - Hashed text
   */
  hash(text) {
    try {
      if (!text) return null;
      
      const hash = crypto.createHash('sha256');
      hash.update(text);
      
      return hash.digest('hex');
    } catch (error) {
      logger.error('Error hashing data', {
        error: error.message
      });
      throw new Error('Hashing failed');
    }
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of random string
   * @returns {string} - Random string
   */
  generateRandomString(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Error generating random string', {
        error: error.message
      });
      throw new Error('Random string generation failed');
    }
  }

  /**
   * Mask sensitive data for display (e.g., email@***.com)
   * @param {string} text - Text to mask
   * @param {string} type - Type of data (email, phone)
   * @returns {string} - Masked text
   */
  maskSensitiveData(text, type = 'email') {
    try {
      if (!text) return '';
      
      switch (type) {
        case 'email':
          const [localPart, domain] = text.split('@');
          if (domain) {
            return `${localPart.charAt(0)}***@${domain}`;
          }
          return text;
          
        case 'phone':
          if (text.length > 4) {
            return `***${text.slice(-4)}`;
          }
          return '***';
          
        default:
          return text;
      }
    } catch (error) {
      logger.error('Error masking sensitive data', {
        error: error.message,
        type
      });
      return '***';
    }
  }
}

module.exports = new EncryptionService(); 
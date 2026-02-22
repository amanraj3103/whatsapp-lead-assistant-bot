require('dotenv').config();
console.log('DEBUG OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const whatsappRoutes = require('./routes/whatsapp');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');
const dailyReportScheduler = require('./schedulers/dailyReportScheduler');
const cleanupScheduler = require('./schedulers/cleanupScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/test', require('./routes/test'));
app.use('/api/calendly', require('./routes/calendly'));

const oneClickLinks = require('./utils/oneClickLinks');

/**
 * Route: /booking/:token
 * Redirects to Calendly if unused, else shows expired message
 */
app.get('/booking/:token', (req, res) => {
  const { token } = req.params;
  const entry = oneClickLinks.getOneClickLink(token);
  
  if (!entry) {
    return res.status(404).send(`
      <html>
        <head><title>Invalid Link</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Invalid or expired booking link</h2>
          <p>This link is no longer valid. Please contact us for a new booking link.</p>
        </body>
      </html>
    `);
  }
  
  if (entry.used) {
    return res.status(410).send(`
      <html>
        <head><title>Link Expired</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>⏰ This booking link has already been used</h2>
          <p>This link can only be used once and is now expired.</p>
          <p>Please contact us for a new booking link if needed.</p>
        </body>
      </html>
    `);
  }
  
  // Mark as used and redirect
  oneClickLinks.markOneClickLinkAsUsed(token);
  res.redirect(entry.calendlyLink);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Lead Assistant Bot server running on port ${PORT}`);
  logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Initialize schedulers
  dailyReportScheduler.initialize();
  cleanupScheduler.initialize();
  logger.info('📅 Daily report scheduler initialized');
  logger.info('🧹 Cleanup scheduler initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 
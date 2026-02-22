# WhatsApp Lead Assistant Bot

A comprehensive AI-powered WhatsApp lead generation and management system that automatically collects lead information, schedules meetings via Calendly, sends reminders, and generates daily reports.

## 🚀 Features

### Core Functionality
- **AI-Powered Conversations**: Uses OpenAI GPT to understand and respond to user messages intelligently
- **Lead Information Collection**: Automatically collects:
  - Full Name
  - Email Address
  - Phone Number
  - Country of Interest
  - Type of Service (Study/Work/Visa Help)
  - Preferred Date and Time for Call
  - Additional Notes or Questions

### Automation Features
- **Calendly Integration**: Creates personalized booking links for each lead
- **Automated Reminders**: Sends WhatsApp reminders 5 hours and 1 hour before scheduled meetings
- **Daily Reports**: Automatically generates PDF and Excel reports of all daily conversations
- **Email Notifications**: Sends reports to business owners via email

### Security & Data Protection
- **Encryption**: All sensitive data (email, phone) is encrypted using AES-256
- **Secure Webhooks**: Twilio signature verification for webhook security
- **Rate Limiting**: Built-in protection against abuse
- **Comprehensive Logging**: Detailed logs for monitoring and debugging

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Twilio Account (for WhatsApp Business API)
- OpenAI API Key
- Calendly Account (optional)
- SMTP Email Service (for reports)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp_lead_assistant_bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # WhatsApp Business API (Twilio)
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=whatsapp:+1234567890

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-3.5-turbo

   # Calendly Configuration
   CALENDLY_API_KEY=your_calendly_api_key
   CALENDLY_USER_URI=your_calendly_user_uri
   CALENDLY_EVENT_TYPE_URI=your_calendly_event_type_uri

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ADMIN_EMAIL=admin@yourcompany.com

   # Encryption (generate secure keys)
   ENCRYPTION_KEY=your_32_character_encryption_key_here
   ENCRYPTION_IV=your_16_character_iv_here

   # Business Configuration
   COMPANY_NAME=Your Company Name
   COMPANY_WEBSITE=https://yourcompany.com
   ```

4. **Generate encryption keys**
   ```bash
   node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'));"
   node -e "console.log('ENCRYPTION_IV=' + require('crypto').randomBytes(16).toString('hex'));"
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Configuration

### Twilio WhatsApp Business API Setup

1. Create a Twilio account and get your Account SID and Auth Token
2. Set up WhatsApp Business API in Twilio Console
3. Configure webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
4. Add your Twilio phone number to environment variables

### Calendly Integration

1. Get your Calendly API key from your account settings
2. Find your User URI and Event Type URI
3. Add to environment variables

### OpenAI Configuration

1. Get your OpenAI API key from OpenAI Console
2. Add to environment variables
3. Choose your preferred model (gpt-3.5-turbo recommended)

## 📱 API Endpoints

### WhatsApp Webhook
- `POST /api/whatsapp/webhook` - Handle incoming WhatsApp messages
- `GET /api/whatsapp/webhook` - Webhook verification
- `POST /api/whatsapp/send` - Send WhatsApp message manually
- `GET /api/whatsapp/status/:messageSid` - Get message status
- `GET /api/whatsapp/conversation/:phoneNumber` - Get conversation summary

### Admin API
- `GET /api/admin/leads` - Get all leads with filtering
- `GET /api/admin/leads/:leadId` - Get specific lead
- `PUT /api/admin/leads/:leadId` - Update lead
- `DELETE /api/admin/leads/:leadId` - Delete lead
- `GET /api/admin/statistics` - Get system statistics
- `POST /api/admin/reports/generate` - Generate daily report
- `GET /api/admin/reports/list` - List available reports
- `GET /api/admin/reports/download/:filename` - Download report
- `POST /api/admin/reminders/send` - Send reminder manually
- `GET /api/admin/reminders/scheduled` - Get scheduled reminders
- `GET /api/admin/system/health` - System health check

## 🔄 Conversation Flow

1. **Initial Contact**: User sends first message
2. **Greeting**: Bot welcomes and asks for name
3. **Information Collection**: Bot collects required lead information
4. **Service Selection**: User chooses service type
5. **Scheduling**: Bot asks for preferred meeting time
6. **Calendly Link**: Bot sends personalized booking link
7. **Reminders**: Automated reminders sent before meeting
8. **Completion**: Conversation marked as complete

## 📊 Reporting

### Daily Reports
- Automatically generated at 11:59 PM daily
- Includes PDF and Excel formats
- Sent via email to admin
- Contains all lead conversations and statistics

### Report Contents
- Lead information (encrypted data decrypted for reports)
- Conversation history
- Meeting scheduling status
- Service type breakdown
- Summary statistics

## 🔒 Security Features

- **Data Encryption**: AES-256 encryption for sensitive data
- **Webhook Verification**: Twilio signature validation
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Joi schema validation
- **Error Handling**: Comprehensive error logging
- **Secure Headers**: Helmet.js security headers

## 📈 Monitoring

### Health Check
- `GET /health` - Basic health status
- `GET /api/admin/system/health` - Detailed system health

### Logging
- Winston logger with file and console output
- Structured logging with metadata
- Error tracking and debugging information

### Statistics
- Lead conversion rates
- Service type distribution
- Meeting scheduling success
- System uptime and performance

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   PORT=3000
   ```

2. **Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "whatsapp-bot"
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **SSL Certificate**
   ```bash
   # Using Let's Encrypt
   sudo certbot --nginx -d yourdomain.com
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

### Manual Testing
```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"From": "whatsapp:+1234567890", "Body": "Hello", "MessageSid": "test123"}'

# Test sending message
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'
```

### Automated Testing
```bash
npm test
```

## 🔧 Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check Twilio webhook URL configuration
   - Verify server is accessible from internet
   - Check webhook signature verification

2. **OpenAI API errors**
   - Verify API key is correct
   - Check API quota and billing
   - Ensure model name is valid

3. **Calendly integration issues**
   - Verify API key and URIs
   - Check event type configuration
   - Ensure proper permissions

4. **Email not sending**
   - Check SMTP configuration
   - Verify email credentials
   - Check firewall/network settings

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the logs for error details

## 🔄 Updates

### Version 1.0.0
- Initial release with core functionality
- WhatsApp Business API integration
- OpenAI-powered conversations
- Calendly scheduling
- Automated reminders
- Daily reporting system
- Admin dashboard API
 
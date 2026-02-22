const express = require('express');
const router = express.Router();
const mockWhatsAppService = require('../services/mockWhatsAppService');
const conversationHandler = require('../services/conversationHandler');
const logger = require('../utils/logger');

// Test chat interface
router.get('/chat', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Bot Test Interface</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chat-container { 
          height: 400px; 
          border: 1px solid #ccc; 
          overflow-y: scroll; 
          padding: 10px; 
          margin-bottom: 10px;
          background: #f9f9f9;
        }
        .message { margin: 5px 0; padding: 8px; border-radius: 8px; }
        .user-message { background: #dcf8c6; margin-left: 20%; }
        .bot-message { background: #fff; margin-right: 20%; }
        .input-container { display: flex; gap: 10px; }
        #message-input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        button { padding: 10px 20px; background: #25d366; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #128c7e; }
        .controls { margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 4px; }
        .phone-input { width: 200px; padding: 5px; margin-right: 10px; }
      </style>
    </head>
    <body>
      <h1>📱 WhatsApp Lead Assistant Bot - Test Interface</h1>
      
      <div class="controls">
        <strong>Phone Number:</strong> 
        <input type="text" id="phone-input" class="phone-input" value="+1234567890" placeholder="Enter phone number">
        <button onclick="clearChat()">Clear Chat</button>
        <button onclick="loadSampleConversation()">Load Sample</button>
      </div>
      
      <div id="chat-container" class="chat-container"></div>
      
      <div class="input-container">
        <input type="text" id="message-input" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
        <button onclick="sendMessage()">Send</button>
      </div>
      
      <div style="margin-top: 20px;">
        <h3>Quick Test Messages:</h3>
        <button onclick="sendQuickMessage('Hi')">Hi</button>
        <button onclick="sendQuickMessage('My name is John Doe')">Name</button>
        <button onclick="sendQuickMessage('john@example.com')">Email</button>
        <button onclick="sendQuickMessage('+1234567890')">Phone</button>
        <button onclick="sendQuickMessage('Canada')">Country</button>
        <button onclick="sendQuickMessage('Study visa')">Service</button>
      </div>
      
      <script>
        let conversationHistory = [];
        
        function handleKeyPress(event) {
          if (event.key === 'Enter') {
            sendMessage();
          }
        }
        
        async function sendMessage() {
          const input = document.getElementById('message-input');
          const phoneInput = document.getElementById('phone-input');
          const message = input.value.trim();
          const phone = phoneInput.value.trim();
          
          if (!message || !phone) return;
          
          // Add user message to chat
          addToChat('You', message, 'user-message');
          input.value = '';
          
          try {
            // Send to bot
            const response = await fetch('/api/test/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                From: 'whatsapp:' + phone,
                Body: message,
                MessageSid: 'test_' + Date.now()
              })
            });
            
            const result = await response.json();
            
            if (result.success && result.response) {
              addToChat('Bot', result.response, 'bot-message');
            } else if (result.error) {
              addToChat('System', 'Error: ' + result.error, 'bot-message');
            }
          } catch (error) {
            addToChat('System', 'Error: ' + error.message, 'bot-message');
          }
        }
        
        function sendQuickMessage(message) {
          document.getElementById('message-input').value = message;
          sendMessage();
        }
        
        function addToChat(sender, message, className) {
          const container = document.getElementById('chat-container');
          const messageDiv = document.createElement('div');
          messageDiv.className = 'message ' + className;
          messageDiv.innerHTML = '<strong>' + sender + ':</strong> ' + message;
          container.appendChild(messageDiv);
          container.scrollTop = container.scrollHeight;
          
          // Store in history
          conversationHistory.push({ sender, message, timestamp: new Date() });
        }
        
        function clearChat() {
          document.getElementById('chat-container').innerHTML = '';
          conversationHistory = [];
        }
        
        function loadSampleConversation() {
          clearChat();
          const samples = [
            'Hi',
            'My name is Sarah Johnson',
            'sarah.johnson@email.com',
            '+1555123456',
            'Australia',
            'Work visa'
          ];
          
          let delay = 0;
          samples.forEach((message, index) => {
            setTimeout(() => {
              document.getElementById('message-input').value = message;
              sendMessage();
            }, delay);
            delay += 2000; // 2 second delay between messages
          });
        }
        
        // Auto-focus on input
        document.getElementById('message-input').focus();
      </script>
    </body>
    </html>
  `);
});

// Test message endpoint
router.post('/message', async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing From or Body' 
      });
    }

    // Process through conversation handler
    const response = await conversationHandler.handleIncomingMessage({
      From,
      Body,
      MessageSid,
      AccountSid: 'test_account_sid',
      To: process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+1234567890'
    });

    logger.info('Test message processed', {
      from: From,
      messageLength: Body.length,
      responseLength: response ? response.length : 0,
      service: 'whatsapp-lead-assistant'
    });

    res.json({
      success: true,
      response: response,
      messageId: MessageSid
    });

  } catch (error) {
    logger.error('Error processing test message', {
      error: error.message,
      service: 'whatsapp-lead-assistant'
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get message history
router.get('/history', (req, res) => {
  const history = mockWhatsAppService.getMessageHistory();
  res.json({
    success: true,
    messages: history,
    count: history.length
  });
});

// Clear message history
router.delete('/history', (req, res) => {
  mockWhatsAppService.clearHistory();
  res.json({
    success: true,
    message: 'Message history cleared'
  });
});

module.exports = router; 
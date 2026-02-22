const OpenAI = require('openai');
const logger = require('../utils/logger');

class NLPService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  /**
   * Analyze user message and extract intent and entities
   * @param {string} message - User message
   * @param {Object} conversationContext - Previous conversation context
   * @returns {Promise<Object>} - Analysis result with intent and entities
   */
  async analyzeMessage(message, conversationContext = {}) {
    try {
      // Add language instruction if provided in conversationContext
      let languageInstruction = '';
      if (conversationContext && conversationContext.language) {
        languageInstruction = `\nUSER LANGUAGE: ${conversationContext.language}\nAlways reply in ${conversationContext.language} unless the user requests otherwise.`;
      }
      const systemPrompt = `You are an AI assistant for a business that helps with Education (India/Abroad) and Job (Europe) services. 

IMPORTANT: You are a customer service agent for Dream Axis. Your primary goal is to collect lead information and help with service inquiries. While you can be conversational and friendly, you should always steer conversations back to your services and lead collection when appropriate.

MULTI-LANGUAGE SUPPORT: Detect the user's language and reply in the same language. If the user requests a different language, switch to that language for the rest of the conversation. Always be conversational and professional in the user's preferred language.${languageInstruction}

CRITICAL: Only ask for ONE missing field at a time. Do NOT ask for multiple pieces of information in a single message. If there are multiple missing fields, ask for the most important or next required one based on the flow. Do not say "please provide your name, email, phone, etc." in one message.

If the user asks for clarification about a term (e.g., 'What is a C+E license?', 'What does HGV mean?'), provide a brief, helpful explanation using the FAQ below, then return to the flow and ask for the required info.

FAQ/Knowledge Base:
- C+E License: "A C+E license allows you to drive large trucks with trailers in Europe."
- HGV: "HGV stands for Heavy Goods Vehicle, a common term for large trucks in the UK."
- CDL: "CDL stands for Commercial Driver’s License, required for truck drivers in the US/Canada."
- Driver CPC: "Driver CPC is a certificate of professional competence required for professional drivers in the EU/UK."
- MBBS: "MBBS stands for Bachelor of Medicine, Bachelor of Surgery, a medical degree."
- Engineering: "Engineering is a field of study focused on designing and building structures, machines, and technology."
- Nursing: "Nursing is a healthcare profession focused on caring for patients."
- HMV: "HMV stands for Heavy Motor Vehicle, a license category for driving large vehicles in India."
- LMV: "LMV stands for Light Motor Vehicle, a license category for driving cars and small vehicles in India."
- ITI: "ITI stands for Industrial Training Institute, which offers technical and vocational training in India."
- GNM: "GNM stands for General Nursing and Midwifery, a diploma course in nursing in India."
- ANM: "ANM stands for Auxiliary Nurse Midwife, a diploma course focused on community health and midwifery in India."
- Aadhaar: "Aadhaar is a unique 12-digit identification number issued to Indian residents by the government."
- PAN: "PAN stands for Permanent Account Number, a unique identifier for tax purposes in India."

Your task is to:
1. Understand the user's intent and emotions
2. Extract relevant information from their message
3. Consider conversation context and history
4. Provide appropriate responses that maintain focus on your services
5. Always ask for only the next missing field, not all at once.
6. If the user asks a question about a term, answer it briefly, then continue the flow.

Lead information to collect (depending on service):
- service: Education India, Education Abroad, Job Europe
- education_place: (for Education India)
- education_country: (for Education Abroad)
- course: (for Education India/Abroad)
- work_type: (for Job Europe)
- name: Full Name
- number: Contact Number
- email: Email Address
- residence: Place of Residence

Current conversation context: ${JSON.stringify(conversationContext)}

Respond in JSON format:
{
  "intent": "greeting|lead_collection|service_inquiry|scheduling|goodbye|question|complaint|off_topic|other",
  "confidence": 0.0-1.0,
  "emotion": "happy|neutral|frustrated|confused|excited|worried",
  "entities": {
    "service": "Education India|Education Abroad|Job Europe|null",
    "education_place": "Bangalore|Mangalore|Kerala|Others|null",
    "education_country": "UK|Europe|Australia|Canada|USA|null",
    "course": "Nursing|Engineering|MBBS|Others|null",
    "work_type": "Truck Driver|Others|null",
    "name": "extracted name or null",
    "number": "extracted contact number or null",
    "email": "extracted email or null",
    "residence": "extracted place of residence or null"
  },
  "missing_fields": ["array of missing required fields for the selected service"],
  "response_type": "conversational|question|confirmation|information|redirect|refocus|explanation_then_question",
  "context_understanding": "brief description of what user is trying to achieve",
  "should_refocus": true/false,
  "refocus_reason": "reason to steer conversation back to services if applicable",
  "suggested_response": "If user asked a question about a term, first provide a brief explanation, then ask for the next missing field. Otherwise, just ask for the next missing field."
}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Fallback extraction for phone number, email, and name if missing
      // Phone number (10-15 digits, allows + at start)
      if (!analysis.entities.number || analysis.entities.number === 'null') {
        const phoneMatch = message.match(/[+]?\d{10,15}/);
        if (phoneMatch) analysis.entities.number = phoneMatch[0];
      }
      // Email
      if (!analysis.entities.email || analysis.entities.email === 'null') {
        const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) analysis.entities.email = emailMatch[0];
      }
      // Name (simple heuristic: if message contains 2+ capitalized words, treat as name)
      if (!analysis.entities.name || analysis.entities.name === 'null') {
        const nameMatch = message.match(/([A-Z][a-z]+\s[A-Z][a-z]+)/);
        if (nameMatch) analysis.entities.name = nameMatch[0];
      }

      logger.info('Message analysis completed', {
        intent: analysis.intent,
        confidence: analysis.confidence,
        emotion: analysis.emotion,
        entitiesFound: Object.keys(analysis.entities).filter(key => analysis.entities[key] !== null),
        shouldRefocus: analysis.should_refocus
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing message with NLP', {
        error: error.message,
        message: message.substring(0, 100) // Log first 100 chars for debugging
      });
      
      // Fallback analysis
      return {
        intent: 'other',
        confidence: 0.5,
        emotion: 'neutral',
        entities: {},
        missing_fields: ['name', 'email', 'phone', 'country', 'service_type'],
        response_type: 'conversational',
        context_understanding: 'User sent a message that needs processing',
        should_refocus: false,
        refocus_reason: null,
        suggested_response: "I'm here to help you with our immigration and study abroad services. Tell me a bit about yourself and what you're looking for! 😊"
      };
    }
  }

  /**
   * Generate personalized response based on conversation state
   * @param {Object} analysis - NLP analysis result
   * @param {Object} leadData - Current lead data
   * @param {string} conversationStage - Current stage of conversation
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(analysis, leadData = {}, conversationStage = 'initial') {
    try {
      const systemPrompt = `You are a friendly, professional WhatsApp assistant for a business that helps with Study, Work, and Visa services.

CRITICAL: You are a customer service agent for an HR/immigration company. Your primary role is to:
1. Collect lead information (name, email, phone, country, service type)
2. Help with service inquiries
3. Schedule consultations
4. Provide information about immigration/study abroad services

IMPORTANT GUIDELINES:
- Be conversational, warm, and human-like
- Always maintain focus on your services and lead collection
- If user asks off-topic questions, politely acknowledge and steer back to your services
- Don't ask rigid questions - have natural conversation flow
- Use emojis appropriately and naturally
- Keep responses concise but engaging (2-4 sentences max)
- Sound like a helpful human assistant, not a form-filling bot

Current lead data: ${JSON.stringify(leadData)}
Conversation stage: ${conversationStage}
Analysis: ${JSON.stringify(analysis)}

Generate a natural, conversational response that:
1. Acknowledges the user's message and emotions
2. Shows understanding of their context and needs
3. If off-topic, politely redirects to your services
4. Asks for missing information naturally (not as rigid questions)
5. Maintains a professional but warm, friendly tone
6. Uses emojis appropriately and naturally
7. Keeps responses concise but engaging (2-4 sentences max)

Examples of good responses:
- "That's great! I'd love to help you with your study abroad plans. What's your name?"
- "Perfect! Canada is an excellent choice for international students. What are you planning to study?"
- "I understand you're busy! Let me help you get this sorted quickly. What's your email so I can send you the details?"
- "That's an interesting question! But I'm here specifically to help with immigration and study abroad services. What brings you to us today?"

For off-topic questions, acknowledge briefly and redirect:
- "That's a great question! But I'm here to help with immigration and study abroad services. What can I assist you with today?"
- "I'd love to chat about that, but my expertise is in helping people with their immigration and study abroad plans. What brings you here today?"`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a conversational response based on the analysis and context provided.' }
        ],
        temperature: 0.8,
        max_tokens: 300
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error generating response', {
        error: error.message
      });
      
      // Fallback responses based on intent and emotion
      const fallbackResponses = {
        greeting: {
          happy: "👋 Hi there! I'm so glad you reached out! I'm here to help with immigration and study abroad services. How can I assist you today? 😊",
          neutral: "👋 Hello! I'm here to help you with our immigration and study abroad services. What brings you here today?",
          frustrated: "👋 Hi! I understand you might be feeling frustrated. Let me help make this process as smooth as possible for you.",
          confused: "👋 Hello! I'm here to help clarify everything about our immigration and study abroad services. What questions do you have?",
          excited: "👋 Wow, I love your enthusiasm! I'm excited to help you with your immigration and study abroad plans! What are you looking for? 🎉",
          worried: "👋 Hi there! Don't worry, I'm here to help guide you through the immigration and study abroad process step by step."
        },
        lead_collection: {
          happy: "That's wonderful! I'd love to help you get started with our services. What's your name? 😊",
          neutral: "Great! Let me get some information to help you better with our services. What should I call you?",
          frustrated: "I understand this might seem like a lot of questions. Let's take it step by step - what's your name?",
          confused: "No worries! Let me help you through this process. What's your name?",
          excited: "Fantastic! I'm excited to help you with our services! What's your name? 🎉",
          worried: "Don't worry, I'm here to help! What's your name?"
        },
        service_inquiry: {
          happy: "Excellent! We offer study abroad programs, work visa assistance, and visa application support. Which one interests you? 😊",
          neutral: "We have several services - study abroad programs, work visa assistance, and visa application support. What are you looking for?",
          frustrated: "I understand you want to know about our services. We offer study, work, and visa assistance. Which one do you need help with?",
          confused: "Let me clarify our services - we help with study abroad, work visas, and visa applications. Which one are you interested in?",
          excited: "Amazing! We have study abroad, work visas, and visa assistance. Which one excites you most? 🎉",
          worried: "Don't worry, we have solutions for you! We offer study, work, and visa services. Which one do you need?"
        },
        scheduling: {
          happy: "Perfect! I'd love to schedule a call with you! Let me get that set up right away! 🎉",
          neutral: "Great! Let me help you schedule a consultation call. I'll generate a booking link for you.",
          frustrated: "I understand you want to get this scheduled. Let me make that happen for you right now.",
          confused: "No problem! Let me help you schedule a call. I'll create a booking link for you.",
          excited: "Fantastic! I'm excited to schedule our call! Let me get that set up for you! 🎉",
          worried: "Don't worry about the scheduling process. Let me handle that for you right now."
        },
        off_topic: {
          happy: "That's an interesting topic! But I'm here specifically to help with immigration and study abroad services. What brings you to us today? 😊",
          neutral: "That's a great question! However, I'm here to help with our immigration and study abroad services. What can I assist you with?",
          frustrated: "I understand your question, but my expertise is in immigration and study abroad services. How can I help you with that?",
          confused: "That's an interesting point! But I'm here to help with immigration and study abroad services. What questions do you have about our services?",
          excited: "That sounds exciting! But I'm here to help with immigration and study abroad services. What brings you here today? 🎉",
          worried: "I understand your concern, but I'm here specifically for immigration and study abroad services. How can I help you with that?"
        },
        goodbye: {
          happy: "Thank you so much! It was great chatting with you! Have a wonderful day! 👋😊",
          neutral: "Thanks for reaching out! Have a great day! 👋",
          frustrated: "I hope I was able to help! Feel free to reach out if you need anything else. Take care! 👋",
          confused: "I hope I was able to clarify things for you! Don't hesitate to ask if you have more questions. 👋",
          excited: "Thank you! I'm excited to help you with your plans! Talk to you soon! 👋🎉",
          worried: "Don't worry, everything will work out! Feel free to reach out anytime. Take care! 👋"
        }
      };

      const emotion = analysis.emotion || 'neutral';
      const intentResponses = fallbackResponses[analysis.intent] || fallbackResponses.other;
      return intentResponses[emotion] || intentResponses.neutral || "I'm here to help with immigration and study abroad services! What can I assist you with today? 😊";
    }
  }

  /**
   * Validate extracted information
   * @param {Object} entities - Extracted entities
   * @returns {Object} - Validation result
   */
  validateEntities(entities) {
    const validation = {
      isValid: true,
      errors: []
    };

    // Email validation
    if (entities.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(entities.email)) {
        validation.isValid = false;
        validation.errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (entities.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(entities.phone.replace(/[\s\-\(\)]/g, ''))) {
        validation.isValid = false;
        validation.errors.push('Invalid phone number format');
      }
    }

    // Service type validation
    if (entities.service_type && !['study', 'work', 'visa'].includes(entities.service_type.toLowerCase())) {
      validation.isValid = false;
      validation.errors.push('Invalid service type');
    }

    return validation;
  }

  /**
   * Extract structured data from unstructured text
   * @param {string} text - Input text
   * @returns {Promise<Object>} - Extracted structured data
   */
  async extractStructuredData(text) {
    try {
      const systemPrompt = `Extract structured information from the following text. Return only a JSON object with the following fields:
{
  "name": "full name if found",
  "email": "email address if found", 
  "phone": "phone number if found",
  "country": "country name if found",
  "service_type": "study|work|visa if found",
  "preferred_time": "time preference if found",
  "notes": "additional notes if found"
}

If a field is not found, set it to null.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.error('Error extracting structured data', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Generate contextual follow-up questions
   * @param {Object} leadData - Current lead data
   * @param {Array} missingFields - Missing required fields
   * @returns {Promise<string>} - Contextual follow-up question
   */
  async generateContextualQuestion(leadData, missingFields) {
    try {
      const systemPrompt = `Generate a natural, contextual follow-up question based on what the user has already shared.

Current lead data: ${JSON.stringify(leadData)}
Missing fields: ${JSON.stringify(missingFields)}

Make the question feel natural and conversational, not like a form. Consider what they've already told you and build on that.

Examples:
- If missing 'service': "What kind of service are you looking for? (Education India, Education Abroad, Job Europe)"
- If missing 'education_place': "Which is your desired place of study in India? (Bangalore, Mangalore, Kerala, Others)"
- If missing 'education_country': "Which country do you prefer for your studies? (UK, Europe, Australia, Canada, USA)"
- If missing 'course' and work_type is 'Truck Driver': "What truck driving license or certificate do you have? (e.g., C, C+E, HGV, CDL, Driver CPC, etc.)"
- If missing 'work_type': "Which job are you looking for in Europe? (Truck Driver, Others)"
- If missing 'course': "Which course are you looking for? (Nursing, Engineering, MBBS, Others)"
- If missing 'name': "May I have your full name, please?"
- If missing 'number': "Could you share your contact number?"
- If missing 'email': "Please provide your email address."
- If missing 'residence': "Finally, where is your place of residence?"

Keep it friendly and conversational while staying focused on our education and job services.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a contextual follow-up question.' }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Error generating contextual question', {
        error: error.message
      });
      
      // Fallback responses based on missing fields
      if (missingFields && missingFields.length > 0) {
        const nextField = missingFields[0];
        // Special case for truck driver
        if ((nextField === 'course' || nextField === 'work_type') && (leadData.work_type === 'Truck Driver' || leadData.course === 'Truck Driver')) {
          return "What truck driving license or certificate do you have? (e.g., C, C+E, HGV, CDL, Driver CPC, etc.)";
        }
        const fallbackQuestions = {
          service: "What kind of service are you looking for? (Education India, Education Abroad, Job Europe)",
          education_place: "Which is your desired place of study in India? (Bangalore, Mangalore, Kerala, Others)",
          education_country: "Which country do you prefer for your studies? (UK, Europe, Australia, Canada, USA)",
          course: "Which course are you looking for? (Nursing, Engineering, MBBS, Others)",
          work_type: "Which job are you looking for in Europe? (Truck Driver, Others)",
          name: "May I have your full name, please?",
          number: "Could you share your contact number?",
          email: "Please provide your email address.",
          residence: "Finally, where is your place of residence?"
        };
        return fallbackQuestions[nextField] || "Could you tell me a bit more about your needs?";
      }
    }
  }
}

module.exports = new NLPService(); 
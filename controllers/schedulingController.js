const AppError = require('../utils/appError');
const validator = require('validator');
const axios = require('axios');

// Scheduling Agent Class
class SchedulingAgent {
  constructor() {
    this.meetingTypes = {
      'technical_discussion': {
        duration: 45,
        description: 'Technical Discussion & Code Review',
        topics: ['architecture', 'system design', 'code review', 'tech stack']
      },
      'collaboration': {
        duration: 30,
        description: 'Project Collaboration Discussion',
        topics: ['partnership', 'project ideas', 'collaboration', 'startup']
      },
      'interview': {
        duration: 60,
        description: 'Technical Interview & Role Discussion',
        topics: ['job', 'role', 'interview', 'hiring', 'position']
      },
      'mentoring': {
        duration: 30,
        description: 'Mentoring & Career Guidance',
        topics: ['mentoring', 'guidance', 'learning', 'career advice']
      },
      'general': {
        duration: 30,
        description: 'General Discussion',
        topics: []
      }
    };
    
    this.timeSlots = this.generateAvailableSlots();
  }

  // Analyze conversation to determine meeting intent using LLM-style analysis
  async analyzeMeetingIntent(conversationHistory, currentMessage) {
    // Combine all conversation context
    const fullContext = [
      ...conversationHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`),
      `User: ${currentMessage}`
    ].join('\n');
    
    console.log('🤖 Analyzing conversation context for meeting intent...');
    
    // Advanced natural language analysis
    const lowerText = fullContext.toLowerCase();
    
    // Check for explicit meeting requests
    const explicitMeetingPhrases = [
      'schedule', 'meet', 'call', 'video call', 'zoom', 'meeting',
      'discuss in person', 'talk live', 'chat live', 'speak with'
    ];
    
    const hasExplicitRequest = explicitMeetingPhrases.some(phrase => 
      lowerText.includes(phrase)
    );
    
    // Analyze conversation progression and interest level
    const conversationLength = conversationHistory.length;
    const userMessages = conversationHistory.filter(msg => msg.type === 'user');
    const hasDeepQuestions = userMessages.some(msg => 
      msg.content.length > 50 || // Detailed questions
      msg.content.includes('?') || // Question format
      ['tell me more', 'can you explain', 'how did you', 'what was your experience'].some(phrase => 
        msg.content.toLowerCase().includes(phrase)
      )
    );
    
    // Determine meeting type based on conversation topics
    let bestIntent = 'general';
    let confidence = 0;
    
    if (hasExplicitRequest) {
      confidence = 0.9; // High confidence for explicit requests
      
      // Determine specific type based on context
      if (lowerText.includes('interview') || lowerText.includes('job') || lowerText.includes('position') || lowerText.includes('hire')) {
        bestIntent = 'interview';
      } else if (lowerText.includes('collaborate') || lowerText.includes('project') || lowerText.includes('work together') || lowerText.includes('startup')) {
        bestIntent = 'collaboration';
      } else if (lowerText.includes('technical') || lowerText.includes('code') || lowerText.includes('architecture') || lowerText.includes('development')) {
        bestIntent = 'technical_discussion';
      } else if (lowerText.includes('mentor') || lowerText.includes('guidance') || lowerText.includes('advice') || lowerText.includes('learn')) {
        bestIntent = 'mentoring';
      }
    } else if (conversationLength >= 4 && hasDeepQuestions) {
      // Implicit interest through engaged conversation
      confidence = 0.6;
      
      // Analyze topic focus for type classification
      if (lowerText.includes('wayfair') || lowerText.includes('amazon') || lowerText.includes('experience') || lowerText.includes('work')) {
        bestIntent = 'collaboration';
      } else if (lowerText.includes('skill') || lowerText.includes('technology') || lowerText.includes('project')) {
        bestIntent = 'technical_discussion';
      }
    } else if (conversationLength >= 6) {
      // Very engaged conversation, moderate confidence
      confidence = 0.4;
      bestIntent = 'general';
    }
    
    console.log(`📊 Intent Analysis: ${bestIntent} (confidence: ${confidence.toFixed(2)})`);

    return {
      intent: bestIntent,
      confidence: confidence,
      suggestedDuration: this.meetingTypes[bestIntent].duration,
      description: this.meetingTypes[bestIntent].description
    };
  }

  // Generate available time slots (next 14 days, working hours)
  generateAvailableSlots() {
    const slots = [];
    const now = new Date();
    
    for (let day = 1; day <= 14; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Working hours: 9 AM to 6 PM IST
      for (let hour = 9; hour < 18; hour++) {
        const slot = new Date(date);
        slot.setHours(hour, 0, 0, 0);
        
        slots.push({
          datetime: slot.toISOString(),
          display: this.formatSlotDisplay(slot),
          timezone: 'Asia/Kolkata',
          available: true
        });
      }
    }
    
    return slots;
  }

  formatSlotDisplay(date) {
    const options = {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    };
    return date.toLocaleDateString('en-IN', options);
  }

  // Smart slot recommendation based on user preference and urgency
  recommendSlots(intent, urgency = 'normal') {
    const availableSlots = this.timeSlots.filter(slot => slot.available);
    
    if (urgency === 'urgent') {
      return availableSlots.slice(0, 3); // Next 3 available slots
    } else if (urgency === 'soon') {
      return availableSlots.slice(0, 6); // Next 6 slots  
    } else {
      return availableSlots.slice(0, 10); // Next 10 slots
    }
  }

  // Generate meeting agenda based on conversation
  generateMeetingAgenda(intent, conversationContext) {
    const baseAgendas = {
      technical_discussion: [
        'Project architecture overview',
        'Code review and best practices',
        'Technology stack discussion',
        'Implementation challenges',
        'Next steps and action items'
      ],
      collaboration: [
        'Project goals and vision alignment',
        'Role and responsibility definition',
        'Timeline and milestone planning',
        'Resource and skill requirements',
        'Collaboration framework setup'
      ],
      interview: [
        'Role requirements and expectations',
        'Technical skills assessment',
        'Project experience deep-dive',
        'Company culture and team fit',
        'Next steps in hiring process'
      ],
      mentoring: [
        'Current challenges and goals',
        'Learning path recommendations',
        'Industry insights and trends',
        'Career guidance and advice',
        'Action plan and follow-up'
      ],
      general: [
        'Introduction and background',
        'Current needs and objectives',
        'Potential collaboration areas',
        'Next steps and follow-up'
      ]
    };

    return baseAgendas[intent] || baseAgendas.general;
  }
}

// Initialize scheduling agent
const schedulingAgent = new SchedulingAgent();

// Auto-suggest meeting based on conversation
const suggestMeeting = async (req, res, next) => {
  try {
    const { conversationHistory = [], currentMessage, userContext = {} } = req.body;

    if (!currentMessage) {
      return next(new AppError('Current message is required', 400));
    }

    console.log('🤖 Analyzing conversation for meeting suggestion...');

    // Analyze conversation intent
    const intentAnalysis = await schedulingAgent.analyzeMeetingIntent(conversationHistory, currentMessage);
    
    // Check if meeting suggestion is appropriate
    // Lower threshold since we have smarter analysis now
    const shouldSuggestMeeting = intentAnalysis.confidence > 0.2;

    if (!shouldSuggestMeeting) {
      return res.status(200).json({
        status: 'success',
        data: {
          shouldSuggest: false,
          reason: 'Conversation context doesn\'t indicate meeting interest'
        }
      });
    }

    // Get recommended time slots
    const urgency = currentMessage.toLowerCase().includes('urgent') ? 'urgent' : 'normal';
    const recommendedSlots = schedulingAgent.recommendSlots(intentAnalysis.intent, urgency);
    
    // Generate meeting agenda
    const agenda = schedulingAgent.generateMeetingAgenda(intentAnalysis.intent, conversationHistory);

    const suggestion = {
      shouldSuggest: true,
      meetingType: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      duration: intentAnalysis.suggestedDuration,
      description: intentAnalysis.description,
      recommendedSlots: recommendedSlots.slice(0, 5),
      agenda: agenda,
      urgency: urgency,
      autoMessage: `Based on our conversation, I'd love to schedule a ${intentAnalysis.description.toLowerCase()} to dive deeper into this topic. I have some time slots available - would any of these work for you?`
    };

    console.log(`📅 Meeting suggested: ${intentAnalysis.intent} (${intentAnalysis.confidence.toFixed(2)} confidence)`);

    res.status(200).json({
      status: 'success',
      data: suggestion
    });

  } catch (error) {
    console.error('Meeting suggestion error:', error);
    next(new AppError('Failed to analyze meeting suggestion', 500));
  }
};

// Schedule a meeting
const scheduleMeeting = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      selectedSlot, 
      meetingType, 
      message = '',
      agenda = [],
      duration = 30
    } = req.body;

    // Validation
    if (!name || !email || !selectedSlot || !meetingType) {
      return next(new AppError('Name, email, selected slot, and meeting type are required', 400));
    }

    if (!validator.isEmail(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    // Sanitize inputs
    const sanitizedData = {
      name: validator.escape(name.trim()),
      email: validator.normalizeEmail(email),
      selectedSlot: selectedSlot,
      meetingType: validator.escape(meetingType),
      message: message ? validator.escape(message.trim()) : '',
      agenda: agenda,
      duration: parseInt(duration),
      scheduledAt: new Date().toISOString(),
      status: 'pending_confirmation'
    };

    console.log(`📅 Scheduling ${meetingType} meeting for ${sanitizedData.email}`);

    // Here you would integrate with calendar services
    // For now, we'll create a meeting record and send confirmation

    const meetingDetails = {
      id: generateMeetingId(),
      ...sanitizedData,
      meetingLink: `${process.env.MEETING_PLATFORM_URL || 'https://meet.google.com'}/new`,
      confirmationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/meeting/confirm/${generateMeetingId()}`,
      calendarEvent: await generateCalendarEvent(sanitizedData)
    };

    // Send confirmation email
    await sendMeetingConfirmation(meetingDetails);

    console.log(`✅ Meeting scheduled successfully: ${meetingDetails.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Meeting scheduled successfully! You\'ll receive a confirmation email shortly.',
      data: {
        meetingId: meetingDetails.id,
        scheduledTime: selectedSlot,
        meetingType: meetingType,
        duration: duration,
        agenda: agenda
      }
    });

  } catch (error) {
    console.error('Meeting scheduling error:', error);
    next(new AppError('Failed to schedule meeting', 500));
  }
};

// Get available time slots
const getAvailableSlots = async (req, res, next) => {
  try {
    const { days = 14, meetingType = 'general' } = req.query;
    
    const slots = schedulingAgent.recommendSlots(meetingType, 'normal');
    const limitedSlots = slots.slice(0, parseInt(days) * 2); // 2 slots per day average

    res.status(200).json({
      status: 'success',
      data: {
        availableSlots: limitedSlots,
        timezone: 'Asia/Kolkata',
        meetingTypes: Object.keys(schedulingAgent.meetingTypes)
      }
    });

  } catch (error) {
    console.error('Get slots error:', error);
    next(new AppError('Failed to get available slots', 500));
  }
};

// Helper functions
function generateMeetingId() {
  return 'meet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function generateCalendarEvent(meetingData) {
  const startTime = new Date(meetingData.selectedSlot);
  const endTime = new Date(startTime.getTime() + meetingData.duration * 60000);

  return {
    summary: `${meetingData.meetingType.replace('_', ' ').toUpperCase()} - ${meetingData.name}`,
    description: `Meeting with ${meetingData.name}\n\nAgenda:\n${meetingData.agenda.map(item => `• ${item}`).join('\n')}\n\nMessage: ${meetingData.message}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Kolkata'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Kolkata'
    },
    attendees: [
      { email: 'himanshu.c.official@gmail.com' },
      { email: meetingData.email }
    ]
  };
}

async function sendMeetingConfirmation(meetingDetails) {
  // This would integrate with your email service
  console.log(`📧 Sending meeting confirmation to ${meetingDetails.email}`);
  
  // For now, just log the details
  console.log('Meeting Details:', {
    id: meetingDetails.id,
    type: meetingDetails.meetingType,
    time: meetingDetails.selectedSlot,
    duration: meetingDetails.duration,
    attendee: meetingDetails.email
  });
  
  return true;
}

// Health check
const healthCheck = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        schedulingAgentReady: true,
        availableMeetingTypes: Object.keys(schedulingAgent.meetingTypes),
        totalAvailableSlots: schedulingAgent.timeSlots.filter(slot => slot.available).length
      }
    });
  } catch (error) {
    next(new AppError('Scheduling service health check failed', 500));
  }
};

module.exports = {
  suggestMeeting,
  scheduleMeeting,
  getAvailableSlots,
  healthCheck
}; 
const AppError = require('../utils/appError');

class AIController {
  constructor() {
    this.apiEndpoint = 'https://api.mistral.ai/v1/chat/completions';
    this.modelName = 'mistral-small';
    this.apiKey = process.env.MISTRAL_API_KEY;
  }

  // Generate AI response with chat context
  generateResponse = async (req, res, next) => {
    try {
      const { query, chatHistory = [] } = req.body;

      if (!query || !query.trim()) {
        return next(new AppError('Query is required', 400));
      }

      if (!this.apiKey) {
        return next(new AppError('AI service not configured', 500));
      }

      console.log('🔥 Processing AI request:', query);

      // Build conversation messages from chat history
      const messages = [
        {
          role: "system",
          content: "You are a helpful assistant who knows everything about Himanshu Chaudhary. Answer questions about him directly and concisely. Be brief and to the point. Keep responses under 300 words. Use the previous conversation context to provide more relevant and personalized responses.\n\nName: Himanshu Chaudhary\nTitle: Software Engineer II\nLocation: Bulandshahr, UP\nEmail: himanshu.c.official@gmail.com\nPhone: +91-9761744048\nLinkedIn: https://www.linkedin.com/in/himanshucofficial/\nGitHub: https://github.com/himanshukadian\n\nSummary: Software Engineer with 3+ years of experience in backend and full-stack development, specializing in Java and Spring Boot. Successfully delivered scalable solutions, including AI-powered chat assistants and optimized systems that reduce operational costs. Collaborates effectively with cross-functional teams to drive innovation, enhance performance, and ensure platform stability.\n\nSkills:\n- Languages: Python, Java, C++, JavaScript, SQL\n- Tools: VS Code, IntelliJ, GCP, AWS, Kafka, DynamoDB, Lambda, Cloud Functions, Jenkins\n- Technologies: Spring Boot, Hibernate, JDBC, AI/GenAI, Docker, Kubernetes, Microservice Architecture, System Design, React, Node.js\n- Databases: MongoDB, NoSQL, MySQL, PostgreSQL\n\nExperience:\n1. **Wayfair** (Apr 2023–Present) – Software Engineer II, Bangalore\n   - Built AI-powered assistant translating English to SQL\n   - Designed a Lane Management System reducing fulfillment cost by 20%\n   - Processed 50K+ events/min for metrics and triage\n   - Rebuilt label printing to handle 100 labels/sec with pipelines\n\n2. **Amazon** (Jul 2022–Mar 2023) – SDE I, Bangalore\n   - Migrated 1M+ customers across marketplaces\n   - Reduced IMR costs by 50%\n\n3. **Mobeology Communications** (Jan 2021–Jun 2022) – Software Engineer, Faridabad\n   - Built dashboards and microservices for analytics\n\nEducation:\n- MCA from NIT Warangal (2022) – Class Topper\n- B.Sc (H) CS from University of Delhi (2019)\n\nProjects:\n- Grievance Portal (Python, Django, AWS, NLP)\n- NITADDA – resource-sharing platform for NIT students\n\nAchievements:\n- Class Topper (MCA 2019–2020)\n- School Topper (CBSE 2015–2016)\n- Lead Developer at WSDC (2020–2022)"
        }
      ];

      // Add chat history (limit to last 10 messages to avoid token limits)
      const recentHistory = chatHistory.slice(-10);
      recentHistory.forEach(msg => {
        if (msg.type === 'user') {
          messages.push({
            role: 'user',
            content: msg.content
          });
        } else if (msg.type === 'assistant') {
          messages.push({
            role: 'assistant',
            content: msg.content
          });
        }
      });

      console.log(`💬 Including ${recentHistory.length} previous messages for context`);

      // Use axios instead of fetch for better compatibility
      const axios = require('axios');
      const response = await axios.post(this.apiEndpoint, {
        model: this.modelName,
        messages: messages,
        temperature: 0.3,
        max_tokens: 400,
        top_p: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const aiResponse = response.data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return next(new AppError('No response generated', 500));
      }

      console.log('🤖 AI Response generated successfully');

      res.status(200).json({
        status: 'success',
        data: {
          response: aiResponse,
          model: this.modelName,
          contextUsed: recentHistory.length > 0
        }
      });

    } catch (error) {
      console.error('AI Controller Error:', error);
      next(new AppError('Failed to generate AI response', 500));
    }
  };

  // Health check for AI service
  healthCheck = async (req, res, next) => {
    try {
      const isConfigured = !!this.apiKey;
      
      res.status(200).json({
        status: 'success',
        data: {
          aiServiceConfigured: isConfigured,
          model: this.modelName,
          ready: isConfigured
        }
      });
    } catch (error) {
      next(new AppError('AI health check failed', 500));
    }
  };
}

module.exports = new AIController();
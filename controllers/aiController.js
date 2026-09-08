const AppError = require('../utils/appError');

class AIController {
  constructor() {
    this.apiEndpoint = 'https://api.mistral.ai/v1/chat/completions';
    this.modelName = 'open-mistral-7b';
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
          content: "You are Himanshu Chaudhary's AI chat assistant on his portfolio website. Be conversational, helpful, and natural. You help visitors learn about Himanshu, schedule meetings, and provide AI-powered resume customization services.\n\n**Your Capabilities:**\n1. **Portfolio Information** - Answer questions about Himanshu's experience, skills, projects, education\n2. **Resume Customization** - When users provide job descriptions, help them customize resumes (don't output full resumes unless they paste a job description)\n3. **Meeting Scheduling** - Help coordinate meetings and discussions\n4. **Writing/Articles** - Answer questions about Himanshu's blog articles using the retrieved writing context and link to the articles you reference\n\n**About Himanshu:**\n- Software Engineer II at Wayfair (Apr 2023–Present)\n- 4+ years of experience building scalable, distributed backend systems\n- Strong background in microservices architecture, REST APIs, cloud-native development, system design, and data pipelines\n- Previously: Amazon (SDE 1), Mobeology Communications\n- Education: MCA from NIT Warangal (Class Topper), B.Sc CS from University of Delhi\n- Key Projects: AI-powered analytics assistant, Lane Management System, high-throughput monitoring platform\n- Skills: Python, Java, JavaScript, SQL, AWS, Kafka, DynamoDB, Docker, Kubernetes, Generative AI, Large Language Models\n- Contact: himanshu.c.official@gmail.com, https://www.linkedin.com/in/himanshucofficial, https://github.com/himanshukadian, https://portfolio.buildwithhimanshu.com\n\n**Response Style:**\n- Be conversational and friendly (use emojis appropriately)\n- Keep responses focused and under 300 words\n- For resume questions without job descriptions, explain the AI customization service\n- For meeting requests, be enthusiastic about connecting\n- For portfolio questions, provide relevant details naturally\n- Don't output full resume templates unless user provides a job description to customize for"
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

      let writingSources = [];
      try {
        const rag = require('../utils/articleRag');
        writingSources = await rag.retrieve(query, 4);
      } catch (e) {
        writingSources = [];
      }

      if (writingSources.length > 0) {
        let contextBlock = '\n\n**Relevant writing from Himanshu\'s blog (use this as context when the question is about his articles/blog/writing):**\n';
        writingSources.forEach((source, i) => {
          contextBlock += `Source ${i + 1}: ${source.title} — ${source.url}\n   ${source.snippet}\n`;
        });
        contextBlock += 'If you use this context, cite the article titles/links naturally.';
        messages[0].content += contextBlock;
      }

      // Use axios instead of fetch for better compatibility
      const axios = require('axios');
      const response = await axios.post(this.apiEndpoint, {
        model: this.modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
        top_p: 0.9
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
          contextUsed: recentHistory.length > 0,
          writingSources: writingSources.map(s => ({ title: s.title, slug: s.slug, url: s.url, snippet: s.snippet }))
        }
      });

    } catch (error) {
      console.error('AI Controller Error:', error);
      next(new AppError('Failed to generate AI response', 500));
    }
  };

  // Retrieve relevant blog articles via RAG
  retrieveArticles = async (req, res, next) => {
    try {
      const { query } = req.body;

      if (!query || !query.trim()) {
        return next(new AppError('Query is required', 400));
      }

      const rag = require('../utils/articleRag');
      const results = await rag.retrieve(query, 8);

      res.status(200).json({
        status: 'success',
        data: {
          query,
          results
        }
      });
    } catch (error) {
      next(new AppError('Failed to retrieve articles', 500));
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
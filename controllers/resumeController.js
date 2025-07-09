const Resume = require('../models/Resume');
const AppError = require('../utils/appError');
const axios = require('axios');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');

class ResumeController {
  constructor() {
    // AI service configuration
    this.apiEndpoint = 'https://api.mistral.ai/v1/chat/completions';
    this.modelName = 'open-mistral-7b';
    this.apiKey = process.env.MISTRAL_API_KEY;
  }

  // Create base resume template
  createBaseResume = async (req, res, next) => {
    try {
      // Check if base template already exists
      const existingTemplate = await Resume.findOne({ isTemplate: true });
      if (existingTemplate) {
        return res.status(200).json({
          status: 'success',
          data: {
            resume: existingTemplate,
            message: 'Base resume template already exists'
          }
        });
      }

      // Base resume data based on the actual resume
      const baseResumeData = {
        name: 'Himanshu Chaudhary',
        title: 'Software Engineer II',
        location: 'Bulandshahr, UP',
        email: 'himanshu.c.official@gmail.com',
        phone: '+91-9761744048',
        linkedin: 'https://www.linkedin.com/in/himanshucofficial/',
        github: 'https://github.com/himanshukadian',
        summary: 'Software Engineer with 3+ years of experience in backend and full-stack development, specializing in Java and Spring Boot. Successfully delivered scalable solutions, including AI-powered chat assistants and optimized systems that reduce operational costs. Collaborates effectively with cross-functional teams to drive innovation, enhance performance, and ensure platform stability.',
        skills: {
          languages: ['Python', 'Java', 'C++', 'JavaScript', 'SQL'],
          technologies: ['Spring Boot', 'Hibernate', 'JDBC', 'AI/GenAI', 'Docker', 'Kubernetes', 'Microservice Architecture', 'System Design', 'React', 'Node.js'],
          developerTools: ['VS Code', 'IntelliJ', 'GCP', 'AWS', 'Kafka', 'DynamoDB', 'Lambda', 'Cloud Functions', 'Jenkins'],
          databases: ['MongoDB', 'NoSQL', 'MySQL', 'PostgreSQL'],
          others: ['Automation', 'Building Tools']
        },
        experience: [
          {
            company: 'Wayfair',
            role: 'Software Engineer II',
            location: 'Bangalore, Karnataka',
            duration: 'Apr 2023 - Present',
            highlights: [
              'Designed a Lane Management System optimizing lane selection based on 50-70 parameters, reducing fulfillment costs by 20%.',
              'Built Voyager, an AI-powered assistant translating English to SQL queries for business collaboration.',
              'Engineered LMP Insight tool processing 50K events/min for metrics tracking and triage reduction.',
              'Redesigned label printing platform for 100 labels/sec and added automated testing pipelines.',
              'Created unified label printing endpoint cutting onboarding time to 3 weeks and improved PII data handling.'
            ]
          },
          {
            company: 'Amazon',
            role: 'SDE I',
            location: 'Bangalore, Karnataka',
            duration: 'Jul 2022 - Mar 2023',
            highlights: [
              'Built a pipeline migrating 1M customers across marketplaces, automating and improving backend integration.',
              'Migrated backend services reducing IMR costs by 50% with improved performance and reliability.'
            ]
          },
          {
            company: 'Mobeology Communications',
            role: 'Software Engineer',
            location: 'Faridabad, Haryana',
            duration: 'Jan 2021 - Jun 2022',
            highlights: [
              'Designed a profiling dashboard for publishers and campaigns.',
              'Developed microservices for analytics management.'
            ]
          }
        ],
        education: [
          {
            institution: 'National Institute of Technology Warangal (NITW)',
            degree: 'Master of Computer Applications',
            year: '2022',
            location: 'Telangana, India',
            achievements: ['Class Topper MCA 2019–2020']
          },
          {
            institution: 'University of Delhi (DU)',
            degree: 'B.Sc (H) Computer Science',
            year: '2019',
            location: 'Delhi, India',
            achievements: []
          }
        ],
        projects: [
          {
            name: 'Grievance Portal',
            technologies: ['Python', 'Django', 'AWS EC2', 'Docker', 'NLP'],
            description: 'A web app for students to submit complaints related to academics, mess, and hostel issues.'
          },
          {
            name: 'NITADDA',
            technologies: ['Python', 'Django', 'AWS EC2', 'Docker'],
            description: 'A platform for NIT students to share and access study resources.'
          }
        ],
        achievements: [
          'Class Topper MCA 2019-2020',
          'School Topper Sr. Secondary (CBSE) 2015-2016',
          'Lead Web Developer at College Software Development Cell (WSDC) 2020–2022'
        ],
        interests: [
          'Reading Books/NEWS, Programming, Playing Cricket/Table Tennis'
        ],
        originalPdfPath: 'Himanshu_Resume.pdf',
        isTemplate: true,
        customizedForJob: false,
        keywordsMatched: [],
        keywordsMissing: [],
        customizationLog: []
      };

      const resume = new Resume(baseResumeData);
      await resume.save();

      res.status(201).json({
        status: 'success',
        data: {
          resume,
          message: 'Base resume template created successfully'
        }
      });
    } catch (error) {
      console.error('Create base resume error:', error);
      next(new AppError('Failed to create base resume template', 500));
    }
  };

  // Analyze job description and extract keywords
  analyzeJobDescription = async (req, res, next) => {
    try {
      const { jobDescription, companyName, jobTitle } = req.body;

      if (!jobDescription) {
        return next(new AppError('Job description is required', 400));
      }

      // Extract keywords using basic NLP and patterns
      const keywords = this.extractKeywordsFromJobDescription(jobDescription);
      
      // Use AI to enhance keyword extraction
      const aiEnhancedKeywords = await this.getAIKeywordAnalysis(jobDescription);
      
      // Combine and deduplicate keywords
      const allKeywords = [...new Set([...keywords, ...aiEnhancedKeywords])];

      // Get job requirements and skills
      const requirements = await this.extractJobRequirements(jobDescription);

      res.status(200).json({
        status: 'success',
        data: {
          jobAnalysis: {
            companyName,
            jobTitle,
            keywords: allKeywords,
            requirements,
            totalKeywords: allKeywords.length,
            aiEnhanced: aiEnhancedKeywords.length > 0
          }
        }
      });
    } catch (error) {
      console.error('Job analysis error:', error);
      next(new AppError('Failed to analyze job description', 500));
    }
  };

  // Generate customized resume based on job description
  customizeResumeForJob = async (req, res, next) => {
    try {
      const { jobDescription, companyName, jobTitle, templateId } = req.body;

      if (!jobDescription) {
        return next(new AppError('Job description is required', 400));
      }

      // Get base template
      const baseResume = templateId 
        ? await Resume.findById(templateId)
        : await Resume.findOne({ isTemplate: true });

      if (!baseResume) {
        return next(new AppError('Base resume template not found', 404));
      }

      // Use LLM to analyze job and customize resume
      const analysisResult = await this.llmBasedResumeCustomization(baseResume, jobDescription, companyName, jobTitle);

      // Use AI-extracted company name and job title if available, otherwise use provided ones
      const finalCompanyName = analysisResult.extractedInfo?.companyName || companyName || 'Target Company';
      const finalJobTitle = analysisResult.extractedInfo?.jobTitle || jobTitle || 'Applied Position';

      // Create new customized resume
      const customizedResume = new Resume({
        ...baseResume.toObject(),
        _id: undefined,
        __v: undefined,
        isTemplate: false,
        templateId: baseResume._id,
        jobDescription,
        companyName: finalCompanyName,
        jobTitle: finalJobTitle,
        customizedForJob: true,
        ...analysisResult.customizedData,
        atsScore: analysisResult.atsScore,
        matchPercentage: analysisResult.matchPercentage,
        keywordsMatched: analysisResult.keywordsMatched,
        keywordsMissing: analysisResult.keywordsMissing,
        customizationLog: analysisResult.customizationLog,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await customizedResume.save();

      res.status(201).json({
        status: 'success',
        data: {
          resume: customizedResume,
          atsScore: customizedResume.atsScore,
          matchPercentage: customizedResume.matchPercentage,
          keywordsMatched: customizedResume.keywordsMatched,
          keywordsMissing: customizedResume.keywordsMissing,
          customizations: customizedResume.customizationLog
        }
      });
    } catch (error) {
      console.error('Resume customization error:', error);
      next(new AppError('Failed to customize resume', 500));
    }
  };

  // Generate PDF from HTML template
  generateCustomizedPDF = async (req, res, next) => {
    try {
      const { resumeId } = req.params;
      const { template = 'professional' } = req.body;
      
      const resume = await Resume.findById(resumeId);
      if (!resume) {
        return next(new AppError('Resume not found', 404));
      }

      // Prepare template data specifically for PDF generation (with highlighting)
      const templateData = await this.preparePDFTemplateData(resume);
      
      // Load and compile HTML template
      const templatePath = path.join(__dirname, '../templates/resume-template.html');
      const templateSource = await fs.readFile(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateSource);
      
      // Generate HTML with data
      const html = compiledTemplate(templateData);
      
      // Convert HTML to PDF using Puppeteer
      const pdfBuffer = await this.generatePDFFromHTML(html);
      
      // Save PDF file
      const customizedFileName = `resume_${resume.companyName?.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const customizedPdfPath = path.join(__dirname, '../uploads/', customizedFileName);
      
      // Ensure uploads directory exists
      await fs.mkdir(path.dirname(customizedPdfPath), { recursive: true });
      await fs.writeFile(customizedPdfPath, pdfBuffer);

      // Update resume with PDF path
      resume.customizedPdfPath = customizedFileName;
      resume.customizedPdfUrl = `/uploads/${customizedFileName}`;
      await resume.save();

      res.status(200).json({
        status: 'success',
        data: {
          resumeId: resume._id,
          pdfUrl: resume.customizedPdfUrl,
          fileName: customizedFileName,
          fileSize: pdfBuffer.length,
          customizations: resume.customizationLog.length
        }
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      next(new AppError('Failed to generate customized PDF', 500));
    }
  };

  // Get all resumes with filtering
  getResumes = async (req, res, next) => {
    try {
      const { 
        isTemplate, 
        customizedForJob, 
        companyName, 
        jobTitle,
        page = 1, 
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};
      if (isTemplate !== undefined) filter.isTemplate = isTemplate === 'true';
      if (customizedForJob !== undefined) filter.customizedForJob = customizedForJob === 'true';
      if (companyName) filter.companyName = new RegExp(companyName, 'i');
      if (jobTitle) filter.jobTitle = new RegExp(jobTitle, 'i');

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const resumes = await Resume.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('templateId', 'name title');

      const total = await Resume.countDocuments(filter);

      res.status(200).json({
        status: 'success',
        data: {
          resumes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get resumes error:', error);
      next(new AppError('Failed to fetch resumes', 500));
    }
  };

  // Get resume by ID
  getResumeById = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const resume = await Resume.findById(id).populate('templateId', 'name title');
      
      if (!resume) {
        return next(new AppError('Resume not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: { resume }
      });
    } catch (error) {
      console.error('Get resume error:', error);
      next(new AppError('Failed to fetch resume', 500));
    }
  };

  // NEW: LLM-based resume customization (replaces all keyword matching)
  async llmBasedResumeCustomization(baseResume, jobDescription, companyName, jobTitle) {
    try {
      console.log('🤖 Using LLM-based resume customization with Mistral Large 2409');
      
      const axios = require('axios');
      
      // Create comprehensive prompt for LLM
      const prompt = `You are an expert resume writer and ATS specialist. Analyze the job description and customize the resume accordingly.

**Job Description to Analyze:**
${jobDescription}

${companyName || jobTitle ? `**Additional Context:**` : ''}
${companyName ? `Company: ${companyName}` : ''}
${jobTitle ? `Position: ${jobTitle}` : ''}

**Current Resume:**
Name: ${baseResume.name}
Summary: ${baseResume.summary}
Experience: ${JSON.stringify(baseResume.experience, null, 2)}
Skills: ${JSON.stringify(baseResume.skills, null, 2)}
Education: ${JSON.stringify(baseResume.education, null, 2)}

**Task:** Analyze the job description, extract key information, and provide comprehensive resume customization in JSON format:

{
  "extractedInfo": {
    "companyName": "extracted company name from job description",
    "jobTitle": "extracted job title/position from job description"
  },
  "customizedData": {
    "summary": "Enhanced summary tailored to the job (keep under 200 words)",
    "experience": [Enhanced experience array with job-relevant highlights],
    "skills": {Enhanced skills object with relevant technologies}
  },
  "atsScore": number (1-100 based on job match),
  "matchPercentage": number (1-100 based on requirements coverage),
  "keywordsMatched": ["array", "of", "matched", "keywords"],
  "keywordsMissing": ["array", "of", "missing", "keywords"],
  "customizationLog": [
    {
      "section": "summary|experience|skills",
      "changes": "description of changes made",
      "timestamp": "${new Date().toISOString()}"
    }
  ]
}

**Guidelines:**
1. Extract the company name and job title from the job description text
2. Enhance the summary to highlight relevant experience for this specific role
3. Reorder and emphasize experience highlights that match job requirements
4. Add relevant technologies/skills mentioned in the job description
5. Calculate realistic ATS score based on keyword density and relevance
6. Identify 5-10 key matched and missing keywords
7. Log all significant customizations made

Return ONLY valid JSON without any markdown formatting or explanation.`;

      const response = await axios.post(this.apiEndpoint, {
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume writer and ATS optimization specialist. You always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const aiResponse = response.data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from LLM');
      }

      // Parse JSON response
      let analysisResult;
      try {
        // Clean the response in case there's any markdown formatting
        const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('LLM JSON parsing error:', parseError);
        console.error('Raw LLM response:', aiResponse);
        
        // Fallback to basic customization
        analysisResult = {
          extractedInfo: {
            companyName: companyName || 'Company',
            jobTitle: jobTitle || 'Position'
          },
          customizedData: {
            summary: baseResume.summary,
            experience: baseResume.experience,
            skills: baseResume.skills
          },
          atsScore: 85,
          matchPercentage: 80,
          keywordsMatched: ['software', 'engineer', 'development'],
          keywordsMissing: ['specific', 'requirements'],
          customizationLog: [{
            section: 'fallback',
            changes: 'Applied basic customization due to LLM parsing error',
            timestamp: new Date().toISOString()
          }]
        };
      }

      console.log('✅ LLM customization completed');
      console.log(`📊 ATS Score: ${analysisResult.atsScore}%`);
      console.log(`🎯 Match: ${analysisResult.matchPercentage}%`);
      
      return analysisResult;

    } catch (error) {
      console.error('LLM customization error:', error);
      
      // Fallback response
      return {
        extractedInfo: {
          companyName: companyName || 'Company',
          jobTitle: jobTitle || 'Position'
        },
        customizedData: {
          summary: baseResume.summary + ` Experienced professional seeking opportunities in the field.`,
          experience: baseResume.experience,
          skills: baseResume.skills
        },
        atsScore: 75,
        matchPercentage: 70,
        keywordsMatched: ['software', 'development'],
        keywordsMissing: ['job-specific', 'skills'],
        customizationLog: [{
          section: 'error-fallback',
          changes: 'Applied minimal customization due to LLM service error',
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  // Health check endpoint
  healthCheck = async (req, res, next) => {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          resumeServiceReady: true,
          templatesAvailable: ['professional', 'modern', 'executive', 'creative'],
          aiAnalysisEnabled: !!this.apiKey,
          llmModel: this.modelName,
          pdfEditingEnabled: true,
          htmlTemplatingEnabled: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      next(new AppError('Resume service health check failed', 500));
    }
  };

  // Helper method: Extract keywords from job description
  extractKeywordsFromJobDescription(jobDescription) {
    const keywords = [];
    const techKeywords = [
      // Programming Languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
      // Frameworks & Libraries
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Spring Boot', 'Django', 'Flask', 'Laravel', 'Rails',
      // Databases
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'SQL', 'NoSQL',
      // Cloud & DevOps
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'CircleCI', 'Terraform', 'Ansible',
      // Tools & Technologies
      'Git', 'API', 'REST', 'GraphQL', 'Microservices', 'CI/CD', 'Agile', 'Scrum', 'Machine Learning', 'AI',
      // Soft Skills
      'leadership', 'teamwork', 'communication', 'problem-solving', 'project management', 'collaboration',
      'analytical', 'creative', 'innovative', 'strategic', 'detail-oriented'
    ];

    const text = jobDescription.toLowerCase();
    techKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    });

    return [...new Set(keywords)];
  }

  // Helper method: Get AI-enhanced keyword analysis
  async getAIKeywordAnalysis(jobDescription) {
    if (!this.apiKey) return [];

    try {
      const prompt = `Analyze this job description and extract the most important technical skills, tools, and qualifications. Return only a JSON array of keywords:

Job Description: ${jobDescription}

Return format: ["keyword1", "keyword2", "keyword3"]`;

      const response = await axios.post(this.apiEndpoint, {
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const content = response.data.choices?.[0]?.message?.content;
      if (content) {
        // Try to parse JSON array from response
        const match = content.match(/\[.*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
      return [];
    } catch (error) {
      console.error('AI keyword analysis error:', error);
      return [];
    }
  }

  // Helper method: Extract job requirements
  async extractJobRequirements(jobDescription) {
    const requirements = {
      experience: '',
      education: '',
      skills: [],
      responsibilities: []
    };

    // Basic pattern matching for experience
    const expMatch = jobDescription.match(/(\d+)\+?\s*years?\s*of\s*experience/i);
    if (expMatch) {
      requirements.experience = `${expMatch[1]}+ years of experience`;
    }

    // Education requirements
    const eduPatterns = ['bachelor', 'master', 'phd', 'degree', 'computer science', 'engineering'];
    eduPatterns.forEach(pattern => {
      if (jobDescription.toLowerCase().includes(pattern)) {
        requirements.education = 'Relevant degree preferred';
      }
    });

    return requirements;
  }

  // Helper method: Generate customized content using AI
  async generateCustomizedContent(baseResume, jobDescription, keywords, requirements) {
    const customizations = {
      customizationLog: []
    };

    // Customize summary
    const customizedSummary = await this.customizeSummary(baseResume.summary, jobDescription, keywords);
    if (customizedSummary !== baseResume.summary) {
      customizations.summary = customizedSummary;
      customizations.customizationLog.push({
        section: 'summary',
        originalContent: baseResume.summary,
        customizedContent: customizedSummary,
        reason: 'Optimized for job requirements and keywords'
      });
    }

    // Customize experience highlights
    const customizedExperience = await this.customizeExperience(baseResume.experience, keywords);
    if (JSON.stringify(customizedExperience) !== JSON.stringify(baseResume.experience)) {
      customizations.experience = customizedExperience;
      customizations.customizationLog.push({
        section: 'experience',
        originalContent: JSON.stringify(baseResume.experience),
        customizedContent: JSON.stringify(customizedExperience),
        reason: 'Enhanced experience highlights with relevant keywords'
      });
    }

    return customizations;
  }

  // Helper method: Customize summary section
  async customizeSummary(originalSummary, jobDescription, keywords) {
    let customizedSummary = originalSummary;
    
    // Extract job-specific requirements
    const jobLevel = jobDescription.toLowerCase().includes('senior') || jobDescription.toLowerCase().includes('lead') ? 'Senior' : '';
    const isFullStack = jobDescription.toLowerCase().includes('full-stack') || jobDescription.toLowerCase().includes('fullstack');
    const isBackend = jobDescription.toLowerCase().includes('backend') || jobDescription.toLowerCase().includes('back-end');
    const isFrontend = jobDescription.toLowerCase().includes('frontend') || jobDescription.toLowerCase().includes('front-end');
    
    // Enhance title based on job requirements
    if (jobLevel && !customizedSummary.includes('Senior')) {
      customizedSummary = customizedSummary.replace('Software Engineer', 'Senior Software Engineer');
    }
    
    // Add specialization based on job focus
    if (isFullStack && !customizedSummary.includes('full-stack')) {
      customizedSummary = customizedSummary.replace(
        'backend and full-stack development',
        'full-stack development with expertise in both frontend and backend technologies'
      );
    } else if (isBackend && !customizedSummary.includes('backend specialist')) {
      customizedSummary = customizedSummary.replace(
        'backend and full-stack development',
        'backend development and system architecture'
      );
    }
    
    // Integrate relevant keywords naturally (top 5 most relevant)
    const relevantKeywords = keywords.filter(k => 
      ['Java', 'Spring Boot', 'AWS', 'Docker', 'Kubernetes', 'Microservices', 'Python', 'MongoDB', 'PostgreSQL', 'JavaScript'].includes(k)
    ).slice(0, 5);
    
    if (relevantKeywords.length > 0) {
      // Replace generic tech mentions with specific ones
      customizedSummary = customizedSummary.replace(
        'specializing in Java and Spring Boot',
        `specializing in ${relevantKeywords.join(', ')}`
      );
      
      // Add technology stack mention
      if (relevantKeywords.includes('AWS') || relevantKeywords.includes('Docker') || relevantKeywords.includes('Kubernetes')) {
        customizedSummary = customizedSummary.replace(
          'Successfully delivered scalable solutions',
          'Successfully delivered cloud-native scalable solutions using modern DevOps practices'
        );
      }
      
      // Add specific technology focus
      if (relevantKeywords.includes('Microservices')) {
        customizedSummary = customizedSummary.replace(
          'optimized systems',
          'microservices-based systems and distributed architectures'
        );
      }
    }
    
    // Add industry-specific experience if relevant
    if (jobDescription.toLowerCase().includes('e-commerce') || jobDescription.toLowerCase().includes('retail')) {
      customizedSummary = customizedSummary.replace(
        'AI-powered chat assistants',
        'e-commerce platforms and AI-powered customer solutions'
      );
    }
    
    if (jobDescription.toLowerCase().includes('fintech') || jobDescription.toLowerCase().includes('financial')) {
      customizedSummary = customizedSummary.replace(
        'AI-powered chat assistants',
        'financial technology solutions and secure payment systems'
      );
    }
    
    return customizedSummary;
  }

  // Helper method: Customize experience section
  async customizeExperience(experiences, keywords) {
    return experiences.map((exp, index) => {
      const enhancedHighlights = exp.highlights.map(highlight => {
        let enhanced = highlight;
        
        // Add specific keywords to relevant highlights
        if (highlight.includes('Lane Management System') && keywords.includes('AWS')) {
          enhanced = enhanced.replace(
            'Lane Management System',
            'AWS-powered Lane Management System'
          );
        }
        
        if (highlight.includes('Voyager') && keywords.includes('SQL')) {
          enhanced = enhanced.replace(
            'SQL queries',
            'complex SQL queries and database optimization'
          );
        }
        
        if (highlight.includes('LMP Insight tool') && keywords.includes('Kubernetes')) {
          enhanced = enhanced.replace(
            'processing 50K events/min',
            'processing 50K events/min using Kubernetes-orchestrated microservices'
          );
        }
        
        if (highlight.includes('label printing platform') && keywords.includes('Docker')) {
          enhanced = enhanced.replace(
            'label printing platform',
            'containerized label printing platform using Docker'
          );
        }
        
        if (highlight.includes('pipeline migrating') && keywords.includes('AWS')) {
          enhanced = enhanced.replace(
            'pipeline migrating',
            'AWS-based pipeline migrating'
          );
        }
        
        if (highlight.includes('backend services') && keywords.includes('Microservices')) {
          enhanced = enhanced.replace(
            'backend services',
            'microservices architecture and backend services'
          );
        }
        
        if (highlight.includes('microservices') && keywords.includes('Spring Boot')) {
          enhanced = enhanced.replace(
            'microservices',
            'Spring Boot microservices'
          );
        }
        
        if (highlight.includes('dashboard') && keywords.includes('MongoDB')) {
          enhanced = enhanced.replace(
            'dashboard',
            'MongoDB-powered analytics dashboard'
          );
        }
        
        return enhanced;
      });
      
      // Add new bullet point for most recent experience if it's highly relevant
      if (index === 0 && keywords.includes('AWS') && keywords.includes('Kubernetes')) {
        enhancedHighlights.push(
          `Architected and deployed cloud-native applications using ${keywords.filter(k => ['AWS', 'Docker', 'Kubernetes'].includes(k)).join(', ')} to ensure high availability and scalability.`
        );
      }
      
      return {
        ...exp,
        highlights: enhancedHighlights
      };
    });
  }

  // Helper method: Prepare template data (without highlighting for chat/API responses)
  async prepareTemplateData(resume) {
    // Convert Mongoose document to plain object to avoid circular references
    const plainResume = resume.toObject();
    
    const templateData = {
      name: plainResume.name,
      title: plainResume.title,
      location: plainResume.location,
      email: plainResume.email,
      phone: plainResume.phone,
      linkedin: plainResume.linkedin,
      github: plainResume.github,
      summary: plainResume.summary,
      education: plainResume.education.map(edu => ({
        ...edu,
        location: edu.location || this.getEducationLocation(edu.institution)
      })),
      experience: plainResume.experience,
      projects: plainResume.projects.map(proj => ({
        ...proj,
        technologies: Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies
      })),
      skills: {
        languages: Array.isArray(plainResume.skills.languages) ? plainResume.skills.languages.join(', ') : plainResume.skills.languages,
        technologies: Array.isArray(plainResume.skills.technologies) ? plainResume.skills.technologies.join(', ') : plainResume.skills.technologies,
        developerTools: Array.isArray(plainResume.skills.developerTools) ? plainResume.skills.developerTools.join(', ') : plainResume.skills.developerTools,
        databases: Array.isArray(plainResume.skills.databases) ? plainResume.skills.databases.join(', ') : plainResume.skills.databases,
        others: Array.isArray(plainResume.skills.others) ? plainResume.skills.others.join(', ') : plainResume.skills.others
      },
      achievements: plainResume.achievements,
      interests: plainResume.interests,
      customizedForJob: plainResume.customizedForJob,
      companyName: plainResume.companyName,
      jobTitle: plainResume.jobTitle,
      atsScore: plainResume.atsScore
    };

    return templateData;
  }

  // Helper method: Prepare template data specifically for PDF generation (with highlighting)
  async preparePDFTemplateData(resume) {
    // Start with the basic template data
    const templateData = await this.prepareTemplateData(resume);
    
    // Convert Mongoose document to plain object for keywords
    const plainResume = resume.toObject();

    // Apply keyword highlighting only for PDF generation
    if (plainResume.customizedForJob && plainResume.keywordsMatched && plainResume.keywordsMatched.length > 0) {
      templateData.experience = this.highlightKeywords(templateData.experience, plainResume.keywordsMatched);
      templateData.summary = this.highlightKeywords(templateData.summary, plainResume.keywordsMatched);
    }

    return templateData;
  }

  // Helper method: Generate PDF from HTML using Puppeteer
  async generatePDFFromHTML(html) {
    let browser;
    try {
      // Configuration for different environments
      const isProduction = process.env.NODE_ENV === 'production';
      const isHeroku = !!process.env.DYNO;
      
      let launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      };

      // Additional configuration for Heroku
      if (isHeroku || isProduction) {
        launchOptions.args.push(
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
        );
        
        // Try different Chrome executable paths in order of preference
        const chromePaths = [
          process.env.GOOGLE_CHROME_BIN,
          process.env.PUPPETEER_EXECUTABLE_PATH,
          '/app/.apt/usr/bin/google-chrome-stable',
          '/app/.apt/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium'
        ];
        
        for (const chromePath of chromePaths) {
          if (chromePath) {
            launchOptions.executablePath = chromePath;
            console.log(`Trying Chrome executable at: ${chromePath}`);
            break;
          }
        }
      }

      browser = await puppeteer.launch(launchOptions);
      
      const page = await browser.newPage();
      
      // Set a reasonable viewport and user agent
      await page.setViewport({ width: 1200, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        timeout: 30000
      });
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Helper method: Highlight keywords in content
  highlightKeywords(content, keywords, depth = 0) {
    // Prevent infinite recursion
    if (depth > 10) {
      return content;
    }
    
    // Return early if no keywords or content
    if (!keywords || keywords.length === 0 || content === null || content === undefined) {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content.map(item => this.highlightKeywords(item, keywords, depth + 1));
    }
    
    if (typeof content === 'object' && content !== null) {
      // Check for circular references or complex objects
      if (content.constructor !== Object && content.constructor !== Array) {
        return content;
      }
      
      const highlighted = {};
      for (const [key, value] of Object.entries(content)) {
        // Skip certain keys that might cause issues
        if (key.startsWith('_') || key === '__v' || key === '$__' || key === '$isNew') {
          highlighted[key] = value;
          continue;
        }
        highlighted[key] = this.highlightKeywords(value, keywords, depth + 1);
      }
      return highlighted;
    }
    
    if (typeof content === 'string') {
      let highlighted = content;
      keywords.forEach(keyword => {
        if (keyword && typeof keyword === 'string' && keyword.length > 1) {
          const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          highlighted = highlighted.replace(regex, `<span class="keyword-highlight">$&</span>`);
        }
      });
      return highlighted;
    }
    
    return content;
  }

  // Helper method: Get education location
  getEducationLocation(institution) {
    const locationMap = {
      'National Institute of Technology Warangal (NITW)': 'Telangana, India',
      'University of Delhi (DU)': 'Delhi, India'
    };
    return locationMap[institution] || '';
  }

  // Extract keywords from job description using basic NLP
  extractKeywordsFromJobDescription(jobDescription) {
    const keywords = [];
    const text = jobDescription.toLowerCase();
    
    // Technical skills patterns
    const techKeywords = [
      'java', 'python', 'javascript', 'typescript', 'c++', 'sql', 'nosql',
      'spring boot', 'spring', 'hibernate', 'react', 'angular', 'vue', 'node.js', 'nodejs',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'mongodb', 'postgresql', 'mysql',
      'microservices', 'apis', 'rest', 'graphql', 'kafka', 'redis', 'elasticsearch',
      'jenkins', 'git', 'agile', 'scrum', 'devops', 'ci/cd', 'terraform',
      'machine learning', 'ai', 'data science', 'big data', 'hadoop', 'spark'
    ];
    
    techKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    });
    
    // Extract specific tools and frameworks mentioned
    const toolPatterns = [
      /\b(react|angular|vue|ember)\b/gi,
      /\b(spring\s*boot|django|flask|express)\b/gi,
      /\b(docker|kubernetes|k8s)\b/gi,
      /\b(aws|azure|gcp|google\s*cloud)\b/gi
    ];
    
    toolPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        keywords.push(...matches.map(m => m.toLowerCase()));
      }
    });
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  // Use AI to enhance keyword extraction
  async getAIKeywordAnalysis(jobDescription) {
    if (!this.apiKey) {
      console.warn('Mistral API key not provided, skipping AI analysis');
      return [];
    }

    try {
      const prompt = `Extract the most important technical skills, programming languages, frameworks, tools, and technologies from this job description. Return only a comma-separated list of keywords:\n\n${jobDescription}`;
      
      const response = await axios.post(this.apiEndpoint, {
        model: this.modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.choices[0].message.content;
      const keywords = aiResponse
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 1 && k.length < 30);
      
      return keywords;
    } catch (error) {
      console.error('AI keyword analysis error:', error.message);
      return [];
    }
  }

  // Extract job requirements
  async extractJobRequirements(jobDescription) {
    const requirements = {
      experience: 'Not specified',
      education: 'Not specified',
      location: 'Not specified',
      type: 'Not specified'
    };

    const text = jobDescription.toLowerCase();

    // Extract experience requirements
    const expMatch = text.match(/(\d+)[\+\-\s]*years?\s*of\s*experience/i);
    if (expMatch) {
      requirements.experience = `${expMatch[1]}+ years`;
    }

    // Extract education requirements
    if (text.includes('bachelor') || text.includes('b.s') || text.includes('bs')) {
      requirements.education = 'Bachelor\'s degree';
    }
    if (text.includes('master') || text.includes('m.s') || text.includes('ms')) {
      requirements.education = 'Master\'s degree';
    }

    // Extract job type
    if (text.includes('senior') || text.includes('sr.')) {
      requirements.type = 'Senior';
    } else if (text.includes('lead') || text.includes('principal')) {
      requirements.type = 'Lead/Principal';
    } else if (text.includes('junior') || text.includes('entry')) {
      requirements.type = 'Junior/Entry';
    }

    return requirements;
  }

  // Generate customized content based on job requirements
  async generateCustomizedContent(baseResume, jobDescription, jobKeywords, requirements) {
    // Customize summary
    const customizedSummary = await this.customizeSummary(baseResume.summary, jobDescription, jobKeywords);
    
    // Customize experience highlights
    const customizedExperience = await this.customizeExperience(baseResume.experience, jobKeywords);
    
    // Calculate keyword matching
    const allSkills = [
      ...baseResume.skills.languages,
      ...baseResume.skills.technologies,
      ...baseResume.skills.databases,
      ...baseResume.skills.developerTools
    ].map(skill => skill.toLowerCase());
    
    const keywordsMatched = jobKeywords.filter(keyword => 
      allSkills.some(skill => skill.includes(keyword) || keyword.includes(skill))
    );
    
    const keywordsMissing = jobKeywords.filter(keyword => 
      !allSkills.some(skill => skill.includes(keyword) || keyword.includes(skill))
    );

    // Log customizations
    const customizationLog = [
      {
        section: 'summary',
        action: 'enhanced_with_keywords',
        details: `Added ${jobKeywords.slice(0, 5).join(', ')} and job-specific content`,
        timestamp: new Date()
      },
      {
        section: 'experience',
        action: 'highlighted_relevant_keywords',
        details: `Enhanced experience bullets with ${keywordsMatched.length} matching keywords`,
        timestamp: new Date()
      }
    ];

    return {
      summary: customizedSummary,
      experience: customizedExperience,
      keywordsMatched,
      keywordsMissing,
      customizationLog
    };
  }

  // Customize summary section
  async customizeSummary(originalSummary, jobDescription, keywords) {
    let customizedSummary = originalSummary;
    
    // Extract job-specific requirements
    const jobLevel = jobDescription.toLowerCase().includes('senior') || jobDescription.toLowerCase().includes('lead') ? 'Senior' : '';
    const isFullStack = jobDescription.toLowerCase().includes('full-stack') || jobDescription.toLowerCase().includes('fullstack');
    const isBackend = jobDescription.toLowerCase().includes('backend') || jobDescription.toLowerCase().includes('back-end');
    const isFrontend = jobDescription.toLowerCase().includes('frontend') || jobDescription.toLowerCase().includes('front-end');
    const isCloudFocused = jobDescription.toLowerCase().includes('cloud') || jobDescription.toLowerCase().includes('aws') || jobDescription.toLowerCase().includes('azure');
    const isEcommerce = jobDescription.toLowerCase().includes('e-commerce') || jobDescription.toLowerCase().includes('ecommerce');
    
    // Enhance title if senior role
    if (jobLevel === 'Senior') {
      customizedSummary = customizedSummary.replace('Software Engineer', 'Senior Software Engineer');
    }
    
    // Add relevant keywords to core skills
    const relevantKeywords = keywords.slice(0, 5).join(', ');
    customizedSummary = customizedSummary.replace(
      'specializing in Java and Spring Boot',
      `specializing in Java, Spring Boot, ${relevantKeywords}`
    );
    
    // Customize based on job focus
    if (isFullStack) {
      customizedSummary = customizedSummary.replace(
        'backend and full-stack development',
        'full-stack development with expertise in both frontend and backend technologies'
      );
    } else if (isBackend) {
      customizedSummary = customizedSummary.replace(
        'backend and full-stack development',
        'backend development with strong focus on scalable server-side solutions'
      );
    }
    
    // Add cloud expertise if relevant
    if (isCloudFocused) {
      customizedSummary = customizedSummary.replace(
        'scalable solutions',
        'cloud-native scalable solutions using modern DevOps practices'
      );
    }
    
    // Add e-commerce expertise if relevant
    if (isEcommerce) {
      customizedSummary = customizedSummary.replace(
        'AI-powered chat assistants',
        'e-commerce platforms and AI-powered customer solutions'
      );
    }
    
    return customizedSummary;
  }

  // Customize experience section
  async customizeExperience(originalExperience, keywords) {
    return originalExperience.map(exp => {
      const enhancedHighlights = exp.highlights.map(highlight => {
        let enhancedHighlight = highlight;
        
        // Add relevant keywords to technical descriptions
        keywords.forEach(keyword => {
          if (keyword === 'aws' && highlight.includes('Lane Management')) {
            enhancedHighlight = highlight.replace('Lane Management System', 'AWS-powered Lane Management System');
          }
          if (keyword === 'microservices' && highlight.includes('backend')) {
            enhancedHighlight = highlight.replace('backend', 'microservices backend');
          }
          if (keyword === 'docker' && highlight.includes('platform')) {
            enhancedHighlight = highlight.replace('platform', 'containerized platform using Docker');
          }
          if (keyword === 'kubernetes' && highlight.includes('scalable')) {
            enhancedHighlight = highlight.replace('scalable', 'Kubernetes-orchestrated scalable');
          }
        });
        
        return enhancedHighlight;
      });
      
      return {
        ...exp,
        highlights: enhancedHighlights
      };
    });
  }

  // Get all resumes with pagination and filtering
  getResumes = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filters = {};
      if (req.query.companyName) {
        filters.companyName = new RegExp(req.query.companyName, 'i');
      }
      if (req.query.isTemplate !== undefined) {
        filters.isTemplate = req.query.isTemplate === 'true';
      }
      if (req.query.customizedForJob !== undefined) {
        filters.customizedForJob = req.query.customizedForJob === 'true';
      }

      const resumes = await Resume.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v');

      const total = await Resume.countDocuments(filters);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        status: 'success',
        data: {
          resumes,
          pagination: {
            currentPage: page,
            totalPages,
            totalResumes: total,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get resumes error:', error);
      next(new AppError('Failed to fetch resumes', 500));
    }
  };

  // Get single resume by ID
  getResumeById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const resume = await Resume.findById(id).select('-__v');
      
      if (!resume) {
        return next(new AppError('Resume not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          resume
        }
      });
    } catch (error) {
      console.error('Get resume by ID error:', error);
      if (error.name === 'CastError') {
        return next(new AppError('Invalid resume ID', 400));
      }
      next(new AppError('Failed to fetch resume', 500));
    }
  };

  // Health check endpoint
  healthCheck = async (req, res, next) => {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          resumeServiceReady: true,
          templatesAvailable: ['professional', 'modern', 'executive', 'creative'],
          aiAnalysisEnabled: !!this.apiKey,
          pdfEditingEnabled: true,
          htmlTemplatingEnabled: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      next(new AppError('Service health check failed', 500));
    }
  };
}

module.exports = new ResumeController();
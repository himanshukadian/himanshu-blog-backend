# Resume Customization API

This API provides AI-powered resume customization based on job descriptions using modern best practices for ATS optimization and keyword matching.

## Features

- 🤖 **AI-Powered Analysis**: Uses Mistral AI for intelligent job description analysis
- 📄 **PDF Editing**: Customizes existing PDF resumes using pdf-lib
- 🎯 **ATS Optimization**: Implements modern ATS scoring and keyword matching
- 📊 **Match Scoring**: Provides detailed match percentage and skill alignment
- 🎨 **Template System**: Multiple professional templates for different industries
- 📈 **Performance Tracking**: Logs all customizations for analysis

## Prerequisites

- Node.js >= 14.0.0
- MongoDB database
- Mistral AI API key (optional for enhanced analysis)

## Environment Variables

```bash
MISTRAL_API_KEY=your_mistral_api_key_here  # Optional for AI-enhanced analysis
MONGO_URI=your_mongodb_connection_string
```

## API Endpoints

### 1. Health Check

```http
GET /api/resume/health
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "resumeServiceReady": true,
    "templatesAvailable": ["modern", "executive", "creative", "technical"],
    "aiAnalysisEnabled": true
  }
}
```

### 2. Create Base Resume Template

```http
POST /api/resume/base-resume
```

Creates the base resume template with Himanshu's information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "resume": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Himanshu Chaudhary",
      "title": "Software Engineer II",
      "isTemplate": true,
      // ... full resume data
    },
    "message": "Base resume template created successfully"
  }
}
```

### 3. Analyze Job Description

```http
POST /api/resume/analyze-job
```

**Request Body:**
```json
{
  "jobDescription": "We are looking for a Senior Software Engineer with 5+ years experience in Java, Spring Boot, AWS, and microservices...",
  "companyName": "Tech Corp",
  "jobTitle": "Senior Software Engineer"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "jobAnalysis": {
      "companyName": "Tech Corp",
      "jobTitle": "Senior Software Engineer",
      "keywords": ["Java", "Spring Boot", "AWS", "microservices", "API"],
      "requirements": {
        "experience": "5+ years of experience",
        "education": "Relevant degree preferred",
        "skills": ["Java", "Spring Boot", "AWS"],
        "responsibilities": []
      },
      "totalKeywords": 15,
      "aiEnhanced": true
    }
  }
}
```

### 4. Customize Resume for Job

```http
POST /api/resume/customize
```

**Request Body:**
```json
{
  "jobDescription": "We are looking for a Senior Software Engineer...",
  "companyName": "Tech Corp", 
  "jobTitle": "Senior Software Engineer",
  "templateId": "65a1b2c3d4e5f6g7h8i9j0k1"  // Optional, uses base template if not provided
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "resume": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "name": "Himanshu Chaudhary",
      "title": "Senior Software Engineer",
      "companyName": "Tech Corp",
      "jobTitle": "Senior Software Engineer",
      "customizedForJob": true,
      "atsScore": 85,
      "keywordsMatched": ["Java", "Spring Boot", "AWS"],
      "keywordsMissing": ["Docker", "Kubernetes"],
      "customizationLog": [
        {
          "section": "summary",
          "originalContent": "...",
          "customizedContent": "...",
          "reason": "Optimized for job requirements and keywords",
          "timestamp": "2024-01-15T10:30:00.000Z"
        }
      ],
      // ... full customized resume data
    },
    "atsScore": 85,
    "matchPercentage": 75,
    "keywordsMatched": ["Java", "Spring Boot", "AWS"],
    "keywordsMissing": ["Docker", "Kubernetes"],
    "customizations": [...]
  }
}
```

### 5. Generate Customized PDF

```http
POST /api/resume/generate-pdf/:resumeId
```

Generates a customized PDF based on the resume data.

**Response:**
```json
{
  "status": "success",
  "data": {
    "resumeId": "65a1b2c3d4e5f6g7h8i9j0k2",
    "pdfUrl": "/uploads/resume_Tech_Corp_1705234567890.pdf",
    "fileName": "resume_Tech_Corp_1705234567890.pdf",
    "fileSize": 245760,
    "customizations": 3
  }
}
```

### 6. Get All Resumes

```http
GET /api/resume?page=1&limit=10&isTemplate=false&customizedForJob=true
```

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of results per page
- `isTemplate` (boolean): Filter by template status
- `customizedForJob` (boolean): Filter by customization status
- `companyName` (string): Filter by company name
- `jobTitle` (string): Filter by job title
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "status": "success",
  "data": {
    "resumes": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 7. Get Resume by ID

```http
GET /api/resume/:id
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "resume": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "name": "Himanshu Chaudhary",
      // ... full resume data
      "templateId": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Himanshu Chaudhary",
        "title": "Software Engineer II"
      }
    }
  }
}
```

## Usage Example

### Complete Workflow

```javascript
// 1. Create base resume (one-time setup)
const baseResponse = await fetch('/api/resume/base-resume', {
  method: 'POST'
});

// 2. Analyze job description
const analysisResponse = await fetch('/api/resume/analyze-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobDescription: "Software Engineer position requiring Java, Spring Boot...",
    companyName: "Tech Corp",
    jobTitle: "Software Engineer"
  })
});

// 3. Customize resume for the job
const customizeResponse = await fetch('/api/resume/customize', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobDescription: "Software Engineer position requiring Java, Spring Boot...",
    companyName: "Tech Corp",
    jobTitle: "Software Engineer"
  })
});

const { resume } = await customizeResponse.json();

// 4. Generate PDF
const pdfResponse = await fetch(`/api/resume/generate-pdf/${resume._id}`, {
  method: 'POST'
});

const { pdfUrl } = await pdfResponse.json();
console.log(`Download PDF: ${pdfUrl}`);
```

## Features in Detail

### AI-Powered Job Analysis

The system uses advanced AI to:
- Extract relevant keywords from job descriptions
- Identify required skills and experience
- Analyze industry and company context
- Generate ATS optimization scores
- Provide intelligent customization suggestions

### ATS Optimization

Modern ATS systems are automatically handled with:
- Keyword density optimization
- Industry-specific terminology
- Action verb enhancement
- Quantifiable metrics highlighting
- Clean formatting for parsing

### PDF Customization

Using pdf-lib, the system can:
- Edit existing PDF content
- Add dynamic text overlays
- Highlight relevant skills
- Apply industry-specific styling
- Maintain professional formatting

### Template System

Multiple professional templates:
- **Modern**: Clean, tech-focused design
- **Executive**: Conservative, leadership-oriented
- **Creative**: Visually appealing for design roles
- **Technical**: Developer and engineering focused

### Performance Tracking

All customizations are logged for:
- A/B testing different approaches
- Performance analytics
- Continuous improvement
- Audit trails

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "errors": [
    // Detailed validation errors if applicable
  ]
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation errors)
- `404`: Resource not found
- `500`: Internal server error

## Rate Limiting

- Job analysis: 10 requests per 5 minutes per IP
- PDF generation: 5 requests per 15 minutes per IP
- Other endpoints: Standard rate limiting

## Security

- Input validation and sanitization
- XSS protection
- NoSQL injection prevention
- File upload security
- Rate limiting

## Best Practices

1. **Job Description Quality**: Provide detailed, well-formatted job descriptions for better analysis
2. **Caching**: Cache job analysis results for similar job descriptions
3. **Batch Processing**: Use bulk endpoints for multiple resume customizations
4. **Error Handling**: Always check response status and handle errors gracefully
5. **File Management**: Clean up old PDF files periodically

## Troubleshooting

### Common Issues

1. **PDF Generation Fails**
   - Check if Himanshu_Resume.pdf exists
   - Verify uploads directory permissions
   - Ensure pdf-lib is properly installed

2. **AI Analysis Not Working**
   - Verify MISTRAL_API_KEY is set
   - Check API key validity
   - Fallback to local analysis is automatic

3. **Low ATS Scores**
   - Job description may be too vague
   - Consider manual keyword enhancement
   - Check resume base content alignment

### Debug Mode

Set `NODE_ENV=development` for detailed logging and error information.
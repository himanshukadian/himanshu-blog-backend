const mongoose = require('mongoose');

const skillsSchema = new mongoose.Schema({
  languages: [String],
  technologies: [String],
  developerTools: [String],
  databases: [String],
  others: [String]
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  role: { type: String, required: true },
  location: String,
  duration: String,
  highlights: [String]
}, { _id: false });

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  year: String,
  achievements: [String]
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  technologies: [String],
  description: String
}, { _id: false });

const resumeSchema = new mongoose.Schema({
  // Base resume information
  name: { type: String, required: true },
  title: { type: String, required: true },
  location: String,
  email: { type: String, required: true },
  phone: String,
  linkedin: String,
  github: String,
  summary: String,
  
  // Resume sections
  skills: skillsSchema,
  experience: [experienceSchema],
  education: [educationSchema],
  projects: [projectSchema],
  achievements: [String],
  
  // PDF file information
  originalPdfPath: String,
  originalPdfUrl: String,
  
  // Customization tracking
  isTemplate: { type: Boolean, default: false },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  
  // Job-specific customizations
  jobDescription: String,
  companyName: String,
  jobTitle: String,
  customizedForJob: { type: Boolean, default: false },
  
  // ATS and matching data
  atsScore: Number,
  keywordsMatched: [String],
  keywordsMissing: [String],
  customizationLog: [{
    section: String,
    originalContent: String,
    customizedContent: String,
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Generated PDF information
  customizedPdfPath: String,
  customizedPdfUrl: String,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
resumeSchema.index({ email: 1 });
resumeSchema.index({ isTemplate: 1 });
resumeSchema.index({ templateId: 1 });
resumeSchema.index({ customizedForJob: 1 });
resumeSchema.index({ createdAt: -1 });

// Virtual for match percentage
resumeSchema.virtual('matchPercentage').get(function() {
  if (!this.keywordsMatched || !this.keywordsMissing) return 0;
  const total = this.keywordsMatched.length + this.keywordsMissing.length;
  return total > 0 ? Math.round((this.keywordsMatched.length / total) * 100) : 0;
});

// Method to extract keywords from job description
resumeSchema.methods.extractJobKeywords = function(jobDescription) {
  // Basic keyword extraction (can be enhanced with NLP)
  const keywords = [];
  const commonKeywords = [
    // Technical skills
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'MongoDB', 'SQL', 'AWS', 'Docker', 'Kubernetes',
    'Spring Boot', 'Microservices', 'API', 'REST', 'GraphQL', 'Git', 'CI/CD', 'Agile', 'Scrum',
    // Soft skills
    'leadership', 'teamwork', 'communication', 'problem-solving', 'project management', 'collaboration',
    // Experience levels
    'senior', 'junior', 'lead', 'architect', 'manager', 'developer', 'engineer', 'analyst'
  ];
  
  const text = jobDescription.toLowerCase();
  commonKeywords.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      keywords.push(keyword);
    }
  });
  
  return [...new Set(keywords)]; // Remove duplicates
};

// Method to calculate ATS score
resumeSchema.methods.calculateATSScore = function(jobKeywords) {
  const resumeText = `${this.summary} ${this.experience.map(exp => exp.highlights.join(' ')).join(' ')} ${this.skills.languages.join(' ')} ${this.skills.technologies.join(' ')}`.toLowerCase();
  
  let matchedKeywords = 0;
  let totalKeywords = jobKeywords.length;
  
  const matched = [];
  const missing = [];
  
  jobKeywords.forEach(keyword => {
    if (resumeText.includes(keyword.toLowerCase())) {
      matchedKeywords++;
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });
  
  this.keywordsMatched = matched;
  this.keywordsMissing = missing;
  this.atsScore = totalKeywords > 0 ? Math.round((matchedKeywords / totalKeywords) * 100) : 0;
  
  return this.atsScore;
};

module.exports = mongoose.model('Resume', resumeSchema); 
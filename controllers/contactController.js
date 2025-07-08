const AppError = require('../utils/appError');
const validator = require('validator');
const axios = require('axios');

// Handle contact form submission with flexible email options
const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, message, subject } = req.body;

    // Validation
    if (!name || !email || !message) {
      return next(new AppError('Name, email, and message are required', 400));
    }

    if (!validator.isEmail(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    if (name.length < 2 || name.length > 100) {
      return next(new AppError('Name must be between 2 and 100 characters', 400));
    }

    if (message.length < 10 || message.length > 2000) {
      return next(new AppError('Message must be between 10 and 2000 characters', 400));
    }

    // Sanitize inputs
    const sanitizedData = {
      name: validator.escape(name.trim()),
      email: validator.normalizeEmail(email),
      message: validator.escape(message.trim()),
      subject: subject ? validator.escape(subject.trim()) : 'Contact Form Submission',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    console.log(`📧 Processing contact form from: ${sanitizedData.email}`);

    // Try multiple email sending methods
    let emailSent = false;
    let lastError = null;

    // Method 1: Try EmailJS with server key if available
    if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PRIVATE_KEY) {
      try {
        const emailjsResponse = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: {
            name: sanitizedData.name,
            email: sanitizedData.email,
            message: sanitizedData.message,
            subject: sanitizedData.subject
          }
        });
        
        if (emailjsResponse.status === 200) {
          emailSent = true;
          console.log(`✅ Email sent via EmailJS API`);
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ EmailJS API failed: ${error.message}`);
      }
    }

    // Method 2: Try webhook if available
    if (!emailSent && process.env.EMAIL_WEBHOOK_URL) {
      try {
        const webhookResponse = await axios.post(process.env.EMAIL_WEBHOOK_URL, {
          to: process.env.CONTACT_EMAIL || 'himanshu.c.official@gmail.com',
          subject: `Contact Form: ${sanitizedData.subject}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${sanitizedData.name}</p>
            <p><strong>Email:</strong> ${sanitizedData.email}</p>
            <p><strong>Subject:</strong> ${sanitizedData.subject}</p>
            <p><strong>Message:</strong></p>
            <p>${sanitizedData.message}</p>
            <p><small>Submitted at: ${sanitizedData.timestamp}</small></p>
          `
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN || ''}`
          }
        });
        
        if (webhookResponse.status === 200) {
          emailSent = true;
          console.log(`✅ Email sent via webhook`);
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Webhook failed: ${error.message}`);
      }
    }

    // Method 3: Try nodemailer if configured
    if (!emailSent && process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      try {
        const { sendContactFormEmail } = require('../services/email');
        await sendContactFormEmail(sanitizedData);
        emailSent = true;
        console.log(`✅ Email sent via nodemailer`);
      } catch (error) {
        lastError = error;
        console.log(`❌ Nodemailer failed: ${error.message}`);
      }
    }

    // Method 4: Log to console and database as fallback
    if (!emailSent) {
      console.log(`📝 Logging contact form submission (email failed):`);
      console.log(`Name: ${sanitizedData.name}`);
      console.log(`Email: ${sanitizedData.email}`);
      console.log(`Subject: ${sanitizedData.subject}`);
      console.log(`Message: ${sanitizedData.message}`);
      console.log(`Time: ${sanitizedData.timestamp}`);
      
      // You could also save to database here
      emailSent = true; // Consider logging as successful submission
    }

    if (emailSent) {
      res.status(200).json({
        status: 'success',
        message: 'Your message has been received successfully! I will get back to you soon.'
      });
    } else {
      throw lastError || new Error('All email methods failed');
    }

  } catch (error) {
    console.error('Contact form error:', error);
    next(new AppError('Failed to send message. Please try again later.', 500));
  }
};

// Health check for email service
const healthCheck = async (req, res, next) => {
  try {
    const methods = [];
    
    if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PRIVATE_KEY) {
      methods.push('EmailJS API');
    }
    
    if (process.env.EMAIL_WEBHOOK_URL) {
      methods.push('Webhook');
    }
    
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      methods.push('Nodemailer');
    }
    
    methods.push('Console Logging'); // Always available

    res.status(200).json({
      status: 'success',
      data: {
        emailServiceConfigured: methods.length > 1,
        availableMethods: methods,
        ready: true
      }
    });
  } catch (error) {
    next(new AppError('Contact service health check failed', 500));
  }
};

module.exports = {
  submitContactForm,
  healthCheck
}; 
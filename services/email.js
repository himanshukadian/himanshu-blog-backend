const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const AppError = require('../utils/appError');

// Create email templates directory if it doesn't exist
const templatesDir = path.join(__dirname, '../templates/email');
fs.mkdir(templatesDir, { recursive: true }).catch(console.error);

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Load email template
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(templatesDir, `${templateName}.hbs`);
    const template = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(template);
  } catch (err) {
    throw new AppError(`Email template ${templateName} not found`, 500);
  }
};

// Send email
const sendEmail = async (options) => {
  try {
    const {
      to,
      subject,
      template,
      context,
      attachments,
      cc,
      bcc,
      replyTo
    } = options;

    // Load and compile template
    const compiledTemplate = await loadTemplate(template);
    const html = compiledTemplate(context);

    // Prepare email options
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      attachments,
      cc,
      bcc,
      replyTo
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('Email error:', err);
    throw new AppError('Error sending email', 500);
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Our Blog!',
    template: 'welcome',
    context: {
      name: user.name,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Reset Your Password',
    template: 'password-reset',
    context: {
      name: user.name,
      resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${user.passwordResetToken}`
    }
  });
};

// Send comment notification email
const sendCommentNotificationEmail = async (article, comment, user) => {
  await sendEmail({
    to: article.author.email,
    subject: 'New Comment on Your Article',
    template: 'comment-notification',
    context: {
      authorName: article.author.name,
      commenterName: user.name,
      articleTitle: article.title,
      commentContent: comment.content,
      articleLink: `${process.env.FRONTEND_URL}/articles/${article.slug}`
    }
  });
};

// Send article published email
const sendArticlePublishedEmail = async (article, subscribers) => {
  const emails = subscribers.map(sub => sub.email);
  await sendEmail({
    to: emails,
    subject: `New Article: ${article.title}`,
    template: 'article-published',
    context: {
      articleTitle: article.title,
      articleExcerpt: article.excerpt,
      authorName: article.author.name,
      articleLink: `${process.env.FRONTEND_URL}/articles/${article.slug}`
    }
  });
};

// Send newsletter email
const sendNewsletterEmail = async (subscribers, content) => {
  const emails = subscribers.map(sub => sub.email);
  await sendEmail({
    to: emails,
    subject: content.subject,
    template: 'newsletter',
    context: {
      content: content.body,
      unsubscribeLink: `${process.env.FRONTEND_URL}/unsubscribe`
    }
  });
};

// Send contact form email
const sendContactFormEmail = async (formData) => {
  await sendEmail({
    to: process.env.CONTACT_EMAIL,
    subject: 'New Contact Form Submission',
    template: 'contact-form',
    context: {
      name: formData.name,
      email: formData.email,
      message: formData.message
    }
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendCommentNotificationEmail,
  sendArticlePublishedEmail,
  sendNewsletterEmail,
  sendContactFormEmail
}; 
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  projectType: {
    type: String,
    required: [true, 'Project type is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true
  },
  timeline: {
    type: String,
    required: [true, 'Timeline is required'],
    trim: true
  },
  budget: {
    type: String,
    required: [true, 'Budget is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema); 
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Section = require('../models/Section');

const sections = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    order: 1,
    description: 'Introduction to System Design and basic concepts'
  },
  {
    title: 'Load Balancing & Caching',
    slug: 'load-balancing-caching',
    order: 2,
    description: 'Understanding load balancers and caching strategies'
  },
  {
    title: 'Content Delivery Networks',
    slug: 'content-delivery-networks',
    order: 3,
    description: 'CDN architecture and implementation'
  },
  {
    title: 'Database Design',
    slug: 'database-design',
    order: 4,
    description: 'Database scaling, sharding, and replication'
  },
  {
    title: 'Message Queues',
    slug: 'message-queues',
    order: 5,
    description: 'Asynchronous communication and message queuing'
  },
  {
    title: 'System Design Patterns',
    slug: 'system-design-patterns',
    order: 6,
    description: 'Common patterns and best practices in system design'
  },
  {
    title: 'Scalability & Performance',
    slug: 'scalability-performance',
    order: 7,
    description: 'Techniques for scaling systems and optimizing performance'
  },
  {
    title: 'Security & Reliability',
    slug: 'security-reliability',
    order: 8,
    description: 'Security considerations and ensuring system reliability'
  }
];

async function addSections() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find the System Design course
    const course = await Course.findOne({ slug: 'system-design' });
    if (!course) {
      console.error('System Design course not found');
      process.exit(1);
    }

    // Delete existing sections for the course
    await Section.deleteMany({ courseId: course._id });
    console.log('Deleted existing sections');

    // Create new sections
    const createdSections = await Section.insertMany(
      sections.map(section => ({
        ...section,
        courseId: course._id
      }))
    );

    console.log('\nCreated sections:');
    createdSections.forEach(section => {
      console.log(`- ${section.title} (${section.slug})`);
    });

    console.log('\nSections added successfully! 🎉');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addSections(); 
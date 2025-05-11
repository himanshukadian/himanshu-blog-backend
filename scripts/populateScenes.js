require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Chapter = require('../models/Chapter');
const Scene = require('../models/Scene');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Function to populate database
const populateDatabase = async () => {
  try {
    // Find the existing System Design course
    const course = await Course.findOne({ slug: 'system-design' });
    if (!course) {
      console.error('System Design course not found');
      return;
    }
    console.log('Found course:', course.title);

    // Define sections
    const sections = [
      {
        title: 'Advanced Concepts',
        slug: 'advanced-concepts',
        order: 2,
        description: 'Advanced system design patterns and practices'
      },
      {
        title: 'Case Studies',
        slug: 'case-studies',
        order: 3,
        description: 'Real-world system design case studies and implementations'
      }
    ];

    // Create sections and their chapters
    for (const sectionData of sections) {
      const section = await Section.create({
        ...sectionData,
        courseId: course._id
      });
      console.log(`Created section: ${section.title}`);

      // Create chapters for each section
      if (section.slug === 'advanced-concepts') {
        // Create Rate Limiter chapter
        const rateLimiterChapter = await Chapter.create({
          title: 'Rate Limiter',
          slug: 'rate-limiter',
          order: 1,
          sectionId: section._id
        });
        console.log(`Created chapter: ${rateLimiterChapter.title}`);

        // Create scenes for Rate Limiter chapter
        const rateLimiterScenes = [
          {
            title: 'Introduction to Rate Limiting',
            dialogue: 'Rate limiting is a strategy used to control the rate of requests a client can make to a server.',
            drawFunction: `(ctx) => {
              // Draw client
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 2;
              ctx.strokeRect(40, 60, 80, 40);
              ctx.font = '16px sans-serif';
              ctx.fillStyle = '#2563eb';
              ctx.fillText('Client', 50, 85);
              
              // Draw rate limiter
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 3;
              ctx.strokeRect(180, 90, 120, 60);
              ctx.fillStyle = '#6d28d9';
              ctx.fillText('Rate Limiter', 190, 125);
              
              // Draw server
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.strokeRect(350, 60, 100, 40);
              ctx.fillStyle = '#059669';
              ctx.fillText('Server', 370, 85);
            }`,
            order: 1,
            chapterId: rateLimiterChapter._id
          },
          {
            title: 'Rate Limiting Algorithms',
            dialogue: 'Common rate limiting algorithms include Token Bucket, Leaky Bucket, and Fixed Window.',
            drawFunction: `(ctx) => {
              // Draw algorithms
              ctx.strokeStyle = '#f59e42';
              ctx.lineWidth = 2;
              ctx.font = 'bold 14px sans-serif';
              ctx.fillStyle = '#f59e42';
              ctx.fillText('Token Bucket', 50, 40);
              ctx.fillText('Leaky Bucket', 50, 80);
              ctx.fillText('Fixed Window', 50, 120);
            }`,
            order: 2,
            chapterId: rateLimiterChapter._id
          },
          {
            title: 'Token Bucket Algorithm',
            dialogue: 'The Token Bucket algorithm maintains a bucket of tokens that are consumed for each request.',
            drawFunction: `(ctx) => {
              // Draw bucket
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(100, 100);
              ctx.lineTo(100, 200);
              ctx.lineTo(200, 200);
              ctx.lineTo(200, 100);
              ctx.stroke();
              
              // Draw tokens
              ctx.fillStyle = '#f59e42';
              for(let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(150, 150 - i * 15, 10, 0, Math.PI * 2);
                ctx.fill();
              }
              
              // Draw token generation
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(250, 150);
              ctx.lineTo(300, 150);
              ctx.stroke();
              ctx.fillStyle = '#059669';
              ctx.fillText('Token Generation', 260, 140);
            }`,
            order: 3,
            chapterId: rateLimiterChapter._id
          },
          {
            title: 'Leaky Bucket Algorithm',
            dialogue: 'The Leaky Bucket algorithm processes requests at a constant rate, like water leaking from a bucket.',
            drawFunction: `(ctx) => {
              // Draw bucket
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(100, 100);
              ctx.lineTo(100, 200);
              ctx.lineTo(200, 200);
              ctx.lineTo(200, 100);
              ctx.stroke();
              
              // Draw water level
              ctx.fillStyle = '#2563eb';
              ctx.fillRect(100, 150, 100, 50);
              
              // Draw leak
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(150, 200);
              ctx.lineTo(150, 250);
              ctx.stroke();
              ctx.fillStyle = '#059669';
              ctx.fillText('Constant Rate', 160, 270);
            }`,
            order: 4,
            chapterId: rateLimiterChapter._id
          },
          {
            title: 'Rate Limiting Implementation',
            dialogue: 'Rate limiting can be implemented at different levels: application, API gateway, or infrastructure.',
            drawFunction: `(ctx) => {
              // Draw layers
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 2;
              ctx.strokeRect(50, 50, 300, 60);
              ctx.strokeRect(50, 120, 300, 60);
              ctx.strokeRect(50, 190, 300, 60);
              
              // Draw labels
              ctx.fillStyle = '#6d28d9';
              ctx.font = 'bold 14px sans-serif';
              ctx.fillText('Application Layer', 70, 90);
              ctx.fillText('API Gateway', 70, 160);
              ctx.fillText('Infrastructure Layer', 70, 230);
            }`,
            order: 5,
            chapterId: rateLimiterChapter._id
          }
        ];

        for (const sceneData of rateLimiterScenes) {
          await Scene.create(sceneData);
          console.log(`Created scene: ${sceneData.title}`);
        }
      } else if (section.slug === 'case-studies') {
        // Create Lift Design chapter
        const liftDesignChapter = await Chapter.create({
          title: 'Lift Design',
          slug: 'lift-design',
          order: 1,
          sectionId: section._id
        });
        console.log(`Created chapter: ${liftDesignChapter.title}`);

        // Create scenes for Lift Design chapter
        const liftDesignScenes = [
          {
            title: 'Lift System Overview',
            dialogue: 'A lift system consists of multiple elevators serving multiple floors in a building.',
            drawFunction: `(ctx) => {
              // Draw building
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 2;
              ctx.strokeRect(40, 40, 100, 200);
              
              // Draw floors
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              for(let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(40, 40 + i * 40);
                ctx.lineTo(140, 40 + i * 40);
                ctx.stroke();
                ctx.fillStyle = '#6d28d9';
                ctx.fillText(\`Floor \${5-i}\`, 50, 35 + i * 40);
              }
              
              // Draw elevator
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.strokeRect(60, 80, 60, 40);
              ctx.fillStyle = '#059669';
              ctx.fillText('Lift', 75, 105);
            }`,
            order: 1,
            chapterId: liftDesignChapter._id
          },
          {
            title: 'Lift Scheduling',
            dialogue: 'Efficient lift scheduling algorithms ensure optimal service and minimal waiting time.',
            drawFunction: `(ctx) => {
              // Draw scheduling diagram
              ctx.strokeStyle = '#f59e42';
              ctx.lineWidth = 2;
              ctx.font = 'bold 14px sans-serif';
              ctx.fillStyle = '#f59e42';
              ctx.fillText('SCAN Algorithm', 50, 40);
              ctx.fillText('LOOK Algorithm', 50, 80);
              ctx.fillText('C-SCAN Algorithm', 50, 120);
            }`,
            order: 2,
            chapterId: liftDesignChapter._id
          },
          {
            title: 'SCAN Algorithm',
            dialogue: 'The SCAN algorithm moves the elevator in one direction until it reaches the end, then reverses direction.',
            drawFunction: `(ctx) => {
              // Draw building
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 2;
              ctx.strokeRect(40, 40, 100, 200);
              
              // Draw floors
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              for(let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(40, 40 + i * 40);
                ctx.lineTo(140, 40 + i * 40);
                ctx.stroke();
              }
              
              // Draw elevator path
              ctx.strokeStyle = '#f59e42';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(100, 200);
              ctx.lineTo(100, 40);
              ctx.lineTo(100, 200);
              ctx.stroke();
              
              // Draw arrows
              ctx.fillStyle = '#f59e42';
              ctx.fillText('↑', 95, 120);
              ctx.fillText('↓', 95, 180);
            }`,
            order: 3,
            chapterId: liftDesignChapter._id
          },
          {
            title: 'Multiple Elevator Coordination',
            dialogue: 'In a multi-elevator system, coordination is crucial to optimize passenger wait times and energy efficiency.',
            drawFunction: `(ctx) => {
              // Draw building
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 2;
              ctx.strokeRect(40, 40, 200, 200);
              
              // Draw floors
              ctx.strokeStyle = '#6d28d9';
              ctx.lineWidth = 1;
              for(let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(40, 40 + i * 40);
                ctx.lineTo(240, 40 + i * 40);
                ctx.stroke();
              }
              
              // Draw multiple elevators
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.strokeRect(60, 80, 60, 40);
              ctx.strokeRect(140, 160, 60, 40);
              ctx.strokeRect(180, 40, 60, 40);
              
              // Draw coordination arrows
              ctx.strokeStyle = '#f59e42';
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(90, 100);
              ctx.lineTo(170, 180);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(170, 180);
              ctx.lineTo(210, 60);
              ctx.stroke();
              ctx.setLineDash([]);
            }`,
            order: 4,
            chapterId: liftDesignChapter._id
          },
          {
            title: 'Emergency Handling',
            dialogue: 'Lift systems must handle emergencies like power failures, fire alarms, and mechanical issues.',
            drawFunction: `(ctx) => {
              // Draw emergency scenarios
              ctx.strokeStyle = '#dc2626';
              ctx.lineWidth = 2;
              ctx.font = 'bold 14px sans-serif';
              ctx.fillStyle = '#dc2626';
              ctx.fillText('Power Failure', 50, 40);
              ctx.fillText('Fire Alarm', 50, 80);
              ctx.fillText('Mechanical Issue', 50, 120);
              
              // Draw safety features
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.font = '14px sans-serif';
              ctx.fillStyle = '#059669';
              ctx.fillText('Backup Power', 200, 40);
              ctx.fillText('Emergency Brakes', 200, 80);
              ctx.fillText('Manual Override', 200, 120);
            }`,
            order: 5,
            chapterId: liftDesignChapter._id
          }
        ];

        for (const sceneData of liftDesignScenes) {
          await Scene.create(sceneData);
          console.log(`Created scene: ${sceneData.title}`);
        }
      }
    }

    console.log('Database population completed successfully! 🎉');

  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
populateDatabase();
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

    // Find existing sections
    const sections = await Section.find({ courseId: course._id });
    console.log('Found sections:', sections.map(s => s.title));

    // Update chapters and scenes for each section
    for (const section of sections) {
      if (section.slug === 'advanced-concepts') {
        // Find and update Rate Limiter chapter
        const rateLimiterChapter = await Chapter.findOne({ 
          sectionId: section._id,
          slug: 'rate-limiter'
        });
        
        if (rateLimiterChapter) {
          // Update chapter with course field
          await Chapter.findByIdAndUpdate(rateLimiterChapter._id, {
            course: course.title
          });
          console.log(`Updated chapter: ${rateLimiterChapter.title}`);

          // Update all scenes for this chapter
          const scenes = await Scene.find({ chapterId: rateLimiterChapter._id });
          for (const scene of scenes) {
            await Scene.findByIdAndUpdate(scene._id, {
              chapter: rateLimiterChapter.title
            });
            console.log(`Updated scene: ${scene.title}`);
          }
        }
      } else if (section.slug === 'case-studies') {
        // Find and update Lift Design chapter
        const liftDesignChapter = await Chapter.findOne({ 
          sectionId: section._id,
          slug: 'lift-design'
        });
        
        if (liftDesignChapter) {
          // Update chapter with course field
          await Chapter.findByIdAndUpdate(liftDesignChapter._id, {
            course: course.title
          });
          console.log(`Updated chapter: ${liftDesignChapter.title}`);

          // Update all scenes for this chapter
          const scenes = await Scene.find({ chapterId: liftDesignChapter._id });
          for (const scene of scenes) {
            await Scene.findByIdAndUpdate(scene._id, {
              chapter: liftDesignChapter.title
            });
            console.log(`Updated scene: ${scene.title}`);
          }
        }
      }
    }

    console.log('Database update completed successfully! 🎉');

  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
populateDatabase();
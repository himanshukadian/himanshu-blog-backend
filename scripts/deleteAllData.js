require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Chapter = require('../models/Chapter');
const Scene = require('../models/Scene');

async function deleteAllData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete all data in reverse order of dependencies
    console.log('\nDeleting all data...');
    
    // Delete scenes first (they depend on chapters)
    const deletedScenes = await Scene.deleteMany({});
    console.log(`Deleted ${deletedScenes.deletedCount} scenes`);

    // Delete chapters (they depend on sections)
    const deletedChapters = await Chapter.deleteMany({});
    console.log(`Deleted ${deletedChapters.deletedCount} chapters`);

    // Delete sections (they depend on courses)
    const deletedSections = await Section.deleteMany({});
    console.log(`Deleted ${deletedSections.deletedCount} sections`);

    // Delete courses last
    const deletedCourses = await Course.deleteMany({});
    console.log(`Deleted ${deletedCourses.deletedCount} courses`);

    console.log('\nAll data deleted successfully! 🎉');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
deleteAllData(); 
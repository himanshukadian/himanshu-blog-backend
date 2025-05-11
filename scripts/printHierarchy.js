require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Chapter = require('../models/Chapter');
const Scene = require('../models/Scene');

async function printHierarchy() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const courses = await Course.find({});
  for (const course of courses) {
    console.log(`Course: ${course.title} (${course.slug})`);
    const sections = await Section.find({ courseId: course._id }).sort({ order: 1 });
    for (const section of sections) {
      console.log(`  Section: ${section.title} (${section.slug})`);
      const chapters = await Chapter.find({ sectionId: section._id }).sort({ order: 1 });
      for (const chapter of chapters) {
        console.log(`    Chapter: ${chapter.title} (${chapter.slug})`);
        const scenes = await Scene.find({ chapterId: chapter._id }).sort({ order: 1 });
        for (const scene of scenes) {
          console.log(`      Scene: ${scene.title} | Dialogue: ${scene.dialogue.slice(0, 40)}...`);
        }
      }
    }
  }

  await mongoose.disconnect();
  console.log('Done!');
}

printHierarchy().catch(err => {
  console.error(err);
  process.exit(1);
}); 
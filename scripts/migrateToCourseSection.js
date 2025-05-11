require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Chapter = require('../models/Chapter');
const Scene = require('../models/Scene');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // 1. Ensure the course exists
  let course = await Course.findOne({ slug: 'system-design' });
  if (!course) {
    course = await Course.create({
      title: 'System Design',
      slug: 'system-design',
      description: 'System Design course'
    });
    console.log('Created course:', course.title);
  }

  // 2. Ensure the section exists
  let section = await Section.findOne({ slug: 'getting-started', courseId: course._id });
  if (!section) {
    section = await Section.create({
      title: 'Getting Started',
      slug: 'getting-started',
      order: 1,
      courseId: course._id
    });
    console.log('Created section:', section.title);
  }

  // 3. Update all chapters to reference the section
  const chapters = await Chapter.find({});
  for (const chapter of chapters) {
    chapter.sectionId = section._id;
    await chapter.save();
    console.log(`Updated chapter "${chapter.title}" to section "${section.title}"`);
  }

  // 4. (Optional) Clean up old fields if needed

  await mongoose.disconnect();
  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
}); 
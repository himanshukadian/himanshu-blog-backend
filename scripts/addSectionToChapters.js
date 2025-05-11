require('dotenv').config();
const mongoose = require('mongoose');
const Chapter = require('../models/Chapter');

const sectionMap = [
  {
    section: "System Design Interviews",
    slugs: [
      "getting-ready-for-the-system-design-interview",
      "key-concepts-to-prepare",
      "resources-to-prepare",
      "dos-and-donts",
      "ai-evaluate-preparation"
    ]
  },
  {
    section: "Introduction",
    slugs: [
      "what-is-system-design",
      "why-system-design-matters"
    ]
  },
  {
    section: "Abstractions",
    slugs: [
      "abstraction-1",
      "abstraction-2"
    ]
  }
  // Add more sections and slugs as needed
];

function getSectionForSlug(slug) {
  for (const group of sectionMap) {
    if (group.slugs.includes(slug)) return group.section;
  }
  return "Other";
}

async function addSections() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const chapters = await Chapter.find({});
  for (const chapter of chapters) {
    const section = getSectionForSlug(chapter.slug);
    chapter.section = section;
    await chapter.save();
    console.log(`Updated chapter "${chapter.title}" with section "${section}"`);
  }
  await mongoose.disconnect();
  console.log('Migration complete!');
}

addSections().catch(err => {
  console.error(err);
  process.exit(1);
}); 
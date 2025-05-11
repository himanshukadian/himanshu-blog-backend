require('dotenv').config();
const mongoose = require('mongoose');
const Scene = require('./models/Scene');
const Chapter = require('./models/Chapter');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const chapter = await Chapter.findOne({ slug: 'load-balancer' });
  if (!chapter) {
    console.log('No chapter found with slug "load-balancer"');
  } else {
    console.log('Chapter:', chapter);
    const scenes = await Scene.find({ chapterId: chapter._id });
    console.log(`Found ${scenes.length} scenes for chapterId ${chapter._id}:`);
    scenes.forEach((scene, i) => {
      console.log(`${i + 1}. ${scene.title} | chapterId: ${scene.chapterId}`);
    });
  }

  // Print all scenes in the database
  const allScenes = await Scene.find();
  console.log(`\nAll scenes in the database (${allScenes.length}):`);
  allScenes.forEach((scene, i) => {
    console.log(`${i + 1}. ${scene.title} | chapterId: ${scene.chapterId}`);
  });

  await mongoose.disconnect();
}

main(); 
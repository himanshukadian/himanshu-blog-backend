require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Chapter = require('./models/Chapter');
const Scene = require('./models/Scene');

const DATA_DIR = '/Users/hc419z/Downloads/code-animo/app/system-design/data';
const CHAPTER_ORDER = ['Load Balancer', 'Caching', 'CDN', 'Database', 'Message Queue'];
const COURSE = 'System Design';

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/blog-backend';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function deleteExistingData() {
  try {
    await Chapter.deleteMany({});
    await Scene.deleteMany({});
    console.log('Deleted existing data');
  } catch (error) {
    console.error('Error deleting existing data:', error);
    throw error;
  }
}

async function createChapters() {
  const chapters = [];
  for (let i = 0; i < CHAPTER_ORDER.length; i++) {
    const title = CHAPTER_ORDER[i];
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const chapter = await Chapter.create({
      title,
      slug,
      order: i + 1,
      course: COURSE
    });
    chapters.push(chapter);
    console.log(`Created chapter: ${title}`);
  }
  return chapters;
}

async function readDataFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf8');
  const scenes = [];

  // Map filename to the correct key
  const keyMap = {
    'loadBalancer.ts': 'Load Balancer',
    'caching.ts': 'Caching',
    'cdn.ts': 'CDN',
    'database.ts': 'Database',
    'messageQueue.ts': 'Message Queue'
  };
  const key = keyMap[filename];
  if (!key) {
    console.log(`No key mapping found for ${filename}`);
    return scenes;
  }

  // Updated regex to handle whitespace and capture the entire array
  const chapterMatch = content.match(new RegExp(`'${key}'\\s*:\\s*\\[([\\s\\S]*?)\\]\\s*[,}]`));
  if (!chapterMatch) {
    console.log(`No '${key}' array found in ${filename}`);
    return scenes;
  }

  const scenesArrayContent = chapterMatch[1];
  // Split the array content by '},' to separate each scene object
  const sceneObjects = scenesArrayContent.split(/},\s*{/).map((scene, idx, arr) => {
    if (idx === 0) {
      return scene.endsWith('}') ? scene : scene + '}';
    } else if (idx === arr.length - 1) {
      return '{' + scene;
    } else {
      return '{' + scene + '}';
    }
  });

  sceneObjects.forEach((sceneObj) => {
    // Extract dialogue
    const dialogueMatch = sceneObj.match(/dialogue:\s*"([^"]*)"/);
    const dialogue = dialogueMatch ? dialogueMatch[1] : '';
    // Extract draw function as string
    const drawMatch = sceneObj.match(/draw:\s*\((ctx:[^)]*)\)\s*=>\s*{([\s\S]*)}/);
    let drawFunction = '';
    if (drawMatch) {
      drawFunction = `(${drawMatch[1]}) => {${drawMatch[2]}}`;
    }
    if (dialogue && drawFunction) {
      scenes.push({ dialogue, drawFunction });
    }
  });

  return scenes;
}

async function populateScenes(chapters) {
  const fileMap = {
    'Load Balancer': 'loadBalancer.ts',
    'Caching': 'caching.ts',
    'CDN': 'cdn.ts',
    'Database': 'database.ts',
    'Message Queue': 'messageQueue.ts'
  };

  for (const chapter of chapters) {
    const filename = fileMap[chapter.title];
    if (!filename) continue;

    const scenes = await readDataFile(filename);
    console.log(`Extracted scenes from ${filename}:`, scenes);
    for (let i = 0; i < scenes.length; i++) {
      await Scene.create({
        title: `${chapter.title} Scene ${i + 1}`,
        chapterId: chapter._id,
        chapter: chapter.title,
        dialogue: scenes[i].dialogue,
        drawFunction: scenes[i].drawFunction,
        order: i + 1
      });
    }
    console.log(`Populated scenes for chapter: ${chapter.title}`);
  }
}

async function main() {
  try {
    await connectDB();
    await deleteExistingData();
    const chapters = await createChapters();
    await populateScenes(chapters);
    console.log('Data population completed successfully');
  } catch (error) {
    console.error('Error populating data:', error);
  } finally {
    await mongoose.connection.close();
  }
}

main(); 
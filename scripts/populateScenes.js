require('dotenv').config();
const mongoose = require('mongoose');
const Scene = require('../models/Scene');
const fs = require('fs');
const path = require('path');

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

// Function to read and parse frontend data files
const readFrontendData = () => {
  const frontendPath = '/Users/hc419z/Downloads/code-animo/app/system-design/data';
  console.log('Looking for data files in:', frontendPath);
  const chapters = {};

  if (!fs.existsSync(frontendPath)) {
    console.error('Frontend data directory not found:', frontendPath);
    return chapters;
  }

  const files = fs.readdirSync(frontendPath)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts' && file !== 'types.ts');
  console.log('Found files:', files);

  files.forEach(file => {
    const filePath = path.join(frontendPath, file);
    console.log('Reading file:', filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract the exported chapter name (e.g., export const cachingChapter: ChapterData = { ... })
    const chapterExportMatch = content.match(/export const (\w+): ChapterData = {([\s\S]*?)};/);
    if (!chapterExportMatch) {
      console.log('No chapter export found in file:', file);
      return;
    }
    // The exported object (e.g., cachingChapter)
    // The object content (e.g., 'Caching': [ ... ])
    const objectContent = chapterExportMatch[2];

    // Extract the chapter key (e.g., 'Caching')
    const chapterKeyMatch = objectContent.match(/'([^']+)'\s*:\s*\[/);
    if (!chapterKeyMatch) {
      console.log('No chapter key found in file:', file);
      return;
    }
    const chapterKey = chapterKeyMatch[1];
    console.log('Processing chapter:', chapterKey);

    // Extract the array of steps (between the first [ and the matching ])
    const stepsArrayMatch = objectContent.match(/\[([\s\S]*)\]/);
    if (!stepsArrayMatch) {
      console.log('No steps array found in file:', file);
      return;
    }
    const stepsArrayContent = stepsArrayMatch[1];

    // Split steps by '},' (end of each object), but keep the closing brace
    const stepObjects = stepsArrayContent.split(/},\s*{/).map((step, idx, arr) => {
      // Add opening/closing braces as needed
      if (idx === 0) {
        return step.endsWith('}') ? step : step + '}';
      } else if (idx === arr.length - 1) {
        return '{' + step;
      } else {
        return '{' + step + '}';
      }
    });

    const steps = stepObjects.map((stepObj, i) => {
      // Extract dialogue
      const dialogueMatch = stepObj.match(/dialogue:\s*"([^"]*)"/);
      const dialogue = dialogueMatch ? dialogueMatch[1] : '';
      // Extract draw function as string
      const drawMatch = stepObj.match(/draw:\s*\((ctx:[^)]*)\)\s*=>\s*{([\s\S]*)}/);
      let drawFunction = '';
      if (drawMatch) {
        drawFunction = `(${drawMatch[1]}) => {${drawMatch[2]}}`;
      }
      return {
        title: chapterKey + ' Step ' + (i + 1),
        dialogue,
        drawFunction,
        order: i,
        clearBeforeDraw: false // You can enhance this if needed
      };
    });
    chapters[chapterKey] = steps;
    console.log(`Found ${steps.length} steps in chapter ${chapterKey}`);
  });
  return chapters;
};

// Function to populate database
const populateDatabase = async () => {
  try {
    await Scene.deleteMany({});
    console.log('Cleared existing scenes');
    const chapters = readFrontendData();
    console.log('Read frontend data:', Object.keys(chapters));
    for (const [chapter, scenes] of Object.entries(chapters)) {
      const scenesWithChapter = scenes.map(scene => ({
        ...scene,
        chapter
      }));
      await Scene.insertMany(scenesWithChapter);
      console.log(`Inserted ${scenes.length} scenes for chapter: ${chapter}`);
    }
    console.log('Database population completed successfully');
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    mongoose.connection.close();
  }
};

populateDatabase(); 
const mongoose = require('mongoose');
require('dotenv').config();

const Article = require('./models/Article');
const Type = require('./models/Type');

async function populateTypes() {
  await mongoose.connect(process.env.MONGO_URI);

  // Get all unique types from articles
  const types = await Article.distinct('type');
  for (const name of types.filter(Boolean)) {
    // Upsert to avoid duplicates
    await Type.updateOne({ name }, { name }, { upsert: true });
    console.log(`Type added/ensured: ${name}`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

populateTypes().catch(err => {
  console.error(err);
  process.exit(1);
}); 
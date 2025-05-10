const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env
const Article = require('../models/Article');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/YOUR_DB_NAME';

async function fixNegativeCommentCounts() {
  console.log('Connecting to:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const negativeArticles = await Article.find({ 'stats.comments': { $lt: 0 } });
  console.log(`Found ${negativeArticles.length} articles with negative comment counts.`);
  if (negativeArticles.length > 0) {
    negativeArticles.forEach(a => {
      console.log(` - Article ID: ${a._id}, Title: ${a.title}, Comments: ${a.stats.comments}`);
    });
  }

  const result = await Article.updateMany(
    { 'stats.comments': { $lt: 0 } },
    { $set: { 'stats.comments': 0 } }
  );

  console.log('Update result:', result);
  console.log(`Updated ${result.nModified || result.modifiedCount} articles with negative comment counts.`);
  await mongoose.disconnect();
}

fixNegativeCommentCounts().catch(err => {
  console.error(err);
  process.exit(1);
}); 
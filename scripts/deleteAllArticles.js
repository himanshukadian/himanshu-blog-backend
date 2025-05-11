require('dotenv').config();

console.log('Script started');

const mongoose = require('mongoose');
const Article = require('../models/Article');

if (!process.env.MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not set.');
  process.exit(1);
}

// Connect to the database using environment variable
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to the database');
  return Article.deleteMany({});
}).then(result => {
  console.log(`Deleted ${result.deletedCount} articles`);
  return mongoose.connection.close();
}).then(() => {
  console.log('Database connection closed');
}).catch(err => {
  console.error('Error:', err);
  mongoose.connection.close();
}); 
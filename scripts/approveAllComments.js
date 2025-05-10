require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Use your actual variable name here (commonly MONGO_URI or DATABASE)
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE;

if (!MONGO_URI) {
  console.error('MongoDB connection string not found in environment variables.');
  process.exit(1);
}

const commentSchema = new mongoose.Schema({}, { strict: false });
const Comment = mongoose.model('Comment', commentSchema);

async function approveAllComments() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const result = await Comment.updateMany(
    { status: { $ne: 'approved' } },
    { $set: { status: 'approved' } }
  );

  console.log(`Updated ${result.modifiedCount || result.nModified} comments to 'approved'.`);
  await mongoose.disconnect();
}

approveAllComments().catch(err => {
  console.error('Error approving comments:', err);
  process.exit(1);
}); 
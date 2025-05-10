require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const adminUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin'
};

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    await User.deleteOne({ email: adminUser.email });
    console.log('Deleted existing admin user if any');

    // Create admin user
    const user = await User.create(adminUser);
    console.log('Admin user created successfully:', {
      name: user.name,
      email: user.email,
      role: user.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin(); 
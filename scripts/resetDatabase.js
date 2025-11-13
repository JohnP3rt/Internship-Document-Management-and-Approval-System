require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { User, StudentProfile } = require('../models');

const resetDatabase = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    console.log('Deleted all documents from collections');

    const uploadsDir = path.join(__dirname, '..', config.UPLOAD_DIR);
    if (fs.existsSync(uploadsDir)) {
      fs.readdirSync(uploadsDir).forEach(file => {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
      console.log('Cleared uploads directory');
    }

    console.log('Database reset complete');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();

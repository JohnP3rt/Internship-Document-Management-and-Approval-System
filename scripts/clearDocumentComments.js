require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { StudentProfile } = require('../models');

const clearDocumentComments = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await StudentProfile.updateMany(
      {},
      { 
        $set: { 
          'documents.$[].comments': [] 
        } 
      }
    );

    console.log(`Cleared comments from ${result.modifiedCount} student profiles`);
    console.log('All document comments have been removed');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing document comments:', error);
    process.exit(1);
  }
};

clearDocumentComments();

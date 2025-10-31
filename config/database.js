const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('\nDatabase connection successful');
    console.log('----------------------------\n');
  } catch (err) {
    console.error('\nDatabase connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('error', err => {
  console.error('\nMongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('\nMongoDB disconnected - reconnecting...');
  connectDB();
});

module.exports = connectDB;

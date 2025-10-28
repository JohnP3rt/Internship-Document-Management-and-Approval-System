require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt-etr',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
    MAX_FILE_SIZE: 5 * 1024 * 1024
};

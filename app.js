const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser'); // Add this
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Add cookie parser
app.use(cookieParser());

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, config.UPLOAD_DIR)));

// Database connection
const connectDB = require('./config/database');
connectDB();

// View engine setup
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/profile-pictures', express.static(path.join(__dirname, 'uploads/profile-pictures')));
app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads/documents')));

// Create upload directories if they don't exist
const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/documents'),
    path.join(__dirname, 'uploads/profile-pictures')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created directory:', dir);
    }
});

// Add this before error handlers
app.use((err, req, res, next) => {
    console.error(err);
    if (err instanceof multer.MulterError) {
        return res.redirect('back?error=' + encodeURIComponent('File upload error: ' + err.message));
    }
    next(err);
});

// Add these routes before the API routes
app.get('/', (req, res) => {
    res.render('auth/login', { 
        error: req.query.error,
        message: req.query.message 
    });
});
app.get('/register', (req, res) => res.render('auth/register'));

// Correct route handling order
app.use('/api', routes);  // API routes first
app.use('/', routes);     // Then general routes

// View routes
const studentRoutes = require('./routes/student');
const coordinatorRoutes = require('./routes/coordinator');
const directorRoutes = require('./routes/director');

app.use('/student', studentRoutes);
app.use('/coordinator', coordinatorRoutes);
app.use('/director', directorRoutes);

// Error handlers for view routes
app.use((err, req, res, next) => {
    if (!req.path.startsWith('/api')) {
        console.error(err);
        return res.render('error', { 
            message: 'Something went wrong!',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
    next(err);
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
}

// Error handlers
app.use(errorHandler);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;  // Make sure this line is present
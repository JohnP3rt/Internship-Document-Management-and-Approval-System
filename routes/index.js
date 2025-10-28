const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth');
const studentRoutes = require('./student');
const coordinatorRoutes = require('./coordinator');
const directorRoutes = require('./director');

// Use routes
router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/director', directorRoutes);

// Export the router
module.exports = router;

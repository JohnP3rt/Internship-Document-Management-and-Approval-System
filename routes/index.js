const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const studentRoutes = require('./student');
const coordinatorRoutes = require('./coordinator');
const directorRoutes = require('./director');

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/director', directorRoutes);

module.exports = router;

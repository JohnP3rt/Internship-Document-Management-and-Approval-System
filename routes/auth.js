const express = require('express');
const router = express.Router();
const { User, StudentProfile } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config'); // Add this line

// POST /api/auth/student-register
router.post('/student-register', async (req, res) => {
  try {
    const { email, password, studentId, firstName, lastName, contactNumber } = req.body;
    
    if (!email || !password || !studentId) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const user = await User.create({
      email,
      password: await bcrypt.hash(password, 10),
      role: 'student',
      status: 'pending'
    });

    const profile = await StudentProfile.create({
      user: user._id,
      personalData: {
        studentId: studentId,  // Make sure this is set
        firstName: firstName,
        lastName: lastName,
        contactNumber: contactNumber
      }
    });

    user.studentProfile = profile._id;
    await user.save();

    res.json({ message: 'Registration successful. Please wait for coordinator approval.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.status !== 'active') return res.status(401).json({ error: 'Invalid credentials or not active' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user._id, role: user.role }, config.JWT_SECRET, { expiresIn: '1d' }); // Use config.JWT_SECRET
  res.json({ token, role: user.role });
});

// GET /api/auth/logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/?message=Successfully logged out');
});

module.exports = router;  // Make sure this is at the end of the file

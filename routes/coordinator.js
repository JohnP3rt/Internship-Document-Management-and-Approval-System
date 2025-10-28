const express = require('express');
const router = express.Router();
const { User, StudentProfile, Announcement } = require('../models');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const profileStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        try {
            const dir = path.join(__dirname, '..', 'uploads', 'profile-pictures');
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } catch (err) {
            cb(err);
        }
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

const profileUpload = multer({
    storage: profileStorage,
    fileFilter: function(req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('profilePicture');

router.post('/create-coordinator', auth('coordinator'), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    password: hash,
    role: 'coordinator',
    status: 'active'
  });
  res.json({ message: 'Coordinator created', userId: user._id });
});

router.get('/pending-students', auth('coordinator'), async (req, res) => {
  const students = await User.find({ role: 'student', status: 'pending' });
  res.json(students);
});

router.put('/approve-student/:userId', auth('coordinator'), async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || user.role !== 'student') return res.status(404).json({ error: 'Student not found' });
  user.status = 'active';
  await user.save();
  res.json({ message: 'Student approved' });
});

router.get('/students', auth('coordinator'), async (req, res) => {
  const { status } = req.query;
  const filter = { role: 'student', status: 'active' };
  const users = await User.find(filter).populate('studentProfile');
  let profiles = users.map(u => u.studentProfile).filter(Boolean);
  if (status) profiles = profiles.filter(p => p.overallStatus === status);
  res.json(profiles);
});

router.get('/student/:studentId', auth('coordinator'), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.studentId).populate('user');
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

router.put('/checklist/:profileId', auth('coordinator'), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.profileId);
  profile.coordinatorChecklist = { ...profile.coordinatorChecklist, ...req.body };
  await profile.save();
  res.json(profile.coordinatorChecklist);
});

router.put('/mark-done/:profileId', auth('coordinator'), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.profileId);
  profile.overallStatus = 'Pending Director Review';
  await profile.save();
  res.json({ message: 'Marked as done, sent to director.' });
});

router.get('/student-details/:studentId', auth('coordinator'), async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId)
      .populate({
        path: 'studentProfile',
        populate: {
          path: 'documents'
        }
      });

    if (!student) {
      return res.redirect('/coordinator/dashboard?error=Student not found');
    }

    res.render('coordinator/student-details', { 
      student,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error('Student Details Error:', err);
    res.redirect('/coordinator/dashboard?error=Error loading student details');
  }
});

router.put('/document-status/:docId', auth('coordinator'), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
    if (!profile) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = profile.documents.id(req.params.docId);
    doc.status = req.body.status;
    await profile.save();

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error('Update Status Error:', err);
    res.status(500).json({ error: 'Error updating status' });
  }
});

router.get('/edit-profile', auth('coordinator'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('coordinator/edit-profile', { user });
    } catch (err) {
        res.redirect('/coordinator/dashboard?error=Error loading profile');
    }
});

router.post('/edit-profile', auth('coordinator'), async (req, res) => {
    profileUpload(req, res, async (err) => {
        try {
            if (err) {
                return res.redirect('/coordinator/edit-profile?error=' + err.message);
            }

            const user = await User.findById(req.user._id);
            if (req.file) {
                if (user.profilePicture) {
                    const oldPath = path.join(__dirname, '..', user.profilePicture);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                user.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
            }
            user.name = req.body.name;
            await user.save();
            res.redirect('/coordinator/dashboard');
        } catch (err) {
            console.error('Profile update error:', err);
            res.redirect('/coordinator/edit-profile?error=' + err.message);
        }
    });
});

router.get('/dashboard', auth('coordinator'), async (req, res) => {
    try {
        const pendingStudents = await User.find({ role: 'student', status: 'pending' })
          .populate({
            path: 'studentProfile',
            select: 'personalData'
          });

        const activeStudents = await User.find({ role: 'student', status: 'active' })
          .populate({
            path: 'studentProfile',
            select: 'personalData documents overallStatus'
          });

        const announcements = await Announcement.find()
            .populate('author', 'name profilePicture')
            .sort({ createdAt: -1 });

        res.render('coordinator/dashboard', { 
          pendingStudents,
          activeStudents,
          announcements,
          error: req.query.error,
          message: req.query.message,
          user: req.user
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        res.redirect('/?error=Error loading dashboard');
    }
});

module.exports = router;

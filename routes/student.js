const express = require('express');
const router = express.Router();
const { StudentProfile, User, Announcement } = require('../models');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        try {
            const dir = path.join(__dirname, '..', 'uploads', 'documents');
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } catch (err) {
            cb(err);
        }
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

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
        fileSize: 10 * 1024 * 1024 // Increased to 10MB
    }
}).single('profilePicture');

const docUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
}).single('file');

router.post('/upload', auth('student'), (req, res) => {
    docUpload(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const profile = await StudentProfile.findOne({ user: req.user._id });
            if (!profile) {
                return res.status(404).json({ error: 'Profile not found' });
            }

            profile.documents.push({
                docType: req.body.docType,
                fileName: req.file.originalname,
                fileUrl: `/uploads/documents/${req.file.filename}`,
                status: 'Submitted',
                uploadDate: new Date()
            });

            await profile.save();
            return res.json({ message: 'Document uploaded successfully' });
        } catch (err) {
            console.error('Upload Error:', err);
            return res.status(500).json({ error: 'Upload failed' });
        }
    });
});

router.get('/me', auth('student'), async (req, res) => {
  const user = await User.findById(req.user.userId).populate('studentProfile');
  res.json(user.studentProfile);
});

router.put('/personal-data', auth('student'), async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user.userId });
  profile.personalData = { ...profile.personalData, ...req.body };
  await profile.save();
  res.json(profile.personalData);
});

router.get('/edit-profile', auth('student'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ user: req.user._id });
        if (!profile) {
            return res.redirect('/student/dashboard?error=Profile not found');
        }
        res.render('student/edit-profile', { 
            profile,
            error: req.query.error,
            message: req.query.message
        });
    } catch (err) {
        console.error('Edit Profile Error:', err);
        res.redirect('/student/dashboard?error=Error loading profile');
    }
});

router.post('/edit-profile', auth('student'), async (req, res) => {
    profileUpload(req, res, async (err) => {
        try {
            if (err instanceof multer.MulterError) {
                console.error('Multer Error:', err);
                return res.redirect('/student/edit-profile?error=File upload error: ' + err.message);
            } else if (err) {
                console.error('Upload Error:', err);
                return res.redirect('/student/edit-profile?error=' + err.message);
            }

            const profile = await StudentProfile.findOne({ user: req.user._id });
            if (!profile) {
                return res.redirect('/student/dashboard?error=Profile not found');
            }

            if (req.file) {
                if (profile.personalData.profilePicture) {
                    try {
                        const oldPath = path.join(__dirname, '..', profile.personalData.profilePicture);
                        if (fs.existsSync(oldPath)) {
                            fs.unlinkSync(oldPath);
                        }
                    } catch (error) {
                        console.error('Error deleting old profile picture:', error);
                    }
                }
                profile.personalData.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
            }

            const updatedData = {
                ...profile.personalData,
                ...req.body
            };

            if (!req.file) {
                updatedData.profilePicture = profile.personalData.profilePicture;
            }

            profile.personalData = updatedData;

            await profile.save();
            res.redirect('/student/dashboard');
        } catch (err) {
            console.error('Profile update error:', err);
            res.redirect('/student/edit-profile?error=' + encodeURIComponent(err.message));
        }
    });
});

router.delete('/document/:docId', auth('student'), async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user.userId });
  profile.documents = profile.documents.filter(doc => doc._id.toString() !== req.params.docId);
  await profile.save();
  res.json({ message: 'Document deleted' });
});

router.get('/dashboard', auth('student'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'studentProfile',
        select: '-__v',
        populate: {
          path: 'documents'
        }
      });
    
    if (!user || !user.studentProfile) {
      console.error('Profile missing for user:', user?._id);
      return res.redirect('/?error=Profile not found. Please contact administrator.');
    }

    const announcements = await Announcement.find()
      .populate('author', 'name profilePicture email')
      .sort({ createdAt: -1 });

    res.render('student/dashboard', { 
      user,
      profile: user.studentProfile,
      announcements,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.redirect('/?error=Error loading dashboard');
  }
});

module.exports = router;

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
        fileSize: 5 * 1024 * 1024
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
        fileSize: 10 * 1024 * 1024
    }
}).single('profilePicture');

const docUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
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
            cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and Word documents are allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
}).single('file');

router.post('/upload', auth('student'), (req, res) => {
    docUpload(req, res, async (err) => {
        try {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file selected' });
            }

            if (!req.body.docType) {
                return res.status(400).json({ error: 'Document type is required' });
            }

            console.log('Upload request:', {
                file: req.file.originalname,
                type: req.body.docType,
                userId: req.user._id
            });

            const profile = await StudentProfile.findOne({ user: req.user._id });
            if (!profile) {
                return res.status(404).json({ error: 'Student profile not found' });
            }

            const existingDocIndex = profile.documents.findIndex(d => d.docType === req.body.docType);
            
            const documentData = {
                docType: req.body.docType,
                fileName: req.file.originalname,
                fileUrl: `/uploads/documents/${req.file.filename}`,
                status: 'Submitted',
                uploadDate: new Date()
            };

            if (existingDocIndex !== -1) {
                profile.documents[existingDocIndex] = documentData;
            } else {
                profile.documents.push(documentData);
            }

            await profile.save();
            console.log('Document uploaded successfully');
            return res.json({ message: 'Document uploaded successfully' });

        } catch (err) {
            console.error('Upload Error:', err);
            return res.status(500).json({ error: 'Upload failed: ' + err.message });
        }
    });
});

router.get('/me', auth('student'), async (req, res) => {
  const user = await User.findById(req.user.userId).populate('studentProfile');
  res.json(user.studentProfile);
});

router.put('/personal-data', auth('student'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ user: req.user.userId });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        profile.personalData = { ...profile.personalData, ...req.body };
        await profile.save();
        res.json(profile.personalData);
    } catch (err) {
        console.error('Update personal data error:', err);
        res.status(500).json({ error: 'Failed to update personal data' });
    }
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

        let announcements = await Announcement.find()
            .populate({
                path: 'author',
                select: 'name profilePicture email studentProfile',
                populate: { path: 'studentProfile', select: 'personalData' }
            })
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'name profilePicture email studentProfile',
                    populate: { path: 'studentProfile', select: 'personalData' }
                },
                options: { sort: { createdAt: -1 } }
            })
            .sort({ createdAt: -1 });

        for (let i = 0; i < announcements.length; i++) {
            const aDoc = announcements[i];
            const a = aDoc.toObject ? aDoc.toObject() : aDoc;

            let auth = a.author || {};
            let pd = auth.studentProfile?.personalData;

            if (!pd && auth._id) {
                const sp = await StudentProfile.findOne({ user: auth._id }).lean();
                pd = sp?.personalData;
            }

            const builtName = auth.name || (pd ? [pd.givenName || pd.firstName, pd.middleName, pd.surname || pd.lastName].filter(Boolean).join(' ') : undefined);
            auth.name = builtName || auth.email || 'User';
            auth.profilePicture = auth.profilePicture || pd?.profilePicture || '/images/default-avatar.png';
            a.author = auth;

            const comments = a.comments || [];
            for (let j = 0; j < comments.length; j++) {
                const comm = comments[j];
                let cAuth = comm.author || {};
                let cpd = cAuth.studentProfile?.personalData;

                if (!cpd && cAuth._id) {
                    const spc = await StudentProfile.findOne({ user: cAuth._id }).lean();
                    cpd = spc?.personalData;
                }

                const cBuiltName = cAuth.name || (cpd ? [cpd.givenName || cpd.firstName, cpd.middleName, cpd.surname || cpd.lastName].filter(Boolean).join(' ') : undefined);
                cAuth.name = cBuiltName || cAuth.email || 'User';
                cAuth.profilePicture = cAuth.profilePicture || cpd?.profilePicture || '/images/default-avatar.png';
                comm.author = cAuth;
                comments[j] = comm;
            }

            a.comments = comments;
            announcements[i] = a;
        }

        const documentData = {
            preDeploymentDocs: [
                { label: 'Record File', value: 'record_file' },
                { label: 'Application for Internship', value: 'application_letter' },
                { label: 'Medical Certificate and Psychological Test', value: 'medical_certificate' },
                { label: 'Certification of Units Earned', value: 'certification_units' },
                { label: 'Internship Resume', value: 'resume' },
                { label: 'Consent Form', value: 'consent_form' },
                { label: 'Endorsement Letter', value: 'endorsement_letter' },
                { label: 'Internship Release Form', value: 'release_form' }
            ],
            legalForms: [
                { label: 'Internship Agreement', value: 'internship_agreement' },
                { label: 'Memorandum of Agreement', value: 'moa' },
                { label: 'Training Agreement Liability Waiver for Overtime', value: 'waiver' }
            ],
            postOjtDocs: [
                { label: 'Internship Evaluation Form', value: 'evaluation_form' },
                { label: 'Certification of Training Completion', value: 'completion_cert' },
                { label: 'Internship Narrative Report', value: 'narrative_report' },
                { label: 'Photocopy of Daily Time Record', value: 'time_record' },
                { label: 'Internship Timeframe', value: 'timeframe' },
                { label: 'Weekly Reports', value: 'weekly_reports' },
                { label: 'Student-Trainees Feedback Form', value: 'student_feedback' },
                { label: 'Training Supervisors Feedback Form', value: 'supervisor_feedback' },
                { label: 'Evaluation Instrument (Self Rated)', value: 'self_evaluation' },
                { label: 'Evaluation Instrument (Student)', value: 'student_evaluation' }
            ]
        };

        res.render('student/dashboard', {
            user,
            profile: user.studentProfile,
            announcements,
            ...documentData,
            error: req.query.error,
            message: req.query.message
        });

    } catch (err) {
        console.error('Dashboard Error:', err);
        res.redirect('/?error=Error loading dashboard');
    }
});

router.get('/templates/:docType', auth('student'), async (req, res) => {
    const { docType } = req.params;
    try {
        const templatePath = path.resolve(__dirname, '..', 'templates', `${docType}.docx`);
        console.log('Attempting to download template:', docType);
        console.log('Full template path:', templatePath);

        if (!fs.existsSync(templatePath)) {
            console.error(`Template file not found: ${templatePath}`);
            return res.status(404).json({ error: 'Template file not found' });
        }

        const filename = docType.replace(/_/g, ' ').toUpperCase() + '.docx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(templatePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            res.status(500).json({ error: 'Error reading template file' });
        });

    } catch (err) {
        console.error('Template download error:', err);
        res.status(500).json({ error: 'Error downloading template' });
    }
});

router.get('/document-comments/:docId', auth('student'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ user: req.user._id, 'documents._id': req.params.docId });
        if (!profile) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = profile.documents.find(d => d._id.toString() === req.params.docId);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const comments = Array.isArray(doc.comments) ? doc.comments : [];
        res.json({ comments });
    } catch (err) {
        console.error('Fetch comments error:', err);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

module.exports = router;

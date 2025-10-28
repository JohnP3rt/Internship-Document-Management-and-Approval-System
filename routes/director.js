const express = require('express');
const router = express.Router();
const { StudentProfile } = require('../models');
const auth = require('../middleware/auth');

// GET /api/director/review-list
router.get('/review-list', auth('director'), async (req, res) => {
  const profiles = await StudentProfile.find({ overallStatus: 'Pending Director Review' }).populate('user');
  res.json(profiles);
});

// GET /api/director/student/:studentId
router.get('/student/:studentId', auth('director'), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.studentId).populate('user');
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// PUT /api/director/set-status/:documentId
router.put('/set-status/:documentId', auth('director'), async (req, res) => {
  const { status } = req.body;
  const profile = await StudentProfile.findOne({ 'documents._id': req.params.documentId });
  if (!profile) return res.status(404).json({ error: 'Document not found' });
  const doc = profile.documents.id(req.params.documentId);
  doc.status = status;
  await profile.save();
  res.json({ message: 'Document status updated' });
});

module.exports = router;

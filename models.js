const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'coordinator', 'director'], required: true },
  status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
  studentProfile: { type: Schema.Types.ObjectId, ref: 'StudentProfile' },
  name: { type: String },
  profilePicture: { type: String }
});

const StudentProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  personalData: {
    studentId: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    surname: String,
    givenName: String,
    middleName: String,
    dateOfBirth: Date,
    civilStatus: String,
    sex: String,
    course: String,
    major: String,
    yearSection: String,
    contactNumber: String,
    guardianName: String,
    homeAddress: String,
    currentAddress: String,
    profilePicture: String
  },
  documents: [{
    docType: {
      type: String,
      enum: [
        'record_file',
        'application_letter',
        'medical_certificate',
        'psychological_test',
        'certification_units',
        'resume',
        'consent_form',
        'endorsement_letter',
        'internship_waiver',
        'moa',
        'waiver',
        'guardian_consent',
        'transcript',
        'medical_cert',
        'insurance',
        'clearance',
        'release_form',
        'internship_agreement',
        'evaluation_form',
        'completion_cert',
        'narrative_report',
        'time_record',
        'timeframe',
        'weekly_reports',
        'student_feedback',
        'supervisor_feedback',
        'self_evaluation',
        'student_evaluation'
      ]
    },
    fileName: String,
    fileUrl: String,
    status: {
      type: String,
      enum: ['Submitted', 'Checked', 'For Revision', 'Done'],
      default: 'Submitted'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    comments: String
  }],

  //dipa finalize  
  coordinatorChecklist: {
    clearance_checked: { type: Boolean, default: false },
    moa_checked: { type: Boolean, default: false },
    record_file_checked: { type: Boolean, default: false }
    // ...add other checklist items here...
  },
  overallStatus: {
    type: String,
    enum: ['Submitting', 'Pending Coordinator Review', 'Pending Director Review', 'Completed', 'Revision Needed'],
    default: 'Submitting'
  }
});

const AnnouncementSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const User = mongoose.model('User', UserSchema);
const StudentProfile = mongoose.model('StudentProfile', StudentProfileSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

module.exports = { User, StudentProfile, Announcement };

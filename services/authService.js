const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, StudentProfile } = require('../models');
const AppError = require('../utils/appError');

class AuthService {
  static async registerStudent(data) {
    const { email, password, studentId, firstName, lastName, contactNumber } = data;
    
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already exists', 400);

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hash,
      role: 'student',
      status: 'pending'
    });

    const profile = await StudentProfile.create({
      user: user._id,
      personalData: { firstName, lastName, studentId, contactNumber }
    });

    user.studentProfile = profile._id;
    await user.save();

    return { message: 'Registered. Await coordinator approval.' };
  }

  static async login(email, password) {
    const user = await User.findOne({ email });
    if (!user || user.status !== 'active') {
      throw new AppError('Invalid credentials or account not active', 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return { token, user };
  }
}

module.exports = AuthService;

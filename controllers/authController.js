const { User, StudentProfile } = require('../models');
const AuthService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');

exports.register = catchAsync(async (req, res) => {
  const result = await AuthService.registerStudent(req.body);
  res.status(201).json(result);
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await AuthService.login(email, password);
  res.json({ token, role: user.role });
});

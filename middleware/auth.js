const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

function auth(role) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

      if (!token) {
        return res.redirect('/?error=Please login first');
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      // Find user and populate studentProfile
      const user = await User.findById(decoded.userId)
        .populate('studentProfile');

      if (!user) {
        console.error('User not found:', decoded.userId);
        return res.redirect('/?error=User not found');
      }

      // Set both userId and _id for consistency
      req.user = user;
      req.user.userId = user._id; // Add this line
      res.locals.user = user;

      if (role && user.role !== role) {
        return res.redirect('/?error=Access denied');
      }

      next();
    } catch (err) {
      console.error('Auth Error:', err);
      res.redirect('/?error=Session expired');
    }
  };
}

module.exports = auth;

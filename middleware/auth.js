const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

function auth(roles) {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

            if (!token) {
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Authentication required' });
                }
                return res.redirect('/?error=Please login first');
            }

            const decoded = jwt.verify(token, config.JWT_SECRET);
            const user = await User.findById(decoded.userId).populate('studentProfile');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            req.user = user;
            res.locals.user = user;
            
            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            
            if (roles && !allowedRoles.includes(user.role)) {
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                return res.redirect('/?error=Access denied');
            }

            next();
        } catch (err) {
            console.error('Auth Error:', err);
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(401).json({ error: 'Session expired' });
            }
            res.redirect('/?error=Session expired');
        }
    };
}

module.exports = auth;

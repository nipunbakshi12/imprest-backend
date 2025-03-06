const jwt = require('jsonwebtoken');
const User = require('../models/user.Model');

const authMiddleware = async(req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
        // Find user
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
    
        // Attach user to request object
        req.user = {
          _id: user._id,
          email: user.email,
          role: user.role,
          department: user.department
        };
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
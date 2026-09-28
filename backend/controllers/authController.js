const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT with minimal payload { userId } and 1 day expiry
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};

// @desc    Authenticate user & return JWT token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email and explicitly include password for bcrypt verification
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password')
      .populate('managerId', 'name email role');

    // Generic response message for unknown email, inactive accounts, or wrong password
    const genericAuthError = {
      success: false,
      message: 'Invalid email or password'
    };

    if (!user) {
      return res.status(401).json(genericAuthError);
    }

    if (!user.isActive) {
      return res.status(401).json(genericAuthError);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json(genericAuthError);
    }

    // Generate token with userId only (role is never trusted from token)
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id)
      .populate('managerId', 'name email role')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  generateToken
};

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin Only)
const getUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .populate('managerId', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin Only)
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user ID format: '${id}'`
      });
    }

    const user = await User.findById(id).populate('managerId', 'name email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active managers (for manager selection)
// @route   GET /api/users/managers
// @access  Private (Authenticated)
const getManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: 'manager', isActive: true })
      .select('name email role')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: managers.length,
      managers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin Only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, managerId } = req.body;

    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    // Check unique email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Validate managerId if provided
    let verifiedManagerId = null;
    if (managerId) {
      if (!mongoose.Types.ObjectId.isValid(managerId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid manager ID format: '${managerId}'`
        });
      }
      const managerExists = await User.findById(managerId);
      if (!managerExists) {
        return res.status(404).json({
          success: false,
          message: 'Specified manager not found in system'
        });
      }
      verifiedManagerId = managerExists._id;
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'employee',
      managerId: verifiedManagerId,
      isActive: true
    });

    const populatedUser = await User.findById(user._id)
      .populate('managerId', 'name email role')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (role, managerId, isActive, name)
// @route   PUT /api/users/:id
// @access  Private (Admin Only)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, managerId, isActive, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user ID format: '${id}'`
      });
    }

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed roles: ${ROLES.join(', ')}`
        });
      }
      updates.role = role;
    }

    if (managerId !== undefined) {
      if (managerId === null || managerId === '') {
        updates.managerId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid manager ID format: '${managerId}'`
          });
        }
        const managerExists = await User.findById(managerId);
        if (!managerExists) {
          return res.status(404).json({
            success: false,
            message: 'Specified manager not found'
          });
        }
        updates.managerId = managerExists._id;
      }
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    })
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
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  getManagers,
  createUser,
  updateUser
};

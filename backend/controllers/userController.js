const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Get all users (with optional filtering)
// @route   GET /api/users
// @access  Private (Admin / Manager / Finance)
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
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('managerId', 'name email role');
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

// @desc    Get all managers (for manager selection dropdowns)
// @route   GET /api/users/managers
// @access  Private
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
// @access  Private (Admin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, managerId } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'employee',
      managerId: managerId || null
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { name, role, managerId, isActive, password } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (role) updates.role = role;
    if (managerId !== undefined) updates.managerId = managerId || null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('managerId', 'name email role');

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

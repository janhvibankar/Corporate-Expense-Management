const express = require('express');
const { body, param } = require('express-validator');
const {
  getUsers,
  getUserById,
  getManagers,
  createUser,
  updateUser
} = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  body('managerId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('managerId must be a valid MongoDB ObjectId'),
  validate
];

const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid user ID format'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  body('managerId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('managerId must be a valid MongoDB ObjectId'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean (true/false)'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  validate
];

// All user routes require authentication
router.use(authenticate);

// Publicly accessible to authenticated users (e.g. dropdowns)
router.get('/managers', getManagers);

// Admin-only user management endpoints
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), param('id').isMongoId().withMessage('Invalid user ID format'), validate, getUserById);
router.post('/', authorize('admin'), createUserValidation, createUser);
router.put('/:id', authorize('admin'), updateUserValidation, updateUser);

module.exports = router;

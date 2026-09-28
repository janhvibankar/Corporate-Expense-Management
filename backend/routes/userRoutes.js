const express = require('express');
const { body } = require('express-validator');
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
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  validate
];

// All user routes require authentication
router.use(authenticate);

router.get('/managers', getManagers);
router.get('/', authorize('admin', 'manager', 'finance'), getUsers);
router.get('/:id', getUserById);
router.post('/', authorize('admin'), createUserValidation, createUser);
router.put('/:id', authorize('admin'), updateUser);

module.exports = router;

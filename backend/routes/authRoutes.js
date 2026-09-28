const express = require('express');
const { body } = require('express-validator');
const { login, getMe } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);

module.exports = router;

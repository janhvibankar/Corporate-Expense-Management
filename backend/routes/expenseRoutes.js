const express = require('express');
const { body, param } = require('express-validator');
const {
  createExpense,
  getMyExpenses,
  getPendingExpenses,
  getTeamExpenses,
  getExpenseStats,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  resubmitExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense
} = require('../controllers/expenseController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { CATEGORIES } = require('../config/constants');

const router = express.Router();

// Validations
const createExpenseValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Expense title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Expense amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
    .custom((val) => {
      if (!/^\d+(\.\d{1,2})?$/.test(val.toString())) {
        throw new Error('Amount cannot have more than 2 decimal places');
      }
      return true;
    }),
  body('category')
    .isIn(CATEGORIES)
    .withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('date')
    .notEmpty()
    .withMessage('Expense date is required')
    .isISO8601()
    .withMessage('Date must be a valid ISO8601 date'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  validate
];

const updateExpenseValidation = [
  param('id').isMongoId().withMessage('Invalid expense ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
    .custom((val) => {
      if (!/^\d+(\.\d{1,2})?$/.test(val.toString())) {
        throw new Error('Amount cannot have more than 2 decimal places');
      }
      return true;
    }),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO8601 date'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  validate
];

const rejectExpenseValidation = [
  param('id').isMongoId().withMessage('Invalid expense ID format'),
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Rejection reason must be at least 5 characters long'),
  validate
];

const mongoIdParamValidation = [
  param('id').isMongoId().withMessage('Invalid expense ID format'),
  validate
];

// All expense routes require authentication
router.use(authenticate);

// =========================================================================
// SPECIFIC NAMED ROUTES MUST BE DECLARED BEFORE DYNAMIC /:id ROUTES
// =========================================================================
router.get('/my', getMyExpenses);
router.get('/pending', authorize('manager', 'admin'), getPendingExpenses);
router.get('/team', authorize('manager', 'admin'), getTeamExpenses);
router.get('/stats', getExpenseStats);
router.get('/', authorize('finance', 'admin'), getAllExpenses);
router.post('/', createExpenseValidation, createExpense);

// =========================================================================
// DYNAMIC PARAMETERIZED ROUTES (/:id)
// =========================================================================
router.get('/:id', mongoIdParamValidation, getExpenseById);
router.put('/:id', updateExpenseValidation, updateExpense);
router.delete('/:id', mongoIdParamValidation, deleteExpense);
router.put('/:id/resubmit', mongoIdParamValidation, resubmitExpense);
router.put('/:id/approve', authorize('manager', 'admin'), mongoIdParamValidation, approveExpense);
router.put('/:id/reject', authorize('manager', 'admin'), rejectExpenseValidation, rejectExpense);
router.put('/:id/reimburse', authorize('finance', 'admin'), mongoIdParamValidation, reimburseExpense);

module.exports = router;

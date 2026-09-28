const express = require('express');
const { body } = require('express-validator');
const {
  getExpenses,
  getMyExpenses,
  getExpenseById,
  createExpense,
  updateExpenseStatus,
  deleteExpense,
  getExpenseStats
} = require('../controllers/expenseController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { CATEGORIES, STATUSES } = require('../config/constants');

const router = express.Router();

const createExpenseValidation = [
  body('title').trim().notEmpty().withMessage('Expense title is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('category').isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('date').isISO8601().toDate().withMessage('Valid date is required'),
  body('description').optional().isString(),
  validate
];

const updateStatusValidation = [
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('note').optional().isString(),
  body('rejectionReason').optional().isString(),
  validate
];

// All expense routes require authentication
router.use(authenticate);

router.get('/stats', getExpenseStats);
router.get('/my', getMyExpenses);
router.get('/', authorize('finance', 'admin'), getExpenses);
router.get('/:id', getExpenseById);
router.post('/', createExpenseValidation, createExpense);
router.patch(
  '/:id/status',
  authorize('manager', 'finance', 'admin'),
  updateStatusValidation,
  updateExpenseStatus
);
router.delete('/:id', deleteExpense);

module.exports = router;

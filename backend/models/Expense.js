const mongoose = require('mongoose');
const { STATUSES, CATEGORIES } = require('../config/constants');

const statusHistorySchema = new mongoose.Schema(
  {
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    from: {
      type: String,
      enum: STATUSES,
      required: true
    },
    to: {
      type: String,
      enum: STATUSES,
      required: true
    },
    at: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee ID is required']
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount must be a positive number']
    },
    category: {
      type: String,
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category'
      },
      required: [true, 'Category is required']
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: '{VALUE} is not a valid status'
      },
      default: 'PENDING',
      required: true
    },
    rejectionReason: {
      type: String,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reimbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reimbursedAt: {
      type: Date,
      default: null
    },
    statusHistory: [statusHistorySchema]
  },
  {
    timestamps: true
  }
);

// Indexes for high-performance querying
expenseSchema.index({ employeeId: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ date: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;

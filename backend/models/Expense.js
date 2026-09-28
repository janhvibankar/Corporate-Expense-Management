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
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      validate: {
        validator: function (v) {
          // Maximum 2 decimal places
          return /^\d+(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Amount cannot have more than 2 decimal places'
      }
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
      maxlength: [500, 'Description cannot exceed 500 characters']
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

// Indexes for query performance
expenseSchema.index({ employeeId: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ date: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;

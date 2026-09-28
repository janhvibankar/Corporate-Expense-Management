const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { STATUSES, CATEGORIES, MAX_EXPENSE_AGE_DAYS } = require('../config/constants');

// Helper to validate date age and future dates
const validateExpenseDate = (dateStr) => {
  const expenseDate = new Date(dateStr);
  if (isNaN(expenseDate.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }

  const now = new Date();
  if (expenseDate > now) {
    return { valid: false, message: 'Expense date cannot be in the future.' };
  }

  const ageInMs = now.getTime() - expenseDate.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  if (ageInDays > MAX_EXPENSE_AGE_DAYS) {
    return {
      valid: false,
      message: `Expense date cannot be older than ${MAX_EXPENSE_AGE_DAYS} days.`
    };
  }

  return { valid: true, date: expenseDate };
};

// @desc    Create / Submit new expense
// @route   POST /api/expenses
// @access  Private (Any authenticated user)
const createExpense = async (req, res, next) => {
  try {
    const { title, amount, category, date, description } = req.body;

    // Strict date validation
    const dateValidation = validateExpenseDate(date);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }

    // Never trust employeeId or status from frontend
    const expense = await Expense.create({
      employeeId: req.user._id,
      title: title.trim(),
      amount: Number(amount),
      category,
      date: dateValidation.date,
      description: description ? description.trim() : '',
      status: 'PENDING',
      statusHistory: [
        {
          by: req.user._id,
          from: 'PENDING',
          to: 'PENDING',
          at: new Date(),
          note: 'Expense created and submitted for review'
        }
      ]
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employeeId', 'name email role')
      .populate('statusHistory.by', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's expenses only
// @route   GET /api/expenses/my
// @access  Private (Any authenticated user)
const getMyExpenses = async (req, res, next) => {
  try {
    const { status, category, from, to, startDate, endDate } = req.query;
    let query = { employeeId: req.user._id };

    if (status) query.status = status;
    if (category) query.category = category;

    const fromDate = from || startDate;
    const toDate = to || endDate;

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('reimbursedBy', 'name email role')
      .populate('statusHistory.by', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending expenses for manager's direct team or admin escalation
// @route   GET /api/expenses/pending
// @access  Private (Manager, Admin)
const getPendingExpenses = async (req, res, next) => {
  try {
    let query = { status: 'PENDING' };

    if (req.user.role === 'manager') {
      // Find all employees directly reporting to this manager
      const directReports = await User.find({ managerId: req.user._id }).select('_id');
      const directReportIds = directReports.map((u) => u._id);

      // Managers see pending expenses of direct reports (excluding own self-expenses)
      query.employeeId = { $in: directReportIds };
    }
    // Admin sees all pending expenses across the organization for escalation

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email role managerId')
      .populate('statusHistory.by', 'name email role')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get processed team expenses history for manager or admin
// @route   GET /api/expenses/team
// @access  Private (Manager, Admin)
const getTeamExpenses = async (req, res, next) => {
  try {
    const { status, category, from, to } = req.query;
    let query = {};

    if (req.user.role === 'manager') {
      const directReports = await User.find({ managerId: req.user._id }).select('_id');
      const directReportIds = directReports.map((u) => u._id);
      query.employeeId = { $in: directReportIds };
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('reimbursedBy', 'name email role')
      .populate('statusHistory.by', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics using MongoDB aggregation ($group)
// @route   GET /api/expenses/stats
// @access  Private (Role-scoped)
const getExpenseStats = async (req, res, next) => {
  try {
    let matchQuery = {};

    if (req.user.role === 'employee') {
      matchQuery.employeeId = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'manager') {
      const directReports = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = directReports.map((u) => u._id);
      matchQuery.employeeId = {
        $in: [...teamIds, new mongoose.Types.ObjectId(req.user.id)]
      };
    }
    // Finance and Admin have global matchQuery = {}

    const [statusAgg, categoryAgg, monthlyAgg] = await Promise.all([
      // 1. Group by Status
      Expense.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // 2. Group by Category
      Expense.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),
      // 3. Group by Year-Month
      Expense.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    // Parse status summary
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let reimbursedAmount = 0;
    let rejectedAmount = 0;

    let totalCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let reimbursedCount = 0;
    let rejectedCount = 0;

    statusAgg.forEach((item) => {
      totalAmount += item.totalAmount;
      totalCount += item.count;
      if (item._id === 'PENDING') {
        pendingAmount = item.totalAmount;
        pendingCount = item.count;
      } else if (item._id === 'APPROVED') {
        approvedAmount = item.totalAmount;
        approvedCount = item.count;
      } else if (item._id === 'REIMBURSED') {
        reimbursedAmount = item.totalAmount;
        reimbursedCount = item.count;
      } else if (item._id === 'REJECTED') {
        rejectedAmount = item.totalAmount;
        rejectedCount = item.count;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        summary: {
          totalAmount: Math.round(totalAmount * 100) / 100,
          pendingAmount: Math.round(pendingAmount * 100) / 100,
          approvedAmount: Math.round(approvedAmount * 100) / 100,
          reimbursedAmount: Math.round(reimbursedAmount * 100) / 100,
          rejectedAmount: Math.round(rejectedAmount * 100) / 100,
          totalCount,
          pendingCount,
          approvedCount,
          reimbursedCount,
          rejectedCount
        },
        byStatus: statusAgg,
        byCategory: categoryAgg,
        monthlyTotals: monthlyAgg.map((m) => ({
          year: m._id.year,
          month: m._id.month,
          totalAmount: Math.round(m.totalAmount * 100) / 100,
          count: m.count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all expenses (Finance / Admin only)
// @route   GET /api/expenses
// @access  Private (Finance, Admin)
const getAllExpenses = async (req, res, next) => {
  try {
    const { status, category, from, to, startDate, endDate, employeeId } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid employee ID: '${employeeId}'`
        });
      }
      query.employeeId = employeeId;
    }

    const fromDate = from || startDate;
    const toDate = to || endDate;

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('reimbursedBy', 'name email role')
      .populate('statusHistory.by', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single expense by ID (Role-aware visibility)
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id)
      .populate('employeeId', 'name email role managerId')
      .populate('reviewedBy', 'name email role')
      .populate('reimbursedBy', 'name email role')
      .populate('statusHistory.by', 'name email role');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Role-aware visibility enforcement
    const isOwner = expense.employeeId._id.toString() === req.user.id.toString();

    if (req.user.role === 'employee') {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own expenses'
        });
      }
    } else if (req.user.role === 'manager') {
      const isReportee =
        expense.employeeId.managerId &&
        expense.employeeId.managerId.toString() === req.user.id.toString();

      if (!isOwner && !isReportee) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view expenses for yourself or direct team members'
        });
      }
    }
    // Finance and Admin have full organization-wide visibility

    res.status(200).json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit expense (Owner only, PENDING status only)
// @route   PUT /api/expenses/:id
// @access  Private (Owner only)
const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amount, category, date, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Ownership check
    if (expense.employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the expense owner can edit this expense.'
      });
    }

    // Status check
    if (expense.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Cannot edit expense with status '${expense.status}'. Only PENDING expenses can be edited.`
      });
    }

    // Date validation if provided
    if (date) {
      const dateValidation = validateExpenseDate(date);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          message: dateValidation.message
        });
      }
      expense.date = dateValidation.date;
    }

    if (title) expense.title = title.trim();
    if (amount !== undefined) expense.amount = Number(amount);
    if (category) expense.category = category;
    if (description !== undefined) expense.description = description.trim();

    expense.statusHistory.push({
      by: req.user._id,
      from: 'PENDING',
      to: 'PENDING',
      at: new Date(),
      note: 'Expense details updated by owner'
    });

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employeeId', 'name email role')
      .populate('statusHistory.by', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense (Owner only, PENDING status only)
// @route   DELETE /api/expenses/:id
// @access  Private (Owner only)
const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Ownership check
    if (expense.employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the expense owner can delete this expense.'
      });
    }

    // Status check
    if (expense.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Cannot delete expense with status '${expense.status}'. Only PENDING expenses can be deleted.`
      });
    }

    await Expense.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resubmit rejected expense (Owner only, REJECTED status only)
// @route   PUT /api/expenses/:id/resubmit
// @access  Private (Owner only)
const resubmitExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amount, category, date, description, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Ownership check
    if (expense.employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the expense owner can resubmit this expense.'
      });
    }

    // State machine check: Only REJECTED -> PENDING is allowed
    if (expense.status !== 'REJECTED') {
      return res.status(409).json({
        success: false,
        message: `Cannot resubmit expense with status '${expense.status}'. Only REJECTED expenses can be resubmitted.`
      });
    }

    // Optional field updates
    if (date) {
      const dateValidation = validateExpenseDate(date);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          message: dateValidation.message
        });
      }
      expense.date = dateValidation.date;
    }

    if (title) expense.title = title.trim();
    if (amount !== undefined) expense.amount = Number(amount);
    if (category) expense.category = category;
    if (description !== undefined) expense.description = description.trim();

    // Atomic reset to PENDING and record past rejection in statusHistory
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, status: 'REJECTED' },
      {
        $set: {
          status: 'PENDING',
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          title: expense.title,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          description: expense.description
        },
        $push: {
          statusHistory: {
            by: req.user._id,
            from: 'REJECTED',
            to: 'PENDING',
            at: new Date(),
            note: note ? note.trim() : 'Expense corrected and resubmitted for review'
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name email role')
      .populate('statusHistory.by', 'name email role');

    if (!updatedExpense) {
      return res.status(409).json({
        success: false,
        message: 'Expense status changed concurrently or is no longer REJECTED.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense resubmitted successfully for review',
      expense: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve expense (Manager or Admin escalation)
// @route   PUT /api/expenses/:id/approve
// @access  Private (Manager, Admin)
const approveExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id).populate('employeeId', 'name email role managerId');
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // 1. Status check
    if (expense.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Cannot approve expense with status '${expense.status}'. Current status must be PENDING.`
      });
    }

    // 2. Business rule: Self-approval is strictly forbidden
    if (expense.employeeId._id.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Self-approval is forbidden. A user cannot approve their own expense claim.'
      });
    }

    // 3. Manager team boundary check and Admin escalation rule:
    // - Manager can only approve direct reports
    // - Admin can only approve top-level managers (managerId === null); cannot approve team employees
    if (req.user.role === 'manager') {
      const isDirectReport =
        expense.employeeId.managerId &&
        expense.employeeId.managerId.toString() === req.user.id.toString();

      if (!isDirectReport) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only approve expenses for employees in your direct team.'
        });
      }
    } else if (req.user.role === 'admin') {
      if (expense.employeeId.managerId !== null) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin cannot approve an employee expense that belongs to another manager team.'
        });
      }
    }

    // 4. Atomic update
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: 'APPROVED',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          rejectionReason: null
        },
        $push: {
          statusHistory: {
            by: req.user._id,
            from: 'PENDING',
            to: 'APPROVED',
            at: new Date(),
            note: note ? note.trim() : 'Expense approved'
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('statusHistory.by', 'name email role');

    if (!updatedExpense) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent update conflict: Expense is no longer in PENDING status.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense approved successfully',
      expense: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject expense (Manager or Admin escalation)
// @route   PUT /api/expenses/:id/reject
// @access  Private (Manager, Admin)
const rejectExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, rejectionReason, note } = req.body;

    const actualReason = (reason || rejectionReason || note || '').trim();

    if (!actualReason || actualReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required and must be at least 5 characters long.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id).populate('employeeId', 'name email role managerId');
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // 1. Status check
    if (expense.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        message: `Cannot reject expense with status '${expense.status}'. Current status must be PENDING.`
      });
    }

    // 2. Business rule: Self-rejection / self-review is forbidden
    if (expense.employeeId._id.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'A user cannot reject or review their own expense.'
      });
    }

    // 3. Manager team boundary check and Admin escalation rule:
    if (req.user.role === 'manager') {
      const isDirectReport =
        expense.employeeId.managerId &&
        expense.employeeId.managerId.toString() === req.user.id.toString();

      if (!isDirectReport) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only reject expenses for employees in your direct team.'
        });
      }
    } else if (req.user.role === 'admin') {
      if (expense.employeeId.managerId !== null) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin cannot reject an employee expense that belongs to another manager team.'
        });
      }
    }

    // 4. Atomic update
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: 'REJECTED',
          rejectionReason: actualReason,
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        },
        $push: {
          statusHistory: {
            by: req.user._id,
            from: 'PENDING',
            to: 'REJECTED',
            at: new Date(),
            note: actualReason
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('statusHistory.by', 'name email role');

    if (!updatedExpense) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent update conflict: Expense is no longer in PENDING status.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense rejected',
      expense: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reimburse expense (Finance, Admin)
// @route   PUT /api/expenses/:id/reimburse
// @access  Private (Finance, Admin)
const reimburseExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid expense ID format: '${id}'`
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // 1. Status check: Only APPROVED -> REIMBURSED is allowed
    if (expense.status !== 'APPROVED') {
      return res.status(409).json({
        success: false,
        message: `Cannot reimburse expense with status '${expense.status}'. Only APPROVED expenses can be reimbursed.`
      });
    }

    // 2. Segregation of duties: The person who approved the expense CANNOT reimburse it
    if (expense.reviewedBy && expense.reviewedBy.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Segregation of duties violation: The reviewer who approved this expense cannot reimburse it.'
      });
    }

    // 3. User cannot reimburse own expense
    if (expense.employeeId.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot reimburse your own expense.'
      });
    }

    // 4. Atomic update
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, status: 'APPROVED' },
      {
        $set: {
          status: 'REIMBURSED',
          reimbursedBy: req.user._id,
          reimbursedAt: new Date()
        },
        $push: {
          statusHistory: {
            by: req.user._id,
            from: 'APPROVED',
            to: 'REIMBURSED',
            at: new Date(),
            note: note ? note.trim() : 'Reimbursement disbursed to employee'
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('reimbursedBy', 'name email role')
      .populate('statusHistory.by', 'name email role');

    if (!updatedExpense) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent update conflict: Expense is no longer in APPROVED status.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense marked as reimbursed',
      expense: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

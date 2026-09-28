const Expense = require('../models/Expense');
const User = require('../models/User');
const { STATUSES, CATEGORIES, MAX_EXPENSE_AGE_DAYS } = require('../config/constants');

// @desc    Get expenses with role-based visibility & filtering
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    const { status, category, startDate, endDate, employeeId } = req.query;
    let query = {};

    // Role-based visibility scoping
    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      // Find all employees reporting to this manager
      const directReports = await User.find({ managerId: req.user._id }).select('_id');
      const directReportIds = directReports.map((u) => u._id);
      // Manager can see their own expenses + direct reports' expenses
      query.employeeId = { $in: [...directReportIds, req.user._id] };
    }
    // Finance and Admin can see all expenses

    // Filter by specific employee if requested and authorized
    if (employeeId) {
      if (req.user.role === 'employee' && employeeId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view another employee expenses'
        });
      }
      query.employeeId = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
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

// @desc    Get single expense by ID
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
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

    // Role check for viewing individual expense
    if (req.user.role === 'employee') {
      const isOwner = expense.employeeId._id.toString() === req.user._id.toString();
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own expenses'
        });
      }
    } else if (req.user.role === 'manager') {
      const isOwner = expense.employeeId._id.toString() === req.user._id.toString();
      const isReportee =
        expense.employeeId.managerId &&
        expense.employeeId.managerId.toString() === req.user._id.toString();

      if (!isOwner && !isReportee) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own or reportees expenses'
        });
      }
    }

    res.status(200).json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create / Submit new expense
// @route   POST /api/expenses
// @access  Private (Employee, Manager, Admin, Finance)
const createExpense = async (req, res, next) => {
  try {
    const { title, amount, category, date, description } = req.body;

    // Validate MAX_EXPENSE_AGE_DAYS
    const expenseDate = new Date(date);
    const now = new Date();
    const ageInMs = now.getTime() - expenseDate.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    if (ageInDays > MAX_EXPENSE_AGE_DAYS) {
      return res.status(400).json({
        success: false,
        message: `Expense date cannot be older than ${MAX_EXPENSE_AGE_DAYS} days.`
      });
    }

    if (expenseDate > now) {
      return res.status(400).json({
        success: false,
        message: 'Expense date cannot be in the future.'
      });
    }

    const expense = await Expense.create({
      employeeId: req.user._id,
      title,
      amount,
      category,
      date: expenseDate,
      description: description || '',
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

// @desc    Update expense status (Approve, Reject, Reimburse)
// @route   PATCH /api/expenses/:id/status
// @access  Private (Manager, Finance, Admin)
const updateExpenseStatus = async (req, res, next) => {
  try {
    const { status, note, rejectionReason } = req.body;
    const expense = await Expense.findById(req.params.id).populate('employeeId');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses: ${STATUSES.join(', ')}`
      });
    }

    const previousStatus = expense.status;

    // Workflow validation based on current status and role
    if (status === 'APPROVED') {
      if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only managers or admins can approve expenses.'
        });
      }
      if (previousStatus !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve an expense that is currently '${previousStatus}'`
        });
      }
      expense.status = 'APPROVED';
      expense.reviewedBy = req.user._id;
      expense.reviewedAt = new Date();
      expense.rejectionReason = null;
    } else if (status === 'REJECTED') {
      if (!['manager', 'finance', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to reject expenses.'
        });
      }
      if (previousStatus === 'REIMBURSED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot reject an already reimbursed expense'
        });
      }
      expense.status = 'REJECTED';
      expense.reviewedBy = req.user._id;
      expense.reviewedAt = new Date();
      expense.rejectionReason = rejectionReason || note || 'Rejected by reviewer';
    } else if (status === 'REIMBURSED') {
      if (req.user.role !== 'finance' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only finance or admins can mark expenses as reimbursed.'
        });
      }
      if (previousStatus !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: `Only APPROVED expenses can be reimbursed. Current status is '${previousStatus}'`
        });
      }
      expense.status = 'REIMBURSED';
      expense.reimbursedBy = req.user._id;
      expense.reimbursedAt = new Date();
    }

    // Add entry to status history
    expense.statusHistory.push({
      by: req.user._id,
      from: previousStatus,
      to: status,
      at: new Date(),
      note: note || (status === 'REJECTED' ? rejectionReason : `Status updated to ${status}`)
    });

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employeeId', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('reimbursedBy', 'name email role')
      .populate('statusHistory.by', 'name email role');

    res.status(200).json({
      success: true,
      message: `Expense marked as ${status}`,
      expense: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense (Owner if PENDING or Admin)
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const isOwner = expense.employeeId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this expense'
      });
    }

    if (isOwner && !isAdmin && expense.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be deleted by the employee'
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics for expenses
// @route   GET /api/expenses/stats
// @access  Private
const getExpenseStats = async (req, res, next) => {
  try {
    let matchQuery = {};

    if (req.user.role === 'employee') {
      matchQuery.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      const directReports = await User.find({ managerId: req.user._id }).select('_id');
      const directReportIds = directReports.map((u) => u._id);
      matchQuery.employeeId = { $in: [...directReportIds, req.user._id] };
    }

    const statsByStatus = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statsByCategory = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        byStatus: statsByStatus,
        byCategory: statsByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's own expenses
// @route   GET /api/expenses/my
// @access  Private
const getMyExpenses = async (req, res, next) => {
  try {
    const { status, category, startDate, endDate } = req.query;
    let query = { employeeId: req.user._id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
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

module.exports = {
  getExpenses,
  getMyExpenses,
  getExpenseById,
  createExpense,
  updateExpenseStatus,
  deleteExpense,
  getExpenseStats
};


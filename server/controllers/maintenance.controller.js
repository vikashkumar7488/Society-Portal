const Maintenance = require('../models/Maintenance');
const PaymentLog = require('../models/PaymentLog');

/**
 * @desc    Get current user's maintenance records
 * @route   GET /api/maintenance
 * @access  Private
 */
exports.getUserMaintenance = async (req, res, next) => {
  try {
    const { status, year } = req.query;
    
    // Build filter
    const filter = { user_id: req.user._id };
    
    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      filter.status = status;
    }
    
    if (year) {
      filter.year = parseInt(year);
    }

    const maintenance = await Maintenance.find(filter)
      .sort({ year: -1, month: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: maintenance.length,
      data: maintenance
    });
  } catch (error) {
    console.error('Error fetching user maintenance:', error);
    next(error);
  }
};

/**
 * @desc    Get current month's maintenance status
 * @route   GET /api/maintenance/current
 * @access  Private
 */
exports.getCurrentMonthStatus = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    let maintenance = await Maintenance.findOne({
      user_id: req.user._id,
      month: currentMonth,
      year: currentYear
    }).lean();

    // If no maintenance record exists for current month, create one
    if (!maintenance) {
      // Calculate due date (18th of current month)
      const dueDate = new Date(currentYear, currentMonth - 1, 18);
      
      maintenance = await Maintenance.create({
        user_id: req.user._id,
        flat_no: req.user.flat_no,
        month: currentMonth,
        year: currentYear,
        amount: 1000,
        late_fee: 0,
        due_date: dueDate,
        status: 'pending'
      });
      
      // Convert to plain object
      maintenance = maintenance.toObject();
    }

    res.status(200).json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    console.error('Error fetching current month status:', error);
    next(error);
  }
};

/**
 * @desc    Get payment history
 * @route   GET /api/maintenance/history
 * @access  Private
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      PaymentLog.find({ user_id: req.user._id })
        .sort({ payment_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PaymentLog.countDocuments({ user_id: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    next(error);
  }
};

/**
 * @desc    Get all flats' maintenance records (Admin/Manager)
 * @route   GET /api/maintenance/all
 * @access  Private (Manager, Admin)
 */
exports.getAllMaintenance = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      month, 
      year, 
      flat_no,
      sort = '-createdAt'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    
    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      filter.status = status;
    }
    
    if (month) {
      filter.month = parseInt(month);
    }
    
    if (year) {
      filter.year = parseInt(year);
    }
    
    if (flat_no) {
      filter.flat_no = flat_no;
    }

    // Build sort
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const [maintenance, total] = await Promise.all([
      Maintenance.find(filter)
        .populate('user_id', 'name email phone')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Maintenance.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: maintenance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all maintenance:', error);
    next(error);
  }
};

/**
 * @desc    Get payment statistics (Admin/Manager)
 * @route   GET /api/maintenance/stats
 * @access  Private (Manager, Admin)
 */
exports.getPaymentStats = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const filter = { month: targetMonth, year: targetYear };

    const [stats, totals] = await Promise.all([
      // Aggregate by status
      Maintenance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total_amount' }
          }
        }
      ]),
      // Get overall totals
      Maintenance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalFlats: { $sum: 1 },
            totalExpected: { $sum: '$amount' },
            totalCollected: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$total_amount', 0]
              }
            },
            totalPending: {
              $sum: {
                $cond: [{ $ne: ['$status', 'paid'] }, '$total_amount', 0]
              }
            }
          }
        }
      ])
    ]);

    // Format stats by status
    const statsByStatus = {
      paid: { count: 0, totalAmount: 0 },
      pending: { count: 0, totalAmount: 0 },
      overdue: { count: 0, totalAmount: 0 }
    };

    stats.forEach(stat => {
      if (statsByStatus[stat._id]) {
        statsByStatus[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        byStatus: statsByStatus,
        totals: totals[0] || {
          totalFlats: 0,
          totalExpected: 0,
          totalCollected: 0,
          totalPending: 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    next(error);
  }
};

/**
 * @desc    Generate maintenance records for all users (Manual trigger)
 * @route   POST /api/maintenance/generate
 * @access  Private (Manager only)
 */
exports.generateMonthlyMaintenance = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const User = require('../models/User');

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    // Get all active residents
    const users = await User.find({ 
      role: { $in: ['resident', 'admin', 'manager'] },
      is_active: true 
    }).select('_id flat_no');

    // Calculate due date (18th of target month)
    const dueDate = new Date(targetYear, targetMonth - 1, 18);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if maintenance already exists
      const exists = await Maintenance.findOne({
        user_id: user._id,
        month: targetMonth,
        year: targetYear
      });

      if (!exists) {
        await Maintenance.create({
          user_id: user._id,
          flat_no: user.flat_no,
          month: targetMonth,
          year: targetYear,
          amount: 1000,
          late_fee: 0,
          due_date: dueDate,
          status: 'pending'
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Maintenance records generated: ${created} created, ${skipped} skipped (already exist)`,
      data: {
        month: targetMonth,
        year: targetYear,
        created,
        skipped
      }
    });
  } catch (error) {
    console.error('Error generating maintenance:', error);
    next(error);
  }
};

// ========== CRON JOB MANUAL TRIGGERS ==========

const { generateMonthlyMaintenance, generateMaintenanceForMonth } = require('../jobs/maintenanceGenerator');
const { applyLateFees } = require('../jobs/lateFeeApplier');
const { sendRemindersByType } = require('../jobs/reminderSender');

/**
 * @desc    Manually trigger monthly maintenance generation
 * @route   POST /api/maintenance/cron/generate
 * @access  Private (Manager only)
 */
exports.triggerMaintenanceGeneration = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    
    let result;
    
    if (month && year) {
      // Generate for specific month/year
      result = await generateMaintenanceForMonth(parseInt(month), parseInt(year));
    } else {
      // Generate for current month
      result = await generateMonthlyMaintenance();
    }
    
    res.status(200).json({
      success: true,
      message: 'Maintenance generation completed',
      data: result
    });
  } catch (error) {
    console.error('Error triggering maintenance generation:', error);
    next(error);
  }
};

/**
 * @desc    Manually trigger late fee application
 * @route   POST /api/maintenance/cron/late-fees
 * @access  Private (Manager only)
 */
exports.triggerLateFeeApplication = async (req, res, next) => {
  try {
    const result = await applyLateFees();
    
    res.status(200).json({
      success: true,
      message: 'Late fee application completed',
      data: result
    });
  } catch (error) {
    console.error('Error triggering late fee application:', error);
    next(error);
  }
};

/**
 * @desc    Manually trigger payment reminders
 * @route   POST /api/maintenance/cron/reminders
 * @access  Private (Manager only)
 */
exports.triggerPaymentReminders = async (req, res, next) => {
  try {
    const { type = 'reminder', month, year } = req.body;
    
    // Validate type
    const validTypes = ['invoice', 'reminder', 'final_warning'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reminder type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const result = await sendRemindersByType(type, month ? parseInt(month) : null, year ? parseInt(year) : null);
    
    res.status(200).json({
      success: true,
      message: `${type} reminders sent`,
      data: result
    });
  } catch (error) {
    console.error('Error triggering payment reminders:', error);
    next(error);
  }
};


/**
 * @desc    Record a manually received maintenance payment (Admin/Manager)
 * @route   PATCH /api/maintenance/:id/mark-paid
 * @access  Private (Admin, Manager)
 */
exports.markMaintenanceAsPaid = async (req, res, next) => {
  const allowedMethods = ['cash', 'upi', 'bank_transfer'];
  const { paymentMethod = 'cash', reference = '', notes = '' } = req.body || {};

  if (!allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: 'Payment method must be cash, upi, or bank_transfer.'
    });
  }

  try {
    const paidDate = new Date();
    // Conditional update prevents two admins from confirming the same record twice.
    const maintenance = await Maintenance.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'paid' } },
      { $set: { status: 'paid', paid_date: paidDate } },
      { new: true, runValidators: true }
    );

    if (!maintenance) {
      const exists = await Maintenance.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists ? 'This maintenance payment is already marked as paid.' : 'Maintenance record not found.'
      });
    }

    try {
      await PaymentLog.create({
        user_id: maintenance.user_id,
        flat_no: maintenance.flat_no,
        amount: maintenance.total_amount,
        payment_date: paidDate,
        transaction_id: reference.trim() || `MANUAL-${maintenance._id}-${paidDate.getTime()}`,
        month: maintenance.month,
        year: maintenance.year,
        payment_method: paymentMethod,
        recorded_by: req.user._id,
        notes: String(notes).trim()
      });
    } catch (logError) {
      // Restore the previous unpaid state if the audit record could not be saved.
      await Maintenance.updateOne(
        { _id: maintenance._id, status: 'paid', paid_date: paidDate },
        { $set: { status: maintenance.due_date < paidDate ? 'overdue' : 'pending', paid_date: null } }
      );
      throw logError;
    }

    return res.status(200).json({
      success: true,
      message: 'Maintenance payment marked as paid.',
      data: maintenance
    });
  } catch (error) {
    console.error('Error recording manual maintenance payment:', error);
    next(error);
  }
};

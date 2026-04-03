// D:\Projects\DoctorBooking\backend\routes\paymentRoutes.js
const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Doctor = require('../models/Doctor');

// ✅ GET payment history for a doctor
router.get('/doctor/:doctorId/history', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Find doctor by doctorId
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Find all payments for this doctor
    const payments = await Payment.find({ 
      doctor: doctor._id,
      status: { $in: ['completed', 'pending', 'failed'] }
    })
    .populate('appointment', 'appointmentDate appointmentTime patient')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Get total count for pagination
    const total = await Payment.countDocuments({ 
      doctor: doctor._id,
      status: { $in: ['completed', 'pending', 'failed'] }
    });

    // Calculate totals
    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalPaid,
        totalTransactions: payments.length,
        completedCount: payments.filter(p => p.status === 'completed').length,
        pendingCount: payments.filter(p => p.status === 'pending').length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ GET single payment details
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('appointment')
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('❌ Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ GET payment statistics for dashboard
router.get('/doctor/:doctorId/stats', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { period = 'month' } = req.query;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (period === 'all') {
      startDate = new Date(0); // Beginning of time
    }

    // Get all completed payments in period
    const payments = await Payment.find({
      doctor: doctor._id,
      status: 'completed',
      createdAt: { $gte: startDate }
    });

    // Calculate statistics
    const stats = {
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalCount: payments.length,
      averageAmount: payments.length > 0 
        ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length 
        : 0,
      byPaymentMethod: payments.reduce((acc, p) => {
        const method = p.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {}),
      monthlyData: []
    };

    // Group by month for chart data
    const monthlyMap = new Map();
    payments.forEach(p => {
      const month = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { month, amount: 0, count: 0 };
      existing.amount += p.amount;
      existing.count += 1;
      monthlyMap.set(month, existing);
    });

    stats.monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      period,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
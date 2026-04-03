// backend/middleware/paymentGuard.js
const Doctor = require('../models/Doctor');

const paymentGuard = {
  // Block restricted doctors from accessing routes
  checkAccess: async (req, res, next) => {
    try {
      // Get doctorId from various possible locations
      const doctorId = req.params.doctorId || 
                       req.body.doctorId || 
                       req.query.doctorId ||
                       req.params.id;
      
      if (!doctorId) {
        return next();
      }

      const doctor = await Doctor.findOne({ 
        $or: [
          { doctorId: doctorId },
          { _id: doctorId }
        ]
      });
      
      if (!doctor) {
        return next();
      }

      // Check if restricted
      if (doctor.paymentStatus === 'restricted') {
        const totalDue = (doctor.paymentStats?.totalCommissionPaid || 0) + (doctor.lateFees || 0);
        
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_RESTRICTED',
          message: '⛔ Account restricted due to unpaid commission',
          data: {
            doctorId: doctor.doctorId,
            doctorName: doctor.name,
            restrictedSince: doctor.restrictedAt,
            amountDue: doctor.paymentStats?.totalCommissionPaid || 0,
            lateFees: doctor.lateFees || 0,
            totalDue: totalDue,
            restrictionReason: doctor.restrictionReason || 'Unpaid commission'
          }
        });
      }

      // Check if overdue but not restricted yet (add warning header)
      if (doctor.paymentStatus === 'overdue' || doctor.paymentStatus === 'late') {
        const totalDue = (doctor.paymentStats?.totalCommissionPaid || 0) + (doctor.lateFees || 0);
        
        res.setHeader('X-Payment-Warning', 'Payment overdue');
        res.setHeader('X-Payment-Amount', totalDue);
        res.setHeader('X-Payment-Status', doctor.paymentStatus);
        res.setHeader('X-Payment-Days-Overdue', doctor.totalOverdueDays || 0);
      }

      // Attach doctor to request for later use
      req.doctor = doctor;
      next();

    } catch (error) {
      console.error('❌ Payment guard error:', error);
      next();
    }
  },

  // Strict check - blocks both restricted AND overdue
  strictCheck: async (req, res, next) => {
    try {
      const doctorId = req.params.doctorId || 
                       req.body.doctorId || 
                       req.query.doctorId ||
                       req.params.id;
      
      if (!doctorId) {
        return next();
      }

      const doctor = await Doctor.findOne({ 
        $or: [
          { doctorId: doctorId },
          { _id: doctorId }
        ]
      });
      
      if (!doctor) {
        return next();
      }

      // Block restricted
      if (doctor.paymentStatus === 'restricted') {
        const totalDue = (doctor.paymentStats?.totalCommissionPaid || 0) + (doctor.lateFees || 0);
        
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_RESTRICTED',
          message: '⛔ Account restricted due to unpaid commission',
          data: {
            doctorId: doctor.doctorId,
            doctorName: doctor.name,
            restrictedSince: doctor.restrictedAt,
            amountDue: doctor.paymentStats?.totalCommissionPaid || 0,
            lateFees: doctor.lateFees || 0,
            totalDue: totalDue
          }
        });
      }

      // Block overdue (>10 days)
      if (doctor.paymentStatus === 'overdue') {
        const totalDue = (doctor.paymentStats?.totalCommissionPaid || 0) + (doctor.lateFees || 0);
        
        return res.status(403).json({
          success: false,
          code: 'PAYMENT_OVERDUE',
          message: '⚠️ Payment overdue. Please clear dues to continue.',
          data: {
            doctorId: doctor.doctorId,
            doctorName: doctor.name,
            amountDue: doctor.paymentStats?.totalCommissionPaid || 0,
            lateFees: doctor.lateFees || 0,
            totalDue: totalDue,
            daysOverdue: doctor.totalOverdueDays || 0
          }
        });
      }

      // Attach doctor to request
      req.doctor = doctor;
      next();

    } catch (error) {
      console.error('❌ Payment guard strict error:', error);
      next();
    }
  },

  // Check if doctor can verify appointments
  canVerify: async (doctorId) => {
    try {
      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) return false;
      
      // Can verify if not restricted and not overdue
      return doctor.paymentStatus !== 'restricted' && doctor.paymentStatus !== 'overdue';
      
    } catch (error) {
      console.error('❌ Error checking verify permission:', error);
      return false;
    }
  },

  // Get detailed restriction status
  getStatus: async (doctorId) => {
    try {
      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) return null;
      
      const totalDue = (doctor.paymentStats?.totalCommissionPaid || 0) + (doctor.lateFees || 0);
      
      return {
        doctorId: doctor.doctorId,
        doctorName: doctor.name,
        email: doctor.email,
        status: doctor.paymentStatus,
        restricted: doctor.paymentStatus === 'restricted',
        restrictedAt: doctor.restrictedAt,
        restrictionReason: doctor.restrictionReason,
        amountDue: doctor.paymentStats?.totalCommissionPaid || 0,
        lateFees: doctor.lateFees || 0,
        totalDue: totalDue,
        daysOverdue: doctor.totalOverdueDays || 0,
        lastReminder: doctor.lastReminderSent,
        lastReminderDate: doctor.lastPaymentReminderDate
      };
      
    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      return null;
    }
  },

  // Middleware for routes that should be accessible even when restricted
  // (like payment page, status check, etc.)
  allowAlways: (req, res, next) => {
    // This just passes through without checks
    next();
  }
};

module.exports = paymentGuard;
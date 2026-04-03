// D:\Projects\DoctorBooking\backend\models\Doctor.js
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    doctorId: {
        type: String,
        unique: true,
        default: () => 'DOC' + Math.random().toString(36).substr(2, 6).toUpperCase()
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    qualification: String,
    experience: String,
    fee: {
        type: Number,
        required: true
    },
    rating: {
        type: String,
        default: '4.5 ★'
    },
    availability: String,
    image: {
        type: String,
        default: '👨‍⚕️'
    },
    phone: String,
    address: String,
    bio: String,

    // ✅ Profile Image
    imageUrl: {
        type: String,
        default: ''
    },

    // ✅ UPI Payment Fields
    upiId: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
        description: 'Doctor\'s UPI ID for direct payments (e.g., doctor@okhdfcbank)'
    },
    qrCodeUrl: {
        type: String,
        default: '',
        description: 'URL to doctor\'s QR code image'
    },
    paymentMethod: {
        type: String,
        enum: ['upi', 'qr', 'both', 'razorpay'],
        default: 'both',
        description: 'Preferred payment method'
    },

    // ✅ Commission Tracking
    commissionPercentage: {
        type: Number,
        default: 1,
        min: 0,
        max: 100,
        description: 'Platform commission % (default 1%)'
    },

    // ✅ Payment Statistics
    paymentStats: {
        totalPaymentsViaPlatform: {
            type: Number,
            default: 0
        },
        totalCommissionPaid: {
            type: Number,
            default: 0
        },
        lastCommissionPaid: {
            type: Date
        }
    },

    totalAppointments: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },

    // ✅ Soft Delete Fields
    isActive: {
        type: Boolean,
        default: true,
        description: 'Whether doctor account is active (false = deleted)'
    },
    deletedAt: {
        type: Date,
        description: 'When doctor was soft deleted'
    },
    originalEmail: {
        type: String,
        description: 'Original email before deletion (for recovery)'
    },

    // ✅ NEW: Payment Enforcement Fields
    paymentStatus: {
        type: String,
        enum: ['current', 'late', 'overdue', 'restricted'],
        default: 'current',
        description: 'Current payment status of doctor'
    },
    restrictedAt: {
        type: Date,
        description: 'When doctor was restricted'
    },
    restrictedUntil: {
        type: Date,
        description: 'When restriction ends (null = permanent until paid)'
    },
    restrictionReason: {
        type: String,
        description: 'Reason for restriction'
    },
    accessRestoredAt: {
        type: Date,
        description: 'When access was last restored'
    },
    lateFees: {
        type: Number,
        default: 0,
        description: 'Total late fees accumulated'
    },
    lastReminderSent: {
        type: String,
        enum: ['none', 'statement', 'gentle', 'due', 'late', 'urgent', 'final'],
        default: 'none',
        description: 'Last reminder type sent'
    },
    totalOverdueDays: {
        type: Number,
        default: 0,
        description: 'Total days payment is overdue'
    },
    lastPaymentReminderDate: {
        type: Date,
        description: 'When last reminder was sent'
    }
}, {
    // ✅ This automatically handles createdAt and updatedAt!
    timestamps: true,
});

// ✅ Helper method to validate UPI ID format
doctorSchema.methods.isValidUpiId = function() {
    if (!this.upiId) return false;
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
    return upiRegex.test(this.upiId);
};

// ✅ Helper to calculate commission
doctorSchema.methods.calculateCommission = function(amount) {
    const commission = (amount * this.commissionPercentage) / 100;
    return {
        total: amount,
        commission: commission,
        doctorGets: amount - commission,
        platformGets: commission,
        percentage: this.commissionPercentage
    };
};

// ✅ Helper to calculate total due including late fees
doctorSchema.methods.getTotalDue = function() {
    return (this.paymentStats?.totalCommissionPaid || 0) + (this.lateFees || 0);
};

// ✅ Helper to check if doctor is restricted
doctorSchema.methods.isRestricted = function() {
    return this.paymentStatus === 'restricted';
};

// ✅ Helper to apply late fee
doctorSchema.methods.applyLateFee = function(feePercentage) {
    const baseAmount = this.paymentStats?.totalCommissionPaid || 0;
    const feeAmount = baseAmount * (feePercentage / 100);
    this.lateFees = (this.lateFees || 0) + feeAmount;
    return feeAmount;
};

// ✅ Helper to soft delete doctor
doctorSchema.methods.softDelete = async function() {
    this.isActive = false;
    this.deletedAt = new Date();
    this.originalEmail = this.email;
    this.email = `deleted_${Date.now()}_${this.email}`;
    await this.save();
};

// ✅ Helper to restore access after payment
doctorSchema.methods.restoreAccess = function() {
    this.paymentStatus = 'current';
    this.restrictedAt = null;
    this.restrictedUntil = null;
    this.restrictionReason = null;
    this.accessRestoredAt = new Date();
    this.lateFees = 0;
    this.totalOverdueDays = 0;
    this.lastReminderSent = 'none';
};

module.exports = mongoose.model('Doctor', doctorSchema);
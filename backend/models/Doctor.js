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

    imageUrl: {
        type: String,
        default: ''
    },

    // 🆕 Doctor's custom logo for their clinic/digital card
    logoUrl: {
        type: String,
        default: null
    },

    // 🆕 Clinic name for "Dr. Card" display
    clinicName: {
        type: String,
        default: function() {
            const firstName = this.name?.split(' ')[0] || 'Doctor';
            return `Dr. ${firstName}'s Clinic`;
        }
    },

    upiId: {
        type: String,
        default: '',
        trim: true,
        lowercase: true
    },
    qrCodeUrl: {
        type: String,
        default: ''
    },
    paymentMethod: {
        type: String,
        enum: ['upi', 'qr', 'both', 'razorpay'],
        default: 'both'
    },

    commissionPercentage: {
        type: Number,
        default: 1,
        min: 0,
        max: 100
    },

    paymentStats: {
        totalPaymentsViaPlatform: { type: Number, default: 0 },
        totalCommissionEarned: { type: Number, default: 0 },
        totalCommissionPaid: { type: Number, default: 0 },
        pendingCommission: { type: Number, default: 0 },
        lastCommissionPaid: { type: Date },
        lastPaymentTransaction: { type: String }
    },

    totalAppointments: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    
    // ✅ Doctor availability status (for appointments)
    isAvailable: { type: Boolean, default: true },
    
    // ✅ ACTIVE/INACTIVE STATUS - For clinic open/closed (Patients can/cannot book)
    isActive: { type: Boolean, default: true },
    
    // Soft delete fields
    deletedAt: { type: Date },
    originalEmail: { type: String },

    // Payment restriction fields
    paymentStatus: {
        type: String,
        enum: ['current', 'late', 'overdue', 'restricted'],
        default: 'current'
    },
    restrictedAt: { type: Date },
    restrictedUntil: { type: Date },
    restrictionReason: { type: String },
    accessRestoredAt: { type: Date },
    lateFees: { type: Number, default: 0 },
    lastReminderSent: {
        type: String,
        enum: ['none', 'statement', 'gentle', 'due', 'late', 'urgent', 'final'],
        default: 'none'
    },
    totalOverdueDays: { type: Number, default: 0 },
    lastPaymentReminderDate: { type: Date }

}, {
    timestamps: true,
});

// ✅ Helper method: Validate UPI ID
doctorSchema.methods.isValidUpiId = function() {
    if (!this.upiId) return false;
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
    return upiRegex.test(this.upiId);
};

// ✅ Helper method: Calculate commission for an amount
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

// ✅ Helper method: Get total due amount (pending commission + late fees)
doctorSchema.methods.getTotalDue = function() {
    return (this.paymentStats?.pendingCommission || 0) + (this.lateFees || 0);
};

// ✅ Helper method: Check if doctor is restricted
doctorSchema.methods.isRestricted = function() {
    return this.paymentStatus === 'restricted';
};

// ✅ Helper method: Apply late fee
doctorSchema.methods.applyLateFee = function(feePercentage) {
    const baseAmount = this.paymentStats?.pendingCommission || 0;
    const feeAmount = baseAmount * (feePercentage / 100);
    this.lateFees = (this.lateFees || 0) + feeAmount;
    return feeAmount;
};

// ✅ Helper method: Soft delete doctor
doctorSchema.methods.softDelete = async function() {
    this.isActive = false;
    this.deletedAt = new Date();
    this.originalEmail = this.email;
    this.email = `deleted_${Date.now()}_${this.email}`;
    await this.save();
};

// ✅ Helper method: Restore doctor access after restriction
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

// ✅ Helper method: Check if doctor is active (for home page display)
doctorSchema.methods.isClinicActive = function() {
    return this.isActive === true;
};

// ✅ Helper method: Get status text for display
doctorSchema.methods.getStatusText = function() {
    return this.isActive ? 'Active' : 'Inactive';
};

// ✅ Helper method: Get status badge color
doctorSchema.methods.getStatusBadge = function() {
    return this.isActive ? '🟢 Active' : '🔴 Inactive';
};

module.exports = mongoose.model('Doctor', doctorSchema);
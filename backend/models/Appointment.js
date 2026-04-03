// D:\Projects\DoctorBooking\backend\models\Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    appointmentId: {
        type: String,
        unique: true,
        default: () => 'MB' + Date.now().toString().slice(-8)
    },
    doctor: {
        id: Number,
        name: String,
        specialization: String,
        fee: Number,
        experience: String,
        qualification: String,
        rating: String,
        availability: String,
        image: String,
        doctorId: String,
        email: String
    },
    patient: {
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        phone: { type: String, required: true },
        symptoms: String
    },
    appointmentDate: { type: String, required: true },
    appointmentTime: { type: String, required: true },
    amount: { type: Number, required: true },
    
    // Status flow
    status: {
        type: String,
        enum: ['pending_verification', 'confirmed', 'completed', 'cancelled'],
        default: 'pending_verification'
    },
    
    paymentStatus: {
        type: String,
        enum: ['pending', 'verified'],
        default: 'pending'
    },
    
    paymentMethod: {
        type: String,
        enum: ['upi', 'cash', 'card', 'online'],
        default: 'upi'
    },
    
    transactionId: { type: String, default: '' },
    verifiedBy: { type: String, default: '' },
    verifiedByRole: { type: String, enum: ['doctor', 'admin', 'staff'], default: 'doctor' },
    verifiedAt: Date,
    paymentId: { type: String, default: '' },
    
    emailSent: { type: Boolean, default: false },
    emailType: { type: String, enum: ['awaiting_verification', 'confirmed', 'reminder', 'cancelled'], default: 'awaiting_verification' },
    emailSentAt: Date,
    
    patientNotes: { type: String, default: '' },
    clinicNotes: { type: String, default: '' },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledReason: String
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } // Let mongoose handle timestamps
});

// Helper methods
appointmentSchema.methods.needsVerification = function() {
    return this.status === 'pending_verification' && this.paymentStatus === 'pending';
};

appointmentSchema.methods.verify = function(transactionId, verifiedBy, role = 'doctor') {
    this.status = 'confirmed';
    this.paymentStatus = 'verified';
    this.transactionId = transactionId;
    this.verifiedBy = verifiedBy;
    this.verifiedByRole = role;
    this.verifiedAt = new Date();
    this.confirmedAt = new Date();
    this.emailType = 'confirmed';
    return this.save();
};

appointmentSchema.methods.cancel = function(reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledReason = reason;
    this.emailType = 'cancelled';
    return this.save();
};

appointmentSchema.methods.complete = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
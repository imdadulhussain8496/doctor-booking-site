const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
    doctorId: {
        type: String,
        required: true
    },
    doctorName: {
        type: String,
        required: true
    },
    doctorEmail: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        default: 'UPI'
    },
    paidAt: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);

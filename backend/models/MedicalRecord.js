// D:\Projects\DoctorBooking\backend\models\MedicalRecord.js
const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    recordId: {
        type: String,
        unique: true,
        default: () => 'REC' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase()
    },
    
    // Patient Information
    patientEmail: {
        type: String,
        required: true,
        index: true,
        lowercase: true
    },
    patientName: {
        type: String,
        required: true
    },
    patientPhone: String,
    
    // Doctor Information
    doctorName: {
        type: String,
        required: true
    },
    doctorId: {
        type: String,
        required: true
    },
    doctorEmail: String,
    
    // Appointment Reference
    appointmentId: String,
    appointmentDate: Date,
    
    // File Information
    fileType: {
        type: String,
        enum: ['xray', 'mri', 'ct', 'ultrasound', 'prescription', 'lab_report', 'discharge_summary', 'other'],
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileSize: Number, // in bytes
    mimeType: String,
    cloudinaryId: String,
    publicId: String,
    
    // Metadata
    title: {
        type: String,
        required: true
    },
    description: String,
    tags: [String],
    
    // Dates
    recordDate: {
        type: Date,
        default: Date.now
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    
    // Access Control
    isPrivate: {
        type: Boolean,
        default: true
    },
    sharedWith: [{
        doctorId: String,
        doctorName: String,
        sharedAt: Date
    }],
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Audit
    uploadedBy: {
        type: String,
        required: true // email of who uploaded
    },
    lastAccessed: Date,
    accessCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for faster queries
medicalRecordSchema.index({ patientEmail: 1, recordDate: -1 });
medicalRecordSchema.index({ doctorId: 1, uploadedAt: -1 });
medicalRecordSchema.index({ fileType: 1, patientEmail: 1 });
medicalRecordSchema.index({ tags: 1 });

// Virtual for formatted file size
medicalRecordSchema.virtual('formattedFileSize').get(function() {
    if (!this.fileSize) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
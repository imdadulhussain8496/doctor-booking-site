// D:\Projects\DoctorBooking\backend\routes\uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MedicalRecord = require('../models/MedicalRecord');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const doctorsUploadDir = path.join(__dirname, '../uploads/doctors');
const medicalRecordsDir = path.join(__dirname, '../uploads/medical-records');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(doctorsUploadDir)) {
    fs.mkdirSync(doctorsUploadDir, { recursive: true });
}
if (!fs.existsSync(medicalRecordsDir)) {
    fs.mkdirSync(medicalRecordsDir, { recursive: true });
}

// ✅ LOCAL STORAGE CONFIGURATION for Medical Records
const medicalRecordsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('📁 Saving medical record to:', medicalRecordsDir);
        cb(null, medicalRecordsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'record-' + uniqueSuffix + ext;
        console.log('📄 Medical record filename:', filename);
        cb(null, filename);
    }
});

// ✅ LOCAL STORAGE CONFIGURATION for Doctor Images
const doctorImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('📁 Saving doctor image to:', doctorsUploadDir);
        cb(null, doctorsUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'doctor-' + uniqueSuffix + ext;
        console.log('📄 Doctor image filename:', filename);
        cb(null, filename);
    }
});

// File filter - validate file types
const fileFilter = (req, file, cb) => {
    console.log('🔍 Checking file:', file.originalname, 'Type:', file.mimetype);
    
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    if (allowedImageTypes.includes(file.mimetype) || allowedDocTypes.includes(file.mimetype)) {
        console.log('✅ File type allowed');
        cb(null, true);
    } else {
        console.log('❌ File type not allowed:', file.mimetype);
        cb(new Error('Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT'), false);
    }
};

// Configure multer for medical records
const uploadMedicalRecord = multer({
    storage: medicalRecordsStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    }
});

// Configure multer for doctor images
const uploadDoctorImage = multer({
    storage: doctorImageStorage,
    fileFilter: (req, file, cb) => {
        // Only allow images for doctor photos
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for doctor photos'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for images
        files: 1
    }
});

// ============================================
// ✅ DOCTOR IMAGE UPLOAD ROUTES
// ============================================

// ✅ Upload doctor image
router.post('/doctor-image', uploadDoctorImage.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }
        
        // Generate URL for the uploaded image
        const imageUrl = `http://localhost:5000/uploads/doctors/${req.file.filename}`;
        
        console.log('✅ Doctor image uploaded successfully:', imageUrl);
        
        res.json({ 
            success: true, 
            imageUrl,
            message: 'Image uploaded successfully' 
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✅ Get doctor image by filename
router.get('/doctor-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(doctorsUploadDir, filename);
    
    if (fs.existsSync(filepath)) {
        res.sendFile(path.resolve(filepath));
    } else {
        res.status(404).json({ success: false, message: 'Image not found' });
    }
});

// ============================================
// ✅ MEDICAL RECORDS UPLOAD ROUTES
// ============================================

// ✅ UPLOAD MEDICAL RECORD
router.post('/upload', (req, res) => {
    console.log('📁 Medical record upload route hit!');
    
    uploadMedicalRecord.single('file')(req, res, async function(err) {
        if (err) {
            console.error('❌ Multer error:', err);
            return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: err.message
            });
        }

        try {
            console.log('✅ File received:', req.file);
            console.log('📦 Body:', req.body);

            const {
                patientEmail,
                patientName,
                patientPhone,
                doctorName,
                doctorId,
                doctorEmail,
                appointmentId,
                fileType,
                title,
                description,
                tags,
                recordDate,
                isPrivate
            } = req.body;

            // Validation
            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No file uploaded' 
                });
            }

            if (!patientEmail || !patientName || !doctorName || !doctorId || !fileType || !title) {
                // Clean up uploaded file
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields' 
                });
            }

            // Create file URL
            const fileUrl = `http://localhost:5000/uploads/medical-records/${req.file.filename}`;

            // Create medical record
            const medicalRecord = await MedicalRecord.create({
                patientEmail: patientEmail.toLowerCase(),
                patientName,
                patientPhone,
                doctorName,
                doctorId,
                doctorEmail,
                appointmentId,
                fileType,
                title,
                description: description || '',
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                recordDate: recordDate || new Date(),
                
                // File info
                fileName: req.file.originalname,
                fileUrl,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                
                // Access control
                isPrivate: isPrivate === 'true',
                
                // Audit
                uploadedBy: doctorEmail || doctorName
            });

            console.log(`✅ File uploaded successfully: ${medicalRecord.recordId}`);

            res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                record: {
                    ...medicalRecord.toObject(),
                    formattedFileSize: medicalRecord.formattedFileSize
                }
            });

        } catch (error) {
            console.error('❌ Upload error:', error);
            
            // Clean up uploaded file if database save failed
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Error deleting file:', unlinkError);
                }
            }
            
            res.status(500).json({
                success: false,
                message: 'Upload failed',
                error: error.message
            });
        }
    });
});

// ✅ GET PATIENT RECORDS
router.get('/patient/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { fileType, limit = 50, page = 1 } = req.query;

        let query = { patientEmail: email.toLowerCase(), isActive: true };
        if (fileType) query.fileType = fileType;

        const records = await MedicalRecord.find(query)
            .sort({ recordDate: -1, uploadedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await MedicalRecord.countDocuments(query);

        res.json({
            success: true,
            records: records.map(r => ({
                ...r.toObject(),
                formattedFileSize: r.formattedFileSize
            })),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching patient records:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ GET DOCTOR'S UPLOADS
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { limit = 50, page = 1 } = req.query;

        const records = await MedicalRecord.find({ 
            doctorId,
            isActive: true 
        })
        .sort({ uploadedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await MedicalRecord.countDocuments({ doctorId, isActive: true });

        res.json({
            success: true,
            records: records.map(r => ({
                ...r.toObject(),
                formattedFileSize: r.formattedFileSize
            })),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ GET SINGLE RECORD
router.get('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ 
            recordId: req.params.recordId,
            isActive: true 
        });

        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'Record not found' 
            });
        }

        // Update access count
        record.accessCount += 1;
        record.lastAccessed = new Date();
        await record.save();

        res.json({
            success: true,
            record: {
                ...record.toObject(),
                formattedFileSize: record.formattedFileSize
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ DELETE RECORD (Soft delete)
router.delete('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });

        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'Record not found' 
            });
        }

        // Soft delete - just mark as inactive
        record.isActive = false;
        await record.save();

        // Optionally delete file from local storage
        if (record.fileUrl) {
            const filename = record.fileUrl.split('/').pop();
            const filePath = path.join(medicalRecordsDir, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({
            success: true,
            message: 'Record deleted successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ UPDATE RECORD METADATA
router.patch('/record/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        const updates = req.body;

        const record = await MedicalRecord.findOne({ recordId });

        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'Record not found' 
            });
        }

        // Update allowed fields
        const allowedUpdates = ['title', 'description', 'tags', 'fileType', 'isPrivate'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                record[field] = updates[field];
            }
        });

        await record.save();

        res.json({
            success: true,
            message: 'Record updated successfully',
            record: {
                ...record.toObject(),
                formattedFileSize: record.formattedFileSize
            }
        });

    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ SHARE RECORD (generate shareable link)
router.post('/record/:recordId/share', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { expiryDays = 7 } = req.body;

        const record = await MedicalRecord.findOne({ recordId });

        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'Record not found' 
            });
        }

        // Generate share token
        const shareToken = Math.random().toString(36).substr(2, 15);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        record.shareToken = shareToken;
        record.shareExpiry = expiryDate;
        await record.save();

        const shareLink = `http://localhost:3000/shared-record/${shareToken}`;

        res.json({
            success: true,
            message: 'Share link generated',
            shareLink,
            expiryDate
        });

    } catch (error) {
        console.error('Error generating share link:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
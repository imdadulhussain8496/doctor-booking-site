const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
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

// ============================================
// FILE SIZE LIMITS
// ============================================
const MAX_FINAL_SIZE = 500 * 1024; // 500KB max
const MIN_FILE_SIZE = 10 * 1024;   // 10KB minimum

// ============================================
// USE MEMORY STORAGE (NO DISK FILE = NO EPERM ERROR)
// ============================================
const uploadMedicalRecord = multer({
    storage: multer.memoryStorage(), // ← KEY FIX: No disk file
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

// Configure multer for doctor images (still use disk for now)
const uploadDoctorImage = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, doctorsUploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, 'doctor-' + uniqueSuffix + ext);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for doctor photos'), false);
        }
    },
    limits: { fileSize: 500 * 1024, files: 1 }
});

// ============================================
// DOCTOR IMAGE UPLOAD
// ============================================
router.post('/doctor-image', uploadDoctorImage.single('image'), async (req, res) => {
    let uploadedFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        uploadedFilePath = req.file.path;
        
        if (req.file.size < MIN_FILE_SIZE) {
            if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
            return res.status(400).json({ 
                success: false, 
                message: `File too small (${(req.file.size / 1024).toFixed(0)}KB). Minimum 10KB.` 
            });
        }
        
        // Compress doctor image using sharp from disk
        const compressedPath = req.file.path.replace(/\.[^/.]+$/, '_compressed.jpg');
        await sharp(req.file.path)
            .resize(800, null, { withoutEnlargement: true })
            .jpeg({ quality: 75, progressive: true })
            .toFile(compressedPath);
        
        if (fs.existsSync(compressedPath)) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            fs.renameSync(compressedPath, req.file.path);
        }
        
        const finalSize = fs.statSync(req.file.path).size;
        console.log(`✅ Doctor image: ${(req.file.size / 1024).toFixed(0)}KB → ${(finalSize / 1024).toFixed(0)}KB`);
        
        const imageUrl = `http://localhost:5000/uploads/doctors/${req.file.filename}`;
        
        res.json({ success: true, imageUrl, message: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Upload error:', error);
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/doctor-image/:filename', (req, res) => {
    const filepath = path.join(doctorsUploadDir, req.params.filename);
    if (fs.existsSync(filepath)) {
        res.sendFile(path.resolve(filepath));
    } else {
        res.status(404).json({ success: false, message: 'Image not found' });
    }
});

// ============================================
// MEDICAL RECORDS UPLOAD (MEMORY STORAGE - NO EPERM)
// ============================================
router.post('/upload', (req, res) => {
    uploadMedicalRecord.single('file')(req, res, async function(err) {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const {
                patientEmail, patientName, patientPhone, doctorName, doctorId,
                doctorEmail, fileType, title, description, recordDate
            } = req.body;

            if (!patientEmail || !patientName || !doctorName || !doctorId || !fileType || !title) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            if (req.file.size < MIN_FILE_SIZE) {
                return res.status(400).json({ 
                    success: false, 
                    message: `File too small (${(req.file.size / 1024).toFixed(0)}KB). Minimum 10KB.` 
                });
            }

            let finalBuffer = req.file.buffer;
            let finalSize = req.file.size;
            let fileExtension = '.jpg';
            let mimeType = req.file.mimetype;

            // Compress images using sharp from memory buffer
            if (req.file.mimetype.startsWith('image/')) {
                try {
                    finalBuffer = await sharp(req.file.buffer)
                        .resize(1200, null, { withoutEnlargement: true, fit: 'inside' })
                        .jpeg({ quality: 55, progressive: true })
                        .toBuffer();
                    
                    finalSize = finalBuffer.length;
                    fileExtension = '.jpg';
                    mimeType = 'image/jpeg';
                    console.log(`✅ Compressed: ${(req.file.size / 1024 / 1024).toFixed(2)}MB → ${(finalSize / 1024).toFixed(0)}KB`);
                } catch (compressError) {
                    console.log('⚠️ Compression failed, using original:', compressError.message);
                }
            }

            if (finalSize > MAX_FINAL_SIZE) {
                return res.status(400).json({ 
                    success: false, 
                    message: `File too large (${(finalSize / 1024).toFixed(0)}KB). Maximum 500KB.` 
                });
            }

            // Save compressed file to disk
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const finalFilename = 'record-' + uniqueSuffix + fileExtension;
            const finalPath = path.join(medicalRecordsDir, finalFilename);
            fs.writeFileSync(finalPath, finalBuffer);

            const fileUrl = `http://localhost:5000/uploads/medical-records/${finalFilename}`;

            const medicalRecord = await MedicalRecord.create({
                patientEmail: patientEmail.toLowerCase(),
                patientName,
                patientPhone,
                doctorName,
                doctorId,
                doctorEmail,
                fileType,
                title,
                description: description || '',
                recordDate: recordDate || new Date(),
                fileName: req.file.originalname,
                fileUrl,
                fileSize: finalSize,
                mimeType: mimeType,
                uploadedBy: doctorEmail || doctorName
            });

            res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                record: { ...medicalRecord.toObject(), formattedFileSize: medicalRecord.formattedFileSize }
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// ============================================
// GET PATIENT RECORDS
// ============================================
router.get('/patient/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const records = await MedicalRecord.find({ 
            patientEmail: email.toLowerCase(), 
            isActive: true 
        }).sort({ recordDate: -1 });

        res.json({
            success: true,
            records: records.map(r => ({ ...r.toObject(), formattedFileSize: r.formattedFileSize }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET DOCTOR'S UPLOADS
// ============================================
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const records = await MedicalRecord.find({ 
            doctorId: req.params.doctorId, 
            isActive: true 
        }).sort({ uploadedAt: -1 });

        res.json({
            success: true,
            records: records.map(r => ({ ...r.toObject(), formattedFileSize: r.formattedFileSize }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET SINGLE RECORD
// ============================================
router.get('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId, isActive: true });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        record.accessCount += 1;
        record.lastAccessed = new Date();
        await record.save();

        res.json({ success: true, record: { ...record.toObject(), formattedFileSize: record.formattedFileSize } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE RECORD (Soft delete)
// ============================================
router.delete('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        record.isActive = false;
        await record.save();

        if (record.fileUrl) {
            const filename = record.fileUrl.split('/').pop();
            const filePath = path.join(medicalRecordsDir, filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// UPDATE RECORD METADATA
// ============================================
router.patch('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        const allowedUpdates = ['title', 'description', 'tags', 'fileType', 'isPrivate'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) record[field] = req.body[field];
        });
        await record.save();
        res.json({ success: true, message: 'Record updated successfully', record });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SHARE RECORD
// ============================================
router.post('/record/:recordId/share', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        const shareToken = Math.random().toString(36).substr(2, 15);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (req.body.expiryDays || 7));
        record.shareToken = shareToken;
        record.shareExpiry = expiryDate;
        await record.save();
        res.json({ success: true, shareLink: `http://localhost:3000/shared-record/${shareToken}`, expiryDate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
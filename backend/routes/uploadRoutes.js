const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const MedicalRecord = require('../models/MedicalRecord');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadsDir = path.join(__dirname, '../uploads');
const doctorsUploadDir = path.join(__dirname, '../uploads/doctors');
const medicalRecordsDir = path.join(__dirname, '../uploads/medical-records');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(doctorsUploadDir)) fs.mkdirSync(doctorsUploadDir, { recursive: true });
if (!fs.existsSync(medicalRecordsDir)) fs.mkdirSync(medicalRecordsDir, { recursive: true });

const MIN_FILE_SIZE = 10 * 1024;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const uploadMedicalRecord = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

const uploadDoctorImage = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, doctorsUploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, 'doctor-' + uniqueSuffix + ext);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files allowed'), false);
    },
    limits: { fileSize: 500 * 1024, files: 1 }
});

router.post('/doctor-image', uploadDoctorImage.single('image'), async (req, res) => {
    let uploadedFilePath = null;
    let compressedPath = null;
    
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        
        uploadedFilePath = req.file.path;
        
        if (req.file.size < MIN_FILE_SIZE) {
            if (fs.existsSync(uploadedFilePath)) try { fs.unlinkSync(uploadedFilePath); } catch(e) {}
            return res.status(400).json({ success: false, message: 'File too small. Minimum 10KB.' });
        }
        
        compressedPath = req.file.path.replace(/\.[^/.]+$/, '_compressed.jpg');
        await sharp(req.file.path).resize(800, null, { withoutEnlargement: true }).jpeg({ quality: 75 }).toFile(compressedPath);
        
        // Upload to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(compressedPath, {
            folder: 'doctor-images',
            transformation: [{ width: 500, height: 500, crop: 'limit' }]
        });
        
        // Cleanup local files with error handling
        
        
        
        res.json({ success: true, imageUrl: cloudinaryResult.secure_url, message: 'Image uploaded to Cloudinary' });
        
    } catch (error) {
        console.error('Upload error:', error);
        try { if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath); } catch(e) {}
        try { if (compressedPath && fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath); } catch(e) {}
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/doctor-image/:filename', (req, res) => {
    const filepath = path.join(doctorsUploadDir, req.params.filename);
    fs.existsSync(filepath) ? res.sendFile(path.resolve(filepath)) : res.status(404).json({ success: false, message: 'Image not found' });
});

router.post('/upload', (req, res) => {
    uploadMedicalRecord.single('file')(req, res, async function(err) {
        if (err) return res.status(400).json({ success: false, message: err.message });
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
            const { patientEmail, patientName, doctorName, doctorId, fileType, title } = req.body;
            if (!patientEmail || !patientName || !doctorName || !doctorId || !fileType || !title) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            
            let finalBuffer = req.file.buffer;
            let finalSize = req.file.size;
            let fileExtension = '.jpg';
            let mimeType = req.file.mimetype;
            
            if (req.file.mimetype.startsWith('image/')) {
                try {
                    finalBuffer = await sharp(req.file.buffer).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 55 }).toBuffer();
                    finalSize = finalBuffer.length;
                    fileExtension = '.jpg';
                    mimeType = 'image/jpeg';
                } catch(e) { console.log('Compression failed:', e.message); }
            }
            
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const finalFilename = 'record-' + uniqueSuffix + fileExtension;
            const finalPath = path.join(medicalRecordsDir, finalFilename);
            fs.writeFileSync(finalPath, finalBuffer);
            
            const fileUrl = `https://drappointment24.com/uploads/medical-records/${finalFilename}`;
            const medicalRecord = await MedicalRecord.create({
                patientEmail: patientEmail.toLowerCase(), patientName, doctorName, doctorId,
                fileType, title, description: req.body.description || '', fileName: req.file.originalname,
                fileUrl, fileSize: finalSize, mimeType, uploadedBy: doctorId
            });
            res.status(201).json({ success: true, record: medicalRecord });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

router.get('/patient/:email', async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patientEmail: req.params.email.toLowerCase(), isActive: true }).sort({ recordDate: -1 });
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const records = await MedicalRecord.find({ doctorId: req.params.doctorId, isActive: true }).sort({ uploadedAt: -1 });
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId, isActive: true });
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
        record.accessCount += 1;
        await record.save();
        res.json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
        record.isActive = false;
        await record.save();
        if (record.fileUrl) {
            const filename = record.fileUrl.split('/').pop();
            const filePath = path.join(medicalRecordsDir, filename);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
        }
        res.json({ success: true, message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
        ['title', 'description', 'tags', 'fileType', 'isPrivate'].forEach(field => {
            if (req.body[field] !== undefined) record[field] = req.body[field];
        });
        await record.save();
        res.json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/record/:recordId/share', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ recordId: req.params.recordId });
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
        const shareToken = Math.random().toString(36).substr(2, 15);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (req.body.expiryDays || 7));
        record.shareToken = shareToken;
        record.shareExpiry = expiryDate;
        await record.save();
        res.json({ success: true, shareLink: `https://drappointment24.com/shared-record/${shareToken}`, expiryDate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

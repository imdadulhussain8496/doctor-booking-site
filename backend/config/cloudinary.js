// D:\Projects\DoctorBooking\backend\config\cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for medical images (X-rays, scans)
const medicalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'doctor-online/medical-records',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }], // Resize large images
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `medical-${uniqueSuffix}`;
        }
    }
});

// Storage for prescriptions and documents (PDFs)
const documentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'doctor-online/documents',
        allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
        resource_type: 'raw',
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `doc-${uniqueSuffix}`;
        }
    }
});

module.exports = {
    cloudinary,
    medicalStorage,
    documentStorage
};
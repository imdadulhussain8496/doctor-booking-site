// D:\Projects\DoctorBooking\backend\config\database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Check if we should use Atlas
        const useAtlas = process.env.USE_ATLAS === 'true';
        const isProduction = process.env.NODE_ENV === 'production';
        
        let mongoURI;
        
        if (useAtlas && isProduction) {
            mongoURI = process.env.MONGODB_ATLAS_URI;
            console.log('🚀 Using MongoDB ATLAS (Cloud)');
        } else {
            mongoURI = process.env.MONGODB_URI;
            console.log('💻 Using MongoDB LOCAL');
        }
        
        const conn = await mongoose.connect(mongoURI);
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📁 Database: ${conn.connection.name}`);
        console.log(`🌍 Mode: ${useAtlas ? 'ATLAS' : 'LOCAL'}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
            if (isProduction) {
                console.log('🔄 Attempting to reconnect...');
                setTimeout(() => connectDB(), 3000);
            }
        });

    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
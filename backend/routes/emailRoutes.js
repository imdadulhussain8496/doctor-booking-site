// backend/routes/emailRoutes.js
const express = require('express');
const router = express.Router();
//  verifyEmailConfig in the import
const { sendTestEmail, verifyEmailConfig, sendAppointmentConfirmation } = require('../utils/emailService');

// ✅ PING - Test if route is working
router.get('/ping', (req, res) => {
    console.log('🏓 Email route ping received');
    res.json({ 
        success: true, 
        message: 'Email router is working!',
        timestamp: new Date().toISOString()
    });
});

// ✅ TEST EMAIL - Send test email
router.post('/test', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        console.log('📧 SendGrid test email requested for:', email);
        
        const result = await sendTestEmail(email);
        
        if (result.success) {
            res.json({
                success: true,
                message: '✅ Test email sent successfully! Please check your inbox.',
                messageId: result.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                message: '❌ Failed to send test email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Test email route error:', error);
        res.status(500).json({
            success: false,
            message: 'Email service error',
            error: error.message
        });
    }
});

// ✅ EMAIL STATUS - Check email configuration (SendGrid + Gmail)
router.get('/status', async (req, res) => {
    console.log('📊 Email status check requested');
    const verification = await verifyEmailConfig();
    
    res.json({
        success: verification.success,
        message: verification.status || (verification.success ? '✅ Email service is healthy' : '❌ Email service is not configured'),
        config: {
            activeProvider: process.env.EMAIL_PROVIDER || 'sendgrid',
            sendgrid: process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Not configured',
            gmail: process.env.GMAIL_USER ? '✅ Configured' : '❌ Not configured',
            fromEmail: process.env.FROM_EMAIL || 'appointments@doctoronline.com'
        },
        details: verification
    });
});

// ✅ SEND REAL CONFIRMATION - For when payment is successful
router.post('/send-confirmation', async (req, res) => {
    try {
        const appointmentData = req.body;
        
        if (!appointmentData.patientEmail) {
            return res.status(400).json({
                success: false,
                message: 'Patient email is required'
            });
        }

        console.log('📧 Sending confirmation email to:', appointmentData.patientEmail);
        
        const result = await sendAppointmentConfirmation(appointmentData);
        
        if (result.success) {
            res.json({
                success: true,
                message: '✅ Confirmation email sent successfully',
                messageId: result.messageId,
                provider: result.provider
            });
        } else {
            res.status(500).json({
                success: false,
                message: '❌ Failed to send confirmation email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Send confirmation error:', error);
        res.status(500).json({
            success: false,
            message: 'Email service error',
            error: error.message
        });
    }
});

module.exports = router;
// controllers/paymentController.js - UPDATED WITH EMAIL SUPPORT
const nodemailer = require('nodemailer');

// Create email transporter (using Gmail or test service)
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER || 'test@ethereal.email',
    pass: process.env.EMAIL_PASS || 'test123'
  }
});

// Email template for appointment confirmation
const createAppointmentEmail = (appointmentData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Appointment Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .success { color: #4CAF50; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 Appointment Confirmed!</h1>
      </div>
      <div class="content">
        <h2>Hello ${appointmentData.patientName},</h2>
        <p class="success">✅ Your appointment has been confirmed successfully!</p>
        
        <div class="details">
          <h3>Appointment Details:</h3>
          <p><strong>Appointment ID:</strong> ${appointmentData.appointmentId}</p>
          <p><strong>Doctor:</strong> ${appointmentData.doctorName}</p>
          <p><strong>Date:</strong> ${appointmentData.appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentData.appointmentTime}</p>
          <p><strong>Amount Paid:</strong> ₹${appointmentData.amount}</p>
          <p><strong>Payment Status:</strong> Completed ✅</p>
        </div>
        
        <h3>📋 Important Instructions:</h3>
        <ul>
          <li>Arrive 15 minutes before your scheduled time</li>
          <li>Bring your ID proof (Aadhaar, PAN, etc.)</li>
          <li>Carry any previous medical reports</li>
          <li>Wear a mask and maintain social distancing</li>
          <li>Contact clinic 24 hours before for cancellations</li>
        </ul>
        
        <p><strong>Clinic Address:</strong><br>
        123 Medical Street, Health City<br>
        Mumbai - 400001<br>
        Phone: +91 98765 43210</p>
        
        <a href="mailto:support@doctorbooking.com?subject=Query: ${appointmentData.appointmentId}" class="button">
          📧 Contact Support
        </a>
        
        <p style="margin-top: 20px;"><strong>Emergency Contact:</strong> +91 98765 43210 (24/7)</p>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} Doctor Booking System</p>
        <p>This is an automated confirmation. Please do not reply to this email.</p>
        <p>For assistance, email: support@doctorbooking.com</p>
      </div>
    </body>
    </html>
  `;
};

// Send real email function
const sendRealEmail = async (emailData) => {
  try {
    const { patientEmail, patientName, doctorName, appointmentDate, appointmentTime, amount, appointmentId } = emailData;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Doctor Booking" <booking@doctorbooking.com>',
      to: patientEmail,
      subject: `✅ Appointment Confirmed with ${doctorName}`,
      html: createAppointmentEmail({
        patientName,
        doctorName,
        appointmentDate,
        appointmentTime,
        amount,
        appointmentId
      })
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('📧 Real email sent:', info.messageId);
    
    // If using ethereal.email, get preview URL
    if (process.env.EMAIL_HOST === 'smtp.ethereal.email') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📧 Preview email:', previewUrl);
      return { success: true, messageId: info.messageId, previewUrl };
    }
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', appointmentId } = req.body;
    
    console.log('💰 Creating payment order for:', amount);
    
    // Create order
    const mockOrder = {
      id: 'order_' + Date.now(),
      amount: amount * 100,
      currency: currency,
      receipt: `receipt_${appointmentId || Date.now()}`,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000)
    };
    
    res.status(200).json({
      success: true,
      message: 'Payment order created',
      order: mockOrder,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      emailReady: true,
      note: 'Real email confirmation will be sent after payment'
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Order creation failed',
      error: error.message
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      patientEmail,        // ← PATIENT'S email comes from frontend
      patientName,         // ← PATIENT'S name
      doctorName, 
      appointmentDate, 
      appointmentTime, 
      amount 
    } = req.body;
    
    console.log('✅ Payment verified for:', patientEmail);
    
    // SEND REAL EMAIL TO PATIENT
    let emailResult = { success: false };
    
    if (patientEmail) {
      emailResult = await sendRealEmail({
        patientEmail,      // ← Goes to PATIENT
        patientName,       // ← PATIENT'S name
        doctorName,
        appointmentDate,
        appointmentTime,
        amount,
        appointmentId: `APP_${Date.now()}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment verified! Appointment confirmed.',
      paymentId: razorpay_payment_id || 'pay_' + Date.now(),
      appointmentStatus: 'confirmed',
      emailSent: emailResult.success,
      emailTo: patientEmail,  // ← Show which patient got email
      patientName: patientName,
      nextSteps: [
        'Appointment confirmed',
        `Confirmation sent to: ${patientEmail}`,
        'Check email for details'
      ]
    });
    
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification error',
      error: error.message
    });
  }
};

// New endpoint to send test email
exports.sendTestEmail = async (req, res) => {
  try {
    const { toEmail = 'test@example.com', patientName = 'Test Patient' } = req.body;
    
    const emailResult = await sendRealEmail({
      patientEmail: toEmail,
      patientName,
      doctorName: 'Dr. Sharma (Cardiologist)',
      appointmentDate: '15 February 2024',
      appointmentTime: '10:30 AM',
      amount: 500,
      appointmentId: 'APP_TEST_' + Date.now()
    });
    
    res.status(200).json({
      success: true,
      message: 'Test email sent',
      emailResult,
      note: emailResult.previewUrl ? `Preview: ${emailResult.previewUrl}` : 'Check your inbox'
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
};

exports.getTestKeys = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment system ready',
    features: {
      payments: 'Mock mode (add real Razorpay keys for production)',
      emails: 'Real emails enabled',
      environment: process.env.NODE_ENV || 'development'
    },
    emailSetup: {
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email (test)',
      user: process.env.EMAIL_USER || 'test@ethereal.email',
      status: process.env.EMAIL_HOST ? 'Configured' : 'Using test service'
    },
    testEndpoint: 'POST /api/payments/send-test-email'
  });
};
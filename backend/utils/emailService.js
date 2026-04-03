// backend/utils/emailService.js - COMPLETE ENHANCED VERSION WITH DUAL PROVIDER SUPPORT
const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");

// Initialize SendGrid with your API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY is not set in .env file");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log("✅ SendGrid initialized successfully");
}

// Initialize Gmail SMTP Transporter
let gmailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  gmailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Verify Gmail connection
  gmailTransporter.verify((error, success) => {
    if (error) {
      console.error("❌ Gmail SMTP connection failed:", error);
    } else {
      console.log("✅ Gmail SMTP ready to send emails");
    }
  });
}

// ===========================================
// 🎨 EMAIL TEMPLATES
// ===========================================

// Template 1: Payment Verification Pending - WITH UPDATED EMAIL-FRIENDLY CIRCLES
const getPaymentPendingHTML = (data) => {
  const appointmentDate = new Date(data.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
        .logo { font-size: 48px; }
        .header h1 { color: white; font-size: 28px; }
        .status-badge { background: #fef3c7; color: #92400e; padding: 8px 24px; border-radius: 50px; display: inline-block; margin-top: 20px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .card { background: #fef3c7; padding: 25px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(245,158,11,0.2); }
        
        /* ✅ UPDATED: Email-friendly circles */
        .steps { background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0; }
        .step { 
          margin-bottom: 12px; 
          overflow: hidden; 
          clear: both;
        }
        .step-number { 
          width: 28px; 
          height: 28px; 
          background: #2563eb; 
          color: white !important; 
          border-radius: 50%; 
          display: inline-block; 
          text-align: center; 
          line-height: 28px; 
          font-weight: bold; 
          font-size: 15px;
          margin-right: 12px;
          float: left;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
        }
        .step-text {
          display: inline-block;
          line-height: 28px;
          color: #334155;
        }
        /* Optional: Different colors */
        .step-1 .step-number { background: #2563eb; }
        .step-2 .step-number { background: #059669; }
        .step-3 .step-number { background: #d97706; }
        
        .footer { text-align: center; padding: 30px; background: #f1f5f9; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⏳</div>
          <h1>Payment Received</h1>
          <div class="status-badge">AWAITING VERIFICATION</div>
        </div>
        
        <div class="content">
          <h2>Hello ${data.patientName}!</h2>
          <p>Your payment has been received and is being verified.</p>
          
          <div class="card">
            <h3 style="color: #92400e; margin-bottom: 20px;">💰 Payment Details</h3>
            <div class="detail-row"><span>Amount:</span><strong> ₹${data.amount}</strong></div>
            <div class="detail-row"><span>Doctor:</span><strong> ${data.doctorName}</strong></div>
            <div class="detail-row"><span>Date:</span><strong> ${appointmentDate}</strong></div>
            <div class="detail-row"><span>Time:</span><strong> ${data.time}</strong></div>
            
          </div>
          
          <div class="steps">
            <h3 style="margin-bottom: 20px;">📋 Next Steps</h3>
            
            <div class="step step-1">
              <span class="step-number">1</span>
              <span class="step-text">Save the payment screenshot</span>
            </div>
            
            <div class="step step-2">
              <span class="step-number">2</span>
              <span class="step-text">Show it at the clinic reception</span>
            </div>
            
            <div class="step step-3">
              <span class="step-number">3</span>
              <span class="step-text">Staff will verify and confirm your appointment</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Need help? Contact: doctoronlinhelp@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template 2: Payment Verified (Appointment Confirmed)
const getPaymentVerifiedHTML = (data) => {
  const appointmentDate = new Date(data.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #059669, #047857); padding: 40px 30px; text-align: center; }
        .logo { font-size: 48px; }
        .header h1 { color: white; font-size: 28px; }
        .status-badge { background: #d1fae5; color: #065f46; padding: 8px 24px; border-radius: 50px; display: inline-block; margin-top: 20px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .card { background: #d1fae5; padding: 25px; border-radius: 12px; border-left: 4px solid #059669; margin: 20px 0; }
        .success-check { font-size: 64px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding: 30px; background: #f1f5f9; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✅</div>
          <h1>Payment Verified!</h1>
          <div class="status-badge">APPOINTMENT CONFIRMED</div>
        </div>
        
        <div class="content">
          <div class="success-check">🎉</div>
          <h2 style="text-align: center;">Your appointment is confirmed!</h2>
          <p style="text-align: center; color: #4b5563;">Payment verified successfully.</p>
          
          <div class="card">
            <h3 style="color: #065f46; margin-bottom: 20px;">📋 Appointment Details</h3>
            <p><strong>Doctor:</strong> ${data.doctorName}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Amount:</strong> ₹${data.amount}</p>
            <p><strong>Verified on:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">See you at the clinic!</p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Doctor Online!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template 3: Commission Reminder for Doctor
const getCommissionReminderHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; }
        .pending-list { background: #fee2e2; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .pending-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fecaca; }
        .total { background: #2563eb; color: white; padding: 20px; border-radius: 12px; text-align: center; font-size: 24px; margin: 20px 0; }
        .upi-info { background: #fef3c7; padding: 20px; border-radius: 12px; text-align: center; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Commission Due Reminder</h1>
        </div>
        
        <div class="content">
          <h2>Dear ${data.doctorName},</h2>
          <p>You have pending commission payments. Please clear them at your earliest convenience.</p>
          
          <div class="pending-list">
            <h3 style="margin-top: 0;">Pending Payments</h3>
            ${data.pendingPayments
              .map(
                (p) => `
              <div class="pending-item">
                <span>${p.patientName} - ${p.date}</span>
                <strong>₹${p.amount}</strong>
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="total">
            <div>Total Due</div>
            <strong>₹${data.totalDue}</strong>
          </div>
          
          <div class="upi-info">
            <h3 style="margin: 0 0 10px;">📱 Platform UPI ID</h3>
            <p style="font-size: 20px; margin: 0;"><strong>platform@okhdfcbank</strong></p>
          </div>
          
          <div style="text-align: center;">
            <a href="http://localhost:3000/doctor-dashboard/${data.doctorId}" class="button">View Dashboard</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template 4: Admin Alert
const getAdminAlertHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
        .header { background: ${data.type === "critical" ? "#dc2626" : "#f59e0b"}; padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; }
        .alert-box { background: ${data.type === "critical" ? "#fee2e2" : "#fef3c7"}; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .timestamp { color: #6b7280; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Admin Alert</h1>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <h3 style="margin-top: 0;">${data.title}</h3>
            <p>${data.message}</p>
            ${data.link ? `<p><a href="${data.link}">View Details →</a></p>` : ""}
          </div>
          
          <div class="timestamp">
            <p>Time: ${new Date().toLocaleString()}</p>
            <p>Type: ${data.type}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ===========================================
// 📧 DUAL PROVIDER EMAIL SENDING FUNCTION
// ===========================================

// Main email sending function with dual provider support
const sendEmail = async (to, subject, html, options = {}) => {
  // 🔍 TRACK WHO'S CALLING - ADD THIS DEBUG LINE
  const stackTrace = new Error().stack;
  console.log("🔍 EMAIL CALLED FROM:", stackTrace.split("\n")[2]);
  console.log(`📧 To: ${to}`);
  console.log(`📧 Subject: ${subject}`);

  const provider = process.env.EMAIL_PROVIDER || "sendgrid"; // Default to SendGrid

  console.log(`📧 Sending email via ${provider} to: ${to}`);
  console.log(`📧 Subject: ${subject}`);

  try {
    if (provider === "gmail" && gmailTransporter) {
      // Use Gmail SMTP
      const fromEmail =
        options.from || `"Doctor Online" <${process.env.GMAIL_USER}>`;

      const mailOptions = {
        from: fromEmail,
        to,
        subject,
        html,
      };

      const info = await gmailTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent via Gmail: ${info.messageId}`);
      return {
        success: true,
        provider: "gmail",
        messageId: info.messageId,
      };
    } else {
      // Use SendGrid (default)
      const fromEmail =
        options.from ||
        process.env.FROM_EMAIL ||
        "appointments@doctoronline.com";

      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      const result = await sgMail.send(msg);
      console.log(`✅ Email sent via SendGrid`);
      return {
        success: true,
        provider: "sendgrid",
        messageId: result[0]?.headers["x-message-id"],
      };
    }
  } catch (error) {
    console.error("❌ Email sending failed:");
    if (error.response) {
      console.error("Status:", error.response.statusCode);
      console.error("Body:", error.response.body);
    } else {
      console.error("Error:", error.message);
    }

    return {
      success: false,
      provider: provider,
      error: error.response?.body?.errors?.[0]?.message || error.message,
    };
  }
};

// ===========================================
// 📧 EMAIL SENDING FUNCTIONS
// ===========================================

// ❌ REMOVED: sendAppointmentConfirmation - NOT USED ANYWHERE

// 1. Send Payment Pending Notification
exports.sendPaymentPending = async (appointmentData) => {
  const html = getPaymentPendingHTML(appointmentData);
  return await sendEmail(
    appointmentData.patientEmail,
    `⏳ Payment Received - Awaiting Verification`,
    html,
  );
};

// 2. Send Payment Verified Notification
exports.sendPaymentVerified = async (appointmentData) => {
  const html = getPaymentVerifiedHTML(appointmentData);
  return await sendEmail(
    appointmentData.patientEmail,
    `✅ Payment Verified - Appointment Confirmed`,
    html,
  );
};

// 3. Send Commission Reminder to Doctor
exports.sendCommissionReminder = async (doctorData) => {
  const html = getCommissionReminderHTML(doctorData);
  return await sendEmail(
    doctorData.doctorEmail,
    `💰 Commission Due Reminder - ${doctorData.doctorName}`,
    html,
  );
};

// 4. Send Admin Alert
exports.sendAdminAlert = async (alertData) => {
  const adminEmail = process.env.ADMIN_EMAIL || "doctoronlinhelp@gmail.com";
  const html = getAdminAlertHTML(alertData);
  return await sendEmail(
    adminEmail,
    `🔔 Admin Alert: ${alertData.title}`,
    html,
  );
};

// Test email function
exports.sendTestEmail = async (testEmail) => {
  console.log("🧪 Sending test email to:", testEmail);

  const testData = {
    patientEmail: testEmail,
    patientName: "Test Patient",
    patientPhone: "9876543210",
    doctorName: "Sharma",
    specialization: "Cardiologist",
    date: new Date().toISOString(),
    time: "10:00 AM",
    amount: "500",
    experience: "15 years",
    paymentId: "TEST_" + Date.now().toString().slice(-8),
  };

  return await exports.sendPaymentPending(testData);
};

// Verify email configuration - FIXED
exports.verifyEmailConfig = async () => {
  console.log("🔍 Verifying email configuration...");

  const provider = process.env.EMAIL_PROVIDER || "sendgrid";

  // Check SendGrid
  const sendgridConfigured = !!(
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY.startsWith("SG.")
  );

  // Check Gmail SMTP
  const gmailConfigured = !!(
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  );

  // Determine overall success based on active provider
  let success = false;
  if (provider === "gmail" && gmailConfigured) {
    success = true;
  } else if (provider === "sendgrid" && sendgridConfigured) {
    success = true;
  } else if (sendgridConfigured || gmailConfigured) {
    // Fallback: if any provider is configured, consider it success
    success = true;
  }

  const result = {
    success, // ✅ ADD THIS - VERY IMPORTANT!
    provider,
    activeProvider: success ? provider : null,
    sendgrid: {
      configured: sendgridConfigured,
      keyFormat: process.env.SENDGRID_API_KEY?.startsWith("SG.")
        ? "valid"
        : "invalid",
      fromEmail: process.env.FROM_EMAIL || "appointments@doctoronline.com",
    },
    gmail: {
      configured: gmailConfigured,
      user: process.env.GMAIL_USER,
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
    },
    status: success ? "✅ Ready" : "❌ Not configured",
    error: success ? null : "No email provider configured",
  };

  return result;
};
// Template 6: Monthly Statement
const getMonthlyStatementHTML = (data) => {
  const monthName = new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; }
        .header h1 { color: white; font-size: 28px; margin: 0; }
        .header p { color: #e0f2fe; margin: 5px 0 0; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; color: #1e293b; margin-bottom: 20px; }
        .summary-card { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
        .summary-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 500; }
        .value { font-weight: 700; color: #0f172a; }
        .total { font-size: 18px; color: #059669; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #475569; }
        .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .footer { text-align: center; padding: 30px; background: #f1f5f9; color: #64748b; font-size: 12px; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>��� Doctor Online</h1>
          <p>Monthly Commission Statement</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear <strong>${data.doctorName}</strong>,
          </div>
          
          <p style="color: #475569;">Your commission statement for <strong>${monthName} ${data.year}</strong> is ready.</p>
          
          <div class="summary-card">
            <h3 style="color: #1e293b; margin-bottom: 15px;">��� Summary</h3>
            <div class="summary-row">
              <span class="label">Opening Balance:</span>
              <span class="value">₹${data.summary.openingBalance}</span>
            </div>
            <div class="summary-row">
              <span class="label">New Commission:</span>
              <span class="value">+ ₹${data.summary.newCommission}</span>
            </div>
            <div class="summary-row">
              <span class="label">Payments Made:</span>
              <span class="value">- ₹${data.summary.totalPaid}</span>
            </div>
            <div class="summary-row" style="border-top: 2px solid #2563eb; margin-top: 10px; padding-top: 10px;">
              <span class="label"><strong>Closing Balance:</strong></span>
              <span class="value total"><strong>₹${data.summary.closingBalance}</strong></span>
            </div>
          </div>

          ${data.appointments.length > 0 ? `
            <h3 style="color: #1e293b; margin: 20px 0 10px;">��� Commission Details</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Amount</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                ${data.appointments.map(apt => `
                  <tr>
                    <td>${apt.date}</td>
                    <td>${apt.patientName}</td>
                    <td>₹${apt.amount}</td>
                    <td>₹${apt.commission}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="color: #94a3b8;">No new commissions this month.</p>'}

          ${data.payments.length > 0 ? `
            <h3 style="color: #1e293b; margin: 20px 0 10px;">��� Payment History</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.payments.map(p => `
                  <tr>
                    <td>${new Date(p.paidAt).toLocaleDateString()}</td>
                    <td>${p.transactionId}</td>
                    <td>₹${p.amount}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0;">
              <strong>��� Due Date:</strong> Please pay any pending amount by 10th of next month.
            </p>
          </div>

          <div style="text-align: center;">
            <a href="http://localhost:3000/doctor-dashboard/${data.doctorId}" class="button">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an auto-generated statement. For queries, contact admin@doctoronline.com</p>
          <p>© ${new Date().getFullYear()} Doctor Online Healthcare</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// 6. Send Monthly Statement - UPDATED to use sendEmail
exports.sendMonthlyStatement = async (doctorEmail, doctorName, data) => {
  const html = getMonthlyStatementHTML(data.doctorData);
  
  // ✅ USE sendEmail instead of sgMail directly
  const result = await sendEmail(
    doctorEmail,
    `📊 Monthly Commission Statement - ${data.month}/${data.year}`,
    html,
    { 
      from: process.env.FROM_EMAIL || 'appointments@doctoronline.com',
      attachments: [{
        filename: `statement_${data.month}_${data.year}.pdf`,
        path: data.pdfPath,
        contentType: 'application/pdf'
      }]
    }
  );
  
  return result;
};
exports.sendEmail = sendEmail;
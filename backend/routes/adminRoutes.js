const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const PaymentHistory = require("../models/PaymentHistory");
const { sendEmail } = require("../utils/emailService");

// Admin auth - Using environment variables for security
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "hussainsilba",
};

// ✅ Generate random password WITHOUT SPACES
const generateRandomPassword = () => {
  const length = 8;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  password = password.replace(/\s/g, "");
  return password;
};

// ✅ Email sending function for doctor welcome
const sendDoctorWelcomeEmail = async (doctorEmail, doctorName, password) => {
  try {
    console.log(`📧 Attempting to send welcome email to: ${doctorEmail}`);

    const loginUrl =
      process.env.FRONTEND_URL || "http://localhost:3000/doctor-login";

    const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #059669, #047857); padding: 40px 30px; text-align: center; }
                    .header h1 { color: white; font-size: 28px; margin: 10px 0; }
                    .content { padding: 40px 30px; }
                    .credentials-box { background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #059669; }
                    .credential { font-family: monospace; font-size: 18px; background: white; padding: 12px; border-radius: 8px; margin: 10px 0; border: 1px solid #e2e8f0; }
                    .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
                    .steps { background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0; }
                    .step { margin-bottom: 12px; overflow: hidden; clear: both; }
                    .step-number { width: 28px; height: 28px; background: #059669; color: white; border-radius: 50%; display: inline-block; text-align: center; line-height: 28px; font-weight: bold; font-size: 15px; margin-right: 12px; float: left; }
                    .step-text { display: inline-block; line-height: 28px; color: #334155; }
                    .footer { text-align: center; padding: 30px; background: #f1f5f9; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 Doctor Online</h1>
                        <p style="color: #d1fae5;">Healthcare Center</p>
                    </div>
                    
                    <div class="content">
                        <h2 style="color: #1e293b;">Welcome ${doctorName}!</h2>
                        <p style="color: #475569;">Your account has been created successfully. You can now access the Doctor Portal.</p>
                        
                        <div class="credentials-box">
                            <h3 style="color: #065f46; margin-bottom: 15px;">🔐 LOGIN DETAILS</h3>
                            <p><strong>Portal:</strong> <a href="${loginUrl}" style="color: #059669;">${loginUrl}</a></p>
                            <p><strong>Email:</strong> ${doctorEmail}</p>
                            <div class="credential">
                                <strong>Password:</strong> ${password}
                            </div>
                            <p style="font-size: 12px; color: #b91c1c; margin-top: 10px;">
                                ⚠️ Please change your password after first login
                            </p>
                        </div>
                        
                        <div class="steps">
                            <h3 style="margin-bottom: 15px;">📋 FIRST STEPS:</h3>
                            <div class="step">
                                <span class="step-number">1</span>
                                <span class="step-text">Login with the credentials above</span>
                            </div>
                            <div class="step">
                                <span class="step-number">2</span>
                                <span class="step-text">Go to UPI Settings and add your UPI ID</span>
                            </div>
                            <div class="step">
                                <span class="step-number">3</span>
                                <span class="step-text">Update your profile photo</span>
                            </div>
                            <div class="step">
                                <span class="step-number">4</span>
                                <span class="step-text">Start accepting appointments</span>
                            </div>
                        </div>
                        
                        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
                            <p style="color: #92400e; margin: 0;">
                                💡 <strong>Tip:</strong> Commission rate is 1% on all confirmed appointments
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${loginUrl}" class="button">Login to Dashboard →</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Need help? Contact: doctoronlinhelp@gmail.com</p>
                        <p>© ${new Date().getFullYear()} Doctor Online Healthcare</p>
                    </div>
                </div>
            </body>
            </html>
        `;

    const result = await sendEmail(
      doctorEmail,
      "🏥 Welcome to Doctor Online - Your Account Details",
      html,
      { from: "DrAppointment <doctoronlinhelp@gmail.com>" },
    );

    if (result.success) {
      console.log(
        `✅ Welcome email sent successfully to ${doctorEmail} via ${result.provider}`,
      );
      return {
        success: true,
        message: "Email sent",
        provider: result.provider,
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Email reminder helper functions
async function sendGentleReminder(doctor, amountDue) {
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; }
                .header h2 { color: white; margin: 0; }
                .content { padding: 30px; }
                .amount-card { background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
                .amount { font-size: 32px; font-weight: bold; color: #f59e0b; }
                .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
                .footer { text-align: center; padding: 20px; background: #f1f5f9; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⏳ Gentle Reminder</h2>
                </div>
                <div class="content">
                    <h2>Hello ${doctor.name},</h2>
                    <p>This is a gentle reminder that your commission payment is due in 5 days.</p>
                    <div class="amount-card">
                        <p><strong>💰 Amount Due:</strong></p>
                        <div class="amount">₹${amountDue}</div>
                        <p><strong>📅 Due Date:</strong> 10th of this month</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" class="button">Pay Now</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Doctor Online Healthcare</p>
                </div>
            </div>
        </body>
        </html>
    `;

  await sendEmail(
    doctor.email,
    "⏳ Gentle Reminder: Commission Payment Due",
    html,
  );
}

async function sendDueReminder(doctor, amountDue) {
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; }
                .header h2 { color: white; margin: 0; }
                .content { padding: 30px; }
                .amount-card { background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
                .amount { font-size: 32px; font-weight: bold; color: #dc2626; }
                .warning { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; color: #b91c1c; }
                .button { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⚠️ Commission Payment Due TODAY</h2>
                </div>
                <div class="content">
                    <h2>Urgent: ${doctor.name}</h2>
                    <p>Your commission payment is due TODAY.</p>
                    <div class="amount-card">
                        <p><strong>💰 Amount Due:</strong></p>
                        <div class="amount">₹${amountDue}</div>
                    </div>
                    <div class="warning">
                        ⚠️ Late fees will apply from tomorrow (2% per day)
                    </div>
                    <div style="text-align: center;">
                        <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" class="button">Pay Immediately</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

  await sendEmail(doctor.email, "⚠️ Commission Payment Due TODAY", html);
}

async function sendUrgentReminder(doctor, amountDue) {
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center; }
                .header h2 { color: white; margin: 0; }
                .content { padding: 30px; }
                .amount-card { background: #fee2e2; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
                .amount { font-size: 32px; font-weight: bold; color: #b91c1c; }
                .button { background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔴 URGENT: Payment Overdue</h2>
                </div>
                <div class="content">
                    <h2 style="color: #dc2626;">URGENT ACTION REQUIRED</h2>
                    <p>Your payment is now overdue. Additional fees have been applied.</p>
                    <div class="amount-card">
                        <p><strong>💰 Total Due:</strong></p>
                        <div class="amount">₹${amountDue}</div>
                    </div>
                    <p>⚠️ Account will be RESTRICTED in 5 days if unpaid</p>
                    <div style="text-align: center;">
                        <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" class="button">PAY NOW</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

  await sendEmail(doctor.email, "🔴 URGENT: Commission Payment Overdue", html);
}

async function sendFinalReminder(doctor, amountDue) {
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; text-align: center; }
                .header h2 { color: white; margin: 0; }
                .content { padding: 30px; }
                .warning-card { border: 2px solid #dc2626; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
                .amount { font-size: 32px; font-weight: bold; color: #dc2626; }
                .button { background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🚨 FINAL WARNING - Account Suspension</h2>
                </div>
                <div class="content">
                    <div class="warning-card">
                        <h2 style="color: #dc2626;">FINAL NOTICE</h2>
                        <p>Your account will be SUSPENDED tomorrow if payment not received.</p>
                        <div class="amount">₹${amountDue}</div>
                    </div>
                    <div style="text-align: center;">
                        <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" class="button">PAY NOW TO AVOID SUSPENSION</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

  await sendEmail(doctor.email, "🚨 FINAL WARNING - Account Suspension", html);
}

async function sendAccessRestoredEmail(doctor) {
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #059669, #047857); padding: 30px; text-align: center; }
                .header h2 { color: white; margin: 0; }
                .content { padding: 30px; }
                .success-card { background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border-left: 4px solid #059669; }
                .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Account Access Restored</h2>
                </div>
                <div class="content">
                    <h2>Dear ${doctor.name},</h2>
                    <p>Your account has been successfully unblocked. Thank you for clearing your dues.</p>
                    <div class="success-card">
                        <p>✅ You can now:</p>
                        <ul style="text-align: left;">
                            <li>Verify appointments</li>
                            <li>Access patient records</li>
                            <li>Use all dashboard features</li>
                        </ul>
                    </div>
                    <div style="text-align: center;">
                        <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" class="button">Go to Dashboard</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

  await sendEmail(doctor.email, "✅ Account Access Restored", html);
}

// ✅ ADMIN LOGIN - With HttpOnly Cookie
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("🔐 Admin login attempt:", username);

  if (
    username === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    console.log("✅ Admin login successful");

    // Generate JWT token
    const token = jwt.sign(
      { username: ADMIN_CREDENTIALS.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    // Set HttpOnly Cookie
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Login successful",
      admin: {
        username: ADMIN_CREDENTIALS.username,
        role: "admin",
        name: "Administrator",
      },
    });
  } else {
    console.log("❌ Admin login failed");
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
});

// ✅ ADMIN LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// ✅ VERIFY ADMIN TOKEN
router.get("/verify", (req, res) => {
  const token = req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      success: true,
      admin: {
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

// ✅ GET DASHBOARD STATISTICS
router.get("/stats", async (req, res) => {
  try {
    const activeDoctors = await Doctor.countDocuments({ isActive: true });
    const restrictedDoctors = await Doctor.countDocuments({
      isActive: true,
      paymentStatus: "restricted",
    });
    const overdueDoctors = await Doctor.countDocuments({
      isActive: true,
      paymentStatus: { $in: ["overdue", "late"] },
    });

    const totalAppointments = await Appointment.countDocuments();
    const totalPatients = await Patient.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAppointments = await Appointment.countDocuments({
      createdAt: { $gte: today },
    });

    const totalRevenue = await Appointment.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "completed"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const activeDoctorsList = await Doctor.find({ isActive: true });
    const commissionAppointments = await Appointment.find({
      status: { $in: ["confirmed", "completed"] },
      paymentStatus: "verified",
    });

    const totalPlatformCommission = commissionAppointments.reduce(
      (sum, apt) => {
        return sum + apt.amount * 0.01;
      },
      0,
    );

    const allDoctors = await Doctor.find({});
    let totalCommissionDue = 0;
    let totalLateFees = 0;

    allDoctors.forEach((doc) => {
      totalCommissionDue += doc.paymentStats?.pendingCommission || 0;
      totalLateFees += doc.lateFees || 0;
    });

    const pendingVerifications = await Appointment.countDocuments({
      status: "pending_verification",
      paymentStatus: "pending",
    });

    const verifiedToday = await Appointment.countDocuments({
      verifiedAt: { $gte: today },
    });

    res.json({
      success: true,
      stats: {
        totalAppointments,
        totalPatients,
        totalDoctors: activeDoctors,
        restrictedDoctors,
        overdueDoctors,
        todayAppointments,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalPlatformCommission,
        totalCommissionDue,
        totalLateFees,
        totalWithFees: totalCommissionDue + totalLateFees,
        appointmentsByStatus,
        pendingVerifications,
        verifiedToday,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET RESTRICTED DOCTORS LIST
router.get("/restricted-doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find(
      {
        isActive: true,
        paymentStatus: "restricted",
      },
      {
        name: 1,
        email: 1,
        doctorId: 1,
        specialization: 1,
        paymentStatus: 1,
        restrictedAt: 1,
        restrictionReason: 1,
        lateFees: 1,
        "paymentStats.pendingCommission": 1,
      },
    ).sort({ restrictedAt: -1 });

    const doctorsWithTotal = doctors.map((doc) => ({
      ...doc.toObject(),
      totalDue:
        (doc.paymentStats?.pendingCommission || 0) + (doc.lateFees || 0),
    }));

    res.json({
      success: true,
      count: doctors.length,
      doctors: doctorsWithTotal,
    });
  } catch (error) {
    console.error("❌ Error fetching restricted doctors:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET OVERDUE DOCTORS LIST
router.get("/overdue-doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find(
      {
        isActive: true,
        paymentStatus: { $in: ["overdue", "late"] },
      },
      {
        name: 1,
        email: 1,
        doctorId: 1,
        specialization: 1,
        paymentStatus: 1,
        totalOverdueDays: 1,
        lateFees: 1,
        "paymentStats.pendingCommission": 1,
      },
    ).sort({ totalOverdueDays: -1 });

    const doctorsWithTotal = doctors.map((doc) => ({
      ...doc.toObject(),
      totalDue:
        (doc.paymentStats?.pendingCommission || 0) + (doc.lateFees || 0),
    }));

    res.json({
      success: true,
      count: doctors.length,
      doctors: doctorsWithTotal,
    });
  } catch (error) {
    console.error("❌ Error fetching overdue doctors:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ UNBLOCK RESTRICTED DOCTOR
router.post("/doctors/unblock/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    doctor.paymentStatus = "current";
    doctor.restrictedAt = null;
    doctor.restrictionReason = null;
    doctor.accessRestoredAt = new Date();
    doctor.lateFees = 0;
    doctor.totalOverdueDays = 0;
    doctor.lastReminderSent = "none";

    await doctor.save();

    await sendAccessRestoredEmail(doctor);

    res.json({
      success: true,
      message: `✅ Doctor ${doctor.name} unblocked successfully`,
      doctor: {
        name: doctor.name,
        status: doctor.paymentStatus,
        restoredAt: doctor.accessRestoredAt,
      },
    });
  } catch (error) {
    console.error("❌ Error unblocking doctor:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ MARK COMMISSION AS PAID
router.post("/commission/mark-paid", async (req, res) => {
  try {
    const { doctorId, transactionId, amount } = req.body;

    console.log("=".repeat(60));
    console.log("💰 ADMIN MARK COMMISSION PAID");
    console.log("Doctor ID:", doctorId);
    console.log("Amount:", amount);
    console.log("Transaction ID:", transactionId);
    console.log("=".repeat(60));

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const pendingAmount = doctor.paymentStats?.pendingCommission || 0;

    if (pendingAmount !== amount) {
      return res.status(400).json({
        success: false,
        message: `Amount mismatch. Expected ₹${pendingAmount}, Received ₹${amount}`,
      });
    }

    const paymentRecord = await PaymentHistory.create({
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      amount: amount,
      transactionId: transactionId,
      paidAt: new Date(),
    });

    const wasRestricted = doctor.paymentStatus === "restricted";

    doctor.paymentStats.totalCommissionPaid =
      (doctor.paymentStats.totalCommissionPaid || 0) + amount;
    doctor.paymentStats.pendingCommission = 0;
    doctor.paymentStats.lastCommissionPaid = new Date();
    doctor.paymentStats.lastPaymentTransaction = transactionId;

    doctor.paymentStatus = "current";
    doctor.lateFees = 0;
    doctor.totalOverdueDays = 0;
    doctor.lastReminderSent = "none";

    if (wasRestricted) {
      doctor.restrictedAt = null;
      doctor.restrictionReason = null;
      doctor.accessRestoredAt = new Date();
    }

    await doctor.save();

    console.log(`✅ Commission marked as paid for ${doctor.name}: ₹${amount}`);
    console.log(`✅ Payment history saved: ${paymentRecord._id}`);

    if (wasRestricted) {
      console.log(`✅ Account automatically unblocked`);
      await sendAccessRestoredEmail(doctor);
    }

    res.json({
      success: true,
      message: wasRestricted
        ? "Commission marked as paid and account unblocked successfully"
        : "Commission marked as paid successfully",
      doctor: {
        name: doctor.name,
        amount,
        paidAt: new Date(),
        transactionId,
      },
      paymentRecord,
      wasRestricted,
    });
  } catch (error) {
    console.error("❌ Error marking commission as paid:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ SEND MANUAL REMINDER TO DOCTOR
router.post("/send-reminder/:doctorId/:type", async (req, res) => {
  try {
    const { doctorId, type } = req.params;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const totalDue =
      (doctor.paymentStats?.pendingCommission || 0) + (doctor.lateFees || 0);

    let emailSent = false;

    switch (type) {
      case "gentle":
        await sendGentleReminder(doctor, totalDue);
        emailSent = true;
        break;
      case "due":
        await sendDueReminder(doctor, totalDue);
        emailSent = true;
        break;
      case "urgent":
        await sendUrgentReminder(doctor, totalDue);
        emailSent = true;
        break;
      case "final":
        await sendFinalReminder(doctor, totalDue);
        emailSent = true;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid reminder type",
        });
    }

    if (emailSent) {
      doctor.lastReminderSent = type;
      doctor.lastPaymentReminderDate = new Date();
      await doctor.save();
    }

    res.json({
      success: true,
      message: `${type} reminder sent to ${doctor.name}`,
      doctor: {
        name: doctor.name,
        email: doctor.email,
        type,
      },
    });
  } catch (error) {
    console.error("❌ Error sending reminder:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET ALL COMMISSION DUE
router.get("/commission-due", async (req, res) => {
  try {
    const doctors = await Doctor.find(
      {
        $or: [
          { isActive: true },
          { "paymentStats.pendingCommission": { $gt: 0 } },
        ],
      },
      {
        name: 1,
        email: 1,
        doctorId: 1,
        isActive: 1,
        paymentStatus: 1,
        lateFees: 1,
        totalOverdueDays: 1,
        restrictedAt: 1,
        "paymentStats.pendingCommission": 1,
        "paymentStats.totalCommissionEarned": 1,
        "paymentStats.totalCommissionPaid": 1,
        "paymentStats.lastCommissionPaid": 1,
        "paymentStats.lastPaymentTransaction": 1,
      },
    );

    const commissionList = doctors.map((doc) => ({
      doctorId: doc.doctorId,
      name: doc.isActive ? doc.name : `${doc.name} (Deleted)`,
      email: doc.email,
      commissionDue: doc.paymentStats?.pendingCommission || 0,
      totalEarned: doc.paymentStats?.totalCommissionEarned || 0,
      totalPaid: doc.paymentStats?.totalCommissionPaid || 0,
      lateFees: doc.lateFees || 0,
      totalDue:
        (doc.paymentStats?.pendingCommission || 0) + (doc.lateFees || 0),
      lastPaid: doc.paymentStats?.lastCommissionPaid,
      lastTransaction: doc.paymentStats?.lastPaymentTransaction,
      isActive: doc.isActive,
      paymentStatus: doc.paymentStatus,
      daysOverdue: doc.totalOverdueDays || 0,
      restrictedAt: doc.restrictedAt,
    }));

    const totalDue = commissionList.reduce(
      (sum, doc) => sum + doc.commissionDue,
      0,
    );
    const totalLateFees = commissionList.reduce(
      (sum, doc) => sum + doc.lateFees,
      0,
    );
    const totalWithFees = totalDue + totalLateFees;

    res.json({
      success: true,
      totalDue,
      totalLateFees,
      totalWithFees,
      doctors: commissionList,
      platformUpiId: process.env.DEFAULT_UPI_ID || "platform@okhdfcbank",
    });
  } catch (error) {
    console.error("❌ Error fetching commission due:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET COMMISSION HISTORY
router.get("/commission-history", async (req, res) => {
  try {
    const { doctorId, startDate, endDate } = req.query;

    let query = {};

    if (doctorId) {
      const doctor = await Doctor.findOne({ doctorId });
      if (doctor) {
        query["doctor.email"] = doctor.email;
      }
    }

    if (startDate || endDate) {
      query.verifiedAt = {};
      if (startDate) query.verifiedAt.$gte = new Date(startDate);
      if (endDate) query.verifiedAt.$lte = new Date(endDate);
    }

    const appointments = await Appointment.find({
      ...query,
      paymentStatus: "verified",
    }).sort({ verifiedAt: -1 });

    const history = appointments.map((apt) => ({
      appointmentId: apt.appointmentId,
      doctorName: apt.doctor.name,
      patientName: apt.patient.name,
      amount: apt.amount,
      commission: apt.amount * 0.01,
      verifiedAt: apt.verifiedAt,
      date: apt.appointmentDate,
    }));

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("❌ Error fetching commission history:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET PAYMENT HISTORY
router.get("/payment-history", async (req, res) => {
  try {
    const { doctorId, startDate, endDate } = req.query;

    let query = {};
    if (doctorId) query.doctorId = doctorId;

    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) query.paidAt.$lte = new Date(endDate);
    }

    const payments = await PaymentHistory.find(query).sort({ paidAt: -1 });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const byDoctor = {};
    payments.forEach((p) => {
      if (!byDoctor[p.doctorName]) {
        byDoctor[p.doctorName] = {
          total: 0,
          count: 0,
          lastPaid: null,
        };
      }
      byDoctor[p.doctorName].total += p.amount;
      byDoctor[p.doctorName].count++;
      if (
        !byDoctor[p.doctorName].lastPaid ||
        p.paidAt > byDoctor[p.doctorName].lastPaid
      ) {
        byDoctor[p.doctorName].lastPaid = p.paidAt;
      }
    });

    res.json({
      success: true,
      count: payments.length,
      totalCollected,
      payments: payments.map((p) => ({
        id: p._id,
        doctorName: p.doctorName,
        amount: p.amount,
        transactionId: p.transactionId,
        paidAt: p.paidAt,
      })),
      byDoctor: Object.entries(byDoctor).map(([name, data]) => ({
        doctorName: name,
        ...data,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching payment history:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET PAYMENT SUMMARY
router.get("/payment-summary", async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true });

    const summary = await Promise.all(
      doctors.map(async (doctor) => {
        const appointments = await Appointment.find({
          $or: [
            { "doctor.name": doctor.name },
            { "doctor.email": doctor.email },
            { "doctor.doctorId": doctor.doctorId },
          ],
          status: { $in: ["confirmed", "completed"] },
          paymentStatus: "verified",
        });

        const totalEarned = appointments.reduce(
          (sum, apt) => sum + apt.amount,
          0,
        );
        const totalCommission = appointments.reduce(
          (sum, apt) => sum + apt.amount * 0.01,
          0,
        );

        const payments = await PaymentHistory.find({
          doctorId: doctor.doctorId,
        });
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const pending = totalCommission - totalPaid;

        return {
          doctorId: doctor.doctorId,
          doctorName: doctor.name,
          specialization: doctor.specialization,
          totalEarned,
          totalCommission,
          totalPaid,
          pending,
          lateFees: doctor.lateFees || 0,
          paymentStatus: doctor.paymentStatus,
          lastPaid:
            payments.length > 0 ? payments[payments.length - 1].paidAt : null,
          paymentCount: payments.length,
          restricted: doctor.paymentStatus === "restricted",
        };
      }),
    );

    const totals = {
      totalEarned: summary.reduce((sum, d) => sum + d.totalEarned, 0),
      totalCommission: summary.reduce((sum, d) => sum + d.totalCommission, 0),
      totalPaid: summary.reduce((sum, d) => sum + d.totalPaid, 0),
      totalPending: summary.reduce((sum, d) => sum + d.pending, 0),
      totalLateFees: summary.reduce((sum, d) => sum + (d.lateFees || 0), 0),
      restrictedCount: summary.filter((d) => d.restricted).length,
    };

    res.json({
      success: true,
      summary,
      totals,
    });
  } catch (error) {
    console.error("❌ Error fetching payment summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET ALL APPOINTMENTS WITH FILTERS
router.get("/appointments", async (req, res) => {
  try {
    const { doctor, status, startDate, endDate, verificationStatus } =
      req.query;
    let query = {};

    if (doctor) query["doctor.name"] = { $regex: doctor, $options: "i" };
    if (status) query.status = status;
    if (verificationStatus === "pending") {
      query.status = "pending_verification";
      query.paymentStatus = "pending";
    } else if (verificationStatus === "verified") {
      query.paymentStatus = "verified";
    }
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) query.appointmentDate.$gte = startDate;
      if (endDate) query.appointmentDate.$lte = endDate;
    }

    const appointments = await Appointment.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    const appointmentsWithCommission = appointments.map((apt) => {
      const aptObj = apt.toObject();
      return {
        ...aptObj,
        commission: (apt.amount * 0.01).toFixed(2),
        doctorGets: (apt.amount * 0.99).toFixed(2),
        verificationStatus:
          apt.paymentStatus === "verified" ? "✅ Verified" : "⏳ Pending",
        verifiedBy: apt.verifiedBy || "-",
        verifiedAt: apt.verifiedAt
          ? new Date(apt.verifiedAt).toLocaleString()
          : "-",
      };
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments: appointmentsWithCommission,
    });
  } catch (error) {
    console.error("❌ Error fetching appointments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ UPDATE APPOINTMENT STATUS
router.patch("/appointments/:id", async (req, res) => {
  try {
    const { status, verifiedBy, transactionId } = req.body;

    let updateData = { status };

    if (status === "confirmed") {
      updateData.paymentStatus = "verified";
      updateData.verifiedBy = verifiedBy || "admin";
      updateData.verifiedByRole = "admin";
      updateData.verifiedAt = new Date();
      updateData.confirmedAt = new Date();
      if (transactionId) updateData.transactionId = transactionId;
    }

    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    if (status === "cancelled") {
      updateData.cancelledAt = new Date();
    }

    const appointment = await Appointment.findOneAndUpdate(
      { appointmentId: req.params.id },
      updateData,
      { new: true },
    );

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (status === "completed") {
      const doctor = await Doctor.findOne({
        email: appointment.doctor.email,
        isActive: true,
      });
      if (doctor) {
        doctor.totalAppointments = (doctor.totalAppointments || 0) + 1;
        doctor.totalEarnings = (doctor.totalEarnings || 0) + appointment.amount;

        if (!doctor.paymentStats) {
          doctor.paymentStats = {
            totalPaymentsViaPlatform: 0,
            totalCommissionEarned: 0,
            totalCommissionPaid: 0,
            pendingCommission: 0,
          };
        }

        const commissionAmount =
          (appointment.amount * (doctor.commissionPercentage || 1)) / 100;

        doctor.paymentStats.totalPaymentsViaPlatform =
          (doctor.paymentStats.totalPaymentsViaPlatform || 0) + 1;
        doctor.paymentStats.totalCommissionEarned =
          (doctor.paymentStats.totalCommissionEarned || 0) + commissionAmount;
        doctor.paymentStats.pendingCommission =
          (doctor.paymentStats.pendingCommission || 0) + commissionAmount;

        await doctor.save();
      }
    }

    res.json({
      success: true,
      message: `Appointment ${status}`,
      appointment,
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET ALL PENDING VERIFICATIONS
router.get("/verifications/pending", async (req, res) => {
  try {
    const pendingAppointments = await Appointment.find({
      status: "pending_verification",
      paymentStatus: "pending",
    }).sort({ createdAt: -1 });

    const groupedByDoctor = {};

    pendingAppointments.forEach((apt) => {
      const doctorName = apt.doctor?.name || "Unknown Doctor";
      if (!groupedByDoctor[doctorName]) {
        groupedByDoctor[doctorName] = [];
      }
      groupedByDoctor[doctorName].push(apt);
    });

    res.json({
      success: true,
      count: pendingAppointments.length,
      groupedByDoctor,
      appointments: pendingAppointments,
    });
  } catch (error) {
    console.error("❌ Error fetching pending verifications:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET VERIFICATION STATS
router.get("/verifications/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Appointment.aggregate([
      {
        $facet: {
          pending: [
            {
              $match: {
                status: "pending_verification",
                paymentStatus: "pending",
              },
            },
            { $count: "count" },
          ],
          verified: [
            { $match: { paymentStatus: "verified" } },
            { $count: "count" },
          ],
          verifiedToday: [
            { $match: { verifiedAt: { $gte: today } } },
            { $count: "count" },
          ],
          byDoctor: [
            { $match: { status: "pending_verification" } },
            { $group: { _id: "$doctor.name", count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        pending: stats[0].pending[0]?.count || 0,
        verified: stats[0].verified[0]?.count || 0,
        verifiedToday: stats[0].verifiedToday[0]?.count || 0,
        byDoctor: stats[0].byDoctor,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching verification stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Send payment received email
router.post("/send-payment-message", async (req, res) => {
  try {
    const {
      patientEmail,
      patientName,
      doctorName,
      appointmentDate,
      appointmentTime,
      amount,
    } = req.body;

    console.log(`📧 Attempting to send payment message to: ${patientEmail}`);

    const formattedDate = new Date(appointmentDate).toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

    const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; }
                    .content { padding: 30px; }
                    .payment-card { background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                    .steps { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; }
                    .step { margin-bottom: 12px; }
                    .step-number { width: 28px; height: 28px; background: #2563eb; color: white; border-radius: 50%; display: inline-block; text-align: center; line-height: 28px; margin-right: 12px; }
                    .footer { text-align: center; padding: 20px; background: #f1f5f9; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏳ Payment Received</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${patientName}!</h2>
                        <p>Your payment has been received and is being verified.</p>
                        <div class="payment-card">
                            <h3>💰 Payment Details</h3>
                            <p><strong>Doctor: </strong> ${doctorName}</p>
                            <p><strong>Date: </strong> ${formattedDate}</p>
                            <p><strong>Time: </strong> ${appointmentTime}</p>
                            <p><strong>Amount: </strong> ₹${amount}</p>
                        </div>
                        <div class="steps">
                            <h3>📋 Next Steps</h3>
                            <div class="step"><span class="step-number">1</span> Save the payment screenshot</div>
                            <div class="step"><span class="step-number">2</span> Show it at the clinic reception</div>
                            <div class="step"><span class="step-number">3</span> Staff will verify and confirm your appointment</div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Need help? Contact: doctoronlinhelp@gmail.com</p>
                    </div>
                </div>
            </body>
            </html>
        `;

    const result = await sendEmail(
      patientEmail,
      "⏳ Payment Received - Awaiting Verification",
      html,
      { from: "DrAppointment <doctoronlinhelp@gmail.com>" },
    );

    if (result.success) {
      console.log(
        `✅ Payment message sent to ${patientEmail} via ${result.provider}`,
      );
      res.json({ success: true, message: "Payment message sent" });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("❌ Error sending payment message:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET DOCTOR STATISTICS
router.get("/doctors/stats", async (req, res) => {
  try {
    const doctorStats = await Appointment.aggregate([
      {
        $group: {
          _id: "$doctor.name",
          appointments: { $sum: 1 },
          revenue: { $sum: "$amount" },
          specialization: { $first: "$doctor.specialization" },
          pendingVerifications: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending_verification"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { appointments: -1 } },
    ]);

    const doctors = await Doctor.find(
      { isActive: true },
      {
        name: 1,
        email: 1,
        specialization: 1,
        fee: 1,
        upiId: 1,
        qrCodeUrl: 1,
        paymentMethod: 1,
        commissionPercentage: 1,
        totalAppointments: 1,
        totalEarnings: 1,
        paymentStatus: 1,
        lateFees: 1,
        "paymentStats.pendingCommission": 1,
        "paymentStats.lastCommissionPaid": 1,
        imageUrl: 1,
      },
    ).sort({ createdAt: -1 });

    const doctorsWithTotal = doctors.map((doc) => {
      const docObj = doc.toObject();
      docObj.totalDue =
        (doc.paymentStats?.pendingCommission || 0) + (doc.lateFees || 0);
      return docObj;
    });

    res.json({
      success: true,
      doctors: doctorsWithTotal,
      appointmentStats: doctorStats,
    });
  } catch (error) {
    console.error("❌ Error fetching doctor stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET ALL DOCTORS WITH PAGINATION (excluding soft-deleted)
router.get("/doctors", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Exclude soft-deleted doctors
    const doctors = await Doctor.find({ deletedAt: null })
      .select("+password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments({ deletedAt: null });

    console.log(
      `📋 Found ${doctors.length} doctors (page ${page} of ${Math.ceil(total / limit)})`,
    );

    const doctorsWithTotal = doctors.map((doc) => {
      const docObj = doc.toObject();
      docObj.totalDue =
        (doc.paymentStats?.pendingCommission || 0) + (doc.lateFees || 0);
      return docObj;
    });

    res.json({
      success: true,
      count: doctors.length,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
      doctors: doctorsWithTotal,
    });
  } catch (error) {
    console.error("❌ Error fetching doctors:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET ALL DOCTORS (excluding soft-deleted)
router.get("/doctors/all", async (req, res) => {
  try {
    const doctors = await Doctor.find({ 
      deletedAt: null  // ← Only show doctors that are NOT soft-deleted
    })
      .select("+password")
      .sort({ createdAt: -1 });

    const doctorsWithTotal = doctors.map((doc) => {
      const docObj = doc.toObject();
      docObj.totalDue =
        (doc.paymentStats?.pendingCommission || 0) + (doc.lateFees || 0);
      return docObj;
    });

    res.json({
      success: true,
      count: doctors.length,
      doctors: doctorsWithTotal,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ ADD A NEW DOCTOR
router.post("/doctors", async (req, res) => {
  try {
    const {
      name,
      email,
      specialization,
      qualification,
      experience,
      fee,
      phone,
      upiId,
      imageUrl,
      paymentMethod = "both",
      commissionPercentage = 1,
    } = req.body;

    console.log("👨‍⚕️ Adding new doctor:", email);

    const existingDoctor = await Doctor.findOne({ email, isActive: true });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "A doctor with this email already exists",
      });
    }

    const randomPassword = generateRandomPassword();
    const doctorId =
      "DOC" + Math.random().toString(36).substr(2, 6).toUpperCase();

    let qrCodeUrl = "";
    if (upiId) {
      const amount = parseInt(fee) || 500;
      const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
    }

    const newDoctor = await Doctor.create({
      doctorId,
      name,
      email,
      password: randomPassword,
      specialization,
      qualification,
      experience,
      fee: parseInt(fee),
      phone,
      upiId,
      qrCodeUrl,
      imageUrl,
      paymentMethod,
      commissionPercentage,
      clinicName:
        req.body.clinicName ||
        (() => {
          const firstName = name.split(" ")[0];
          // Remove "Dr." if present
          const cleanName = firstName.replace(/^Dr\.?\s*/i, "");
          return cleanName ? `${cleanName}'s Clinic` : "Healthcare Center";
        })(),
      address: req.body.address || "",  
      image: getDoctorImage(specialization),
      availability: "Mon-Sat, 9AM-5PM",
      rating: "4.5 ★",
      totalAppointments: 0,
      totalEarnings: 0,
      paymentStats: {
        totalPaymentsViaPlatform: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        pendingCommission: 0,
      },
      isActive: true,
      paymentStatus: "current",
      lateFees: 0,
      totalOverdueDays: 0,
      lastReminderSent: "none",
    });

    console.log("✅ Doctor added successfully:", doctorId);

    await sendDoctorWelcomeEmail(email, name, randomPassword);

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor: {
        doctorId: newDoctor.doctorId,
        name: newDoctor.name,
        email: newDoctor.email,
        specialization: newDoctor.specialization,
        fee: newDoctor.fee,
        upiId: newDoctor.upiId,
        qrCodeUrl: newDoctor.qrCodeUrl,
        paymentMethod: newDoctor.paymentMethod,
        imageUrl: newDoctor.imageUrl,
        password: randomPassword,
        paymentStatus: newDoctor.paymentStatus,
      },
    });
  } catch (error) {
    console.error("❌ Error adding doctor:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ UPDATE DOCTOR DETAILS
router.patch("/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let doctor = await Doctor.findOne({ doctorId: id, isActive: true });

    if (!doctor) {
      if (id && id.length === 24) {
        doctor = await Doctor.findById(id);
      }
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found with ID: " + id,
      });
    }

    if (updates.name !== undefined) doctor.name = updates.name;
    if (updates.email !== undefined) doctor.email = updates.email;
    if (updates.phone !== undefined) doctor.phone = updates.phone;
    if (updates.specialization !== undefined)
      doctor.specialization = updates.specialization;
    if (updates.qualification !== undefined)
      doctor.qualification = updates.qualification;
    if (updates.experience !== undefined)
      doctor.experience = updates.experience;
    if (updates.fee !== undefined) doctor.fee = parseInt(updates.fee);
    if (updates.commissionPercentage !== undefined)
      doctor.commissionPercentage = updates.commissionPercentage;
    if (updates.clinicName !== undefined)doctor.clinicName = updates.clinicName;
    if (updates.address !== undefined) doctor.address = updates.address;

    if (updates.upiId !== undefined || updates.fee !== undefined) {
      const newUpiId =
        updates.upiId !== undefined ? updates.upiId : doctor.upiId;
      const newFee =
        updates.fee !== undefined ? parseInt(updates.fee) : doctor.fee;

      if (newUpiId) {
        const upiString = `upi://pay?pa=${newUpiId}&pn=${encodeURIComponent(doctor.name)}&am=${newFee}&cu=INR`;
        doctor.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
      }

      if (updates.upiId !== undefined) {
        doctor.upiId = updates.upiId;
      }
    }

    if (updates.imageUrl !== undefined) {
      doctor.imageUrl = updates.imageUrl;
    }

    await doctor.save();

    const doctorResponse = doctor.toObject();
    delete doctorResponse.password;

    res.json({
      success: true,
      message: "Doctor updated successfully",
      doctor: doctorResponse,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ SOFT DELETE DOCTOR
router.delete("/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("=".repeat(60));
    console.log("🗑️ SOFT DELETING DOCTOR");
    console.log("Doctor ID:", id);
    console.log("=".repeat(60));

    let doctor = await Doctor.findOne({ doctorId: id });

    if (!doctor) {
      doctor = await Doctor.findById(id);
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    console.log(`✅ Found doctor: ${doctor.name} (${doctor.email})`);

    const appointments = await Appointment.find({
      $or: [
        { "doctor.name": doctor.name },
        { "doctor.email": doctor.email },
        { "doctor.doctorId": doctor.doctorId },
      ],
    });

    if (appointments.length > 0) {
      await Appointment.updateMany(
        {
          $or: [
            { "doctor.name": doctor.name },
            { "doctor.email": doctor.email },
            { "doctor.doctorId": doctor.doctorId },
          ],
        },
        {
          $set: {
            "doctor.status": "deleted",
            "doctor.deletedAt": new Date(),
            "doctor.originalName": doctor.name,
            "doctor.originalEmail": doctor.email,
          },
        },
      );

      console.log(
        `✅ Marked ${appointments.length} appointments as from deleted doctor`,
      );
    }

    const originalEmail = doctor.email;
    const originalName = doctor.name;

    doctor.isActive = false;
    doctor.deletedAt = new Date();
    doctor.originalEmail = originalEmail;
    doctor.email = `deleted_${Date.now()}_${originalEmail}`;
    doctor.name = `${originalName} (Deleted)`;

    await doctor.save();
    console.log(`✅ Doctor soft deleted from database`);

    res.json({
      success: true,
      message: `✅ Doctor ${originalName} deactivated successfully`,
      details: {
        doctorName: originalName,
        doctorEmail: originalEmail,
        affectedAppointments: appointments.length,
        status: "deactivated (soft delete)",
      },
    });
  } catch (error) {
    console.error("❌ Error soft deleting doctor:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ SEND WELCOME EMAIL TO DOCTOR
router.post("/send-doctor-email", async (req, res) => {
  try {
    const { email, name, password } = req.body;

    console.log(`📧 Sending welcome email to: ${email}`);

    const result = await sendDoctorWelcomeEmail(email, name, password);

    if (result.success) {
      res.json({
        success: true,
        message: "Email sent successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Email route error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET COMMISSION REPORT
router.get("/commission/report", async (req, res) => {
  try {
    const { month, year } = req.query;

    const activeDoctors = await Doctor.find({ isActive: true });
    const activeDoctorEmails = activeDoctors.map((d) => d.email);

    let query = {
      $or: [
        { status: "confirmed" },
        { status: "completed" },
        { paymentStatus: "verified" },
      ],
      "doctor.email": { $in: activeDoctorEmails },
    };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      query.appointmentDate = {
        $gte: startDateStr,
        $lte: endDateStr,
      };
    }

    const appointments = await Appointment.find(query);

    const commissionByDoctor = {};
    let totalCommission = 0;
    let totalRevenue = 0;

    appointments.forEach((apt) => {
      const doctorName = apt.doctor.name;
      const commission = apt.amount * 0.01;

      if (!commissionByDoctor[doctorName]) {
        commissionByDoctor[doctorName] = {
          doctorName,
          specialization: apt.doctor.specialization,
          appointments: 0,
          totalRevenue: 0,
          commission: 0,
          upiId: apt.doctor.upiId || "Not set",
          status: apt.status,
          paymentStatus: apt.paymentStatus,
        };
      }

      commissionByDoctor[doctorName].appointments += 1;
      commissionByDoctor[doctorName].totalRevenue += apt.amount;
      commissionByDoctor[doctorName].commission += commission;

      totalRevenue += apt.amount;
      totalCommission += commission;
    });

    res.json({
      success: true,
      report: {
        period: month && year ? `${month}/${year}` : "All time",
        totalRevenue,
        totalCommission,
        doctors: Object.values(commissionByDoctor),
        appointmentCount: appointments.length,
        activeDoctorsCount: activeDoctors.length,
      },
    });
  } catch (error) {
    console.error("❌ Error generating commission report:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ CLEANUP: Find orphaned appointments
router.get("/cleanup/find-orphaned", async (req, res) => {
  try {
    console.log("🔍 Finding orphaned appointments...");

    const activeDoctors = await Doctor.find({ isActive: true });
    const activeDoctorNames = activeDoctors.map((d) => d.name);
    const activeDoctorEmails = activeDoctors.map((d) => d.email);

    const allAppointments = await Appointment.find({});

    let orphanedAppointments = [];
    let orphanedCount = 0;
    let totalOrphanedRevenue = 0;

    for (const apt of allAppointments) {
      const doctorName = apt.doctor?.name;
      const doctorEmail = apt.doctor?.email;

      if (!doctorName && !doctorEmail) continue;

      const doctorExists =
        activeDoctorNames.includes(doctorName) ||
        activeDoctorEmails.includes(doctorEmail);

      if (!doctorExists) {
        orphanedAppointments.push({
          id: apt.appointmentId,
          doctor: doctorName,
          email: doctorEmail,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          amount: apt.amount,
          status: apt.status,
          patient: apt.patient?.name,
        });
        orphanedCount++;
        totalOrphanedRevenue += apt.amount;
      }
    }

    console.log(
      `🔍 Found ${orphanedCount} orphaned appointments (₹${totalOrphanedRevenue})`,
    );

    res.json({
      success: true,
      orphanedCount,
      totalOrphanedRevenue,
      orphanedAppointments,
      activeDoctors: activeDoctorNames,
    });
  } catch (error) {
    console.error("❌ Error finding orphaned appointments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function getDoctorImage(specialization) {
  const images = {
    Cardiologist: "👨‍⚕️",
    Dermatologist: "👩‍⚕️",
    Pediatrician: "👨‍⚕️",
    Orthopedist: "👩‍⚕️",
    Neurologist: "👨‍⚕️",
    Gynecologist: "👩‍⚕️",
  };
  return images[specialization] || "👨‍⚕️";
}

// ✅ DEBUG ROUTE
router.get("/debug/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find({}).select(
      "appointmentId doctor.name status paymentStatus amount verifiedAt",
    );

    console.log("📋 ALL APPOINTMENTS:");
    appointments.forEach((apt) => {
      console.log({
        id: apt.appointmentId,
        doctor: apt.doctor?.name,
        status: apt.status,
        paymentStatus: apt.paymentStatus,
        amount: apt.amount,
        verified: apt.verifiedAt ? "✅" : "❌",
      });
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments: appointments.map((apt) => ({
        id: apt.appointmentId,
        doctor: apt.doctor?.name,
        status: apt.status,
        paymentStatus: apt.paymentStatus,
        amount: apt.amount,
        verified: !!apt.verifiedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = {
  router,
  sendDoctorWelcomeEmail,
};

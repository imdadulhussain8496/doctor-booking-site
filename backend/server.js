// Disable console.log in production
if (process.env.NODE_ENV === "production") {
  console.log = function () {};
}

require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// ✅ ADD CRON JOB FOR COMMISSION REMINDERS
const cron = require("node-cron");

// ✅ IMPORT MONGODB CONNECTION AND MODELS
const connectDB = require("./config/database");
const Appointment = require("./models/Appointment");
const Patient = require("./models/Patient");
const Doctor = require("./models/Doctor");

// ✅ IMPORT ROUTES
const adminRoutes = require("./routes/adminRoutes").router;
const doctorRoutes = require("./routes/doctorRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");

// ✅ IMPORT ENHANCED EMAIL SERVICE
const emailService = require("./utils/emailService");

// ✅ HELPER FUNCTION - PUT IT HERE
function convertTo12Hour(time24) {
  if (!time24) return "";
  let [hours, minutes] = time24.split(":");
  hours = parseInt(hours);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// ✅ CONNECT TO MONGODB
connectDB().catch(async (error) => {
  console.error("❌ Database connection failed:", error);

  // 🔔 SEND CRITICAL ALERT
  await emailService.sendAdminAlert({
    type: "critical",
    title: "⚠️ Database Connection Lost",
    message: error.message,
    link: "http://localhost:3000/admin/status",
  });
});

// ✅ CORS - Allow credentials for cookies
const allowedOrigins = process.env.CORS_ORIGIN
  ? [process.env.CORS_ORIGIN, "http://localhost:3000"]
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

// ✅ PUBLIC ROUTES (No authentication required)
const publicDoctorsRouter = require("./routes/publicDoctors");
app.use("/api/doctors", publicDoctorsRouter);
console.log("✅ Public doctors route registered");

// ✅ Rate limiter - Prevents brute force attacks on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Body parsing middleware with increased limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Cookie parser middleware (IMPORTANT for HttpOnly cookies)
app.use(cookieParser());

// ✅ Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Apply rate limiting to login endpoints (Prevent brute force attacks)
app.use("/api/admin/login", loginLimiter);
app.use("/api/doctor/login", loginLimiter);

// ✅ REGISTER ADMIN ROUTES
console.log("📝 Registering admin routes...");
app.use("/api/admin", adminRoutes);
console.log("✅ Admin routes registered");

// ✅ REGISTER DOCTOR ROUTES
console.log("📝 Registering doctor routes...");
app.use("/api/doctor", doctorRoutes);
console.log("✅ Doctor routes registered");

// ✅ REGISTER UPLOAD ROUTES
console.log("📝 Registering upload routes...");
app.use("/api/upload", uploadRoutes);
console.log("✅ Upload routes registered");

// ✅ REGISTER PAYMENT ROUTES
console.log("📝 Registering payment routes...");
app.use("/api/payment", paymentRoutes);
app.use("/api/availability", availabilityRoutes);
console.log("✅ Payment routes registered");

// ✅ REGISTER STATEMENT ROUTES
console.log("📝 Registering statement routes...");
app.use("/api/statements", require("./routes/statementRoutes"));
console.log("✅ Statement routes registered");

// ✅ IMPORT CRON JOBS
require("./cron/monthlyStatements");

// ✅ Verify Email Configuration on startup
emailService.verifyEmailConfig().then((result) => {
  if (result && result.success) {
    console.log("✅ Email service ready");
    console.log(
      `📧 Active provider: ${result.activeProvider || process.env.EMAIL_PROVIDER || "sendgrid"}`,
    );
    if (result.sendgrid?.configured) console.log("   📧 SendGrid: Configured");
    if (result.gmail?.configured) console.log("   📧 Gmail SMTP: Configured");
  } else {
    const errorMsg = result?.error || "Unknown configuration issue";
    console.warn("⚠️ Email service issues:", errorMsg);
  }
});

// ✅ Test route
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

// ===========================================
// ⏰ CRON JOBS - AUTOMATED TASKS
// ===========================================

// ✅ Commission Reminder Cron Job - Runs on 1st and 15th at 9 AM
cron.schedule("0 9 1,15 * *", async () => {
  console.log("\n" + "=".repeat(60));
  console.log("⏰ CRON JOB: Monthly commission check (1st & 15th)");
  console.log("=".repeat(60));

  try {
    const doctors = await Doctor.find({});
    let remindersSent = 0;
    let totalSystemCommission = 0;

    for (const doctor of doctors) {
      const confirmedAppointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctor.doctorId },
        ],
        status: { $in: ["confirmed", "completed"] },
      });

      const totalCommission = confirmedAppointments.reduce(
        (sum, apt) => sum + apt.amount * 0.01,
        0,
      );

      totalSystemCommission += totalCommission;

      if (totalCommission > 500) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentAppointments = confirmedAppointments.filter(
          (apt) => apt.verifiedAt && new Date(apt.verifiedAt) > thirtyDaysAgo,
        );

        const pendingPayments = recentAppointments.slice(0, 10).map((apt) => ({
          patientName: apt.patient.name,
          date: apt.appointmentDate,
          amount: apt.amount,
        }));

        await emailService.sendCommissionReminder({
          doctorEmail: doctor.email,
          doctorName: doctor.name,
          pendingPayments,
          totalDue: totalCommission,
          doctorId: doctor.doctorId,
        });

        console.log(
          `✅ Reminder sent to ${doctor.name} (${doctor.email}) for ₹${totalCommission}`,
        );
        remindersSent++;
      } else if (totalCommission > 0) {
        console.log(
          `ℹ️ ${doctor.name} has ₹${totalCommission} due (below ₹500 threshold)`,
        );
      }
    }

    console.log(
      `✅ Commission reminder check completed. Sent ${remindersSent} reminders.`,
    );

    if (totalSystemCommission > 10000) {
      await emailService.sendAdminAlert({
        type: "info",
        title: "💰 High Commission Due",
        message: `Total pending commission: ₹${totalSystemCommission} from ${doctors.length} doctors`,
        link: "http://localhost:3000/admin/commission",
      });
      console.log(
        `🔔 Admin alert sent: High commission (₹${totalSystemCommission})`,
      );
    }
  } catch (error) {
    console.error("❌ Error in commission reminder cron:", error);

    await emailService.sendAdminAlert({
      type: "critical",
      title: "⚠️ Commission Cron Job Failed",
      message: error.message,
      link: "http://localhost:3000/admin/logs",
    });
  }
});

console.log(
  "⏰ Commission reminder cron job scheduled - will run on 1st & 15th at 9 AM",
);

// ✅ Weekly Report Cron Job - Every Monday at 10 AM
cron.schedule("0 10 * * 1", async () => {
  console.log("\n" + "=".repeat(60));
  console.log("📊 WEEKLY REPORT CRON: Generating weekly stats");
  console.log("=".repeat(60));

  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const appointments = await Appointment.find({
      createdAt: { $gte: lastWeek },
    });

    const totalRevenue = appointments.reduce((sum, apt) => sum + apt.amount, 0);
    const totalCommission = appointments.reduce(
      (sum, apt) => sum + apt.amount * 0.01,
      0,
    );

    const confirmedCount = appointments.filter(
      (a) => a.status === "confirmed",
    ).length;
    const completedCount = appointments.filter(
      (a) => a.status === "completed",
    ).length;
    const pendingCount = appointments.filter(
      (a) => a.status === "pending_verification",
    ).length;

    console.log(
      `📊 Weekly stats: ${appointments.length} appointments, ₹${totalRevenue} revenue`,
    );

    await emailService.sendAdminAlert({
      type: "info",
      title: "📊 Weekly Report",
      message:
        `${appointments.length} total appointments\n` +
        `✅ Confirmed: ${confirmedCount}\n` +
        `✓ Completed: ${completedCount}\n` +
        `⏳ Pending: ${pendingCount}\n` +
        `💰 Revenue: ₹${totalRevenue}\n` +
        `💳 Commission: ₹${totalCommission}`,
      link: "http://localhost:3000/admin/reports",
    });

    console.log(`✅ Weekly report sent to admin`);
  } catch (error) {
    console.error("❌ Weekly report error:", error);

    await emailService.sendAdminAlert({
      type: "critical",
      title: "⚠️ Weekly Report Failed",
      message: error.message,
      link: "http://localhost:3000/admin/logs",
    });
  }
});

console.log("📊 Weekly report cron scheduled - Every Monday at 10 AM");

// ===========================================
// 📧 ENHANCED EMAIL ROUTES
// ===========================================

// ✅ Send test email (single)
app.post("/api/email-test-direct", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("📧 Sending test email to:", email);

    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      res.json({
        success: true,
        message: "Test email sent! Check your inbox.",
        messageId: result.messageId,
        provider: result.provider,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Email error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Test all email templates at once
app.post("/api/email/test-all", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    console.log("🧪 Testing all email templates to:", email);

    const testData = {
      patientEmail: email,
      patientName: "Test Patient",
      patientPhone: "9876543210",
      doctorName: "Dr. Sharma",
      doctorEmail: email,
      doctorId: "DOC123",
      specialization: "Cardiologist",
      date: new Date().toISOString(),
      time: "10:00 AM",
      amount: "500",
      paymentId: "PAY_" + Date.now().toString().slice(-8),
      pendingPayments: [
        { patientName: "John Doe", date: "2024-03-15", amount: 500 },
        { patientName: "Jane Smith", date: "2024-03-16", amount: 500 },
      ],
      totalDue: 1000,
    };

    const results = {
      pending: await emailService.sendPaymentPending(testData),
      verified: await emailService.sendPaymentVerified(testData),
      commission: await emailService.sendCommissionReminder({
        doctorEmail: email,
        doctorName: "Dr. Sharma",
        doctorId: "DOC123",
        pendingPayments: testData.pendingPayments,
        totalDue: testData.totalDue,
      }),
      admin: await emailService.sendAdminAlert({
        type: "info",
        title: "Test Alert",
        message: "This is a test admin alert",
      }),
    };

    const successCount = Object.values(results).filter(
      (r) => r && r.success,
    ).length;

    res.json({
      success: true,
      message: `Sent ${successCount} of 4 test emails`,
      results,
    });
  } catch (error) {
    console.error("❌ Error sending test emails:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Send payment pending notification
app.post("/api/send-payment-message", async (req, res) => {
  try {
    const {
      patientEmail,
      patientName,
      doctorName,
      appointmentDate,
      appointmentTime,
      amount,
      paymentId,
    } = req.body;

    console.log("📧 Sending payment pending notification to:", patientEmail);

    const result = await emailService.sendPaymentPending({
      patientEmail,
      patientName,
      doctorName,
      date: appointmentDate,
      time: appointmentTime,
      amount,
      paymentId: paymentId || "PAY" + Date.now().toString().slice(-8),
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Payment pending notification sent",
        messageId: result.messageId,
        provider: result.provider,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error sending payment message:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Send payment verified notification
app.post("/api/send-payment-verified", async (req, res) => {
  try {
    const {
      patientEmail,
      patientName,
      doctorName,
      appointmentDate,
      appointmentTime,
      amount,
      paymentId,
    } = req.body;

    console.log("📧 Sending payment verified notification to:", patientEmail);

    const result = await emailService.sendPaymentVerified({
      patientEmail,
      patientName,
      doctorName,
      date: appointmentDate,
      time: appointmentTime,
      amount,
      paymentId,
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Payment verified notification sent",
        messageId: result.messageId,
        provider: result.provider,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error sending verification:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Send commission reminder to doctor
app.post("/api/email/commission-reminder/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    console.log("💰 Sending commission reminder to doctor:", doctorId);

    const doctor = await Doctor.findOne({ doctorId });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const appointments = await Appointment.find({
      $or: [
        { "doctor.name": doctor.name },
        { "doctor.email": doctor.email },
        { "doctor.doctorId": doctorId },
      ],
      status: { $in: ["confirmed", "completed"] },
    });

    const pendingPayments = appointments.slice(0, 10).map((apt) => ({
      patientName: apt.patient.name,
      date: apt.appointmentDate,
      amount: apt.amount,
    }));

    const totalDue = appointments.reduce(
      (sum, apt) => sum + apt.amount * 0.01,
      0,
    );

    if (pendingPayments.length === 0 || totalDue === 0) {
      return res.json({
        success: true,
        message: "No pending commissions for this doctor",
        pendingCount: 0,
      });
    }

    const result = await emailService.sendCommissionReminder({
      doctorEmail: doctor.email,
      doctorName: doctor.name,
      doctorId,
      pendingPayments,
      totalDue,
    });

    res.json({
      success: true,
      message: "Commission reminder sent",
      pendingCount: pendingPayments.length,
      totalDue,
      result,
    });
  } catch (error) {
    console.error("❌ Error sending commission reminder:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Send admin alert
app.post("/api/email/admin-alert", async (req, res) => {
  try {
    const { type, title, message, link } = req.body;

    console.log("🔔 Sending admin alert:", title);

    const result = await emailService.sendAdminAlert({
      type: type || "info",
      title: title || "System Notification",
      message,
      link,
    });

    res.json({
      success: true,
      message: "Admin alert sent",
      result,
    });
  } catch (error) {
    console.error("❌ Error sending admin alert:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Check email configuration status
app.get("/api/email/status", async (req, res) => {
  try {
    const verification = await emailService.verifyEmailConfig();

    res.json({
      success: verification.success,
      configured: verification.success,
      activeProvider: process.env.EMAIL_PROVIDER || "sendgrid",
      sendgrid: process.env.SENDGRID_API_KEY
        ? "✅ Configured"
        : "❌ Not configured",
      gmail: process.env.GMAIL_USER ? "✅ Configured" : "❌ Not configured",
      fromEmail: process.env.FROM_EMAIL || "appointments@doctoronline.com",
      details: verification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===========================================
// 📅 APPOINTMENT ROUTES (Updated with emails)
// ===========================================

// ✅ SAVE APPOINTMENT TO DATABASE WITH EMAIL
app.post("/api/appointments", async (req, res) => {
  try {
    const {
      doctor,
      patient,
      appointmentDate,
      appointmentTime,
      amount,
      paymentId,
      paymentMethod = "upi",
      status = "pending_verification",
    } = req.body;

    console.log("📦 Checking slot availability...");
    console.log("👨‍⚕️ Doctor:", doctor.name);
    console.log("📅 Date:", appointmentDate);
    console.log("⏰ Time:", appointmentTime);
    console.log("💳 Payment Method:", paymentMethod);
    console.log("📊 Status:", status);

    const existingAppointment = await Appointment.findOne({
      "doctor.name": doctor.name,
      appointmentDate: appointmentDate,
      appointmentTime: appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (existingAppointment) {
      console.log("❌ Slot already booked!");
      return res.status(409).json({
        success: false,
        message:
          "This time slot is already booked. Please select another time.",
        conflict: true,
      });
    }

    console.log("✅ Slot available, proceeding with booking...");

    const doctorDetails = await Doctor.findOne({ email: doctor.email });
    const commissionPercentage = doctorDetails?.commissionPercentage || 1;
    const commission = (amount * commissionPercentage) / 100;

    let existingPatient = await Patient.findOne({ email: patient.email });

    if (!existingPatient) {
      existingPatient = await Patient.create({
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        totalAppointments: 1,
        lastVisit: new Date(),
      });
    } else {
      existingPatient.totalAppointments += 1;
      existingPatient.lastVisit = new Date();
      await existingPatient.save();
    }

    console.log("📝 Creating appointment with status: pending_verification");

    const appointment = await Appointment.create({
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        fee: doctor.fee,
        email: doctor.email,
      },
      patient: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        symptoms: patient.symptoms || "",
      },
      appointmentDate,
      appointmentTime,
      amount,
      paymentId: paymentId || `UPI_${Date.now()}`,
      paymentMethod,
      status: "pending_verification",
      paymentStatus: "pending",
      emailSent: true,
      emailType: "awaiting_verification",
    });

    console.log("✅ Appointment saved! ID:", appointment.appointmentId);
    console.log("📊 Appointment status:", appointment.status);
    console.log(`💰 Commission (${commissionPercentage}%): ₹${commission}`);

    const emailResult = await emailService.sendPaymentPending({
      patientEmail: patient.email,
      patientName: patient.name,
      doctorName: doctor.name,
      date: appointmentDate,
      time: appointmentTime,
      amount,
      paymentId: appointment.paymentId,
    });

    res.status(201).json({
      success: true,
      message: "Appointment saved successfully",
      appointmentId: appointment.appointmentId,
      appointment,
      email: emailResult,
      payment: {
        method: paymentMethod,
        commission: commission,
        doctorGets: amount - commission,
      },
    });
  } catch (error) {
    console.error("❌ Error saving appointment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save appointment",
      error: error.message,
    });
  }
});

// ✅ Update appointment status and send appropriate email
app.patch("/api/appointments/:appointmentId/status", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const oldStatus = appointment.status;
    appointment.status = status;

    if (status === "confirmed") {
      appointment.paymentStatus = "verified";
      appointment.verifiedAt = new Date();
    }

    await appointment.save();

    let emailResult = null;

    if (status === "confirmed" && oldStatus !== "confirmed") {
      emailResult = await emailService.sendPaymentVerified({
        patientEmail: appointment.patient.email,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        amount: appointment.amount,
        paymentId: appointment.paymentId,
      });
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment,
      email: emailResult,
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET ALL APPOINTMENTS
app.get("/api/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    console.log(`📊 Found ${appointments.length} appointments`);

    const totalCommission = appointments.reduce((sum, apt) => {
      return sum + apt.amount * 0.01;
    }, 0);

    res.json({
      success: true,
      count: appointments.length,
      totalCommission,
      appointments,
    });
  } catch (error) {
    console.error("❌ Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET APPOINTMENTS BY EMAIL
app.get("/api/appointments/:email", async (req, res) => {
  try {
    const appointments = await Appointment.find({
      "patient.email": req.params.email,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET AVAILABLE TIME SLOTS - WITH LUNCH BREAK SUPPORT
app.get("/api/available-slots", async (req, res) => {
  try {
    const { doctorName, date } = req.query;

    console.log("🔍 Checking available slots for:", doctorName, "on", date);

    // Get booked appointments
    const bookedAppointments = await Appointment.find({
      "doctor.name": doctorName,
      appointmentDate: date,
      status: { $ne: "cancelled" },
    });

    const bookedTimes = bookedAppointments.map((apt) => apt.appointmentTime);

    // Get doctor's availability with lunch breaks
    const doctor = await Doctor.findOne({ name: doctorName });
    let lunchBreak = null;

    if (doctor) {
      const Availability = require("./models/Availability");
      const availability = await Availability.findOne({
        doctorId: doctor.doctorId,
      });

      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = new Date(date).getDay();

      if (availability && availability.weeklySchedule) {
        const daySchedule = availability.weeklySchedule.find(
          (s) => s.day === dayOfWeek,
        );
        // Get lunch break and convert to 12-hour format
        if (daySchedule && daySchedule.breaks && daySchedule.breaks[0]) {
          lunchBreak = {
            start: convertTo12Hour(daySchedule.breaks[0].start),
            end: convertTo12Hour(daySchedule.breaks[0].end),
          };
          console.log(
            "🍽️ Lunch break found:",
            lunchBreak.start,
            "-",
            lunchBreak.end,
          );
        }
      }
    }

    const allSlots = [
      "9:00 AM",
      "9:15 AM",
      "9:30 AM",
      "9:45 AM",
      "10:00 AM",
      "10:15 AM",
      "10:30 AM",
      "10:45 AM",
      "11:00 AM",
      "11:15 AM",
      "11:30 AM",
      "11:45 AM",
      "12:00 PM",
      "12:15 PM",
      "12:30 PM",
      "12:45 PM",
      "2:00 PM",
      "2:15 PM",
      "2:30 PM",
      "2:45 PM",
      "3:00 PM",
      "3:15 PM",
      "3:30 PM",
      "3:45 PM",
      "4:00 PM",
      "4:15 PM",
      "4:30 PM",
      "4:45 PM",
      "5:00 PM",
      "5:15 PM",
    ];

    // Filter out booked slots
    let availableSlots = allSlots.filter((slot) => !bookedTimes.includes(slot));

    // Filter out lunch break slots (both in same 12-hour format)
    if (lunchBreak) {
      availableSlots = availableSlots.filter((slot) => {
        return slot < lunchBreak.start || slot > lunchBreak.end;
      });
      console.log(
        `🍽️ Removed lunch break slots (${lunchBreak.start} - ${lunchBreak.end})`,
      );
    }

    console.log("✅ Available slots:", availableSlots.length);

    res.json({
      success: true,
      bookedSlots: bookedTimes,
      availableSlots,
      totalSlots: allSlots.length,
      lunchBreak: lunchBreak,
      doctor: doctorName,
      date: date,
    });
  } catch (error) {
    console.error("❌ Error checking slots:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET COMMISSION SUMMARY
app.get("/api/commission/summary", async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    let query = {};
    if (doctorId) {
      const doctor = await Doctor.findOne({ doctorId });
      if (doctor) {
        query["doctor.email"] = doctor.email;
      }
    }

    const appointments = await Appointment.find(query);

    const totalRevenue = appointments.reduce((sum, apt) => sum + apt.amount, 0);
    const totalCommission = appointments.reduce(
      (sum, apt) => sum + apt.amount * 0.01,
      0,
    );

    res.json({
      success: true,
      summary: {
        totalAppointments: appointments.length,
        totalRevenue,
        totalCommission,
      },
      appointments: appointments.map((apt) => ({
        appointmentId: apt.appointmentId,
        date: apt.appointmentDate,
        doctor: apt.doctor.name,
        patient: apt.patient.name,
        amount: apt.amount,
        commission: apt.amount * 0.01,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching commission summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ 404 handler (MUST BE LAST!)
app.use((req, res) => {
  console.log("❌ 404 - Route not found:", req.method, req.url);
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.url,
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log(`✅ SERVER RUNNING ON PORT ${PORT}`);
  console.log("=".repeat(60));
  console.log("👨‍💼 ADMIN ROUTES:");
  console.log("   POST   /api/admin/login");
  console.log("   GET    /api/admin/stats");
  console.log("   GET    /api/admin/appointments");
  console.log("   PATCH  /api/admin/appointments/:id");
  console.log("   GET    /api/admin/doctors/stats");
  console.log("   GET    /api/admin/doctors");
  console.log("   POST   /api/admin/doctors");
  console.log("   PATCH  /api/admin/doctors/:doctorId");
  console.log("   DELETE /api/admin/doctors/:doctorId");
  console.log("=".repeat(60));
  console.log("👨‍⚕️ DOCTOR ROUTES:");
  console.log("   POST   /api/doctor/login");
  console.log("   GET    /api/doctor/me");
  console.log("   POST   /api/doctor/logout");
  console.log("   GET    /api/doctor/dashboard/:doctorId");
  console.log("   GET    /api/doctor/appointments/:doctorId");
  console.log("   GET    /api/doctor/patients/:doctorId");
  console.log("   PATCH  /api/doctor/appointments/:appointmentId");
  console.log("   GET    /api/doctor/earnings/:doctorId");
  console.log("   PATCH  /api/doctor/:doctorId/upi");
  console.log("   GET    /api/doctor/:doctorId/commission");
  console.log("=".repeat(60));
  console.log("📁 UPLOAD ROUTES:");
  console.log("   📸 Doctor Images:");
  console.log("      POST   /api/upload/doctor-image");
  console.log("      GET    /api/upload/doctor-image/:filename");
  console.log("   📄 Medical Records:");
  console.log("      POST   /api/upload/upload");
  console.log("      GET    /api/upload/patient/:email");
  console.log("      GET    /api/upload/doctor/:doctorId");
  console.log("      GET    /api/upload/record/:recordId");
  console.log("      DELETE /api/upload/record/:recordId");
  console.log("      PATCH  /api/upload/record/:recordId");
  console.log("      POST   /api/upload/record/:recordId/share");
  console.log("=".repeat(60));
  console.log("💳 PAYMENT ROUTES:");
  console.log("   GET    /api/payment/doctor/:doctorId/upi");
  console.log("   POST   /api/payment/verify");
  console.log("   POST   /api/payment/confirm");
  console.log("=".repeat(60));
  console.log("💰 COMMISSION ROUTES:");
  console.log("   GET    /api/commission/summary");
  console.log("=".repeat(60));
  console.log("📧 ENHANCED EMAIL ROUTES:");
  console.log("   POST   /api/email-test-direct");
  console.log("   POST   /api/email/test-all");
  console.log("   POST   /api/send-payment-message");
  console.log("   POST   /api/send-payment-verified");
  console.log("   POST   /api/email/commission-reminder/:doctorId");
  console.log("   POST   /api/email/admin-alert");
  console.log("   GET    /api/email/status");
  console.log("=".repeat(60));
  console.log("📊 STATEMENT ROUTES:");
  console.log("   GET    /api/statements/monthly-summary/:month/:year");
  console.log("   GET    /api/statements/generate/:doctorId/:month/:year");
  console.log("=".repeat(60));
  console.log("⏰ CRON JOBS:");
  console.log("   ⏰ Commission Reminder - 1st & 15th at 9 AM");
  console.log("   📊 Weekly Report - Every Monday at 10 AM");
  console.log("   📅 Monthly Statements - 1st of every month at 8 AM");
  console.log("=".repeat(60));
  console.log("🔗 OTHER ROUTES:");
  console.log("   GET    /ping");
  console.log("   POST   /api/appointments");
  console.log("   GET    /api/appointments");
  console.log("   GET    /api/appointments/:email");
  console.log("   GET    /api/available-slots");
  console.log("   PATCH  /api/appointments/:appointmentId/status");
  console.log("=".repeat(60));
  console.log(
    "📧 EMAIL PROVIDER:",
    process.env.EMAIL_PROVIDER || "sendgrid (default)",
  );
  console.log(
    "📧 GMAIL SMTP:",
    process.env.GMAIL_USER ? "✅ Configured" : "❌ Not configured",
  );
  console.log(
    "📧 SENDGRID:",
    process.env.SENDGRID_API_KEY ? "✅ Configured" : "❌ Not configured",
  );
  console.log(
    "📧 FROM EMAIL:",
    process.env.FROM_EMAIL || "appointments@doctoronline.com",
  );
  console.log("📁 Static files served from: /uploads");
  console.log("=".repeat(60) + "\n");
});

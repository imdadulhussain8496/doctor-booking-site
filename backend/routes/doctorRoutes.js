const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const PaymentHistory = require("../models/PaymentHistory");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer"); // 🆕 ADD THIS
const path = require("path"); // 🆕 ADD THIS
const fs = require("fs"); // 🆕 ADD THIS

const paymentGuard = require("../middleware/paymentGuard");
const emailService = require("../utils/emailService");

const DOCTORS = {
  "sharma@doctor.com": { password: "doctor123", id: "DOC001" },
  "patel@doctor.com": { password: "doctor123", id: "DOC002" },
  "kumar@doctor.com": { password: "doctor123", id: "DOC003" },
  "gupta@doctor.com": { password: "doctor123", id: "DOC004" },
};

// ============================================
// 🆕 LOGO UPLOAD CONFIGURATION (CLOUDINARY)
// ============================================

const cloudinary = require("../config/cloudinary");

// 🆕 ROUTE 1: Upload doctor logo to Cloudinary
router.post("/upload-logo/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const multer = require("multer");
    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    upload.single("logo")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      try {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `doctor-logos/${doctorId}`,
              transformation: [{ width: 200, height: 200, crop: "limit" }],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          uploadStream.end(req.file.buffer);
        });

        doctor.logoUrl = result.secure_url;
        await doctor.save();

        console.log(`✅ Logo uploaded to Cloudinary for ${doctor.name}`);

        res.json({
          success: true,
          logoUrl: result.secure_url,
          message: "Logo uploaded successfully",
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary error:", cloudinaryError);
        res
          .status(500)
          .json({ success: false, message: "Cloudinary upload failed" });
      }
    });
  } catch (error) {
    console.error("❌ Error uploading logo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🆕 ROUTE 2: Get doctor logo
router.get("/logo/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({ doctorId }).select(
      "logoUrl clinicName name",
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      logoUrl: doctor.logoUrl || null,
      clinicName:
        doctor.clinicName ||
        `Dr. ${doctor.name?.split(" ")[0] || "Doctor"}'s Clinic`,
    });
  } catch (error) {
    console.error("❌ Error fetching logo:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// 🆕 ROUTE 3: Update clinic name
router.patch("/update-clinic/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { clinicName } = req.body;

    if (!clinicName || clinicName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Clinic name is required",
      });
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    doctor.clinicName = clinicName;
    await doctor.save();

    console.log(`✅ Clinic name updated for ${doctor.name}: ${clinicName}`);

    res.json({
      success: true,
      clinicName: doctor.clinicName,
      message: "Clinic name updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating clinic name:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 🆕 DOCTOR ACTIVE/INACTIVE STATUS ROUTES
// ============================================

// UPDATE doctor active status (Active/Inactive)
router.patch("/toggle-status/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isActive } = req.body;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    doctor.isActive = isActive;
    await doctor.save();

    console.log(
      `✅ Doctor ${doctor.name} status: ${isActive ? "Active" : "Inactive"}`,
    );

    res.json({
      success: true,
      message: `Status updated to ${isActive ? "Active" : "Inactive"}`,
      isActive: doctor.isActive,
      statusText: doctor.isActive ? "Active" : "Inactive",
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET doctor status
router.get("/status/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({ doctorId }).select("isActive name");
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      isActive: doctor.isActive,
      doctorName: doctor.name,
      statusText: doctor.isActive ? "Active" : "Inactive",
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// EXISTING ROUTES START HERE (DO NOT MODIFY)
// ============================================

// ✅ GET DOCTOR PAYMENT STATUS
router.get("/status/:doctorId", paymentGuard.allowAlways, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const status = await paymentGuard.getStatus(doctorId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("❌ Error fetching payment status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET CURRENT LOGGED IN DOCTOR (ADD THIS NEW ROUTE)
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findOne({ doctorId: decoded.doctorId });

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    res.json({
      success: true,
      doctor: {
        id: doctor.doctorId || doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        fee: doctor.fee,
        image: doctor.image,
        imageUrl: doctor.imageUrl,
        availability: doctor.availability,
        upiId: doctor.upiId,
        qrCodeUrl: doctor.qrCodeUrl,
        paymentMethod: doctor.paymentMethod,
        commissionPercentage: doctor.commissionPercentage,
        paymentStatus: doctor.paymentStatus,
        lateFees: doctor.lateFees || 0,
        isActive: doctor.isActive, // ✅ ADD THIS LINE
      },
    });
  } catch (error) {
    console.error("❌ Error getting current doctor:", error);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

// ✅ LOGOUT ROUTE (ADD THIS)
router.post("/logout", async (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// ✅ DOCTOR LOGIN (UPDATED WITH JWT + COOKIE)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Doctor login attempt:", email);

    let doctor = await Doctor.findOne({ email });

    if (doctor) {
      console.log("✅ Doctor found in database");

      if (doctor.paymentStatus === "restricted") {
        const totalDue =
          (doctor.paymentStats?.pendingCommission || 0) +
          (doctor.lateFees || 0);

        return res.status(403).json({
          success: false,
          code: "ACCOUNT_RESTRICTED",
          message: "⛔ Account restricted due to unpaid commission",
          data: {
            doctorId: doctor.doctorId,
            doctorName: doctor.name,
            restrictedSince: doctor.restrictedAt,
            amountDue: doctor.paymentStats?.pendingCommission || 0,
            lateFees: doctor.lateFees || 0,
            totalDue: totalDue,
          },
        });
      }

      let isPasswordValid = false;

      if (doctor.password && doctor.password.length > 30) {
        isPasswordValid = await bcrypt.compare(password, doctor.password);
      } else {
        isPasswordValid = password === doctor.password;
      }

      if (isPasswordValid) {
        console.log("✅ Password correct!");

        // ✅ GENERATE JWT TOKEN
        const token = jwt.sign(
          { doctorId: doctor.doctorId, email: doctor.email },
          process.env.JWT_SECRET,
          { expiresIn: "7d" },
        );

        // ✅ SET HTTPONLY COOKIE
        res.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        const response = {
          success: true,
          message: "Login successful",
          doctor: {
            id: doctor.doctorId || doctor._id,
            name: doctor.name,
            email: doctor.email,
            specialization: doctor.specialization,
            fee: doctor.fee,
            image: doctor.image,
            imageUrl: doctor.imageUrl,
            availability: doctor.availability,
            upiId: doctor.upiId,
            qrCodeUrl: doctor.qrCodeUrl,
            paymentMethod: doctor.paymentMethod,
            commissionPercentage: doctor.commissionPercentage,
            paymentStatus: doctor.paymentStatus,
            lateFees: doctor.lateFees || 0,
            totalDue:
              (doctor.paymentStats?.pendingCommission || 0) +
              (doctor.lateFees || 0),
          },
        };

        if (
          doctor.paymentStatus === "overdue" ||
          doctor.paymentStatus === "late"
        ) {
          res.setHeader("X-Payment-Warning", "Payment overdue");
          res.setHeader(
            "X-Payment-Amount",
            (doctor.paymentStats?.pendingCommission || 0) +
              (doctor.lateFees || 0),
          );
        }

        return res.json(response);
      } else {
        console.log("❌ Incorrect password");
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }
    }

    console.log("❌ Doctor not in database, checking hardcoded list...");

    if (DOCTORS[email] && DOCTORS[email].password === password) {
      console.log("✅ Found in hardcoded list");

      const doctorData = getDoctorDataByEmail(email);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      doctor = await Doctor.findOne({ email });
      if (!doctor) {
        doctor = await Doctor.create({
          ...doctorData,
          password: hashedPassword,
          doctorId: DOCTORS[email].id,
          paymentStats: {
            totalPaymentsViaPlatform: 0,
            totalCommissionEarned: 0,
            totalCommissionPaid: 0,
            pendingCommission: 0,
          },
        });
        console.log("✅ Created new doctor in database with hashed password");
      }

      // ✅ GENERATE JWT TOKEN FOR HARDCODED DOCTOR
      const token = jwt.sign(
        { doctorId: doctor.doctorId, email: doctor.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      // ✅ SET HTTPONLY COOKIE
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: "Login successful",
        doctor: {
          id: doctor.doctorId || doctor._id,
          name: doctor.name,
          email: doctor.email,
          specialization: doctor.specialization,
          fee: doctor.fee,
          image: doctor.image,
          imageUrl: doctor.imageUrl,
          availability: doctor.availability,
          upiId: doctor.upiId,
          qrCodeUrl: doctor.qrCodeUrl,
          paymentMethod: doctor.paymentMethod,
          commissionPercentage: doctor.commissionPercentage,
        },
      });
    }

    console.log("❌ Invalid credentials");
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  } catch (error) {
    console.error("❌ Doctor login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Get doctor by ID
router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const doctorData = doctor.toObject();
    delete doctorData.password;

    res.json({
      success: true,
      doctor: doctorData,
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

function getDoctorDataByEmail(email) {
  const doctors = {
    "sharma@doctor.com": {
      name: "Dr. Rajesh Sharma",
      specialization: "Cardiologist",
      qualification: "MD, DM Cardiology",
      experience: "10 years",
      fee: 500,
      availability: "Mon-Fri, 9AM-5PM",
      image: "👨‍⚕️",
      phone: "+91 98765 43210",
      upiId: "sharma@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=sharma@okhdfcbank&pn=Doctor&cu=INR",
    },
    "patel@doctor.com": {
      name: "Dr. Priya Patel",
      specialization: "Dermatologist",
      qualification: "MD Dermatology",
      experience: "8 years",
      fee: 400,
      availability: "Tue-Sat, 10AM-6PM",
      image: "👩‍⚕️",
      phone: "+91 98765 43211",
      upiId: "patel@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=patel@okhdfcbank&pn=Doctor&cu=INR",
    },
    "kumar@doctor.com": {
      name: "Dr. Amit Kumar",
      specialization: "Pediatrician",
      qualification: "MD Pediatrics",
      experience: "12 years",
      fee: 300,
      availability: "Mon-Sat, 8AM-4PM",
      image: "👨‍⚕️",
      phone: "+91 98765 43212",
      upiId: "kumar@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=kumar@okhdfcbank&pn=Doctor&cu=INR",
    },
    "gupta@doctor.com": {
      name: "Dr. Sunita Gupta",
      specialization: "Orthopedist",
      qualification: "MS Orthopedics",
      experience: "15 years",
      fee: 600,
      availability: "Wed-Sun, 11AM-7PM",
      image: "👩‍⚕️",
      phone: "+91 98765 43213",
      upiId: "gupta@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=gupta@okhdfcbank&pn=Doctor&cu=INR",
    },
  };

  return {
    email,
    ...doctors[email],
  };
}

// ✅ GET DOCTOR DASHBOARD STATS
router.get(
  "/dashboard/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      console.log(`📊 Fetching dashboard for doctor ID: ${doctorId}`);

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        console.log(`❌ Doctor not found with ID: ${doctorId}`);
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      console.log(`✅ Found doctor: ${doctor.name} (${doctor.email})`);

      let appointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.name": doctor.name.replace("Dr. ", "") },
          { "doctor.name": `${doctor.name.replace("Dr. ", "")}` },
          { "doctor.email": doctor.email },
        ],
      }).sort({ createdAt: -1 });

      console.log(
        `📊 Found ${appointments.length} total appointments for ${doctor.name}`,
      );

      const pendingVerification = appointments.filter(
        (a) => a.status === "pending_verification",
      ).length;

      const confirmedAppointments = appointments.filter(
        (a) => a.status === "confirmed",
      ).length;

      const completedAppointments = appointments.filter(
        (a) => a.status === "completed",
      ).length;

      const cancelledAppointments = appointments.filter(
        (a) => a.status === "cancelled",
      ).length;

      const totalEarnings = appointments
        .filter((a) => a.status !== "cancelled")
        .reduce((sum, a) => sum + a.amount, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = appointments.filter((a) => {
        const aptDate = new Date(a.appointmentDate);
        return (
          aptDate >= today && aptDate < tomorrow && a.status === "confirmed"
        );
      });

      const upcomingAppointments = appointments
        .filter((a) => {
          const aptDate = new Date(a.appointmentDate);
          return aptDate >= tomorrow && a.status === "confirmed";
        })
        .sort(
          (a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate),
        )
        .slice(0, 5);

      console.log(
        `📊 Pending: ${pendingVerification}, Today: ${todayAppointments.length}, Upcoming: ${upcomingAppointments.length}`,
      );

      const totalDue =
        (doctor.paymentStats?.pendingCommission || 0) + (doctor.lateFees || 0);

      res.json({
        success: true,
        stats: {
          totalAppointments: appointments.length,
          pendingVerification,
          confirmedAppointments,
          completedAppointments,
          cancelledAppointments,
          totalEarnings,
          todayAppointments: todayAppointments.length,
          upcomingCount: upcomingAppointments.length,
        },
        upcomingAppointments: upcomingAppointments.map((apt) => ({
          ...apt.toObject(),
          formattedDate: new Date(apt.appointmentDate).toLocaleDateString(
            "en-IN",
            {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          ),
        })),
        doctor: {
          name: doctor.name,
          specialization: doctor.specialization,
          fee: doctor.fee,
          rating: doctor.rating,
          image: doctor.image,
          availability: doctor.availability,
          email: doctor.email,
          upiId: doctor.upiId,
          qrCodeUrl: doctor.qrCodeUrl,
          paymentMethod: doctor.paymentMethod,
          commissionPercentage: doctor.commissionPercentage,
          paymentStatus: doctor.paymentStatus,
          lateFees: doctor.lateFees || 0,
          totalDue,
          restrictedAt: doctor.restrictedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error in doctor dashboard:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to load dashboard",
      });
    }
  },
);

// ✅ GET PENDING VERIFICATIONS
router.get(
  "/pending-verification/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const pendingAppointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        status: "pending_verification",
        paymentStatus: "pending",
      }).sort({ createdAt: -1 });

      console.log(
        `📋 Found ${pendingAppointments.length} pending verifications for ${doctor.name}`,
      );

      res.json({
        success: true,
        count: pendingAppointments.length,
        appointments: pendingAppointments,
      });
    } catch (error) {
      console.error("❌ Error fetching pending verifications:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// ✅ VERIFY APPOINTMENT
router.post("/verify/:appointmentId", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { verifiedBy, role = "doctor", doctorId } = req.body;

    console.log("=".repeat(60));
    console.log("✅ VERIFY APPOINTMENT REQUEST");
    console.log("Appointment ID:", appointmentId);
    console.log("Doctor ID:", doctorId);
    console.log("Verified By:", verifiedBy);
    console.log("=".repeat(60));

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const doctorIdToUse = doctorId || appointment.doctor?.doctorId;

    const canVerify = await paymentGuard.canVerify(doctorIdToUse);
    if (!canVerify) {
      return res.status(403).json({
        success: false,
        code: "VERIFICATION_BLOCKED",
        message:
          "⛔ Cannot verify appointments. Account restricted or payment overdue.",
        data: await paymentGuard.getStatus(doctorIdToUse),
      });
    }

    if (appointment.status !== "pending_verification") {
      return res.status(400).json({
        success: false,
        message: `This appointment is already ${appointment.status}`,
      });
    }

    const commissionAmount = appointment.amount * 0.01;
    const doctorGets = appointment.amount - commissionAmount;

    console.log(`💰 Commission calculated: ₹${commissionAmount} (1%)`);
    console.log(`👨‍⚕️ Doctor gets: ₹${doctorGets}`);

    appointment.status = "confirmed";
    appointment.paymentStatus = "verified";
    appointment.verifiedBy = verifiedBy;
    appointment.verifiedByRole = role;
    appointment.verifiedAt = new Date();
    appointment.confirmedAt = new Date();
    appointment.emailType = "confirmed";

    await appointment.save();

    console.log(
      `✅ Appointment ${appointmentId} verified successfully by ${verifiedBy}`,
    );

    const doctor = await Doctor.findOne({ doctorId: doctorIdToUse });

    if (doctor) {
      if (!doctor.paymentStats) {
        doctor.paymentStats = {
          totalPaymentsViaPlatform: 0,
          totalCommissionEarned: 0,
          totalCommissionPaid: 0,
          pendingCommission: 0,
        };
      }

      doctor.totalEarnings = (doctor.totalEarnings || 0) + doctorGets;
      doctor.totalAppointments = (doctor.totalAppointments || 0) + 1;
      doctor.paymentStats.totalCommissionEarned =
        (doctor.paymentStats.totalCommissionEarned || 0) + commissionAmount;
      doctor.paymentStats.pendingCommission =
        (doctor.paymentStats.pendingCommission || 0) + commissionAmount;
      doctor.paymentStats.totalPaymentsViaPlatform =
        (doctor.paymentStats.totalPaymentsViaPlatform || 0) + 1;

      await doctor.save();
      console.log(
        `✅ Doctor's stats updated: +₹${doctorGets} earnings, +₹${commissionAmount} commission due`,
      );
    }

    try {
      await emailService.sendPaymentVerified({
        patientEmail: appointment.patient.email,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        amount: appointment.amount,
        paymentId: appointment.paymentId,
      });
      console.log(`✅ Confirmation email sent to ${appointment.patient.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send confirmation email:", emailError);
    }

    res.json({
      success: true,
      message: "Appointment verified and confirmed successfully",
      commission: commissionAmount,
      doctorGets,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        verifiedAt: appointment.verifiedAt,
        amount: appointment.amount,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying appointment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET VERIFICATION STATS
router.get(
  "/verification-stats/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const stats = await Appointment.aggregate([
        {
          $match: {
            $or: [
              { "doctor.name": doctor.name },
              { "doctor.email": doctor.email },
              { "doctor.doctorId": doctorId },
            ],
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const pendingToday = await Appointment.countDocuments({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        status: "pending_verification",
        createdAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
        },
      });

      const verifiedToday = await Appointment.countDocuments({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        verifiedAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
        },
      });

      res.json({
        success: true,
        stats,
        pendingToday,
        verifiedToday,
      });
    } catch (error) {
      console.error("❌ Error fetching verification stats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// ✅ GET COMMISSION SUMMARY
router.get(
  "/:doctorId/commission-due",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const allConfirmedAppointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        status: { $in: ["confirmed", "completed"] },
      });

      const totalCommissionFromAllTime = allConfirmedAppointments.reduce(
        (sum, apt) => sum + apt.amount * 0.01,
        0,
      );

      const monthlyAppointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        verifiedAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $in: ["confirmed", "completed"] },
      });

      const monthlyCommission = monthlyAppointments.reduce(
        (sum, apt) => sum + apt.amount * 0.01,
        0,
      );

      const monthlyEarnings = monthlyAppointments.reduce(
        (sum, apt) => sum + apt.amount,
        0,
      );

      const totalDue =
        (doctor.paymentStats?.pendingCommission || 0) + (doctor.lateFees || 0);

      console.log("📊 Commission Due Calculation:", {
        doctorName: doctor.name,
        totalConfirmedAppointments: allConfirmedAppointments.length,
        totalCommissionFromAllTime,
        monthlyAppointments: monthlyAppointments.length,
        monthlyCommission,
        pendingCommission: doctor.paymentStats?.pendingCommission,
        lastPaid: doctor.paymentStats?.lastCommissionPaid,
        lateFees: doctor.lateFees || 0,
        totalDue,
      });

      res.json({
        success: true,
        doctorName: doctor.name,
        doctorId: doctor.doctorId,
        commissionDue: doctor.paymentStats?.pendingCommission || 0,
        monthlyCommission,
        lastPaid: doctor.paymentStats?.lastCommissionPaid,
        platformUpiId: process.env.DEFAULT_UPI_ID || "platform@okhdfcbank",
        appointmentsThisMonth: monthlyAppointments.length,
        totalEarnings: doctor.totalEarnings || 0,
        monthlyEarnings,
        totalConfirmedAppointments: allConfirmedAppointments.length,
        lateFees: doctor.lateFees || 0,
        totalDue: totalDue,
        paymentStatus: doctor.paymentStatus,
      });
    } catch (error) {
      console.error("❌ Error fetching commission due:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// ✅ PAY COMMISSION
router.post("/pay-commission", async (req, res) => {
  try {
    const { doctorId, amount, transactionId } = req.body;

    console.log("=".repeat(60));
    console.log("💰 COMMISSION PAYMENT REQUEST");
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
    const totalDue = pendingAmount + (doctor.lateFees || 0);

    if (amount !== totalDue) {
      return res.status(400).json({
        success: false,
        message: `Amount mismatch. Total due: ₹${totalDue}, Paid: ₹${amount}`,
      });
    }

    const paymentRecord = await PaymentHistory.create({
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      amount: amount,
      transactionId: transactionId,
      paidAt: new Date(),
      status: "completed",
    });

    doctor.paymentStats.totalCommissionPaid =
      (doctor.paymentStats.totalCommissionPaid || 0) + amount;
    doctor.paymentStats.pendingCommission = 0;
    doctor.paymentStats.lastCommissionPaid = new Date();
    doctor.paymentStats.lastPaymentTransaction = transactionId;
    doctor.paymentStatus = "current";
    doctor.lateFees = 0;
    doctor.totalOverdueDays = 0;
    doctor.lastReminderSent = "none";

    await doctor.save();

    console.log(
      `✅ Commission payment recorded for ${doctor.name}: ₹${amount}`,
    );
    console.log(`✅ Payment history saved: ${paymentRecord._id}`);

    try {
      await emailService.sendAdminAlert({
        type: "success",
        title: "💰 Commission Received",
        message: `${doctor.name} paid ₹${amount}\nTransaction: ${transactionId}`,
        link: "http://localhost:3000/admin/payment-history",
      });
      console.log(`✅ Admin notification sent`);
    } catch (emailError) {
      console.error("❌ Failed to send admin email:", emailError);
    }

    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #059669, #047857); padding: 30px; text-align: center; }
                .header h2 { color: white; margin: 0; }
                .content { padding: 30px; }
                .amount-card { background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border-left: 4px solid #059669; }
                .amount { font-size: 32px; font-weight: bold; color: #059669; }
                .footer { text-align: center; padding: 20px; background: #f1f5f9; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Payment Received</h2>
                </div>
                <div class="content">
                    <h2>Dear ${doctor.name},</h2>
                    <p>Thank you for your commission payment. Your account is now up to date.</p>
                    <div class="amount-card">
                        <p><strong>💰 Amount Paid:</strong></p>
                        <div class="amount">₹${amount}</div>
                        <p><strong>Transaction ID:</strong> ${transactionId}</p>
                    </div>
                    <p>Your commission balance is now ₹0. You can continue using all platform features.</p>
                </div>
                <div class="footer">
                    <p>Doctor Online Healthcare</p>
                </div>
            </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        doctor.email,
        "✅ Commission Payment Confirmation",
        emailHtml,
        { from: process.env.FROM_EMAIL || "imdadulhussain8496@gmail.com" },
      );
      console.log(`✅ Confirmation email sent to ${doctor.email}`);
    } catch (emailError) {
      console.error(
        "❌ Failed to send confirmation email to doctor:",
        emailError,
      );
    }

    res.json({
      success: true,
      message: "Commission payment recorded successfully",
      payment: {
        amount,
        transactionId,
        paidAt: new Date(),
        status: "completed",
      },
    });
  } catch (error) {
    console.error("❌ Error processing commission payment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET DOCTOR'S PAYMENT HISTORY
router.get(
  "/payment-history/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const payments = await PaymentHistory.find({ doctorId }).sort({
        paidAt: -1,
      });

      const appointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        status: { $in: ["confirmed", "completed"] },
        paymentStatus: "verified",
      });

      const totalCommission = appointments.reduce(
        (sum, apt) => sum + apt.amount * 0.01,
        0,
      );
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const nextDue = totalCommission - totalPaid;

      res.json({
        success: true,
        doctorName: doctor.name,
        summary: {
          totalCommission,
          totalPaid,
          nextDue,
          totalPayments: payments.length,
          totalAppointments: appointments.length,
          lateFees: doctor.lateFees || 0,
          paymentStatus: doctor.paymentStatus,
        },
        payments: payments.map((p) => ({
          id: p._id,
          amount: p.amount,
          transactionId: p.transactionId,
          paidAt: p.paidAt,
        })),
      });
    } catch (error) {
      console.error("❌ Error fetching payment history:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// ✅ GET DOCTOR'S APPOINTMENTS
router.get(
  "/appointments/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { status, startDate, endDate } = req.query;

      console.log(`📋 Fetching appointments for doctor ID: ${doctorId}`);

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        console.log(`❌ Doctor not found with ID: ${doctorId}`);
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      console.log(`✅ Found doctor: ${doctor.name} (${doctor.email})`);

      let query = {
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.name": doctor.name.replace("Dr. ", "") },
          { "doctor.name": ` ${doctor.name.replace("Dr. ", "")}` },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
      };

      if (status) query.status = status;
      if (startDate || endDate) {
        query.appointmentDate = {};
        if (startDate) query.appointmentDate.$gte = startDate;
        if (endDate) query.appointmentDate.$lte = endDate;
      }

      const appointments = await Appointment.find(query).sort({
        appointmentDate: -1,
        createdAt: -1,
      });

      console.log(
        `📊 Found ${appointments.length} appointments for ${doctor.name}`,
      );

      const enhancedAppointments = await Promise.all(
        appointments.map(async (apt) => {
          const patientHistory = await Appointment.find({
            "patient.email": apt.patient.email,
            status: { $ne: "cancelled" },
          }).sort({ appointmentDate: -1 });

          return {
            ...apt.toObject(),
            patientHistory: {
              totalVisits: patientHistory.length,
              previousVisits: patientHistory.slice(0, 3),
              firstVisit:
                patientHistory[patientHistory.length - 1]?.appointmentDate ||
                apt.appointmentDate,
              lastVisit:
                patientHistory[0]?.appointmentDate || apt.appointmentDate,
            },
            formattedDate: new Date(apt.appointmentDate).toLocaleDateString(
              "en-IN",
              {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              },
            ),
          };
        }),
      );

      res.json({
        success: true,
        count: appointments.length,
        appointments: enhancedAppointments,
        doctor: {
          name: doctor.name,
          specialization: doctor.specialization,
          email: doctor.email,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching doctor appointments:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to fetch appointments",
      });
    }
  },
);

// ✅ GET DOCTOR'S PATIENTS
router.get(
  "/patients/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }

      const appointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.name": doctor.name.replace("Dr. ", "") },
          { "doctor.name": ` ${doctor.name.replace("Dr. ", "")}` },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
      }).sort({ appointmentDate: -1 });

      const patientMap = new Map();

      appointments.forEach((apt) => {
        const email = apt.patient.email;
        if (!patientMap.has(email)) {
          patientMap.set(email, {
            name: apt.patient.name,
            email: apt.patient.email,
            phone: apt.patient.phone,
            totalVisits: 0,
            lastVisit: apt.appointmentDate,
            totalSpent: 0,
            appointments: [],
            verifiedAppointments: apt.status === "confirmed" ? 1 : 0,
          });
        }

        const patient = patientMap.get(email);
        patient.totalVisits++;
        patient.totalSpent += apt.amount;
        patient.appointments.push({
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          status: apt.status,
          amount: apt.amount,
          symptoms: apt.patient.symptoms,
          verifiedAt: apt.verifiedAt,
        });

        if (apt.appointmentDate > patient.lastVisit) {
          patient.lastVisit = apt.appointmentDate;
        }
      });

      const patients = Array.from(patientMap.values());

      res.json({
        success: true,
        count: patients.length,
        patients,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ✅ UPDATE APPOINTMENT STATUS
router.patch(
  "/appointments/:appointmentId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { status } = req.body;

      const appointment = await Appointment.findOneAndUpdate(
        { appointmentId },
        { status },
        { new: true },
      );

      if (!appointment) {
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      }

      console.log(
        `✅ Appointment ${appointmentId} status updated to ${status}`,
      );

      res.json({
        success: true,
        message: `Appointment ${status}`,
        appointment,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ✅ REJECT APPOINTMENT
router.patch("/reject/:id", paymentGuard.checkAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true },
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    console.log(`❌ Appointment ${id} rejected`);

    res.json({
      success: true,
      message: "Appointment rejected",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET EARNINGS REPORT
router.get(
  "/earnings/:doctorId",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { period } = req.query;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }

      const appointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.name": doctor.name.replace("Dr. ", "") },
          { "doctor.name": ` ${doctor.name.replace("Dr. ", "")}` },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctorId },
        ],
        status: { $ne: "cancelled" },
      });

      const earnings = {};
      let totalEarnings = 0;

      appointments.forEach((apt) => {
        const date = new Date(apt.appointmentDate);
        let key;

        if (period === "daily") {
          key = date.toISOString().split("T")[0];
        } else if (period === "weekly") {
          const week = getWeekNumber(date);
          key = `Week ${week}`;
        } else {
          key = date.toLocaleString("default", {
            month: "long",
            year: "numeric",
          });
        }

        if (!earnings[key]) {
          earnings[key] = 0;
        }
        earnings[key] += apt.amount;
        totalEarnings += apt.amount;
      });

      res.json({
        success: true,
        totalEarnings,
        earningsByPeriod: earnings,
        appointmentCount: appointments.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ✅ UPDATE DOCTOR'S UPI DETAILS
router.patch("/:doctorId/upi", paymentGuard.checkAccess, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { upiId, paymentMethod } = req.body;

    console.log("=".repeat(60));
    console.log("💳 UPI UPDATE REQUEST");
    console.log("Doctor ID:", doctorId);
    console.log("New UPI ID:", upiId);
    console.log("=".repeat(60));

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    console.log("✅ Found doctor:", doctor.name);
    console.log("Old UPI ID:", doctor.upiId);
    console.log("Current fee: ₹", doctor.fee);

    doctor.upiId = upiId || doctor.upiId;
    doctor.paymentMethod = paymentMethod || doctor.paymentMethod;

    if (upiId) {
      const amount = doctor.fee || 500;
      const doctorName = encodeURIComponent(doctor.name);
      const upiString = `upi://pay?pa=${upiId}&pn=${doctorName}&am=${amount}&cu=INR`;
      doctor.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;

      console.log(`✅ Generated QR code with amount: ₹${amount}`);
    } else {
      doctor.qrCodeUrl = "";
    }

    await doctor.save();
    console.log("✅ Doctor saved successfully with amount in QR");

    res.json({
      success: true,
      message: "UPI details updated successfully",
      doctor: {
        upiId: doctor.upiId,
        qrCodeUrl: doctor.qrCodeUrl,
        paymentMethod: doctor.paymentMethod,
        fee: doctor.fee,
      },
    });
  } catch (error) {
    console.error("❌ Error updating UPI:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ GET DOCTOR'S COMMISSION SUMMARY
router.get(
  "/:doctorId/commission",
  paymentGuard.checkAccess,
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findOne({ doctorId });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const appointments = await Appointment.find({
        $or: [{ "doctor.name": doctor.name }, { "doctor.email": doctor.email }],
        status: { $in: ["confirmed", "completed"] },
      });

      const commissionDetails = appointments.map((apt) => {
        const commission = (apt.amount * doctor.commissionPercentage) / 100;
        return {
          appointmentId: apt.appointmentId,
          date: apt.appointmentDate,
          patientName: apt.patient.name,
          amount: apt.amount,
          commission: commission,
          doctorGets: apt.amount - commission,
          verifiedAt: apt.verifiedAt,
        };
      });

      const totalEarnings = appointments.reduce(
        (sum, apt) => sum + apt.amount,
        0,
      );
      const totalCommission =
        (totalEarnings * doctor.commissionPercentage) / 100;

      res.json({
        success: true,
        doctorName: doctor.name,
        commissionPercentage: doctor.commissionPercentage,
        totalEarnings,
        totalCommission,
        totalDoctorGets: totalEarnings - totalCommission,
        appointmentsCount: appointments.length,
        commissionDetails,
        paymentStatus: doctor.paymentStatus,
        lateFees: doctor.lateFees || 0,
        due: doctor.paymentStats?.pendingCommission || 0,
        paid: doctor.paymentStats?.totalCommissionPaid || 0,
        total: doctor.paymentStats?.totalCommissionEarned || 0,
        platformUpiId: process.env.DEFAULT_UPI_ID || "platform@okhdfcbank",
      });
    } catch (error) {
      console.error("❌ Error fetching commission:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = router;

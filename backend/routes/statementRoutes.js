const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const PaymentHistory = require('../models/PaymentHistory');
const PDFGenerator = require('../services/pdfGenerator');
const path = require('path');
const fs = require('fs');

// Generate statement for specific doctor/month
router.get('/generate/:doctorId/:month/:year', async (req, res) => {
  try {
    const { doctorId, month, year } = req.params;

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Parse dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get appointments for the month
    const appointments = await Appointment.find({
      $or: [
        { "doctor.name": doctor.name },
        { "doctor.email": doctor.email },
        { "doctor.doctorId": doctorId }
      ],
      status: { $in: ["confirmed", "completed"] },
      paymentStatus: 'verified',
      verifiedAt: { $gte: startDate, $lte: endDate }
    });

    // Get payments for the month
    const payments = await PaymentHistory.find({ 
      doctorId,
      paidAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate totals
    const totalCommission = appointments.reduce((sum, apt) => sum + (apt.amount * 0.04), 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get previous balance
    const previousPayments = await PaymentHistory.find({ 
      doctorId,
      paidAt: { $lt: startDate }
    });
    const previousCommission = await Appointment.find({
      $or: [
        { "doctor.name": doctor.name },
        { "doctor.email": doctor.email },
        { "doctor.doctorId": doctorId }
      ],
      status: { $in: ["confirmed", "completed"] },
      paymentStatus: 'verified',
      verifiedAt: { $lt: startDate }
    });

    const previousTotalCommission = previousCommission.reduce((sum, apt) => sum + (apt.amount * 0.04), 0);
    const previousTotalPaid = previousPayments.reduce((sum, p) => sum + p.amount, 0);
    const openingBalance = previousTotalCommission - previousTotalPaid;

    // Prepare data for PDF
    const doctorData = {
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      specialization: doctor.specialization,
      summary: {
        openingBalance,
        newCommission: totalCommission,
        totalPaid,
        closingBalance: openingBalance + totalCommission - totalPaid
      },
      appointments: appointments.map(apt => ({
        date: apt.appointmentDate,
        patientName: apt.patient.name,
        amount: apt.amount,
        commission: apt.amount * 0.04,
        status: 'Verified'
      })),
      payments: payments.map(p => ({
        paidAt: p.paidAt,
        transactionId: p.transactionId,
        amount: p.amount
      }))
    };

    // Generate PDF
    const pdfPath = await PDFGenerator.generateMonthlyStatement(doctorData, parseInt(month), parseInt(year));
    
    // Send file
    res.download(pdfPath, `statement_${doctor.name}_${month}_${year}.pdf`, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Clean up file after download
      fs.unlinkSync(pdfPath);
    });

  } catch (error) {
    console.error('❌ Error generating statement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get monthly summary for admin
router.get('/monthly-summary/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const doctors = await Doctor.find({ isActive: true });
    
    const summary = await Promise.all(doctors.map(async (doctor) => {
      const appointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctor.doctorId }
        ],
        status: { $in: ["confirmed", "completed"] },
        paymentStatus: 'verified',
        verifiedAt: { $gte: startDate, $lte: endDate }
      });

      const payments = await PaymentHistory.find({ 
        doctorId: doctor.doctorId,
        paidAt: { $gte: startDate, $lte: endDate }
      });

      const totalCommission = appointments.reduce((sum, apt) => sum + (apt.amount * 0.04), 0);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        doctorId: doctor.doctorId,
        doctorName: doctor.name,
        totalCommission,
        totalPaid,
        pending: totalCommission - totalPaid,
        appointmentsCount: appointments.length,
        paymentsCount: payments.length
      };
    }));

    const totals = {
      totalCommission: summary.reduce((sum, d) => sum + d.totalCommission, 0),
      totalPaid: summary.reduce((sum, d) => sum + d.totalPaid, 0),
      totalPending: summary.reduce((sum, d) => sum + d.pending, 0),
      totalAppointments: summary.reduce((sum, d) => sum + d.appointmentsCount, 0)
    };

    res.json({
      success: true,
      month,
      year,
      summary,
      totals
    });

  } catch (error) {
    console.error('❌ Error fetching monthly summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

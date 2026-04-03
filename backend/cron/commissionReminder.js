// backend/cron/commissionReminder.js
const cron = require('node-cron');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const emailService = require('../utils/emailService');

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🔍 Checking commission due for all doctors...');
  
  try {
    // Get all doctors
    const doctors = await Doctor.find({});
    console.log(`📊 Found ${doctors.length} doctors`);
    
    for (const doctor of doctors) {
      // Calculate commission due for this doctor
      const confirmedAppointments = await Appointment.find({
        $or: [
          { "doctor.name": doctor.name },
          { "doctor.email": doctor.email },
          { "doctor.doctorId": doctor.doctorId }
        ],
        status: { $in: ["confirmed", "completed"] }
      });
      
      const totalCommission = confirmedAppointments.reduce(
        (sum, apt) => sum + (apt.amount * 0.04), 
        0
      );
      
      // If commission due > 100, send reminder (only for significant amounts)
      if (totalCommission > 100) {
        // Get pending payments for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentAppointments = confirmedAppointments.filter(
          apt => new Date(apt.verifiedAt) > thirtyDaysAgo
        );
        
        const pendingPayments = recentAppointments.slice(0, 10).map(apt => ({
          patientName: apt.patient.name,
          date: apt.appointmentDate,
          amount: apt.amount
        }));
        
        // Send email
        await emailService.sendCommissionReminder({
          doctorEmail: doctor.email,
          doctorName: doctor.name,
          pendingPayments,
          totalDue: totalCommission,
          doctorId: doctor.doctorId
        });
        
        console.log(`✅ Reminder sent to ${doctor.name} (${doctor.email}) for ₹${totalCommission}`);
      } else if (totalCommission > 0) {
        console.log(`ℹ️ ${doctor.name} has ₹${totalCommission} due (below ₹100 threshold)`);
      }
    }
    
    console.log('✅ Commission reminder check completed');
  } catch (error) {
    console.error('❌ Error in commission reminder cron:', error);
  }
});

console.log('⏰ Commission reminder cron job scheduled - will run daily at 9 AM');
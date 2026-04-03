const cron = require('node-cron');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const PaymentHistory = require('../models/PaymentHistory');
const PDFGenerator = require('../services/pdfGenerator');
const emailService = require('../utils/emailService');
const fs = require('fs');

// Run on 1st of every month at 8 AM
cron.schedule('0 8 1 * *', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('Ì≥Ñ GENERATING MONTHLY STATEMENTS');
  console.log('='.repeat(60));

  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const month = lastMonth.getMonth() + 1;
    const year = lastMonth.getFullYear();

    console.log(`Ì≥Ö Generating statements for ${month}/${year}`);

    const doctors = await Doctor.find({ isActive: true });
    console.log(`Ì≥ä Found ${doctors.length} active doctors`);

    let statementsGenerated = 0;

    for (const doctor of doctors) {
      try {
        // Get start and end of last month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Get appointments for last month
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

        // Get payment history
        const payments = await PaymentHistory.find({ 
          doctorId: doctor.doctorId,
          paidAt: { $gte: startDate, $lte: endDate }
        });

        // Calculate totals
        const totalCommission = appointments.reduce((sum, apt) => sum + (apt.amount * 0.04), 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        // Get previous balance (from before last month)
        const previousPayments = await PaymentHistory.find({ 
          doctorId: doctor.doctorId,
          paidAt: { $lt: startDate }
        });
        const previousCommission = await Appointment.find({
          $or: [
            { "doctor.name": doctor.name },
            { "doctor.email": doctor.email },
            { "doctor.doctorId": doctor.doctorId }
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
        const pdfPath = await PDFGenerator.generateMonthlyStatement(doctorData, month, year);
        
        // Send email with PDF attachment
        await emailService.sendMonthlyStatement(doctor.email, doctor.name, {
          pdfPath,
          month,
          year,
          doctorData
        });

        console.log(`‚úÖ Statement sent to ${doctor.name} (${doctor.email})`);
        statementsGenerated++;

        // Clean up PDF file after sending
        fs.unlinkSync(pdfPath);

      } catch (error) {
        console.error(`‚ùå Error generating statement for ${doctor.name}:`, error.message);
      }
    }

    // Send summary to admin
    await emailService.sendAdminAlert({
      type: 'info',
      title: 'Ì≥ä Monthly Statements Generated',
      message: `Generated ${statementsGenerated} statements for ${month}/${year}`,
      link: '/admin/reports'
    });

    console.log(`‚úÖ Monthly statements complete. Generated ${statementsGenerated} statements.`);

  } catch (error) {
    console.error('‚ùå Error in monthly statements cron:', error);
  }
});

console.log('Ì≥Ö Monthly statement cron scheduled - 1st of every month at 8 AM');


// backend/cron/paymentEnforcement.js
const cron = require('node-cron');
const Doctor = require('../models/Doctor');
const emailService = require('../utils/emailService');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('\n' + '💰'.repeat(30));
  console.log('💰 PAYMENT ENFORCEMENT SYSTEM RUNNING');
  console.log('💰'.repeat(30) + '\n');

  const today = new Date();
  const dayOfMonth = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  console.log(`📅 Date: ${dayOfMonth}/${month}/${year}`);
  console.log(`⏰ Time: ${today.toLocaleTimeString()}`);

  try {
    // Get all active doctors with pending commission
    const doctors = await Doctor.find({ 
      isActive: true,
      'paymentStats.totalCommissionPaid': { $gt: 0 }
    });

    console.log(`📊 Found ${doctors.length} doctors with pending commission`);

    let processed = 0;
    let restricted = 0;

    for (const doctor of doctors) {
      const amountDue = doctor.paymentStats.totalCommissionPaid;
      const daysOverdue = calculateOverdueDays(doctor.lastCommissionPaid);
      
      // Update overdue days
      doctor.totalOverdueDays = daysOverdue;
      doctor.lastPaymentReminderDate = today;
      
      console.log(`\n👨‍⚕️ Processing: ${doctor.name}`);
      console.log(`   Amount Due: ₹${amountDue}`);
      console.log(`   Days Overdue: ${daysOverdue}`);
      console.log(`   Current Status: ${doctor.paymentStatus}`);

      // Apply rules based on day of month
      const result = await applyPaymentRules(doctor, dayOfMonth, daysOverdue, amountDue);
      
      if (result.statusChanged) {
        console.log(`   ✅ Status changed to: ${doctor.paymentStatus}`);
      }
      if (result.emailSent) {
        console.log(`   📧 Email sent: ${result.emailType}`);
      }
      if (result.feeApplied) {
        console.log(`   💰 Late fee applied: ₹${result.feeAmount}`);
      }
      
      await doctor.save();
      processed++;

      if (doctor.paymentStatus === 'restricted') {
        restricted++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Payment enforcement complete`);
    console.log(`📊 Processed: ${processed} doctors`);
    console.log(`⛔ Restricted: ${restricted} doctors`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error in payment enforcement:', error);
  }
});

// Calculate days since payment due (from 10th of month)
function calculateOverdueDays(lastPaidDate) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Due date is 10th of current month
  const dueDate = new Date(currentYear, currentMonth, 10);
  
  // If paid after due date but already paid
  if (lastPaidDate && lastPaidDate > dueDate) {
    return 0;
  }
  
  // If today is after due date
  if (today > dueDate) {
    const diffTime = today - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  return 0;
}

// Apply payment rules based on day
async function applyPaymentRules(doctor, day, daysOverdue, amountDue) {
  const result = {
    statusChanged: false,
    emailSent: false,
    emailType: null,
    feeApplied: false,
    feeAmount: 0
  };

  const totalDue = amountDue + (doctor.lateFees || 0);

  // 1st - Send monthly statement
  if (day === 1 && doctor.lastReminderSent !== 'statement') {
    await sendMonthlyStatement(doctor, totalDue);
    doctor.lastReminderSent = 'statement';
    result.emailSent = true;
    result.emailType = 'statement';
  }
  
  // 5th - Gentle reminder (if still unpaid)
  if (day === 5 && amountDue > 0 && doctor.lastReminderSent !== 'gentle') {
    await sendGentleReminder(doctor, totalDue);
    doctor.lastReminderSent = 'gentle';
    doctor.paymentStatus = 'late';
    result.statusChanged = true;
    result.emailSent = true;
    result.emailType = 'gentle';
  }
  
  // 10th - Due date reminder
  if (day === 10 && amountDue > 0 && doctor.lastReminderSent !== 'due') {
    await sendDueReminder(doctor, totalDue);
    doctor.lastReminderSent = 'due';
    doctor.paymentStatus = 'late';
    result.statusChanged = true;
    result.emailSent = true;
    result.emailType = 'due';
  }
  
  // 11th - Apply 2% late fee
  if (day === 11 && amountDue > 0 && doctor.lastReminderSent !== 'late') {
    const feeAmount = amountDue * 0.02;
    doctor.lateFees = (doctor.lateFees || 0) + feeAmount;
    doctor.paymentStatus = 'overdue';
    await sendLateFeeNotice(doctor, totalDue + feeAmount, feeAmount);
    doctor.lastReminderSent = 'late';
    result.statusChanged = true;
    result.emailSent = true;
    result.emailType = 'late';
    result.feeApplied = true;
    result.feeAmount = feeAmount;
  }
  
  // 15th - Apply additional 3% (total 5%) and urgent warning
  if (day === 15 && amountDue > 0 && doctor.lastReminderSent !== 'urgent') {
    const additionalFee = amountDue * 0.03;
    doctor.lateFees = (doctor.lateFees || 0) + additionalFee;
    const newTotal = amountDue + doctor.lateFees;
    await sendUrgentWarning(doctor, newTotal, additionalFee);
    doctor.lastReminderSent = 'urgent';
    result.emailSent = true;
    result.emailType = 'urgent';
    result.feeApplied = true;
    result.feeAmount = additionalFee;
  }
  
  // 20th - Final warning
  if (day === 20 && amountDue > 0 && doctor.lastReminderSent !== 'final') {
    await sendFinalWarning(doctor, totalDue);
    doctor.lastReminderSent = 'final';
    result.emailSent = true;
    result.emailType = 'final';
  }
  
  // 25th - RESTRICT ACCOUNT
  if (day === 25 && amountDue > 0 && doctor.paymentStatus !== 'restricted') {
    doctor.paymentStatus = 'restricted';
    doctor.restrictedAt = new Date();
    doctor.restrictionReason = 'Unpaid commission for 15+ days';
    await sendRestrictionNotice(doctor, totalDue);
    result.statusChanged = true;
    result.emailSent = true;
    result.emailType = 'restriction';
  }

  return result;
}

// Email sending functions
async function sendMonthlyStatement(doctor, amountDue) {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL || 'appointments@doctoronline.com',
    subject: `📊 Monthly Commission Statement - ${month}/${year}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px;">
          <h1 style="color: white; margin: 0;">🏥 Doctor Online</h1>
        </div>
        
        <h2>Hello ${doctor.name},</h2>
        <p>Your commission statement for ${month}/${year} is ready.</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">💰 Commission Summary</h3>
          <p><strong>Amount Due:</strong> ₹${amountDue}</p>
          <p><strong>Due Date:</strong> 10th ${getMonthName(month)} ${year}</p>
          <p><strong>Payment Status:</strong> ${amountDue > 0 ? '⏳ Pending' : '✅ Paid'}</p>
        </div>
        
        <div style="text-align: center;">
          <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 20px;">
          This is an auto-generated statement. Please pay by 10th to avoid late fees.
        </p>
      </div>
    `
  };
  
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

async function sendGentleReminder(doctor, amountDue) {
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL,
    subject: '⏳ Gentle Reminder: Commission Payment Due',
    html: `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Hello ${doctor.name},</h2>
        <p>This is a gentle reminder that your commission payment is due in 5 days.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> ₹${amountDue}</p>
          <p><strong>Due Date:</strong> 10th of this month</p>
          <p><strong>Days Left:</strong> 5 days</p>
        </div>
        
        <p>Please log in to your dashboard to make the payment.</p>
        
        <div style="text-align: center;">
          <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Pay Now
          </a>
        </div>
      </div>
    `
  };
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

async function sendDueReminder(doctor, amountDue) {
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL,
    subject: '⚠️ Commission Payment Due TODAY',
    html: `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Urgent: ${doctor.name}</h2>
        <p>Your commission payment is due <strong>TODAY</strong>.</p>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> ₹${amountDue}</p>
          <p><strong>Due Date:</strong> TODAY</p>
          <p style="color: #dc2626;"><strong>⚠️ Late fees will apply from tomorrow (2%)</strong></p>
        </div>
        
        <div style="text-align: center;">
          <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" 
             style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Pay Immediately
          </a>
        </div>
      </div>
    `
  };
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

async function sendLateFeeNotice(doctor, totalDue, feeAmount) {
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL,
    subject: '💰 2% Late Fee Applied',
    html: `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Late Fee Applied</h2>
        <p>A 2% late fee has been applied to your overdue payment.</p>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Original Amount:</strong> ₹${totalDue - feeAmount}</p>
          <p><strong>Late Fee (2%):</strong> ₹${feeAmount}</p>
          <p><strong style="font-size: 18px;">Total Due Now: ₹${totalDue}</strong></p>
          <p><strong>Days Overdue:</strong> 1 day</p>
        </div>
        
        <div style="text-align: center;">
          <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" 
             style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Pay Now - ₹${totalDue}
          </a>
        </div>
      </div>
    `
  };
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

async function sendUrgentWarning(doctor, totalDue, additionalFee) {
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL,
    subject: '🔴 URGENT: Additional 3% Late Fee Applied',
    html: `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; border-left: 4px solid #dc2626;">
        <h2 style="color: #dc2626;">URGENT ACTION REQUIRED</h2>
        <p>Your payment is now 5 days overdue. An additional 3% fee has been applied.</p>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Original Commission:</strong> ₹${totalDue - additionalFee - (totalDue * 0.02)}</p>
          <p><strong>Total Late Fees:</strong> ₹${(totalDue * 0.02) + additionalFee}</p>
          <p><strong style="font-size: 20px;">Total Due: ₹${totalDue}</strong></p>
          <p><strong>Days Overdue:</strong> 5 days</p>
        </div>
        
        <p style="color: #dc2626;"><strong>⚠️ Account will be RESTRICTED on 25th if unpaid</strong></p>
        
        <div style="text-align: center;">
          <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" 
             style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 18px;">
            PAY NOW - ₹${totalDue}
          </a>
        </div>
      </div>
    `
  };
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

async function sendFinalWarning(doctor, totalDue) {
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL,
    subject: '🚨 FINAL WARNING - Account Suspension',
    html: `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px;">
        <h2 style="color: #dc2626; text-align: center;">FINAL NOTICE</h2>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> ₹${totalDue}</p>
          <p><strong>Days Overdue:</strong> 10 days</p>
        </div>
        
        <p style="color: #dc2626;"><strong>⛔ Your account will be SUSPENDED on 25th if payment not received.</strong></p>
        
        <p>You will lose access to:</p>
        <ul>
          <li>❌ Patient verification</li>
          <li>❌ Appointment management</li>
          <li>❌ Medical records</li>
          <li>❌ Dashboard access</li>
        </ul>
        
        <div style="text-align: center;">
          <a href="http://localhost:3000/doctor-dashboard/${doctor.doctorId}" 
             style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            PAY NOW TO AVOID SUSPENSION
          </a>
        </div>
      </div>
    `
  };
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

async function sendRestrictionNotice(doctor, totalDue) {
  const msg = {
    to: doctor.email,
    from: process.env.FROM_EMAIL,
    subject: '⛔ Account Restricted - Immediate Action Required',
    html: `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; background: #fee2e2; border: 2px solid #dc2626; border-radius: 10px;">
        <h2 style="color: #dc2626; text-align: center;">ACCOUNT RESTRICTED</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctor.name}</p>
          <p><strong>Amount Due:</strong> ₹${totalDue}</p>
          <p><strong>Days Overdue:</strong> 15+ days</p>
          <p><strong>Restricted Since:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p style="color: #dc2626;"><strong>❌ You CANNOT:</strong></p>
        <ul style="background: white; padding: 15px 30px; border-radius: 8px;">
          <li>Verify new appointments</li>
          <li>Access patient records</li>
          <li>View dashboard</li>
          <li>Login to your account</li>
        </ul>
        
        <p>To restore access, please contact admin immediately:</p>
        <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
          <p><strong>📧 admin@doctoronline.com</strong></p>
          <p><strong>📞 +91 6002777634</strong></p>
        </div>
        
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
          Access will be restored once payment is confirmed by admin.
        </p>
      </div>
    `
  };
  await emailService.sendEmail(doctor.email, msg.subject, msg.html);
}

// Helper function for month names
function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
}

console.log('💰 Payment enforcement cron scheduled - runs daily at 9 AM');
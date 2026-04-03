const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  // Generate monthly commission statement for a doctor
  static async generateMonthlyStatement(doctorData, month, year) {
    return new Promise((resolve, reject) => {
      try {
        // Detect if we're on mobile? Actually PDFKit doesn't know device
        // So we'll create a flexible layout that works everywhere
        
        // Create a new PDF document with standard size
        const doc = new PDFDocument({ 
          margin: 40,  // Smaller margins for mobile
          size: 'A4',
          layout: 'portrait'  // Portrait mode works best on mobile
        });
        
        // Create filename
        const fileName = `statement_${doctorData.doctorId}_${month}_${year}.pdf`;
        const filePath = path.join(__dirname, '../uploads/statements', fileName);
        
        // Ensure directory exists
        const dir = path.join(__dirname, '../uploads/statements');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Pipe the PDF to a file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add responsive content
        this.addHeader(doc, doctorData, month, year);
        this.addSummary(doc, doctorData);
        this.addCommissionDetails(doc, doctorData);
        this.addPaymentHistory(doc, doctorData);
        this.addFooter(doc);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  static addHeader(doc, doctorData, month, year) {
    // Clinic Name - Responsive size
    doc.fontSize(22)
       .font('Helvetica-Bold')
       .text('DOCTOR ONLINE', { align: 'center' })
       .moveDown(0.3);
    
    doc.fontSize(18)
       .text('Commission Statement', { align: 'center' })
       .moveDown(0.3);
    
    doc.fontSize(14)
       .text(`${this.getMonthName(month)} ${year}`, { align: 'center' })
       .moveDown(0.8);

    // Doctor Info - Compact for mobile
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Doctor:')
       .font('Helvetica')
       .fontSize(11)
       .text(doctorData.doctorName)
       .text(doctorData.doctorEmail)
       .moveDown(0.5);

    // Horizontal line
    doc.moveTo(40, doc.y)
       .lineTo(570, doc.y)
       .stroke();
  }

  static addSummary(doc, doctorData) {
    doc.moveDown(0.8)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Summary', { underline: true })
       .moveDown(0.5);

    const summary = doctorData.summary || {};
    
    // Create a compact grid for mobile
    const startY = doc.y;
    const leftCol = 40;
    const rightCol = 300;
    
    doc.fontSize(11)
       .font('Helvetica');
    
    // Left column
    doc.text('Opening Balance:', leftCol, startY);
    doc.text('New Commission:', leftCol, startY + 20);
    doc.text('Total Paid:', leftCol, startY + 40);
    doc.text('Closing Balance:', leftCol, startY + 60);
    
    // Right column - values
    doc.font('Helvetica-Bold');
    doc.text(`₹${summary.openingBalance || 0}`, rightCol, startY);
    doc.text(`₹${summary.newCommission || 0}`, rightCol, startY + 20);
    doc.text(`₹${summary.totalPaid || 0}`, rightCol, startY + 40);
    doc.text(`₹${summary.closingBalance || 0}`, rightCol, startY + 60);
    
    doc.y = startY + 90;
  }

  static addCommissionDetails(doc, doctorData) {
    const appointments = doctorData.appointments || [];
    
    if (appointments.length === 0) {
      doc.fontSize(11).text('No commission details for this period.').moveDown(1);
      return;
    }

    doc.moveDown(0.5)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Commission Details', { underline: true })
       .moveDown(0.5);

    // Mobile-friendly table - simplified columns
    const tableTop = doc.y;
    
    // Column positions - adjusted for mobile
    const colDate = 40;
    const colPatient = 140;
    const colAmount = 340;
    const colCommission = 440;
    
    // Header
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    doc.text('Date', colDate, tableTop);
    doc.text('Patient', colPatient, tableTop);
    doc.text('Amt', colAmount, tableTop);
    doc.text('Comm', colCommission, tableTop);

    // Line under header
    doc.moveTo(40, tableTop + 15)
       .lineTo(570, tableTop + 15)
       .stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    appointments.forEach((apt, index) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
        // Redraw header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Date', colDate, y);
        doc.text('Patient', colPatient, y);
        doc.text('Amt', colAmount, y);
        doc.text('Comm', colCommission, y);
        doc.moveTo(40, y + 15).lineTo(570, y + 15).stroke();
        y += 25;
        doc.font('Helvetica').fontSize(9);
      }

      // Short date format (DD/MM)
      const shortDate = apt.date ? apt.date.slice(5).replace('-', '/') : 'N/A';
      
      doc.text(shortDate, colDate, y);
      doc.text(apt.patientName ? apt.patientName.substring(0, 15) : 'N/A', colPatient, y, { width: 150 });
      doc.text(`₹${apt.amount || 0}`, colAmount, y);
      doc.text(`₹${apt.commission || 0}`, colCommission, y);
      
      y += 20;
    });

    doc.y = y + 10;
  }

  static addPaymentHistory(doc, doctorData) {
    const payments = doctorData.payments || [];
    
    if (payments.length === 0) {
      doc.fontSize(11).text('No payment history for this period.').moveDown(1);
      return;
    }

    doc.moveDown(0.5)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Payment History', { underline: true })
       .moveDown(0.5);

    // Mobile-friendly table
    const tableTop = doc.y;
    const colDate = 40;
    const colTxn = 150;
    const colAmount = 420;
    
    // Header
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    doc.text('Date', colDate, tableTop);
    doc.text('Transaction', colTxn, tableTop);
    doc.text('Amount', colAmount, tableTop);

    // Line under header
    doc.moveTo(40, tableTop + 15)
       .lineTo(570, tableTop + 15)
       .stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    payments.forEach((payment, index) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
        // Redraw header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Date', colDate, y);
        doc.text('Transaction', colTxn, y);
        doc.text('Amount', colAmount, y);
        doc.moveTo(40, y + 15).lineTo(570, y + 15).stroke();
        y += 25;
        doc.font('Helvetica').fontSize(9);
      }

      const shortDate = new Date(payment.paidAt).toLocaleDateString().slice(0, 10);
      const shortTxn = payment.transactionId ? payment.transactionId.slice(-8) : 'N/A';
      
      doc.text(shortDate, colDate, y);
      doc.text(shortTxn, colTxn, y);
      doc.text(`₹${payment.amount || 0}`, colAmount, y);
      
      y += 20;
    });

    doc.y = y + 10;
  }

  static addFooter(doc) {
    doc.moveDown(2)
       .fontSize(8)
       .font('Helvetica-Oblique')
       .text('System generated statement', 40, doc.y, { align: 'center', width: 530 })
       .moveDown(0.3)
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  }

  static getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || 'Unknown';
  }
}

module.exports = PDFGenerator;
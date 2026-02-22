require('dotenv').config();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const encryptionService = require('./encryptionService');

class ReportingService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
    this.setupEmailTransporter();
  }

  /**
   * Ensure reports directory exists
   */
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Setup email transporter
   */
  setupEmailTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Generate daily report
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Array} leads - Leads for the date
   * @returns {Promise<Object>} - Report files info
   */
  async generateDailyReport(date, leads) {
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
      
      const reportData = {
        date: formattedDate,
        totalLeads: leads.length,
        leads: leads.map(lead => ({
          ...lead,
          data: encryptionService.decryptLeadData(lead.data)
        }))
      };

      // Generate Excel report
      const excelPath = await this.generateExcelReport(reportData, formattedDate, timestamp);
      
      // Generate PDF report
      const pdfPath = await this.generatePDFReport(reportData, formattedDate, timestamp);

      logger.info('Daily report generated', {
        date: formattedDate,
        totalLeads: leads.length,
        excelPath,
        pdfPath
      });

      return {
        date: formattedDate,
        totalLeads: leads.length,
        excelPath,
        pdfPath,
        files: [excelPath, pdfPath]
      };
    } catch (error) {
      logger.error('Error generating daily report', {
        error: error.message,
        date
      });
      throw error;
    }
  }

  /**
   * Generate Excel report
   * @param {Object} reportData - Report data
   * @param {string} date - Formatted date
   * @param {string} timestamp - Timestamp
   * @returns {Promise<string>} - File path
   */
  async generateExcelReport(reportData, date, timestamp) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Leads Report');

      // Set up headers
      worksheet.columns = [
        { header: 'Lead ID', key: 'id', width: 36 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'Service Type', key: 'service_type', width: 15 },
        { header: 'Preferred Time', key: 'preferred_time', width: 20 },
        { header: 'Notes', key: 'notes', width: 40 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Stage', key: 'stage', width: 15 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Qualified', key: 'qualified', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Meeting Scheduled', key: 'meetingScheduled', width: 20 },
        { header: 'Meeting Time', key: 'meetingTime', width: 20 }
      ];

      // Add data rows
      reportData.leads.forEach(lead => {
        worksheet.addRow({
          id: lead.id,
          name: lead.data.name || 'N/A',
          email: lead.data.email || 'N/A',
          phone: lead.data.phone || 'N/A',
          country: lead.data.country || 'N/A',
          service_type: lead.data.service_type || 'N/A',
          preferred_time: lead.data.preferred_time || 'N/A',
          notes: lead.data.notes || 'N/A',
          status: lead.status,
          stage: lead.stage,
          score: typeof lead.score === 'number' ? lead.score : 0,
          qualified: lead.qualified ? 'Yes' : 'No',
          createdAt: moment(lead.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          meetingScheduled: lead.scheduledMeeting ? 'Yes' : 'No',
          meetingTime: lead.scheduledMeeting ? 
            moment(lead.scheduledMeeting.meetingTime).format('YYYY-MM-DD HH:mm:ss') : 'N/A'
        });
      });

      // Add summary statistics
      worksheet.addRow([]);
      worksheet.addRow(['Summary Statistics']);
      worksheet.addRow(['Total Leads', reportData.totalLeads]);
      worksheet.addRow(['Active Leads', reportData.leads.filter(l => l.status === 'active').length]);
      worksheet.addRow(['Scheduled Meetings', reportData.leads.filter(l => l.scheduledMeeting).length]);
      worksheet.addRow(['Completed Stages', reportData.leads.filter(l => l.stage === 'completed').length]);

      // Style the worksheet
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      const filename = `daily_leads_report_${date}_${timestamp}.xlsx`;
      const filepath = path.join(this.reportsDir, filename);
      
      await workbook.xlsx.writeFile(filepath);
      
      logger.info('Excel report generated', { filepath });
      return filepath;
    } catch (error) {
      logger.error('Error generating Excel report', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate PDF report
   * @param {Object} reportData - Report data
   * @param {string} date - Formatted date
   * @param {string} timestamp - Timestamp
   * @returns {Promise<string>} - File path
   */
  async generatePDFReport(reportData, date, timestamp) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `daily_leads_report_${date}_${timestamp}.pdf`;
        const filepath = path.join(this.reportsDir, filename);
        
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);
        
        doc.pipe(stream);

        // Header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Daily Leads Report', { align: 'center' });
        
        doc.moveDown();
        doc.fontSize(14)
           .font('Helvetica')
           .text(`Date: ${date}`, { align: 'center' });
        
        doc.moveDown();
        doc.fontSize(12)
           .text(`Total Leads: ${reportData.totalLeads}`, { align: 'center' });
        
        doc.moveDown(2);

        // Summary statistics
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Summary Statistics');
        
        doc.moveDown();
        doc.fontSize(12)
           .font('Helvetica')
           .text(`• Total Leads: ${reportData.totalLeads}`);
        doc.text(`• Active Leads: ${reportData.leads.filter(l => l.status === 'active').length}`);
        doc.text(`• Scheduled Meetings: ${reportData.leads.filter(l => l.scheduledMeeting).length}`);
        doc.text(`• Completed Stages: ${reportData.leads.filter(l => l.stage === 'completed').length}`);
        
        doc.moveDown(2);

        // Lead details
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Lead Details');
        
        doc.moveDown();

        reportData.leads.forEach((lead, index) => {
          if (index > 0) doc.moveDown();
          
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .text(`Lead ${index + 1}: ${lead.data.name || 'N/A'}`);
          
          doc.fontSize(10)
             .font('Helvetica')
             .text(`ID: ${lead.id}`)
             .text(`Email: ${lead.data.email || 'N/A'}`)
             .text(`Phone: ${lead.data.phone || 'N/A'}`)
             .text(`Country: ${lead.data.country || 'N/A'}`)
             .text(`Service: ${lead.data.service_type || 'N/A'}`)
             .text(`Status: ${lead.status}`)
             .text(`Stage: ${lead.stage}`)
             .text(`Score: ${lead.score || 'N/A'}`)
             .text(`Qualified: ${lead.qualified ? 'Yes' : 'No'}`)
             .text(`Created: ${moment(lead.createdAt).format('YYYY-MM-DD HH:mm:ss')}`);
          
          if (lead.scheduledMeeting) {
            doc.text(`Meeting: ${moment(lead.scheduledMeeting.meetingTime).format('YYYY-MM-DD HH:mm:ss')}`);
          }
          
          if (lead.data.notes) {
            doc.text(`Notes: ${lead.data.notes}`);
          }
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .text(`Report generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          logger.info('PDF report generated', { filepath });
          resolve(filepath);
        });

        stream.on('error', (error) => {
          logger.error('Error writing PDF file', { error: error.message });
          reject(error);
        });
      } catch (error) {
        logger.error('Error generating PDF report', {
          error: error.message
        });
        reject(error);
      }
    });
  }

  /**
   * Send report via email
   * @param {Object} reportInfo - Report information
   * @param {string} recipientEmail - Recipient email
   * @returns {Promise<Object>} - Email result
   */
  async sendReportEmail(reportInfo, recipientEmail = process.env.ADMIN_EMAIL) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not configured');
      }

      const emailContent = `
        <h2>Daily Leads Report - ${reportInfo.date}</h2>
        <p>Please find attached the daily leads report for ${reportInfo.date}.</p>
        <p><strong>Summary:</strong></p>
        <ul>
          <li>Total Leads: ${reportInfo.totalLeads}</li>
          <li>Excel Report: Attached</li>
          <li>PDF Report: Attached</li>
        </ul>
        <p>Best regards,<br>WhatsApp Lead Assistant Bot</p>
      `;

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: recipientEmail,
        subject: `Daily Leads Report - ${reportInfo.date}`,
        html: emailContent,
        attachments: reportInfo.files.map(filepath => ({
          filename: path.basename(filepath),
          path: filepath
        }))
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Report email sent successfully', {
        recipientEmail,
        messageId: result.messageId,
        attachments: reportInfo.files.length
      });

      return result;
    } catch (error) {
      logger.error('Error sending report email', {
        error: error.message,
        recipientEmail
      });
      throw error;
    }
  }

  /**
   * Generate and send daily report
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Array} leads - Leads for the date
   * @param {string} recipientEmail - Recipient email
   * @returns {Promise<Object>} - Complete report result
   */
  async generateAndSendDailyReport(date, leads, recipientEmail) {
    try {
      // Generate reports
      const reportInfo = await this.generateDailyReport(date, leads);
      
      // Send email if leads exist
      if (leads.length > 0) {
        await this.sendReportEmail(reportInfo, recipientEmail);
      }

      return {
        success: true,
        reportInfo,
        emailSent: leads.length > 0
      };
    } catch (error) {
      logger.error('Error generating and sending daily report', {
        error: error.message,
        date
      });
      throw error;
    }
  }

  /**
   * Clean up old report files
   * @param {number} daysToKeep - Number of days to keep files
   */
  cleanupOldReports(daysToKeep = 30) {
    try {
      const cutoffDate = moment().subtract(daysToKeep, 'days');
      
      fs.readdir(this.reportsDir, (err, files) => {
        if (err) {
          logger.error('Error reading reports directory', { error: err.message });
          return;
        }

        files.forEach(file => {
          const filepath = path.join(this.reportsDir, file);
          const stats = fs.statSync(filepath);
          const fileDate = moment(stats.mtime);

          if (fileDate.isBefore(cutoffDate)) {
            fs.unlinkSync(filepath);
            logger.info('Old report file deleted', { filepath });
          }
        });
      });
    } catch (error) {
      logger.error('Error cleaning up old reports', {
        error: error.message
      });
    }
  }

  /**
   * Get report statistics
   * @returns {Object} - Report statistics
   */
  getReportStatistics() {
    try {
      const files = fs.readdirSync(this.reportsDir);
      const totalFiles = files.length;
      const totalSize = files.reduce((size, file) => {
        const filepath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filepath);
        return size + stats.size;
      }, 0);

      return {
        totalFiles,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
        directory: this.reportsDir
      };
    } catch (error) {
      logger.error('Error getting report statistics', {
        error: error.message
      });
      return {};
    }
  }
}

module.exports = new ReportingService(); 
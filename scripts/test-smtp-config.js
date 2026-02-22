require('dotenv').config();

console.log('🔧 Testing SMTP Configuration\n');

console.log('📧 Environment Variables:');
console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '***SET***' : 'NOT SET'}`);
console.log(`ADMIN_EMAIL: ${process.env.ADMIN_EMAIL}`);
console.log();

// Test nodemailer configuration
const nodemailer = require('nodemailer');

try {
  console.log('📡 Creating SMTP transporter...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  console.log('✅ SMTP transporter created successfully');
  console.log(`📧 Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`👤 User: ${process.env.SMTP_USER}`);
  console.log(`🔐 Secure: ${process.env.SMTP_PORT === '465'}`);
  console.log();

  // Test connection
  console.log('🔗 Testing SMTP connection...');
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ SMTP connection failed:', error.message);
    } else {
      console.log('✅ SMTP connection successful!');
      console.log('📧 Server is ready to send emails');
    }
  });

} catch (error) {
  console.error('❌ Error creating SMTP transporter:', error.message);
} 
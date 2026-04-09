require('dotenv').config();
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1. Create Transporter using SMTP Settings from .env
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, 
      port: process.env.SMTP_PORT || 587, 
      secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
      },
    });

    // 2. Define Email Options
    // Uses APP_NAME from .env (e.g., APP_NAME="Elite Infinity"), defaults to "System Admin"
    const senderName = process.env.APP_NAME || 'System Admin';
    const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 3. Send Email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully. Message ID:", info.messageId);
    
    return true;

  } catch (error) {
    console.error("❌ Email Error:", error.message);
    // Throw the error so the calling function (like the register route) knows it failed
    throw error; 
  }
};

module.exports = sendEmail;
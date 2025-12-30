require('dotenv').config();
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create Transporter using Brevo Settings from .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // smtp-relay.brevo.com
    port: process.env.SMTP_PORT, // 587
    secure: false,               // False for port 587
    auth: {
      user: process.env.SMTP_USER, // Brevo Login ID
      pass: process.env.SMTP_PASS, // Brevo Key
    },
  });

  // 2. Define Email Options
  const mailOptions = {
    from: `Elite Infinity <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3. Send Email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully via Brevo. ID:", info.messageId);
  } catch (error) {
    console.error("❌ Email Error:", error);
    // Log error but don't crash the server
  }
};

module.exports = sendEmail;
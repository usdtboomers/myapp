// backend/utils/sendEmail.js

// 👇 SABSE IMPORTANT LINE: Ye .env file ko load karegi
require('dotenv').config(); 

const nodemailer = require('nodemailer');

let transporter;

// Create transporter only once
const createTransporter = () => {
  // 👇 DEBUGGING: Ye check karega ki password code tak pahunch raha hai ya nahi
  console.log("---------------------------------------------------");
  console.log("📧 DEBUG: Email Logic Triggered");
  console.log("👤 User:", process.env.EMAIL_USER || "❌ MISSING (Check .env file)");
  console.log("🔑 Pass:", process.env.EMAIL_PASS ? "✅ Password Loaded" : "❌ Password MISSING");
  console.log("---------------------------------------------------");

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,      // Your Gmail address
        pass: process.env.EMAIL_PASS,      // Gmail App Password
      },
      tls: {
        rejectUnauthorized: false,         // Avoid certificate issues
      },
    });
  }
  return transporter;
};

/**
 * sendEmail - Send email securely
 * @param {Object} options
 * @param {string} options.to - recipient email
 * @param {string} options.subject - email subject
 * @param {string} options.text - plain text content
 * @param {string} options.html - optional HTML content
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Elite Infinity Support" <${process.env.EMAIL_USER}>`, // Naam professional kar diya
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.response);
    return info;
  } catch (err) {
    console.error('❌ Send email error:', err);
    throw err;
  }
};

module.exports = sendEmail;
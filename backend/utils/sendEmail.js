// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

let transporter;

// Create transporter only once
const createTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,       // Your Gmail address
        pass: process.env.EMAIL_PASS,       // Gmail App Password (16-character, not normal password)
      },
      tls: {
        rejectUnauthorized: false,          // Avoid certificate issues
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
      from: `"  App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.response);
    return info;
  } catch (err) {
    console.error('❌ Send email error:', err);
    throw err;
  }
};

module.exports = sendEmail;

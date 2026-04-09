require('dotenv').config();
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // ✅ Simple & Reliable Gmail Config
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,   // Gmail
        pass: process.env.EMAIL_PASS,   // App Password
      },
    });

    // ✅ Sender Info
    const senderName = process.env.APP_NAME || 'System Admin';

    const mailOptions = {
      from: `"${senderName}" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // ✅ Send Mail
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.messageId);

    return true;

  } catch (error) {
    console.error("❌ Email Error:", error);
    throw error;
  }
};

module.exports = sendEmail;